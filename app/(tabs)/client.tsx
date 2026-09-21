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
  I18nManager,
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
        <Ionicons name={icon as any} size={24} color="#155EEF" />
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
      style={{ flex: 1, backgroundColor: "#F6F8FC" }}
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
          colors={["#10224D", "#1B3A7A"]}
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
              <Ionicons name="checkmark-circle" size={72} color="#067647" />
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
                <ActivityIndicator color="#10224D" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#10224D" />
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
                textContentType="none"
        style={[st.input, focused && st.inputFocused, multiline && { height: lines * 44, textAlignVertical: "top", paddingTop: 12 }]}
        placeholder={placeholder}
        placeholderTextColor="#D0D5DD"
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
    alignSelf: I18nManager.isRTL ? "flex-start" : "flex-end", backgroundColor: "rgba(255,208,0,0.15)",
    borderWidth: 1, borderColor: "#155EEF",
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 16,
  },
  heroBadgeText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#155EEF" },
  heroTitle: { fontFamily: "Tajawal_700Bold", fontSize: 28, color: "#fff", textAlign: "right", lineHeight: 38, marginBottom: 10 },
  heroSub: { fontFamily: "Tajawal_400Regular", fontSize: 15, color: "rgba(255,255,255,0.65)", textAlign: "right", lineHeight: 22, marginBottom: 24, writingDirection: "rtl" },
  statsRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 },
  statBox: { alignItems: "center", gap: 4 },
  statNum: { fontFamily: "Tajawal_700Bold", fontSize: 22, color: "#155EEF" },
  statLabel: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  statsDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)" },

  section: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8, direction: (I18nManager.isRTL ? "rtl" : "ltr") as "rtl" | "ltr" },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 19, color: "#10224D", textAlign: "right", marginBottom: 16, writingDirection: "rtl" },

  benefitsGrid: { flexDirection: I18nManager.isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 12 },
  benefitCard: {
    width: (W - 32 - 12) / 2,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    alignItems: "flex-start", gap: 8,
  },
  benefitIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFF4D6", alignItems: "center", justifyContent: "center" },
  benefitTitle: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#10224D", textAlign: "right", writingDirection: "rtl" },
  benefitSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#667085", textAlign: "right", lineHeight: 17, writingDirection: "rtl" },

  stepRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepNumBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#155EEF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNum: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#10224D" },
  stepBody: { flex: 1 },
  stepTitle: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#10224D", textAlign: "right", writingDirection: "rtl" },
  stepSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#667085", textAlign: "right", lineHeight: 17, marginTop: 2, writingDirection: "rtl" },
  stepLine: { height: 20, width: 1, backgroundColor: "#EAECF0", marginStart: 16, marginVertical: 4 },

  formBox: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  formTitle: { fontFamily: "Tajawal_700Bold", fontSize: 19, color: "#10224D", textAlign: "right", marginBottom: 4, writingDirection: "rtl" },
  formSub: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: "#667085", textAlign: "right", marginBottom: 20, writingDirection: "rtl" },

  field: { marginBottom: 14 },
  fieldLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#444", textAlign: "right", marginBottom: 6, writingDirection: "rtl" },
  input: {
    backgroundColor: "#F6F8FC", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#EAECF0",
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Tajawal_400Regular", fontSize: 14, color: "#10224D",
    minHeight: 48,
  },
  inputFocused: { borderColor: "#155EEF", backgroundColor: "#FFF4D6" },

  submitBtn: {
    backgroundColor: "#155EEF", borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, marginTop: 8,
  },
  submitText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#10224D" },

  successBox: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: "#fff", borderRadius: 20, padding: 32,
    alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  successIcon: {},
  successTitle: { fontFamily: "Tajawal_700Bold", fontSize: 22, color: "#10224D", textAlign: "center" },
  successSub: { fontFamily: "Tajawal_400Regular", fontSize: 14, color: "#475467", textAlign: "center", lineHeight: 22, writingDirection: "rtl" },
  newBtn: { backgroundColor: "#155EEF", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  newBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#10224D" },
});
