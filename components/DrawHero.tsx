import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import Colors, { Fonts, Radius, Spacing } from "@/constants/colors";
import { IS_RTL } from "@/lib/rtl";
import { buildMediaUrl } from "@/lib/query-client";
import type { CurrentDraw } from "@/components/DrawBanner";
import { useDesignScale } from "@/lib/design-scale";

const c = Colors.light;

/**
 * الواجهة RTL فتنعكس الصفوف: صورة الجائزة يساراً، والنص في هذه البطاقة
 * يلتصق بجهتها.
 */
const TOWARD_IMAGE = IS_RTL ? "left" : "right";

const formatCount = (n: number) => n.toLocaleString("en-US");

function formatPercent(sold: number, target: number) {
  if (target <= 0) return "0%";
  const pct = Math.min(100, (sold / target) * 100);
  return `${pct.toFixed(1).replace(/\.0$/, "")}%`;
}

interface Props {
  draw: CurrentDraw;
  onPress?: () => void;
}

/** بطاقة الجولة في الرئيسية: الجائزة كبطل، والتقدّم وشروط السحب تحتها. */
export default function DrawHero({ draw, onPress }: Props) {
  const dp = useDesignScale();
  const image = buildMediaUrl(draw.prizeImageUrl);
  const banner = buildMediaUrl(draw.bannerImageUrl);
  const sold = draw.soldTickets;
  const target = draw.targetTickets;
  const fill = target > 0 ? Math.min(1, sold / target) : 0;

  const stage =
    draw.status === "ready_to_draw" ? "اكتمل العدد" :
    draw.status === "scheduled" ? "الجولة القادمة" :
    "الجولة الحالية";

  // صياغة دقيقة: السحب يُجرى من لوحة الإدارة وليس تلقائياً
  const footer =
    draw.status === "ready_to_draw"
      ? "اكتمل العدد — يُجرى السحب قريباً"
      : `يُجرى السحب عند اكتمال ${formatCount(target)} قسيمة`;

  const label = `${stage}: ${draw.prizeName}، ${formatCount(sold)} من ${formatCount(target)} قسيمة`;

  // بانر من تصميم المدير: الصورة كما هي، والعدّاد يُرسم فوقها في مكانه من التصميم
  if (banner) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={label}
        style={({ pressed }) => [s.card, s.bannerCard, pressed && onPress && { opacity: 0.96 }]}
      >
        <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        <LinearGradient
          colors={["rgba(11,33,66,0)", "rgba(11,33,66,0.55)"]}
          style={s.scrim}
          pointerEvents="none"
        />
        <View style={[s.counter, { right: dp(24), bottom: dp(22) }]} pointerEvents="none">
          <View style={s.progressLabels}>
            <Text style={[s.count, s.shadowed]}>
              <Text style={s.countStrong}>{formatCount(sold)}</Text>
              {` من ${formatCount(target)} قسيمة`}
            </Text>
            <Text style={[s.percent, s.shadowed]}>{formatPercent(sold, target)}</Text>
          </View>
          <View style={s.track}>
            {fill > 0 && (
              <LinearGradient
                colors={["#3D8BFF", c.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.fill, { width: `${fill * 100}%` }]}
              />
            )}
          </View>
          <Text style={[s.footerText, s.shadowed, s.remaining]} numberOfLines={1}>
            {draw.status === "ready_to_draw"
              ? "اكتمل العدد — يُجرى السحب قريباً"
              : `متبقي ${formatCount(Math.max(0, target - sold))} قسيمة للسحب`}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
      style={({ pressed }) => [s.card, { minHeight: dp(405) }, pressed && onPress && { opacity: 0.96 }]}
    >
      <LinearGradient
        colors={[c.navy, c.navy, c.navySoft]}
        locations={[0, 0.55, 1]}
        start={{ x: IS_RTL ? 0 : 1, y: 0 }}
        end={{ x: IS_RTL ? 1 : 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.scribble} pointerEvents="none">
        <Text style={s.scribbleText}>{"ممكن تكون أنت\nالفائز!"}</Text>
        <Svg width={64} height={12} viewBox="0 0 96 16" style={s.swoosh}>
          <Path d="M3 12 C 30 3, 62 2, 93 7" stroke={c.gold} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M22 15 C 44 9, 66 9, 86 11" stroke={c.gold} strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
      </View>

      <View style={s.row}>
        <View style={s.content}>
          {/* يبقى بعيداً عن العبارة الذهبية في الزاوية */}
          <View style={s.lead}>
            <View style={s.stagePill}>
              <Text style={s.stageText}>{stage}</Text>
            </View>
            <Text style={s.leadText}>تسوق وادخل السحب على</Text>
          </View>

          <Text style={s.prize} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
            {draw.prizeName}
          </Text>
          {!!draw.prizeDescription && (
            <Text style={s.description} numberOfLines={1}>{draw.prizeDescription}</Text>
          )}

          <View style={s.features}>
            <Feature icon="car-outline" label="شحن لكافة المناطق" />
            <Feature icon="shield-checkmark" label="سحب موثوق وشفاف" />
            <Feature icon="gift" label={`${formatCount(target)} قسيمة`} />
          </View>

          <View style={s.progressLabels}>
            <Text style={s.count}>
              <Text style={s.countStrong}>{formatCount(sold)}</Text>
              {` من ${formatCount(target)} قسيمة`}
            </Text>
            <Text style={s.percent}>{formatPercent(sold, target)}</Text>
          </View>
          <View style={s.track}>
            {fill > 0 && (
              <LinearGradient
                colors={["#3D8BFF", c.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.fill, { width: `${fill * 100}%` }]}
              />
            )}
          </View>

          <View style={s.footer}>
            <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={s.footerText} numberOfLines={1}>{footer}</Text>
          </View>
        </View>

        <View style={[s.imageCol, { width: dp(270) }]}>
          {image ? (
            <Image source={{ uri: image }} style={[s.image, { height: dp(350) }]} contentFit="contain" cachePolicy="memory-disk" transition={200} />
          ) : (
            <Ionicons name="trophy" size={48} color={c.gold} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function Feature({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={s.feature}>
      <Ionicons name={icon} size={10} color={c.gold} />
      <Text style={s.featureText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: Radius.hero,
    overflow: "hidden",
    padding: Spacing.md,
    backgroundColor: c.navy,
  },
  scribble: {
    position: "absolute",
    top: Spacing.sm + 2,
    start: Spacing.md,
    alignItems: "center",
    transform: [{ rotate: IS_RTL ? "-8deg" : "8deg" }],
    zIndex: 1,
  },
  scribbleText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: c.gold,
    textAlign: "center",
    writingDirection: "rtl",
  },
  swoosh: { marginTop: -2 },

  row: { flex: 1, flexDirection: "row", alignItems: "stretch", gap: Spacing.sm },
  content: { flex: 1, alignItems: "flex-end", justifyContent: "space-between", gap: 3 },
  lead: { alignItems: "flex-end", gap: 3, paddingStart: 66 },
  stagePill: {
    backgroundColor: c.primary,
    borderRadius: 7,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  stageText: { fontFamily: Fonts.medium, fontSize: 10, color: c.surface, writingDirection: "rtl" },
  leadText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
    textAlign: TOWARD_IMAGE,
    writingDirection: "rtl",
  },
  prize: {
    alignSelf: "stretch",
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: c.surface,
    textAlign: TOWARD_IMAGE,
  },
  description: {
    alignSelf: "stretch",
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.78)",
    textAlign: TOWARD_IMAGE,
    writingDirection: "rtl",
    marginTop: -3,
  },

  features: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  feature: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 2 },
  featureText: {
    fontFamily: Fonts.medium,
    fontSize: 7.5,
    color: c.surface,
    writingDirection: "rtl",
  },

  progressLabels: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  count: { fontFamily: Fonts.regular, fontSize: 11, color: c.surface, writingDirection: "rtl" },
  countStrong: { fontFamily: Fonts.bold, fontSize: 13 },
  percent: { fontFamily: Fonts.bold, fontSize: 13, color: c.surface, writingDirection: "ltr" },

  // التعبئة تبدأ من جهة الصورة كما في التصميم المعتمد
  track: {
    alignSelf: "stretch",
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
    alignItems: "flex-end",
  },
  fill: { height: "100%", borderRadius: Radius.pill },

  footer: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    flexShrink: 1,
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    writingDirection: "rtl",
  },

  // بانر المدير بنسبة التصميم 800 × 405، والعدّاد على 58% من العرض يمين الأسفل
  bannerCard: { aspectRatio: 800 / 405, padding: 0 },
  scrim: { position: "absolute", start: 0, end: 0, bottom: 0, height: "50%" },
  // صورة المدير ثابتة الاتجاه، فالعدّاد يُثبَّت يميناً وبترتيب RTL على كل المنصات
  counter: { position: "absolute", width: "58%", gap: 6, direction: "rtl" },
  shadowed: {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  remaining: { alignSelf: "stretch", textAlign: "right" },

  // مساحة صورة الجائزة 270 × 350 من تصميم 800 × 405
  imageCol: { alignItems: "center", justifyContent: "center" },
  image: { width: "100%", borderRadius: Radius.card },
});
