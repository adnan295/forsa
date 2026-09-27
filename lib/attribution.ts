import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { getApiUrl } from "@/lib/query-client";

/**
 * من أي رابط تتبع (nayvo.store/r/…) جاء هالمستخدم؟ يُحدَّد مرة وحدة عند أول فتح للتطبيق
 * ويُرسل مع إنشاء الحساب، فتنحسب مشتريات الحساب لهذا الرابط.
 * أندرويد: Google Play بيمرّر utm_campaign بدقة. آيفون: مطابقة تقديرية من السيرفر.
 * المتصفح ما بيحتاج هالشي — السيرفر بيقرأ كوكي الرابط.
 */
export type AttributionRef = { slug: string; source: "play" | "ios_match" };

const STORAGE_KEY = "nayvo.attribution.v1";
let pending: Promise<AttributionRef | null> | null = null;

/** utm_source=nayvo&utm_campaign=slug — بدون URLSearchParams لأنه ناقص على React Native */
function slugFromReferrer(referrer: string): string | null {
  const params: Record<string, string> = {};
  for (const pair of referrer.split("&")) {
    const [key, value = ""] = pair.split("=");
    try {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    } catch {
      // مصدر تثبيت غير مفهوم
    }
  }
  const slug = (params.utm_campaign || "").toLowerCase();
  return params.utm_source === "nayvo" && /^[a-z0-9_-]{1,40}$/.test(slug) ? slug : null;
}

async function detect(): Promise<AttributionRef | null> {
  if (Platform.OS === "android") {
    const slug = slugFromReferrer(await Application.getInstallReferrerAsync());
    return slug ? { slug, source: "play" } : null;
  }
  if (Platform.OS === "ios") {
    const url = new URL(`api/attribution/ios?os=${encodeURIComponent(String(Platform.Version))}`, getApiUrl());
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`attribution ${res.status}`);
    const data = await res.json();
    return typeof data?.slug === "string" ? { slug: data.slug, source: "ios_match" } : null;
  }
  return null;
}

/** يُستدعى عند فتح التطبيق وعند إنشاء الحساب؛ النتيجة محفوظة فما بيتكرر السؤال */
export function getAttribution(): Promise<AttributionRef | null> {
  if (Platform.OS === "web") return Promise.resolve(null);
  if (!pending) {
    pending = (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) return (JSON.parse(stored).ref as AttributionRef | null) ?? null;
      const ref = await detect();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ref, checkedAt: Date.now() }));
      return ref;
    })().catch(() => {
      // بلا نت أو خطأ مؤقت: نعيد المحاولة بالفتحة الجاية
      pending = null;
      return null;
    });
  }
  return pending;
}
