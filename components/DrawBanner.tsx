import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Colors, { Fonts, FontSize, Radius, Spacing } from "@/constants/colors";
import { buildMediaUrl } from "@/lib/query-client";
import { DrawProgress } from "@/components/ui";
import type { Draw } from "@shared/schema";

const c = Colors.light;

export type CurrentDraw = Draw & { participants?: number; myTickets?: number };

interface Props {
  draw: CurrentDraw;
  onPress?: () => void;
  /** نسخة مصغّرة للاستخدام داخل صفحات أخرى */
  compact?: boolean;
  /** إظهار عنوان الجولة الصغير فوق اسم الجائزة */
  showLabel?: boolean;
}

/**
 * بطاقة الجائزة: خلفية كحلية، نص أبيض، صورة واضحة للجائزة،
 * وعدّاد السحب بتعبئة زرقاء.
 */
export default function DrawBanner({ draw, onPress, compact = false, showLabel = true }: Props) {
  const prizeImage = buildMediaUrl(draw.prizeImageUrl);
  const isReady = draw.status === "ready_to_draw";
  const isScheduled = draw.status === "scheduled";

  const label = isReady
    ? "اكتمل العدد — السحب قريباً"
    : isScheduled
    ? "السحب القادم"
    : "تسوّق وادخل";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [s.card, compact && s.cardCompact, pressed && onPress && { opacity: 0.94 }]}
    >
      <View style={s.row}>
        <View style={s.textCol}>
          {showLabel && <Text style={s.label}>{label}</Text>}
          <Text style={[s.heading, compact && s.headingCompact]} numberOfLines={1}>
            السحب
          </Text>
          <Text style={s.prize} numberOfLines={2}>
            الجائزة: {draw.prizeName}
          </Text>
        </View>

        <View style={[s.imageWrap, compact && s.imageWrapCompact]}>
          {prizeImage ? (
            <Image
              source={{ uri: prizeImage }}
              style={s.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View style={s.imageFallback}>
              <Ionicons name="trophy" size={30} color={c.gold} />
            </View>
          )}
        </View>
      </View>

      <DrawProgress sold={draw.soldTickets} target={draw.targetTickets} onNavy />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: c.navy,
    borderRadius: Radius.hero,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  cardCompact: { padding: Spacing.md, gap: Spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  textCol: { flex: 1, gap: Spacing.xs },
  label: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: "rgba(255,255,255,0.75)",
    textAlign: "right",
    writingDirection: "rtl",
  },
  heading: {
    fontFamily: Fonts.bold,
    fontSize: 30,
    color: c.surface,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 40,
  },
  headingCompact: { fontSize: 22, lineHeight: 30 },
  prize: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: "rgba(255,255,255,0.9)",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  imageWrap: {
    width: 104,
    height: 124,
    borderRadius: Radius.card,
    backgroundColor: c.surface,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapCompact: { width: 74, height: 90 },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
});
