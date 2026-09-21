import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Logo, Button, Field } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";
import { translateError } from "@/lib/errors";

const c = Colors.light;

type Step = "email" | "code" | "password" | "done";

const STEP_COPY: Record<Step, { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }> = {
  email: {
    icon: "mail-outline",
    title: "استعادة كلمة السر",
    body: "أدخل بريدك الإلكتروني ومنبعتلك رمز تأكيد",
  },
  code: {
    icon: "key-outline",
    title: "أدخل رمز التأكيد",
    body: "بعتنالك رمز من 6 أرقام — تحقّق من بريدك",
  },
  password: {
    icon: "lock-closed-outline",
    title: "كلمة سر جديدة",
    body: "اختر كلمة سر قوية ما استخدمتها قبل",
  },
  done: {
    icon: "checkmark-circle",
    title: "تم التغيير",
    body: "صار فيك تسجّل دخولك بكلمة السر الجديدة",
  },
};

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** لما يفشل إرسال الإيميل بيرجّع الخادم الرمز حتى نعرضه */
  const [fallbackCode, setFallbackCode] = useState<string | null>(null);

  async function sendCode() {
    if (!email.trim()) {
      setErrors({ email: "البريد الإلكتروني مطلوب" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email: email.trim() });
      const data = await res.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (data.emailFailed && data.code) setFallbackCode(data.code);
      setStep("code");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تعذّر الإرسال", translateError(error?.message));
    } finally {
      setLoading(false);
    }
  }

  function goToPassword() {
    if (code.trim().length < 4) {
      setErrors({ code: "أدخل الرمز كاملاً" });
      return;
    }
    setErrors({});
    setStep("password");
  }

  async function resetPassword() {
    const next: Record<string, string> = {};
    if (newPassword.length < 6) next.newPassword = "كلمة السر لازم 6 أحرف على الأقل";
    if (newPassword !== confirmPassword) next.confirmPassword = "كلمتا السر مو متطابقتين";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", {
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تعذّر التغيير", translateError(error?.message));
      // الرمز غالباً هو المشكلة — منرجّعه للمستخدم ليصححه
      setStep("code");
    } finally {
      setLoading(false);
    }
  }

  const copy = STEP_COPY[step];
  const isDone = step === "done";

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingTop: insets.top + Spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/auth"))}
            style={s.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <Ionicons name="chevron-back" size={24} color={c.textMuted} />
          </Pressable>

          <View style={s.brand}>
            <Logo size={30} />
          </View>

          <View style={[s.stepIcon, isDone && { backgroundColor: StatusColors.success.bg }]}>
            <Ionicons
              name={copy.icon}
              size={34}
              color={isDone ? StatusColors.success.fg : c.primary}
            />
          </View>

          <Text style={s.title}>{copy.title}</Text>
          <Text style={s.subtitle}>{copy.body}</Text>

          {fallbackCode && step === "code" && (
            <View style={s.fallbackBox}>
              <Ionicons name="warning-outline" size={17} color={StatusColors.warning.fg} />
              <View style={s.flex}>
                <Text style={s.fallbackLabel}>تعذّر إرسال الإيميل — استخدم هذا الرمز:</Text>
                <Text style={s.fallbackCode}>{fallbackCode}</Text>
              </View>
            </View>
          )}

          <View style={s.form}>
            {step === "email" && (
              <>
                <Field
                  label="البريد الإلكتروني"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  icon="mail-outline"
                  keyboardType="email-address"
                  error={errors.email}
                  ltr
                />
                <Button label="إرسال الرمز" onPress={sendCode} loading={loading} />
              </>
            )}

            {step === "code" && (
              <>
                <Field
                  label="رمز التأكيد"
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  icon="key-outline"
                  keyboardType="number-pad"
                  maxLength={6}
                  error={errors.code}
                  ltr
                />
                <Button label="متابعة" onPress={goToPassword} />
                <Pressable onPress={sendCode} disabled={loading} style={s.linkBtn}>
                  <Text style={s.linkText}>إعادة إرسال الرمز</Text>
                </Pressable>
              </>
            )}

            {step === "password" && (
              <>
                <Field
                  label="كلمة السر الجديدة"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  icon="lock-closed-outline"
                  secureTextEntry
                  error={errors.newPassword}
                  hint="6 أحرف على الأقل"
                  ltr
                />
                <Field
                  label="تأكيد كلمة السر"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  icon="lock-closed-outline"
                  secureTextEntry
                  error={errors.confirmPassword}
                  ltr
                />
                <Button label="تغيير كلمة السر" onPress={resetPassword} loading={loading} />
              </>
            )}

            {isDone && (
              <Button label="تسجيل الدخول" onPress={() => router.replace("/auth")} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  backBtn: { alignSelf: "flex-start", width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  brand: { alignItems: "center" },

  stepIcon: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.navy,
    textAlign: "center",
    writingDirection: "rtl",
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 23,
  },

  form: { gap: Spacing.lg },
  linkBtn: { alignSelf: "center", paddingVertical: Spacing.sm },
  linkText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.primary,
    writingDirection: "rtl",
  },

  fallbackBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: StatusColors.warning.bg,
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  fallbackLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: StatusColors.warning.fg,
    textAlign: "right",
    writingDirection: "rtl",
  },
  fallbackCode: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: StatusColors.warning.fg,
    letterSpacing: 4,
    writingDirection: "ltr",
    textAlign: "center",
    marginTop: 4,
  },
});
