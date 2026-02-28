import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";

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

interface FormErrors {
  fullName?: string;
  phone?: string;
  city?: string;
  address?: string;
  country?: string;
}

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
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPhone(user.phone || "");
      setCity(user.city || "");
      setAddress(user.address || "");
      setCountry(user.country || "السعودية");
    }
  }, [user]);

  const filteredArabCountries = useMemo(() => {
    if (!countrySearch.trim()) return ARAB_COUNTRIES;
    return ARAB_COUNTRIES.filter((c) => c.includes(countrySearch.trim()));
  }, [countrySearch]);

  const filteredOtherCountries = useMemo(() => {
    if (!countrySearch.trim()) return OTHER_COUNTRIES;
    return OTHER_COUNTRIES.filter((c) => c.includes(countrySearch.trim()));
  }, [countrySearch]);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!fullName.trim()) newErrors.fullName = "الاسم الكامل مطلوب";
    if (!phone.trim()) newErrors.phone = "رقم الهاتف مطلوب";
    if (!city.trim()) newErrors.city = "المدينة مطلوبة";
    if (!address.trim()) newErrors.address = "العنوان التفصيلي مطلوب";
    if (!country.trim()) newErrors.country = "الدولة مطلوبة";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      Alert.alert("تم بنجاح", "تم تحديث بياناتك بنجاح");
      router.back();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err.message || "حدث خطأ أثناء الحفظ";
      Alert.alert("خطأ", msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    } finally {
      setSaving(false);
    }
  }

  function selectCountry(c: string) {
    setCountry(c);
    setCountryModalVisible(false);
    setCountrySearch("");
    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: undefined }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const modalData = useMemo(() => {
    const sections: { key: string; type: "header" | "item"; label: string }[] = [];
    if (filteredArabCountries.length > 0) {
      sections.push({ key: "header-arab", type: "header", label: "الدول العربية" });
      filteredArabCountries.forEach((c) =>
        sections.push({ key: `arab-${c}`, type: "item", label: c })
      );
    }
    if (filteredOtherCountries.length > 0) {
      sections.push({ key: "header-other", type: "header", label: "دول أخرى" });
      filteredOtherCountries.forEach((c) =>
        sections.push({ key: `other-${c}`, type: "item", label: c })
      );
    }
    return sections;
  }, [filteredArabCountries, filteredOtherCountries]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7C3AED", "#A855F7", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>تعديل الملف الشخصي</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={Colors.light.accent} />
              <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
            </View>
            <View style={styles.divider} />

            <Text style={styles.inputLabel}>الاسم الكامل</Text>
            <TextInput
              style={[styles.input, errors.fullName ? styles.inputError : null]}
              placeholder="الاسم الكامل"
              placeholderTextColor={Colors.light.textSecondary}
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
              }}
            />
            {errors.fullName ? (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            ) : null}

            <Text style={styles.inputLabel}>رقم الهاتف</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              placeholder="رقم الهاتف"
              placeholderTextColor={Colors.light.textSecondary}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
              }}
              keyboardType="phone-pad"
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}

            <Text style={styles.inputLabel}>المدينة</Text>
            <TextInput
              style={[styles.input, errors.city ? styles.inputError : null]}
              placeholder="المدينة"
              placeholderTextColor={Colors.light.textSecondary}
              value={city}
              onChangeText={(t) => {
                setCity(t);
                if (errors.city) setErrors((p) => ({ ...p, city: undefined }));
              }}
            />
            {errors.city ? (
              <Text style={styles.errorText}>{errors.city}</Text>
            ) : null}

            <Text style={styles.inputLabel}>العنوان التفصيلي</Text>
            <TextInput
              style={[
                styles.input,
                { minHeight: 80, textAlignVertical: "top" },
                errors.address ? styles.inputError : null,
              ]}
              placeholder="العنوان التفصيلي"
              placeholderTextColor={Colors.light.textSecondary}
              value={address}
              onChangeText={(t) => {
                setAddress(t);
                if (errors.address) setErrors((p) => ({ ...p, address: undefined }));
              }}
              multiline
              numberOfLines={3}
            />
            {errors.address ? (
              <Text style={styles.errorText}>{errors.address}</Text>
            ) : null}

            <Text style={styles.inputLabel}>الدولة</Text>
            <Pressable
              onPress={() => setCountryModalVisible(true)}
              style={[
                styles.input,
                styles.countryPicker,
                errors.country ? styles.inputError : null,
              ]}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={Colors.light.textSecondary}
              />
              <Text
                style={[
                  styles.countryPickerText,
                  !country && { color: Colors.light.textSecondary },
                ]}
              >
                {country || "اختر الدولة"}
              </Text>
            </Pressable>
            {errors.country ? (
              <Text style={styles.errorText}>{errors.country}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              saving && { opacity: 0.6 },
            ]}
          >
            <LinearGradient
              colors={[Colors.light.accent, Colors.light.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>حفظ التغييرات</Text>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={countryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setCountryModalVisible(false);
          setCountrySearch("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                paddingTop: Platform.OS === "web" ? 20 : Math.max(insets.top, 20),
                paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => {
                  setCountryModalVisible(false);
                  setCountrySearch("");
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </Pressable>
              <Text style={styles.modalTitle}>اختر الدولة</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color={Colors.light.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="ابحث عن دولة..."
                placeholderTextColor={Colors.light.textSecondary}
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoFocus={false}
              />
            </View>

            <FlatList
              data={modalData}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                if (item.type === "header") {
                  return (
                    <View style={styles.countryGroupHeader}>
                      <Text style={styles.countryGroupTitle}>{item.label}</Text>
                    </View>
                  );
                }
                const isSelected = country === item.label;
                return (
                  <Pressable
                    onPress={() => selectCountry(item.label)}
                    style={[
                      styles.countryItem,
                      isSelected && styles.countryItemSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={Colors.light.accent}
                      />
                    )}
                    <Text
                      style={[
                        styles.countryItemText,
                        isSelected && { color: Colors.light.accent, fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    writingDirection: "rtl",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 14,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.light.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: Colors.light.danger,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.danger,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 4,
  },
  countryPicker: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  countryPickerText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  saveBtn: {
    borderRadius: 18,
    overflow: "hidden",
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  saveText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(31, 41, 55, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "60%",
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
    textAlign: "center",
    writingDirection: "rtl",
  },
  searchContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: Colors.light.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  countryGroupHeader: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: "#FFFFFF",
  },
  countryGroupTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.light.accent,
    textAlign: "right",
    writingDirection: "rtl",
  },
  countryItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 10,
  },
  countryItemSelected: {
    backgroundColor: "rgba(124, 58, 237, 0.06)",
  },
  countryItemText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
});
