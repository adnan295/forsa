import crypto from "crypto";
import jwt from "jsonwebtoken";
import { jwtVerify } from "jose";
import type { SocialProvider } from "@shared/schema";
import { socialKeySets } from "./social-jwks";

const APPLE_ISSUER = "https://appleid.apple.com";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const REQUEST_TIMEOUT_MS = 10_000;

export interface SocialIdentity {
  provider: SocialProvider;
  /** معرّف ثابت لدى المزوّد */
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

export class SocialAuthError extends Error {}

/** معرّف تطبيق iOS — هو جمهور رموز Sign in with Apple من التطبيق */
function appleClientId(): string {
  return (process.env.APPLE_CLIENT_ID || process.env.APN_BUNDLE_ID || "app.replit.forsa").trim();
}

/** معرّفات OAuth من Google Cloud (الويب وiOS وأندرويد) مفصولة بفواصل */
function googleClientIds(): string[] {
  return (process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((id: string) => id.trim())
    .filter(Boolean);
}

export function isSocialProviderEnabled(provider: SocialProvider): boolean {
  return provider === "apple" ? !!appleClientId() : googleClientIds().length > 0;
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const truthy = (v: unknown) => v === true || v === "true";

/**
 * يتحقق من توقيع رمز الدخول ومُصدره وجمهوره وصلاحيته، ثم يعيد هوية المستخدم.
 * مع Apple يُشترط nonce: التطبيق يرسل النص الأصلي، والرمز يحمل تجزئته.
 */
export async function verifySocialToken(
  provider: SocialProvider,
  idToken: string,
  rawNonce?: string,
): Promise<SocialIdentity> {
  if (!isSocialProviderEnabled(provider)) {
    throw new SocialAuthError("هذه الطريقة غير مفعّلة حالياً");
  }

  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(idToken, socialKeySets[provider], {
      issuer: provider === "apple" ? APPLE_ISSUER : GOOGLE_ISSUERS,
      audience: provider === "apple" ? appleClientId() : googleClientIds(),
      algorithms: ["RS256"],
      clockTolerance: 60,
    });
    payload = result.payload as Record<string, unknown>;
  } catch {
    throw new SocialAuthError("تعذّر التحقق من تسجيل الدخول، حاول مرة ثانية");
  }

  const subject = typeof payload.sub === "string" ? payload.sub : "";
  if (!subject) throw new SocialAuthError("تعذّر التحقق من تسجيل الدخول، حاول مرة ثانية");

  if (provider === "apple") {
    if (!rawNonce || typeof payload.nonce !== "string" || payload.nonce !== sha256Hex(rawNonce)) {
      throw new SocialAuthError("تعذّر التحقق من تسجيل الدخول، حاول مرة ثانية");
    }
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
  const name = provider === "google" && typeof payload.name === "string" ? payload.name.trim() : null;

  return {
    provider,
    subject,
    email: email || null,
    emailVerified: !!email && truthy(payload.email_verified),
    name: name || null,
  };
}

/* ───────── إبطال Sign in with Apple عند حذف الحساب (شرط مراجعة آبل) ───────── */

export function isAppleRevocationConfigured(): boolean {
  return !!(process.env.APPLE_SIGNIN_KEY && process.env.APPLE_SIGNIN_KEY_ID && process.env.APPLE_TEAM_ID);
}

function applePrivateKey(): string {
  return (process.env.APPLE_SIGNIN_KEY || "").replace(/\\n/g, "\n").trim();
}

function appleClientSecret(): string {
  return jwt.sign({}, applePrivateKey(), {
    algorithm: "ES256",
    keyid: process.env.APPLE_SIGNIN_KEY_ID!.trim(),
    issuer: process.env.APPLE_TEAM_ID!.trim(),
    audience: APPLE_ISSUER,
    subject: appleClientId(),
    expiresIn: "10m",
  });
}

async function applePost(path: string, form: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${APPLE_ISSUER}${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form).toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** يستبدل رمز التفويض برمز تحديث يُحفظ لإبطاله لاحقاً. لا يُفشل الدخول إن تعذّر. */
export async function exchangeAppleAuthorizationCode(code: string): Promise<string | null> {
  if (!isAppleRevocationConfigured() || !code) return null;
  try {
    const res = await applePost("/auth/token", {
      client_id: appleClientId(),
      client_secret: appleClientSecret(),
      code,
      grant_type: "authorization_code",
    });
    if (!res.ok) {
      console.error(`[Apple] token exchange failed: ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { refresh_token?: string };
    return body.refresh_token ?? null;
  } catch (error) {
    console.error("[Apple] token exchange error:", error);
    return null;
  }
}

/** يبطل ربط الحساب لدى Apple — أفضل جهد، لا يمنع حذف الحساب */
export async function revokeAppleRefreshToken(refreshToken: string): Promise<boolean> {
  if (!isAppleRevocationConfigured() || !refreshToken) return false;
  try {
    const res = await applePost("/auth/revoke", {
      client_id: appleClientId(),
      client_secret: appleClientSecret(),
      token: refreshToken,
      token_type_hint: "refresh_token",
    });
    if (!res.ok) console.error(`[Apple] revoke failed: ${res.status}`);
    return res.ok;
  } catch (error) {
    console.error("[Apple] revoke error:", error);
    return false;
  }
}
