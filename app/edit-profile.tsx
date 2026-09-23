import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Alert } from "@/lib/alert";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";
import { translateError } from "@/lib/errors";
import Colors, { Spacing } from "@/constants/colors";
import { Header, Button, Field, InfoNote } from "@/components/ui";
import SyrianCityField from "@/components/SyrianCityField";
import {
  SYRIA,
  SYRIAN_PHONE_ERROR,
  SYRIAN_PHONE_PLACEHOLDER,
  isSyrianPhone,
  normalizeSyrianPhone,
} from "@shared/syria";

const c = Colors.light;

type FormErrors = Partial<Record<"fullName" | "phone" | "city" | "address", string>>;

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || "");
    setPhone(user.phone || "");
    setCity(user.city || "");
    setAddress(user.address || "");
  }, [user]);

  function validate(): boolean {
    const next: FormErrors = {};
    if (fullName.trim().length < 2) next.fullName = "الاسم الكامل مطلوب";
    if (!isSyrianPhone(phone)) next.phone = SYRIAN_PHONE_ERROR;
    if (city.trim().length < 2) next.city = "اختر المدينة";
    if (address.trim().length < 5) next.address = "العنوان التفصيلي مطلوب";
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
        phone: normalizeSyrianPhone(phone),
        city: city.trim(),
        address: address.trim(),
        country: SYRIA,
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
            placeholder={SYRIAN_PHONE_PLACEHOLDER}
            icon="call-outline"
            keyboardType="phone-pad"
            error={errors.phone}
            ltr
          />

          {/* التوصيل حالياً داخل سوريا فقط */}
          <Field
            label="الدولة"
            value={SYRIA}
            onChangeText={() => {}}
            icon="flag-outline"
            editable={false}
            hint="التوصيل حالياً داخل سوريا فقط"
          />

          <SyrianCityField
            label="المدينة"
            value={city}
            onChange={(next) => {
              setCity(next);
              setErrors((prev) => ({ ...prev, city: undefined }));
            }}
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  content: { padding: Spacing.screen, paddingBottom: 120, gap: Spacing.lg },

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
});
