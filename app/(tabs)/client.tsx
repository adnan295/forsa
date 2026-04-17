import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";

const { width: W } = Dimensions.get("window");

// ─── Step dot ────────────────────────────────────────────────
function StepItem({ num, title, sub }: { num: number; title: string; sub: string }) {
  return (
    <View style={st.stepRow}>
      <View style={st.stepNumBox}>
        <Text style={st.stepNum}>{num}</Text>
      </View>
      <View style={st.stepBody}>
        <Text style={st.stepTitle}>{title}</Text>
        <Text style={st.stepSub}>{sub}</Text>
      </View>
    </View>
  );
}

// ─── Benefit card ─────────────────────────────────────────────
function BenefitCard({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <View style={st.benefitCard}>
      <View style={st.benefitIcon}>
        <Ionicons name={icon as any} size={24} color="#FFD000" />
      </View>
      <Text style={st.benefitTitle}>{title}</Text>
      <Text style={st.benefitSub}>{sub}</Text>
    </View>
  );
}

// ─── Stat box ─────────────────────────────────────────────────
function StatBox({ num, label }: { num: string; label: string }) {
  return (
    <View style={st.statBox}>
      <Text style={st.statNum}>{num}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function ClientScreen() {
  const insets = useSafeAreaInsets();
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [productName, setProductName] = useState("");
  const [productValue, setProductValue] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const checkScale = useSharedValue(0);
  const checkAnim = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  async function handleSubmit() {
    if (!businessName.trim() || !contactName.trim() || !phone.trim() || !productName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تنبيه", "يرجى ملء جميع الحقول المطلوبة (*) قبل الإرسال.");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiRequest("POST", "/api/campaign-requests", {
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        productName: productName.trim(),
        productValue: productValue.trim() || undefined,
        description: description.trim() || undefined,
      });
      setDone(true);
      checkScale.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("خطأ", e?.message || "حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setDone(false);
    setBusinessName(""); setContactName(""); setPhone(""); setEmail("");
    setProductName(""); setProductValue(""); setDescription("");
    checkScale.value = withTiming(0, { duration: 200 });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F8F8F8" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 + 24 : 110 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <LinearGradient
          colors={["#1A1A1A", "#2D2D2D"]}
          style={[st.hero, { paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16 }]}
        >
          <View style={st.heroBadge}>
            <Text style={st.heroBadgeText}>شراكة تجارية</Text>
          </View>
          <Text style={st.heroTitle}>اعرض منتجك{"\n"}على فرصة</Text>
          <Text style={st.heroSub}>
            حوّل منتجك إلى حملة إثارة يتنافس عليها الآلاف — وسوّقه بتكلفة صفر
          </Text>
          <View style={st.statsRow}>
            <StatBox num="+500" label="مشترك نشط" />
            <View style={st.statsDivider} />
            <StatBox num="+30" label="حملة ناجحة" />
            <View style={st.statsDivider} />
            <StatBox num="$0" label="تكلفة التسويق" />
          </View>
        </LinearGradient>

        {/* Benefits */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>لماذا فرصة؟</Text>
          <View style={st.benefitsGrid}>
            <BenefitCard icon="megaphone" title="تسويق مجاني" sub="حملتك تصل لآلاف المشترين بدون تكلفة إعلانية" />
            <BenefitCard icon="flash" title="مبيعات فورية" sub="التذاكر تُباع بسرعة كبيرة عبر مجتمعنا النشط" />
            <BenefitCard icon="shield-checkmark" title="ضمان الدفع" sub="تستلم قيمة منتجك كاملاً قبل إجراء السحب" />
            <BenefitCard icon="trending-up" title="تعزيز البراند" sub="ظهور واسع لمنتجك ومتجرك أمام جمهور متحمس" />
          </View>
        </View>

        {/* How it works */}
        <View style={[st.section, { backgroundColor: "#fff", borderRadius: 20, marginHorizontal: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }]}>
          <Text style={st.sectionTitle}>كيف يعمل؟</Text>
          <StepItem num={1} title="أرسل طلبك" sub="أرسل تفاصيل منتجك من خلال النموذج أدناه" />
          <View style={st.stepLine} />
          <StepItem num={2} title="نراجع الطلب" sub="فريقنا يتواصل معك خلال 24 ساعة لتأكيد التفاصيل" />
          <View style={st.stepLine} />
          <StepItem num={3} title="نطلق الحملة" sub="نصوّر المنتج ونبني الحملة ونطلقها أمام مجتمعنا" />
          <View style={st.stepLine} />
          <StepItem num={4} title="تستلم قيمتك" sub="تستلم قيمة المنتج بعد اكتمال الحملة والسحب" />
        </View>

        {/* Form */}
        {done ? (
          <View style={st.successBox}>
            <Animated.View style={[st.successIcon, checkAnim]}>
              <Ionicons name="checkmark-circle" size={72} color="#10B981" />
            </Animated.View>
            <Text style={st.successTitle}>تم إرسال طلبك!</Text>
            <Text style={st.successSub}>
              سيتواصل معك فريقنا على رقم الهاتف المسجل خلال 24 ساعة عمل.
            </Text>
            <Pressable style={st.newBtn} onPress={reset}>
              <Text style={st.newBtnText}>إرسال طلب آخر</Text>
            </Pressable>
          </View>
        ) : (
          <View style={st.formBox}>
            <Text style={st.formTitle}>أرسل طلبك الآن</Text>
            <Text style={st.formSub}>الحقول المميزة بـ * إلزامية</Text>

            <Field label="اسم النشاط التجاري *" placeholder="مثال: متجر الأناقة" value={businessName} onChangeText={setBusinessName} />
            <Field label="الاسم الكامل *" placeholder="اسمك الكامل" value={contactName} onChangeText={setContactName} />
            <Field label="رقم الهاتف *" placeholder="+963 9XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="البريد الإلكتروني" placeholder="اختياري" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Field label="اسم المنتج *" placeholder="مثال: iPhone 15 Pro Max" value={productName} onChangeText={setProductName} />
            <Field label="قيمة المنتج (USD)" placeholder="مثال: 1200" value={productValue} onChangeText={setProductValue} keyboardType="numeric" />
            <Field label="تفاصيل إضافية" placeholder="صف منتجك وأي تفاصيل تريد مشاركتها..." value={description} onChangeText={setDescription} multiline lines={4} />

            <Pressable
              style={[st.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#1A1A1A" />
                  <Text style={st.submitText}>إرسال الطلب</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, placeholder, value, onChangeText, keyboardType = "default", multiline = false, lines = 1,
}: {
  label: string; placeholder: string; value: string;
  onChangeText: (t: string) => void; keyboardType?: any; multiline?: boolean; lines?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={st.field}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        style={[st.input, focused && st.inputFocused, multiline && { height: lines * 44, textAlignVertical: "top", paddingTop: 12 }]}
        placeholder={placeholder}
        placeholderTextColor="#C0C0C0"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        textAlign="right"
        multiline={multiline}
        numberOfLines={multiline ? lines : 1}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  heroBadge: {
    alignSelf: "flex-end", backgroundColor: "rgba(255,208,0,0.15)",
    borderWidth: 1, borderColor: "#FFD000",
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 16,
  },
  heroBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#FFD000" },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff", textAlign: "right", lineHeight: 38, marginBottom: 10 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 15, color: "rgba(255,255,255,0.65)", textAlign: "right", lineHeight: 22, marginBottom: 24, writingDirection: "rtl" },
  statsRow: { flexDirection: "row-reverse", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 },
  statBox: { alignItems: "center", gap: 4 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#FFD000" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  statsDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)" },

  section: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 19, color: "#1A1A1A", textAlign: "right", marginBottom: 16, writingDirection: "rtl" },

  benefitsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12 },
  benefitCard: {
    width: (W - 32 - 12) / 2,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    alignItems: "flex-end", gap: 8,
  },
  benefitIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFF9E0", alignItems: "center", justifyContent: "center" },
  benefitTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#1A1A1A", textAlign: "right", writingDirection: "rtl" },
  benefitSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#888", textAlign: "right", lineHeight: 17, writingDirection: "rtl" },

  stepRow: { flexDirection: "row-reverse", gap: 14, alignItems: "flex-start" },
  stepNumBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFD000", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNum: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#1A1A1A" },
  stepBody: { flex: 1, alignItems: "flex-end" },
  stepTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#1A1A1A", textAlign: "right", writingDirection: "rtl" },
  stepSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#888", textAlign: "right", lineHeight: 17, marginTop: 2, writingDirection: "rtl" },
  stepLine: { height: 20, width: 1, backgroundColor: "#E5E7EB", marginStart: 16, marginVertical: 4 },

  formBox: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  formTitle: { fontFamily: "Inter_700Bold", fontSize: 19, color: "#1A1A1A", textAlign: "right", marginBottom: 4, writingDirection: "rtl" },
  formSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#888", textAlign: "right", marginBottom: 20, writingDirection: "rtl" },

  field: { marginBottom: 14 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#444", textAlign: "right", marginBottom: 6, writingDirection: "rtl" },
  input: {
    backgroundColor: "#F8F8F8", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#EBEBEB",
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Inter_400Regular", fontSize: 14, color: "#1A1A1A",
    minHeight: 48,
  },
  inputFocused: { borderColor: "#FFD000", backgroundColor: "#FFFDF0" },

  submitBtn: {
    backgroundColor: "#FFD000", borderRadius: 14,
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, marginTop: 8,
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#1A1A1A" },

  successBox: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: "#fff", borderRadius: 20, padding: 32,
    alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  successIcon: {},
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#1A1A1A", textAlign: "center" },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, writingDirection: "rtl" },
  newBtn: { backgroundColor: "#FFD000", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  newBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#1A1A1A" },
});
