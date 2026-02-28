import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

function OTPInput({ value, onChange }: { value: string[]; onChange: (val: string[]) => void }) {
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleChange(text: string, index: number) {
    const newVal = [...value];
    const digit = text.replace(/[^0-9]/g, "");
    newVal[index] = digit.slice(-1);
    onChange(newVal);

    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const newVal = [...value];
      newVal[index - 1] = "";
      onChange(newVal);
    }
  }

  return (
    <View style={otpStyles.row}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <TextInput
          key={i}
          ref={(ref) => { inputs.current[i] = ref; }}
          style={[otpStyles.box, value[i] ? otpStyles.boxFilled : null]}
          value={value[i]}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          testID={`otp-input-${i}`}
        />
      ))}
    </View>
  );
}

const otpStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: 24,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    textAlign: "center",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  boxFilled: {
    borderColor: "#A78BFA",
    backgroundColor: "rgba(167, 139, 250, 0.15)",
  },
});

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, verifyEmail, resendVerification } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول");
      return;
    }
    if (!isLogin && !email.trim()) {
      Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(username.trim(), password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        const result = await register(username.trim(), email.trim(), password);
        if (result.requiresVerification) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setVerificationEmail(result.email);
          setVerificationStep(true);
          setResendTimer(60);
        }
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error?.message || "حدث خطأ ما";
      Alert.alert("خطأ", msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    const code = otpDigits.join("");
    if (code.length !== 6) {
      Alert.alert("خطأ", "يرجى إدخال الرمز كاملاً");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(verificationEmail, code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error?.message || "الرمز غير صحيح";
      Alert.alert("خطأ", msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
      setOtpDigits(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    try {
      await resendVerification(verificationEmail);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResendTimer(60);
      Alert.alert("تم", "تم إرسال رمز تحقق جديد");
    } catch (error: any) {
      Alert.alert("خطأ", "تعذّر إعادة الإرسال، حاول لاحقاً");
    }
  }

  if (verificationStep) {
    return (
      <LinearGradient colors={["#7C3AED", "#6D28D9", "#5B21B6"]} style={styles.gradient}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[
              styles.container,
              {
                paddingTop: Platform.OS === "web" ? 67 + 40 : insets.top + 40,
                paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={() => { setVerificationStep(false); setOtpDigits(["", "", "", "", "", ""]); }} style={styles.backBtn}>
              <Ionicons name="arrow-forward" size={28} color="rgba(255,255,255,0.8)" />
            </Pressable>

            <View style={styles.logoArea}>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
                <Ionicons name="mail" size={36} color="#10B981" />
              </View>
              <Text style={styles.logoText}>تحقق من بريدك</Text>
              <Text style={styles.tagline}>
                أرسلنا رمز تحقق مكوّن من 6 أرقام إلى
              </Text>
              <Text style={[styles.tagline, { color: "#A78BFA", fontFamily: "Inter_600SemiBold", marginTop: 4 }]}>
                {verificationEmail}
              </Text>
            </View>

            <View style={styles.form}>
              <OTPInput value={otpDigits} onChange={setOtpDigits} />

              <Pressable
                onPress={handleVerify}
                disabled={loading || otpDigits.join("").length !== 6}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  (loading || otpDigits.join("").length !== 6) && { opacity: 0.6 },
                ]}
                testID="verify-button"
              >
                <View style={styles.submitInner}>
                  {loading ? (
                    <ActivityIndicator color={Colors.light.accent} />
                  ) : (
                    <Text style={styles.submitText}>تحقق</Text>
                  )}
                </View>
              </Pressable>

              <View style={styles.resendRow}>
                <Text style={styles.resendLabel}>لم يصلك الرمز؟</Text>
                <Pressable onPress={handleResend} disabled={resendTimer > 0}>
                  <Text style={[styles.resendBtn, resendTimer > 0 && { opacity: 0.4 }]}>
                    {resendTimer > 0 ? `إعادة الإرسال (${resendTimer}ث)` : "إعادة الإرسال"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#7C3AED", "#6D28D9", "#5B21B6"]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: Platform.OS === "web" ? 67 + 40 : insets.top + 40,
              paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="rgba(255,255,255,0.8)" />
          </Pressable>

          <View style={styles.logoArea}>
            <View style={styles.iconCircle}>
              <Ionicons name="diamond" size={36} color="#fff" />
            </View>
            <Text style={styles.logoText}>لاكي درو</Text>
            <Text style={styles.tagline}>
              {isLogin ? "أهلاً بعودتك" : "أنشئ حسابك"}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="اسم المستخدم"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                testID="username-input"
              />
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="البريد الإلكتروني"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  testID="email-input"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="كلمة المرور"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                testID="password-input"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.6 },
              ]}
              testID="submit-button"
            >
              <View style={styles.submitInner}>
                {loading ? (
                  <ActivityIndicator color={Colors.light.accent} />
                ) : (
                  <Text style={styles.submitText}>
                    {isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
                  </Text>
                )}
              </View>
            </Pressable>

            {isLogin && (
              <Pressable
                onPress={() => router.push("/forgot-password")}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                setIsLogin(!isLogin);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.switchBtn}
            >
              <Text style={styles.switchText}>
                {isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
                <Text style={styles.switchTextBold}>
                  {isLogin ? "سجّل الآن" : "تسجيل الدخول"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    padding: 8,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
    marginBottom: 8,
    writingDirection: "rtl",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    writingDirection: "rtl",
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#FFFFFF",
    height: 56,
    textAlign: "right",
    writingDirection: "rtl",
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  submitInner: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  submitText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.accent,
    writingDirection: "rtl",
  },
  switchBtn: {
    alignItems: "center",
    marginTop: 8,
    padding: 8,
  },
  switchText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    writingDirection: "rtl",
  },
  switchTextBold: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  forgotBtn: {
    alignItems: "center",
    padding: 4,
  },
  forgotText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    writingDirection: "rtl",
    textDecorationLine: "underline",
  },
  resendRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  resendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    writingDirection: "rtl",
  },
  resendBtn: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#A78BFA",
    writingDirection: "rtl",
  },
});
