import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import Colors, { Fonts, FontSize, Radius, Sizing, Spacing } from "@/constants/colors";
import { Alert } from "@/lib/alert";
import { useAuth } from "@/lib/auth-context";
import { translateError } from "@/lib/errors";
import {
  isAppleSignInAvailable,
  isGoogleSignInConfigured,
  signInWithApple,
  signInWithGoogle,
  type SocialCredential,
} from "@/lib/social-auth";

const c = Colors.light;

/** شعار Google الرسمي بألوانه الأربعة */
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/**
 * الدخول أو التسجيل بكبسة عبر Apple (iOS) أو Google.
 * لا يظهر شيء إن لم تتوفر أي طريقة على هذا الجهاز.
 */
export default function SocialSignIn({ onSuccess }: { onSuccess: () => void }) {
  const { socialLogin } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  const googleAvailable = isGoogleSignInConfigured();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  if (!appleAvailable && !googleAvailable) return null;

  async function run(provider: "apple" | "google", getCredential: () => Promise<SocialCredential | null>) {
    if (busy) return;
    setBusy(provider);
    try {
      const credential = await getCredential();
      if (!credential) return;
      await socialLogin(credential);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تعذّر تسجيل الدخول", translateError(error?.message));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={s.root}>
      {appleAvailable && (
        <View style={s.appleWrap} pointerEvents={busy ? "none" : "auto"}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={Radius.button}
            style={s.appleButton}
            onPress={() => run("apple", signInWithApple)}
          />
          {busy === "apple" && (
            <View style={s.appleBusy}>
              <ActivityIndicator color={c.surface} />
            </View>
          )}
        </View>
      )}

      {googleAvailable && (
        <Pressable
          onPress={() => run("google", signInWithGoogle)}
          disabled={!!busy}
          accessibilityRole="button"
          accessibilityLabel="المتابعة باستخدام Google"
          style={({ pressed }) => [s.google, pressed && { backgroundColor: c.background }, !!busy && busy !== "google" && { opacity: 0.6 }]}
        >
          {busy === "google" ? (
            <ActivityIndicator color={c.text} />
          ) : (
            <>
              <GoogleLogo />
              <Text style={s.googleText}>المتابعة باستخدام Google</Text>
            </>
          )}
        </Pressable>
      )}

      <View style={s.divider}>
        <View style={s.line} />
        <Text style={s.or}>أو بالبريد الإلكتروني</Text>
        <View style={s.line} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: Spacing.md },
  appleWrap: { height: Sizing.buttonHeight },
  appleButton: { width: "100%", height: Sizing.buttonHeight },
  appleBusy: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.button,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  google: {
    height: Sizing.buttonHeight,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  googleText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: c.text,
    writingDirection: "rtl",
  },
  divider: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Platform.OS === "ios" ? 2 : 0 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  or: { fontFamily: Fonts.regular, fontSize: FontSize.label, color: c.textMuted, writingDirection: "rtl" },
});
