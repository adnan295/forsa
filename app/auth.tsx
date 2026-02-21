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
import { useAuth } from "@/lib/auth-context";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      } else {
        await register(username.trim(), email.trim(), password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error?.message || "حدث خطأ ما";
      Alert.alert("خطأ", msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    } finally {
      setLoading(false);
    }
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
});
