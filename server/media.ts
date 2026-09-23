import crypto from "crypto";
import sharp from "sharp";
import { eq, like, or } from "drizzle-orm";
import { db } from "./db";
import { media, products, draws, paymentMethods, orders, orderItems, type Media } from "@shared/schema";

/**
 * الصور المرفوعة تُضغط وتُحفظ في جدول media وتُخدَّم برابط قصير مخزَّن مؤقتاً،
 * بدل تضمينها نصاً داخل كل قائمة منتجات أو طلبات (كانت تصل لعدة ميغابايت لكل طلب).
 */

export type ImageKind = "product" | "banner" | "icon" | "receipt";

/** أقصى بُعد بالبكسل لكل نوع — يكفي شاشات الموبايل بدقة عالية */
const MAX_SIDE: Record<ImageKind, number> = { product: 1200, banner: 1600, icon: 512, receipt: 1800 };
const MAX_INPUT_PIXELS = 50_000_000;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

export const MEDIA_PATH = "/api/media/";

export class MediaError extends Error {}

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
};

/**
 * يصغّر الصورة ويعيد ترميزها: WebP للمتجر، JPEG للإيصالات.
 * يدوّرها حسب EXIF ويحذف البيانات الوصفية (منها موقع GPS في صور الموبايل).
 * صور SVG تُحوَّل لصور نقطية فلا يُخدَّم أي SVG قابل لتشغيل سكربت.
 */
export async function compressImage(input: Buffer, kind: ImageKind) {
  const max = MAX_SIDE[kind];
  try {
    let pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, density: 144 })
      .rotate()
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true });
    pipeline =
      kind === "receipt"
        ? pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 80, mozjpeg: true })
        : pipeline.webp({ quality: 80, effort: 4 });
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      data,
      mimeType: kind === "receipt" ? "image/jpeg" : "image/webp",
      width: info.width,
      height: info.height,
    };
  } catch {
    throw new MediaError("تعذّر قراءة الصورة، جرّب صورة JPG أو PNG");
  }
}

async function insertMedia(data: Buffer, mimeType: string, isPrivate: boolean, width?: number, height?: number) {
  const id = crypto.randomBytes(18).toString("base64url");
  await db.insert(media).values({
    id,
    mimeType,
    dataBase64: data.toString("base64"),
    bytes: data.length,
    width: width ?? null,
    height: height ?? null,
    isPrivate,
  });
  return `${MEDIA_PATH}${id}.${EXTENSIONS[mimeType] ?? "bin"}`;
}

/** يحفظ ملفاً مرفوعاً ويعيد رابطه النسبي (/api/media/…) */
export async function saveUpload(buffer: Buffer, declaredMime: string, kind: ImageKind): Promise<string> {
  const isPrivate = kind === "receipt";
  if (declaredMime === "application/pdf") {
    if (kind !== "receipt") throw new MediaError("الملف لازم يكون صورة");
    if (buffer.length > MAX_PDF_BYTES) throw new MediaError("ملف PDF أكبر من 5 ميغابايت");
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") throw new MediaError("ملف PDF غير صالح");
    return insertMedia(buffer, "application/pdf", true);
  }
  const image = await compressImage(buffer, kind);
  return insertMedia(image.data, image.mimeType, isPrivate, image.width, image.height);
}

export async function getMedia(id: string): Promise<Media | undefined> {
  const [row] = await db.select().from(media).where(eq(media.id, id));
  return row || undefined;
}

/* ───────── تحويل الصور القديمة المضمّنة كنص (data:) إلى روابط ───────── */

function decodeDataUrl(value: string): { mime: string; buffer: Buffer } | null {
  const match = value.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) return null;
  const [, mime, isBase64, payload] = match;
  const buffer = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
  return { mime, buffer };
}

/**
 * يحوّل كل صورة مضمّنة في الجداول إلى جدول media. آمن للتكرار: لا يلمس إلا
 * القيم التي تبدأ بـ data:، ونفس الصورة المكررة (صورة منتج في عدة طلبات) تُحفظ مرة واحدة.
 * صورة تفشل قراءتها تبقى كما هي ويُسجَّل السبب.
 */
export async function migrateInlineImages(log: (message: string) => void = console.log) {
  const cache = new Map<string, string>();
  let converted = 0;
  let failed = 0;

  async function convert(value: string | null, kind: ImageKind): Promise<string | null> {
    if (!value || !value.startsWith("data:")) return value;
    const key = `${kind}:${crypto.createHash("sha256").update(value).digest("hex")}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const decoded = decodeDataUrl(value);
    try {
      if (!decoded) throw new MediaError("unreadable data URL");
      const url = await saveUpload(decoded.buffer, decoded.mime, kind);
      cache.set(key, url);
      converted++;
      return url;
    } catch (error) {
      failed++;
      log(`[media] kept an inline ${kind} image: ${(error as Error).message}`);
      return value;
    }
  }

  const productRows = await db
    .select({ id: products.id, imageUrl: products.imageUrl, imagesJson: products.imagesJson })
    .from(products)
    .where(or(like(products.imageUrl, "data:%"), like(products.imagesJson, "%data:%")));
  for (const row of productRows) {
    let imagesJson = row.imagesJson;
    if (imagesJson?.includes("data:")) {
      try {
        const list = JSON.parse(imagesJson);
        if (Array.isArray(list)) {
          const next = [];
          for (const item of list) next.push(typeof item === "string" ? await convert(item, "product") : item);
          imagesJson = JSON.stringify(next);
        }
      } catch {
        // قائمة صور تالفة تبقى كما هي
      }
    }
    await db
      .update(products)
      .set({ imageUrl: await convert(row.imageUrl, "product"), imagesJson })
      .where(eq(products.id, row.id));
  }

  const drawRows = await db
    .select({ id: draws.id, prizeImageUrl: draws.prizeImageUrl, bannerImageUrl: draws.bannerImageUrl })
    .from(draws)
    .where(or(like(draws.prizeImageUrl, "data:%"), like(draws.bannerImageUrl, "data:%")));
  for (const row of drawRows) {
    await db
      .update(draws)
      .set({
        prizeImageUrl: await convert(row.prizeImageUrl, "product"),
        bannerImageUrl: await convert(row.bannerImageUrl, "banner"),
      })
      .where(eq(draws.id, row.id));
  }

  const methodRows = await db
    .select({ id: paymentMethods.id, imageUrl: paymentMethods.imageUrl })
    .from(paymentMethods)
    .where(like(paymentMethods.imageUrl, "data:%"));
  for (const row of methodRows) {
    await db.update(paymentMethods).set({ imageUrl: await convert(row.imageUrl, "icon") }).where(eq(paymentMethods.id, row.id));
  }

  const receiptRows = await db
    .select({ id: orders.id, receiptUrl: orders.receiptUrl })
    .from(orders)
    .where(like(orders.receiptUrl, "data:%"));
  for (const row of receiptRows) {
    await db.update(orders).set({ receiptUrl: await convert(row.receiptUrl, "receipt") }).where(eq(orders.id, row.id));
  }

  const itemRows = await db
    .select({ id: orderItems.id, productImageUrl: orderItems.productImageUrl })
    .from(orderItems)
    .where(like(orderItems.productImageUrl, "data:%"));
  for (const row of itemRows) {
    await db
      .update(orderItems)
      .set({ productImageUrl: await convert(row.productImageUrl, "product") })
      .where(eq(orderItems.id, row.id));
  }

  if (converted || failed) log(`[media] moved ${converted} inline images to /api/media (${failed} kept inline)`);
  return { converted, failed };
}
