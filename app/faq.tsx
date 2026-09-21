import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable } from "react-native";
import { router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors, { Fonts, FontSize, Radius, Sizing, Spacing } from "@/constants/colors";
import { Header, Button, Accordion, EmptyState } from "@/components/ui";
import type { CurrentDraw } from "@/components/DrawBanner";

const c = Colors.light;

/** الأسئلة — {price} بتتبدّل بسعر الفرصة الحالي */
const FAQ: { q: string; a: string }[] = [
  {
    q: "كيف أحصل على فرصة؟",
    a: "كل {price}$ من قيمة المنتجات تمنحك فرصة سحب. رسوم التوصيل لا تُحتسب.",
  },
  {
    q: "متى تُؤكَّد قسيمتي؟",
    a: "بعد ما يتأكّد دفع طلبك من الإدارة مباشرة. القسائم تظهر في «قسائمي» بحالة «مؤكدة».",
  },
  {
    q: "كيف أتابع طلبي؟",
    a: "من «حسابي» ← «طلباتي» تشوف حالة كل طلب: قيد التأكيد، قيد التنفيذ، أو تم التسليم.",
  },
  {
    q: "ما شروط السحب؟",
    a: "السحب يتم لما ينباع كامل عدد فرص الجولة. الفائز يُختار عشوائياً من كل القسائم المؤكدة، ويتم التواصل معه لتسليم الجائزة.",
  },
  {
    q: "هل تنتهي صلاحية فرصي؟",
    a: "لا. إذا ما كان في سحب مفتوح وقت الشراء، فرصك تُحفظ وتنضاف تلقائياً لأول سحب يُفتح.",
  },
  {
    q: "ماذا لو رُفض دفعي؟",
    a: "الطلب بيظهر بحالة «دفع مرفوض» مع السبب، وأي رصيد استُخدم من محفظتك بيرجع لك تلقائياً.",
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    staleTime: 30000,
  });

  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;

  const items = useMemo(() => {
    const priceText = ticketPrice > 0 ? ticketPrice.toFixed(0) : "١٠";
    const resolved = FAQ.map((item) => ({ ...item, a: item.a.replace("{price}", priceText) }));
    const q = search.trim().toLowerCase();
    if (!q) return resolved;
    return resolved.filter(
      (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    );
  }, [search, ticketPrice]);

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="المساعدة" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, Spacing.lg) + 90 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.searchRow}>
          <Ionicons name="search" size={20} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setOpenIndex(null);
            }}
            placeholder="ابحث عن سؤالك"
            placeholderTextColor={c.textMuted}
            style={s.searchInput}
            returnKeyType="search"
            accessibilityLabel="البحث في الأسئلة"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8} accessibilityLabel="مسح البحث">
              <Ionicons name="close-circle" size={19} color={c.textMuted} />
            </Pressable>
          )}
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon="help-circle-outline"
            title="ما لقينا سؤال مطابق"
            body="جرّب كلمة تانية، أو تواصل معنا وبنجاوبك"
          />
        ) : (
          items.map((item, i) => (
            <Accordion
              key={item.q}
              question={item.q}
              answer={item.a}
              expanded={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))
        )}
      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Button
          label="تواصل مع الدعم"
          icon="chatbubble-ellipses-outline"
          onPress={() => router.push({ pathname: "/info", params: { type: "contact" } } as any)}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { padding: Spacing.screen, gap: Spacing.md },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
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
