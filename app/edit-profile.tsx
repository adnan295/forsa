import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";
import { translateError } from "@/lib/errors";
import Colors, { Fonts, FontSize, Radius, Sizing, Spacing } from "@/constants/colors";
import { Header, Button, Field, InfoNote } from "@/components/ui";

const c = Colors.light;

const ARAB_COUNTRIES = [
  "السعودية", "الإمارات", "الكويت", "البحرين", "قطر", "عمان",
  "العراق", "مصر", "الأردن", "لبنان", "المغرب", "تونس",
  "الجزائر", "ليبيا", "السودان", "اليمن", "فلسطين", "سوريا",
];

const OTHER_COUNTRIES = [
  "أفغانستان", "ألبانيا", "أندورا", "أنغولا", "أنتيغوا وباربودا", "الأرجنتين",
  "أرمينيا", "أستراليا", "النمسا", "أذربيجان", "الباهاما", "بنغلاديش",
  "باربادوس", "بيلاروسيا", "بلجيكا", "بليز", "بنين", "بوتان",
  "بوليفيا", "البوسنة والهرسك", "بوتسوانا", "البرازيل", "بروناي",
  "بلغاريا", "بوركينا فاسو", "بوروندي", "كمبوديا", "الكاميرون",
  "كندا", "الرأس الأخضر", "تشاد", "تشيلي", "الصين", "كولومبيا",
  "جزر القمر", "الكونغو", "كوستاريكا", "كرواتيا", "كوبا", "قبرص",
  "التشيك", "الدنمارك", "جيبوتي", "دومينيكا", "الدومينيكان",
  "الإكوادور", "السلفادور", "غينيا الاستوائية", "إريتريا", "إستونيا",
  "إثيوبيا", "فيجي", "فنلندا", "فرنسا", "الغابون", "غامبيا",
  "جورجيا", "ألمانيا", "غانا", "اليونان", "غرينادا", "غواتيمالا",
  "غينيا", "غيانا", "هايتي", "هندوراس", "المجر", "آيسلندا",
  "الهند", "إندونيسيا", "إيران", "أيرلندا", "إيطاليا", "جامايكا",
  "اليابان", "كازاخستان", "كينيا", "كوريا الجنوبية", "كوريا الشمالية",
  "لاتفيا", "ليسوتو", "ليبيريا", "ليختنشتاين", "ليتوانيا", "لوكسمبورغ",
  "مدغشقر", "ملاوي", "ماليزيا", "المالديف", "مالي", "مالطا",
  "موريتانيا", "موريشيوس", "المكسيك", "مولدوفا", "موناكو", "منغوليا",
  "الجبل الأسود", "موزمبيق", "ميانمار", "ناميبيا", "نيبال",
  "هولندا", "نيوزيلندا", "نيكاراغوا", "النيجر", "نيجيريا", "النرويج",
  "باكستان", "بنما", "باراغواي", "بيرو", "الفلبين", "بولندا",
  "البرتغال", "رومانيا", "روسيا", "رواندا", "ساموا",
  "السنغال", "صربيا", "سيشل", "سيراليون", "سنغافورة",
  "سلوفاكيا", "سلوفينيا", "جزر سليمان", "الصومال", "جنوب أفريقيا",
  "إسبانيا", "سريلانكا", "سورينام", "سوازيلاند", "السويد",
  "سويسرا", "تايوان", "طاجيكستان", "تنزانيا", "تايلاند",
  "تيمور الشرقية", "توغو", "تونغا", "ترينيداد وتوباغو", "تركيا",
  "تركمانستان", "أوغندا", "أوكرانيا", "المملكة المتحدة",
  "الولايات المتحدة", "أوروغواي", "أوزبكستان", "فانواتو",
  "فنزويلا", "فيتنام", "زامبيا", "زيمبابوي",
];

