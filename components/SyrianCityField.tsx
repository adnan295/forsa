import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors, { Fonts, FontSize, Radius, Sizing, Spacing, StatusColors } from "@/constants/colors";
import { SYRIAN_CITIES } from "@shared/syria";

const c = Colors.light;

interface Props {
  value: string;
  onChange: (city: string) => void;
  /** يُترك فارغاً عندما تعرض الشاشة عنوانها الخاص */
  label?: string;
  error?: string;
}

/** منتقي المدينة من قائمة المدن السورية مجمّعة حسب المحافظة، مع بحث */
export default function SyrianCityField({ value, onChange, label, error }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim();
    if (!q) return SYRIAN_CITIES;
    return SYRIAN_CITIES.map((g) => ({
      governorate: g.governorate,
      cities: g.governorate.includes(q) ? g.cities : g.cities.filter((city) => city.includes(q)),
    })).filter((g) => g.cities.length > 0);
  }, [query]);

  function pick(city: string) {
    Haptics.selectionAsync();
    onChange(city);
    setOpen(false);
    setQuery("");
  }

  return (
    <View style={s.field}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `المدينة: ${value}` : "اختر المدينة"}
        style={[s.box, !!error && s.boxError]}
      >
        <Ionicons name="business-outline" size={19} color={error ? StatusColors.error.fg : c.textMuted} />
        <Text style={[s.value, !value && s.placeholder]} numberOfLines={1}>
          {value || "اختر المدينة"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.textMuted} />
      </Pressable>
      {!!error && <Text style={s.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.card}>
            <View style={s.head}>
              <Text style={s.title}>اختر المدينة</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="إغلاق">
                <Ionicons name="close" size={24} color={c.navy} />
              </Pressable>
            </View>

            <View style={s.searchRow}>
              <Ionicons name="search" size={19} color={c.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث عن مدينة أو محافظة"
                placeholderTextColor={c.textMuted}
                style={s.searchInput}
                accessibilityLabel="البحث عن مدينة"
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
              {groups.map((g) => (
                <View key={g.governorate} style={s.group}>
                  <Text style={s.groupLabel}>محافظة {g.governorate}</Text>
                  {g.cities.map((city) => {
                    const active = city === value;
                    return (
                      <Pressable
                        key={city}
                        onPress={() => pick(city)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[s.row, active && s.rowActive]}
                      >
                        <Text style={[s.rowText, active && s.rowTextActive]}>{city}</Text>
                        {active && <Ionicons name="checkmark" size={18} color={c.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              {groups.length === 0 && <Text style={s.empty}>ما في مدينة بهالاسم</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  field: { gap: 6 },
  label: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  box: {
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
  boxError: { borderColor: StatusColors.error.fg, backgroundColor: StatusColors.error.bg },
  value: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: c.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  placeholder: { color: c.textMuted },
  error: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: StatusColors.error.fg,
    textAlign: "right",
    writingDirection: "rtl",
  },

  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  card: {
    backgroundColor: c.background,
    borderTopStartRadius: Radius.hero,
    borderTopEndRadius: Radius.hero,
    maxHeight: "85%",
    paddingBottom: Spacing.lg,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title: { fontFamily: Fonts.bold, fontSize: FontSize.h3, color: c.navy, writingDirection: "rtl" },
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
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  group: { gap: 4, marginTop: Spacing.md },
  groupLabel: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.label,
    color: c.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.button,
    backgroundColor: c.surface,
  },
  rowActive: { backgroundColor: c.primarySoft },
  rowText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: c.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  rowTextActive: { fontFamily: Fonts.bold, color: c.primary },
  empty: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    paddingVertical: Spacing.xl,
  },
});
