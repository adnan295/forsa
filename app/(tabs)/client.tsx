import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { translateError } from "@/lib/errors";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Header, Button, Card, Field, InfoNote } from "@/components/ui";

const c = Colors.light;

/** خطوات الشراكة كما تُعرض للتاجر */
const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: "document-text-outline", title: "أرسل طلبك", body: "عبّي البيانات وحدّد المنتج اللي بدك تعرضه" },
  { icon: "call-outline", title: "منتواصل معك", body: "بنراجع الطلب وبنرجعلك خلال يومين عمل" },
  { icon: "pricetags-outline", title: "منعرض منتجك", body: "بنضيف منتجك للمتجر ومنتابع المبيعات معك" },
  { icon: "cash-outline", title: "منحاسبك", body: "بنحوّل مستحقاتك حسب الاتفاق" },
];

type Errors = Partial<Record<"businessName" | "contactName" | "phone" | "productName", string>>;

export default function ClientScreen() {
  const insets = useSafeAreaInsets();

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [productName, setProductName] = useState("");
  const [productValue, setProductValue] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function validate(): boolean {
    const next: Errors = {};
    if (businessName.trim().length < 2) next.businessName = "اسم النشاط التجاري مطلوب";
    if (contactName.trim().length < 2) next.contactName = "اسم المسؤول مطلوب";
    if (phone.trim().length < 7) next.phone = "رقم الهاتف غير صحيح";
    if (productName.trim().length < 2) next.productName = "اسم المنتج مطلوب";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تعذّر الإرسال", translateError(error?.message));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setDone(false);
    setBusinessName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setProductName("");
    setProductValue("");
    setDescription("");
    setErrors({});
  }

  if (done) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="شراكة تجارية" showBack />

        <ScrollView contentContainerStyle={s.doneWrap} showsVerticalScrollIndicator={false}>
          <View style={s.doneIcon}>
            <Ionicons name="checkmark-circle" size={52} color={StatusColors.success.fg} />
          </View>

          <Text style={s.doneTitle}>وصلنا طلبك</Text>
          <Text style={s.doneBody}>
            شكراً لك! فريقنا رح يراجع الطلب ويتواصل معك خلال يومين عمل على الرقم اللي أدخلته.
          </Text>

          <View style={s.doneActions}>
            <Button label="إرسال طلب آخر" variant="secondary" onPress={reset} />
            <Button
              label="رجوع للمتجر"
              icon="storefront-outline"
              onPress={() => router.push("/(tabs)/products" as any)}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="شراكة تجارية" showBack />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ───── تعريف ───── */}
          <View style={s.hero}>
            <View style={s.heroIcon}>
              <Ionicons name="briefcase" size={30} color={c.primary} />
            </View>
            <Text style={s.heroTitle}>اعرض منتجك على فرصة</Text>
            <Text style={s.heroBody}>
              وصّل منتجك لآلاف المتسوّقين — نحن منتولّى العرض والبيع والسحب، وأنت بتتابع النتائج.
            </Text>
          </View>

          {/* ───── الخطوات ───── */}
          <Card title="كيف بتصير الشراكة؟" icon="git-branch-outline">
            {STEPS.map((step, i) => (
              <View key={step.title} style={s.stepRow}>
                <Text style={s.stepNum}>{i + 1}</Text>
                <View style={s.stepText}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepBody}>{step.body}</Text>
                </View>
                <View style={s.stepIcon}>
                  <Ionicons name={step.icon} size={19} color={c.primary} />
                </View>
              </View>
            ))}
          </Card>

          {/* ───── النموذج ───── */}
          <Card title="بيانات الطلب" icon="create-outline">
            <Field
              label="اسم النشاط التجاري *"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="اسم المتجر أو الشركة"
              icon="business-outline"
              error={errors.businessName}
            />

            <Field
              label="اسم المسؤول *"
              value={contactName}
              onChangeText={setContactName}
              placeholder="الاسم الكامل"
              icon="person-outline"
              error={errors.contactName}
            />

            <Field
              label="رقم الهاتف *"
              value={phone}
              onChangeText={setPhone}
              placeholder="05xxxxxxxx"
              icon="call-outline"
              keyboardType="phone-pad"
              error={errors.phone}
              ltr
            />

            <Field
              label="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              hint="اختياري"
              ltr
            />

            <Field
              label="اسم المنتج *"
              value={productName}
              onChangeText={setProductName}
              placeholder="المنتج اللي بدك تعرضه"
              icon="cube-outline"
              error={errors.productName}
            />

            <Field
              label="قيمة المنتج التقريبية ($)"
              value={productValue}
              onChangeText={setProductValue}
              placeholder="مثال: 250"
              icon="pricetag-outline"
              keyboardType="numeric"
              hint="اختياري"
              ltr
            />

            <Field
              label="تفاصيل إضافية"
              value={description}
              onChangeText={setDescription}
              placeholder="أي معلومات بتساعدنا نفهم منتجك أكثر"
              icon="document-text-outline"
              multiline
              hint="اختياري"
            />
          </Card>

          <InfoNote>الحقول المعلّمة بـ * مطلوبة — الباقي بيساعدنا نرجعلك أسرع</InfoNote>
        </ScrollView>

        <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <Button label="إرسال الطلب" onPress={handleSubmit} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  content: { padding: Spacing.screen, paddingBottom: 120, gap: Spacing.md },

  hero: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.navy,
    textAlign: "center",
    writingDirection: "rtl",
  },
  heroBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 23,
  },

  stepRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  stepNum: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.borderSubtle,
    width: 22,
    textAlign: "center",
  },
  stepText: { flex: 1, gap: 2 },
  stepTitle: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  stepBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 19,
  },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.button,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: c.surface,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },

  doneWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  doneIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: StatusColors.success.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.navy,
    textAlign: "center",
    writingDirection: "rtl",
  },
  doneBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 23,
  },
  doneActions: { alignSelf: "stretch", gap: Spacing.md, marginTop: Spacing.sm },
});
