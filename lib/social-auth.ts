import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "@/constants/social-auth";

/** ما يُرسل إلى /api/auth/social بعد موافقة المستخدم لدى Apple أو Google */
export interface SocialCredential {
  provider: "apple" | "google";
  idToken: string;
  nonce?: string;
  authorizationCode?: string;
  fullName?: string;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export function isGoogleSignInConfigured(): boolean {
  if (Platform.OS === "web" || !GOOGLE_WEB_CLIENT_ID) return false;
  return Platform.OS === "android" || !!GOOGLE_IOS_CLIENT_ID;
}

/** يعيد null إذا ألغى المستخدم */
export async function signInWithApple(): Promise<SocialCredential | null> {
  // النص الأصلي للخادم، وتجزئته لـApple فتعود داخل الرمز الموقّع — تمنع إعادة استخدامه
  const rawNonce = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error("تعذّر تسجيل الدخول عبر Apple");
    // الاسم يصل أول مرة فقط
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
    return {
      provider: "apple",
      idToken: credential.identityToken,
      nonce: rawNonce,
      authorizationCode: credential.authorizationCode ?? undefined,
      fullName: fullName || undefined,
    };
  } catch (error: any) {
    if (error?.code === "ERR_REQUEST_CANCELED") return null;
    throw error;
  }
}

/** يعيد null إذا ألغى المستخدم */
export async function signInWithGoogle(): Promise<SocialCredential | null> {
  // تحميل متأخر: الوحدة الأصلية غير موجودة على الويب
  const { GoogleSignin, isCancelledResponse, isSuccessResponse, statusCodes } = await import(
    "@react-native-google-signin/google-signin"
  );
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new Error("تعذّر تسجيل الدخول عبر Google");
    }
    const idToken = response.data.idToken;
    // لا نحتفظ بجلسة Google داخل التطبيق؛ في المرة القادمة يختار الحساب من جديد
    GoogleSignin.signOut().catch(() => {});
    return { provider: "google", idToken };
  } catch (error: any) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED || error?.code === statusCodes.IN_PROGRESS) return null;
    throw error;
  }
}
