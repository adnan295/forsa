import React, { useState } from "react";
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
import { apiRequest } from "@/lib/query-client";

type Step = "email" | "code" | "newPassword" | "done";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSendCode() {
    if (!email.trim()) {
      Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: email.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("code");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("خطأ", error.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndReset() {
    if (!code.trim()) {
      Alert.alert("خطأ", "يرجى إدخال رمز التأكيد");
      return;
    }
    if (step === "code") {
      setStep("newPassword");
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("خطأ", "كلمتا المرور غير متطابقتين");
      return;
    }

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
      Alert.alert("خطأ", error.message || "الرمز غير صحيح أو منتهي الصلاحية");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#7C3AED", "#A855F7", "#EC4899"]} style={styles.gradient}>
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
            <Ionicons name="arrow-forward" size={28} color="rgba(255,255,255,0.8)" />
          </Pressable>

          <View style={styles.logoArea}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={step === "done" ? "checkmark-circle" : "lock-open"}
                size={36}
                color="#fff"
              />
            </View>
            <Text style={styles.logoText}>
              {step === "done" ? "تم بنجاح!" : "استعادة كلمة المرور"}
            </Text>
            <Text style={styles.tagline}>
              {step === "email" && "أدخل بريدك الإلكتروني لإرسال رمز التأكيد"}
              {step === "code" && "أدخل الرمز المكون من 6 أرقام المرسل لبريدك"}
              {step === "newPassword" && "أدخل كلمة المرور الجديدة"}
              {step === "done" && "تم تغيير كلمة المرور بنجاح"}
            </Text>
          </View>

          <View style={styles.form}>
            {step === "email" && (
              <>
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
                  />
                </View>
                <Pressable
                  onPress={handleSendCode}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    loading && { opacity: 0.6 },
                  ]}
                >
                  <View style={styles.submitInner}>
                    {loading ? (
                      <ActivityIndicator color={Colors.light.accent} />
                    ) : (
                      <Text style={styles.submitText}>إرسال رمز التأكيد</Text>
                    )}
                  </View>
                </Pressable>
              </>
            )}

            {step === "code" && (
              <>
                <View style={styles.inputGroup}>
                  <Ionicons name="keypad-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { textAlign: "center", letterSpacing: 8, fontSize: 24 }]}
                    placeholder="------"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <Pressable
                  onPress={handleVerifyAndReset}
                  disabled={loading || code.length < 6}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    (loading || code.length < 6) && { opacity: 0.6 },
                  ]}
                >
                  <View style={styles.submitInner}>
                    <Text style={styles.submitText}>التالي</Text>
                  </View>
                </Pressable>
                <Pressable onPress={handleSendCode} style={styles.resendBtn}>
                  <Text style={styles.resendText}>إعادة إرسال الرمز</Text>
                </Pressable>
              </>
            )}

            {step === "newPassword" && (
              <>
                <View style={styles.inputGroup}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="كلمة المرور الجديدة"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="rgba(255,255,255,0.5)"
                    />
                  </Pressable>
                </View>
                <View style={styles.inputGroup}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="تأكيد كلمة المرور"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
                <Pressable
                  onPress={handleVerifyAndReset}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    loading && { opacity: 0.6 },
                  ]}
                >
                  <View style={styles.submitInner}>
                    {loading ? (
                      <ActivityIndicator color={Colors.light.accent} />
                    ) : (
                      <Text style={styles.submitText}>تغيير كلمة المرور</Text>
                    )}
                  </View>
                </Pressable>
              </>
            )}

            {step === "done" && (
              <Pressable
                onPress={() => router.replace("/auth")}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={styles.submitInner}>
                  <Text style={styles.submitText}>تسجيل الدخول</Text>
                </View>
              </Pressable>
            )}

            {step !== "done" && (
              <Pressable onPress={() => router.back()} style={styles.switchBtn}>
                <Text style={styles.switchText}>
                  العودة لتسجيل الدخول
                </Text>
              </Pressable>
            )}
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
    fontSize: 26,
    color: "#FFFFFF",
    marginBottom: 8,
    writingDirection: "rtl",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    writingDirection: "rtl",
    textAlign: "center",
    lineHeight: 22,
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
  resendBtn: {
    alignItems: "center",
    padding: 8,
  },
  resendText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    writingDirection: "rtl",
    textDecorationLine: "underline",
  },
});
