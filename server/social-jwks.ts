import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

/**
 * مفاتيح Apple وGoogle العامة لتوقيع رموز الدخول. تُجلب وتُخزَّن مؤقتاً تلقائياً.
 * ملف مستقل حتى تستبدله الاختبارات بمفاتيح محلية دون أي باب خلفي في الإنتاج.
 */
export const socialKeySets: Record<"apple" | "google", JWTVerifyGetKey> = {
  apple: createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys")),
  google: createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")),
};