type FormErrors = Partial<Record<"fullName" | "phone" | "city" | "address" | "country", string>>;

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("السعودية");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || "");
    setPhone(user.phone || "");
    setCity(user.city || "");
    setAddress(user.address || "");
    setCountry(user.country || "السعودية");
  }, [user]);

  const filtered = useMemo(() => {
    const q = countrySearch.trim();
    const match = (name: string) => !q || name.includes(q);
    return {
      arab: ARAB_COUNTRIES.filter(match),
      other: OTHER_COUNTRIES.filter(match),
    };
  }, [countrySearch]);

  function validate(): boolean {
    const next: FormErrors = {};
    if (fullName.trim().length < 2) next.fullName = "الاسم الكامل مطلوب";
    if (phone.trim().length < 8) next.phone = "رقم الهاتف غير صحيح";
    if (city.trim().length < 2) next.city = "المدينة مطلوبة";
    if (address.trim().length < 5) next.address = "العنوان التفصيلي مطلوب";
    if (!country.trim()) next.country = "الدولة مطلوبة";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSaving(true);
    try {
      await apiRequest("PUT", "/api/user/profile", {
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
        country: country.trim(),
      });
      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم الحفظ", "تم تحديث بياناتك", [
        { text: "تمام", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تعذّر الحفظ", translateError(error?.message));
    } finally {
      setSaving(false);
    }
  }

  function pickCountry(name: string) {
    Haptics.selectionAsync();
    setCountry(name);
    setPickerOpen(false);
    setCountrySearch("");
    setErrors((prev) => ({ ...prev, country: undefined }));
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="بياناتي" showBack />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <InfoNote>بياناتك بتُستخدم لتوصيل طلباتك وتسليم الجوائز — خلّيها محدّثة</InfoNote>

          <Field
            label="الاسم الكامل"
            value={fullName}
            onChangeText={setFullName}
            placeholder="الاسم كما في الهوية"
            icon="person-outline"
            error={errors.fullName}
          />

          <Field
            label="رقم الهاتف"
            value={phone}
            onChangeText={setPhone}
            placeholder="05xxxxxxxx"
            icon="call-outline"
            keyboardType="phone-pad"
            error={errors.phone}
            ltr
          />

          {/* الدولة — منتقي بدل حقل حر */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>الدولة</Text>
            <Pressable
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`الدولة: ${country}`}
              style={[s.picker, !!errors.country && s.pickerError]}
            >
              <Ionicons name="chevron-down" size={18} color={c.textMuted} />
              <Text style={s.pickerValue}>{country}</Text>
              <Ionicons name="flag-outline" size={19} color={c.textMuted} />
            </Pressable>
            {errors.country ? <Text style={s.fieldError}>{errors.country}</Text> : null}
          </View>

          <Field
            label="المدينة"
            value={city}
            onChangeText={setCity}
            placeholder="اسم المدينة"
            icon="business-outline"
            error={errors.city}
          />

          <Field
            label="العنوان التفصيلي"
            value={address}
            onChangeText={setAddress}
            placeholder="الحي، الشارع، رقم المبنى"
            icon="location-outline"
            multiline
            error={errors.address}
          />
        </ScrollView>

        <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <Button label="حفظ البيانات" onPress={handleSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>

      {/* ───────── منتقي الدولة ───────── */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHead}>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8} accessibilityLabel="إغلاق">
                <Ionicons name="close" size={24} color={c.navy} />
              </Pressable>
              <Text style={s.modalTitle}>اختر الدولة</Text>
            </View>

            <View style={s.searchRow}>
              <Ionicons name="search" size={19} color={c.textMuted} />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="ابحث عن دولة"
                placeholderTextColor={c.textMuted}
                style={s.searchInput}
                accessibilityLabel="البحث عن دولة"
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalList}>
              {filtered.arab.length > 0 && <Text style={s.groupLabel}>الدول العربية</Text>}
              {filtered.arab.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => pickCountry(name)}
                  accessibilityRole="button"
                  style={[s.countryRow, country === name && s.countryRowActive]}
                >
                  {country === name && <Ionicons name="checkmark" size={18} color={c.primary} />}
                  <Text style={[s.countryText, country === name && s.countryTextActive]}>{name}</Text>
                </Pressable>
              ))}

              {filtered.other.length > 0 && <Text style={s.groupLabel}>باقي الدول</Text>}
              {filtered.other.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => pickCountry(name)}
                  accessibilityRole="button"
                  style={[s.countryRow, country === name && s.countryRowActive]}
                >
                  {country === name && <Ionicons name="checkmark" size={18} color={c.primary} />}
                  <Text style={[s.countryText, country === name && s.countryTextActive]}>{name}</Text>
                </Pressable>
              ))}

              {filtered.arab.length === 0 && filtered.other.length === 0 && (
                <Text style={s.noResult}>ما في دولة بهذا الاسم</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  content: { padding: Spacing.screen, paddingBottom: 120, gap: Spacing.lg },

  field: { gap: 6 },
  fieldLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  fieldError: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: "#B42318",
    textAlign: "right",
    writingDirection: "rtl",
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    height: Sizing.inputHeight,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  pickerError: { borderColor: "#B42318", backgroundColor: "#FEF3F2" },
  pickerValue: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: c.text,
    textAlign: "right",
    writingDirection: "rtl",
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

  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: c.background,
    borderTopStartRadius: Radius.hero,
    borderTopEndRadius: Radius.hero,
    maxHeight: "85%",
    paddingBottom: Spacing.lg,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    writingDirection: "rtl",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: c.surface,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.md,
    height: Sizing.inputHeight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: c.text,
    textAlign: "right",
    writingDirection: "rtl",
    padding: 0,
  },
  modalList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: 4 },
  groupLabel: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.label,
    color: c.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.button,
    backgroundColor: c.surface,
  },
  countryRowActive: { backgroundColor: c.primarySoft },
  countryText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: c.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  countryTextActive: { fontFamily: Fonts.bold, color: c.primary },
  noResult: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    paddingVertical: Spacing.xl,
  },
});
