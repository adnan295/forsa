#!/usr/bin/env node
/**
 * إدخال المنتجات وجولات السحب التجريبية عبر واجهة الإدارة.
 *
 * بيستعمل نفس مسارات /api/admin/* يلي بتستعملها لوحة الأدمن، فبتنكتب
 * سجلات النشاط وبتنطلق إشعارات الجولة الجديدة تماماً متل الإدخال اليدوي.
 * ما بيلمس قاعدة البيانات مباشرة.
 *
 * التشغيل:
 *   ADMIN_PASSWORD=... node scripts/seed-admin-demo.mjs [--url https://nayvo.store]
 *
 * على السيرفر بيقرأ كلمة السر من .env.production لحاله:
 *   cd /opt/forsa && node scripts/seed-admin-demo.mjs
 *
 * آمن للإعادة: بيتخطّى أي منتج أو جولة موجودة بنفس الاسم.
 * الحذف: من لوحة الإدارة، أو --delete لحذف ما أدخله هذا السكربت.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const BASE = (flag("--url", process.env.APP_URL || "https://nayvo.store")).replace(/\/$/, "");
const USER = flag("--user", process.env.ADMIN_USERNAME || "admin");
const DELETE = args.includes("--delete");

/** كلمة السر: من البيئة، وإلا من .env.production بجانب المستودع */
function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const env = readFileSync(join(here, "..", ".env.production"), "utf8");
    const line = env.split("\n").find((l) => l.trim().startsWith("ADMIN_PASSWORD="));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {}
  return null;
}

const PASS = adminPassword();
if (!PASS) {
  console.error("لازم ADMIN_PASSWORD بالبيئة أو بملف .env.production.");
  process.exit(1);
}

let cookie = "";
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    if (c.startsWith("connect.sid=")) cookie = c.split(";")[0];
  }
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (!res.ok) {
    const msg = data?.message || text.slice(0, 200) || res.statusText;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

/** مهلة قصيرة: حد المعدّل 60 طلب بالدقيقة */
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const catalog = JSON.parse(readFileSync(join(here, "demo-catalog.json"), "utf8"));

async function main() {
  const me = await api("POST", "/api/auth/login", { username: USER, password: PASS });
  if (me.role !== "admin") {
    console.error(`المستخدم ${USER} مو أدمن (role=${me.role}).`);
    process.exit(1);
  }
  console.log(`دخول ناجح: ${me.username} — ${BASE}`);

  const existingProducts = await api("GET", "/api/products");
  const byName = new Map(existingProducts.map((p) => [p.name, p]));

  if (DELETE) {
    let removed = 0;
    for (const p of catalog.products) {
      const found = byName.get(p.name);
      if (!found) continue;
      await api("DELETE", `/api/admin/products/${found.id}`);
      console.log(`  حُذف: ${p.name}`);
      removed++;
      await pause(250);
    }
    console.log(`\nحُذف ${removed} منتج. جولات السحب احذفها من لوحة الإدارة.`);
    return;
  }

  console.log("\nالمنتجات:");
  let added = 0, skipped = 0;
  for (const p of catalog.products) {
    if (byName.has(p.name)) {
      console.log(`  موجود مسبقاً، تخطّي: ${p.name}`);
      skipped++;
      continue;
    }
    const created = await api("POST", "/api/admin/products", p);
    console.log(`  أُضيف: ${created.name} — ${created.price}$ — مخزون ${created.stock}`);
    added++;
    await pause(250);
  }

  console.log("\nجولات السحب:");
  const existingDraws = await api("GET", "/api/draws/completed").catch(() => []);
  const current = await api("GET", "/api/draws/current").catch(() => null);
  const drawNames = new Set([
    ...(Array.isArray(existingDraws) ? existingDraws : []).map((d) => d.prizeName),
    ...(current ? [current.prizeName] : []),
  ]);

  let drawsAdded = 0;
  for (const d of catalog.draws) {
    if (drawNames.has(d.prizeName)) {
      console.log(`  موجودة مسبقاً، تخطّي: ${d.prizeName}`);
      continue;
    }
    const created = await api("POST", "/api/admin/draws", d);
    console.log(`  أُنشئت: ${created.title} — ${created.prizeName} — ` +
                `${created.soldTickets}/${created.targetTickets} — الحالة ${created.status}`);
    drawsAdded++;
    await pause(250);
  }

  console.log(`\nالخلاصة: ${added} منتج جديد، ${skipped} متخطّى، ${drawsAdded} جولة.`);
  console.log("هذه بيانات تجريبية للمعاينة — احذفها قبل فتح البيع الحقيقي.");
}

/** رسالة واضحة بدل أثر المكدّس عند فشل أي طلب */
main().catch((err) => {
  console.error(`\nتوقّف: ${err?.message ?? err}`);
  process.exit(1);
});
