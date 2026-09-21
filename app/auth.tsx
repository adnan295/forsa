import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Alert } from "@/lib/alert";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Logo, Button, Field } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { translateError } from "@/lib/errors";

const c = Colors.light;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/** حقول رمز التحقق — ستة مربّعات بانتقال تلقائي */
function OTPInput({ value, onChange }: { value: string[]; onChange: (val: string[]) => void }) {
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleChange(text: string, index: number) {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={s.otpRow}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, i)}
          keyboardType="number-pad"
          maxLength={1}
          accessibilityLabel={`الرقم ${i + 1} من رمز التحقق`}
          style={[s.otpBox, value[i] ? s.otpBoxFilled : null]}
        />
      ))}
    </View>
  );
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, verifyEmail, resendVerification } = useAuth();
  /** بعد الدخول من صفحة الدفع على الويب منرجّع المستخدم لهناك */
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  function finishAuth() {
    if (typeof returnTo === "string" && /^\/checkout(?:\?|$)/.test(returnTo)) {
      router.replace(returnTo as any);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as any);
    }
  }

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendTimer, setResendTimer] = useState(0);
  /** لما يفشل إرسال الإيميل بيرجّع الخادم الرمز حتى نعرضه */
  const [fallbackCode, setFallbackCode] = useState<string | null>(null);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((v) => v - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!isLogin && username.trim().length < 3) errors.username = "اسم المستخدم لازم 3 أحرف على الأقل";
    if (!email.trim()) errors.email = "البريد الإلكتروني مطلوب";
    else if (!isLogin && !/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "البريد الإلكتروني غير صحيح";
    if (password.length < 6) errors.password = "كلمة السر لازم 6 أحرف على الأقل";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        finishAuth();
      } else {
        const result = await register(username.trim(), email.trim(), password);
        if (result.requiresVerification) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setVerificationEmail(result.email);
          setVerificationStep(true);
          setResendTimer(RESEND_SECONDS);
          if (result.verificationCode) setFallbackCode(result.verificationCode);
        }
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تعذّر إتمام العملية", translateError(error?.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    const code = otpDigits.join("");
    if (code.length !== OTP_LENGTH) {
      Alert.alert("رمز ناقص", "أدخل الرمز كاملاً");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(verificationEmail, code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finishAuth();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("الرمز غير صحيح", translateError(error?.message));
      setOtpDigits(Array(OTP_LENGTH).fill(""));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    try {
      const res = await resendVerification(verificationEmail);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResendTimer(RESEND_SECONDS);
      if (res?.verificationCode) {
        setFallbackCode(res.verificationCode);
      } else {
        setFallbackCode(null);
        Alert.alert("تم الإرسال", "بعتنالك رمز تحقق جديد");
      }
    } catch {
      Alert.alert("تعذّر الإرسال", "جرّب بعد شوي");
    }
  }

  /* ───────────────────── خطوة رمز التحقق ───────────────────── */
  if (verificationStep) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[s.content, { paddingTop: insets.top + Spacing.xxl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.brand}>
              <Logo size={30} />
            </View>

            <View style={s.otpIcon}>
              <Ionicons name="mail-open-outline" size={34} color={c.primary} />
            </View>

            <Text style={s.title}>تحقّق من بريدك</Text>
            <Text style={s.subtitle}>
              بعتنا رمز من {OTP_LENGTH} أرقام على{"\n"}
              <Text style={s.emailText}>{verificationEmail}</Text>
            </Text>

            {fallbackCode && (
              <View style={s.fallbackBox}>
                <Ionicons name="warning-outline" size={17} color={StatusColors.warning.fg} />
                <View style={s.flex}>
                  <Text style={s.fallbackLabel}>تعذّر إرسال الإيميل — استخدم هذا الرمز:</Text>
                  <Text style={s.fallbackCode}>{fallbackCode}</Text>
                </View>
              </View>
            )}

            <OTPInput value={otpDigits} onChange={setOtpDigits} />

            <Button label="تأكيد" onPress={handleVerify} loading={loading} />

            <Pressable
              onPress={handleResend}
              disabled={resendTimer > 0}
              accessibilityRole="button"
              style={s.linkBtn}
            >
              <Text style={[s.linkText, resendTimer > 0 && { color: c.textMuted }]}>
                {resendTimer > 0 ? `إعادة الإرسال بعد ${resendTimer} ثانية` : "إعادة إرسال الرمز"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setVerificationStep(false);
                setFallbackCode(null);
              }}
              accessibilityRole="button"
              style={s.linkBtn}
            >
              <Text style={s.linkMuted}>رجوع</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  /* ───────────────────── الدخول / حساب جديد ───────────────────── */
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            style={s.closeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="إغلاق"
          >
            <Ionicons name="close" size={24} color={c.textMuted} />
          </Pressable>

          <View style={s.brand}>
            <Logo size={34} />
            <Text style={s.tagline}>مشترياتك اليوم قد تكون فرصتك غداً</Text>
          </View>

          <View style={s.switcher}>
            {(
              [
                { key: true, label: "تسجيل الدخول" },
                { key: false, label: "حساب جديد" },
              ] as const
            ).map((opt) => {
              const active = isLogin === opt.key;
              return (
                <Pressable
                  key={String(opt.key)}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIsLogin(opt.key);
                    setFieldErrors({});
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[s.switchTab, active && s.switchTabActive]}
                >
                  <Text style={[s.switchText, active && s.switchTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.form}>
            {!isLogin && (
              <Field
                label="اسم المستخدم"
                value={username}
                onChangeText={setUsername}
                placeholder="اسمك بالتطبيق"
                icon="person-outline"
                error={fieldErrors.username}
                ltr
                testID="username-input"
              />
            )}

            <Field
              label={isLogin ? "البريد الإلكتروني أو اسم المستخدم" : "البريد الإلكتروني"}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              icon="mail-outline"
              keyboardType={isLogin ? "default" : "email-address"}
              error={fieldErrors.email}
              ltr
              testID="email-input"
            />

            <Field
              label="كلمة السر"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              icon="lock-closed-outline"
              secureTextEntry
              error={fieldErrors.password}
              hint={!isLogin ? "6 أحرف على الأقل" : undefined}
              ltr
              testID="password-input"
            />

            {isLogin && (
              <Pressable
                onPress={() => router.push("/forgot-password" as any)}
                accessibilityRole="button"
                style={s.forgotBtn}
              >
                <Text style={s.linkText}>نسيت كلمة السر؟</Text>
              </Pressable>
            )}

            <Button
              label={isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
              onPress={handleSubmit}
              loading={loading}
              testID="submit-auth"
            />
          </View>

          <Text style={s.legal}>
            بمتابعتك أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </Text>
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

  closeBtn: { alignSelf: "flex-start", width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  brand: { alignItems: "center", gap: Spacing.sm },
  tagline: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },

  switcher: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  switchTab: {
    flex: 1,
    height: 44,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  switchTabActive: { backgroundColor: c.primary },
  switchText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
  switchTextActive: { color: c.surface },

  form: { gap: Spacing.lg },
  forgotBtn: { alignSelf: "flex-start" },
  linkBtn: { alignSelf: "center", paddingVertical: Spacing.sm },
  linkText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.primary,
    writingDirection: "rtl",
  },
  linkMuted: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textMuted,
    writingDirection: "rtl",
  },
  legal: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 20,
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
  emailText: { fontFamily: Fonts.bold, color: c.navy, writingDirection: "ltr" },
  otpIcon: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  otpRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.sm, direction: "ltr" },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: Radius.input,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    textAlign: "center",
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.navy,
  },
  otpBoxFilled: { borderColor: c.primary, backgroundColor: c.primarySoft },

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
