import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { buildMediaUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import type { Campaign } from "@shared/schema";

function useCountdown(endsAt: string | Date | null | undefined) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
  useEffect(() => {
    if (!endsAt) return;
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      };
    };
    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return timeLeft;
}

interface Props {
  campaign: Campaign;
  onPress: () => void;
  index?: number;
}

export default function CampaignCard({ campaign, onPress, index = 0 }: Props) {
  const { isDark, colors } = useTheme();
  const scale = useSharedValue(1);
  const entranceOpacity = useSharedValue(0);
  const entranceTranslateY = useSharedValue(24);
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(campaign.id);
  const countdown = useCountdown(campaign.endsAt);
  const flashCountdown = useCountdown((campaign as any).flashSaleEndsAt);
  const isActiveFlashSale = !!(campaign as any).isFlashSale && !flashCountdown.expired;

  useEffect(() => {
    const delay = Math.min(index * 70, 350);
    entranceOpacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    entranceTranslateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: entranceTranslateY.value }],
    opacity: entranceOpacity.value,
  }));

  const progress = campaign.totalQuantity > 0 ? campaign.soldQuantity / campaign.totalQuantity : 0;
  const isCompleted = campaign.status === "completed";
  const isSoldOut = campaign.status === "sold_out" || campaign.status === "drawing";
  const progressPercent = Math.round(progress * 100);

  function getStatusColor() {
    if (isCompleted) return colors.success;
    if (isSoldOut) return colors.warning;
    if (isActiveFlashSale) return "#EF4444";
    return colors.accent;
  }

  function getStatusText() {
    if (isCompleted) return "مكتمل";
    if (campaign.status === "drawing") return "جاري الاختيار";
    if (isSoldOut) return "نفذت الكمية";
    if (isActiveFlashSale) return "عرض محدود";
    return "نشط";
  }

  function getStatusIcon(): keyof typeof Ionicons.glyphMap {
    if (isCompleted) return "checkmark-circle";
    if (campaign.status === "drawing") return "dice";
    if (isSoldOut) return "alert-circle";
    if (isActiveFlashSale) return "flash";
    return "radio-button-on";
  }

  function getCtaText() {
    if (isCompleted) return "عرض النتائج";
    if (isSoldOut) return "عرض التفاصيل";
    return "اشترِ الآن";
  }

  const progressColor: [string, string] = isCompleted
    ? [colors.success, "#059669"]
    : isSoldOut
    ? [colors.warning, "#D97706"]
    : [colors.accent, colors.accentPink];

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        <View style={styles.imageArea}>
          {campaign.imageUrl ? (
            <Image
              source={{ uri: buildMediaUrl(campaign.imageUrl)! }}
              style={styles.campaignImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={["#7C3AED", "#A855F7", "#C084FC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imagePlaceholder}
            >
              <View style={styles.placeholderIcon}>
                <Ionicons name="gift" size={36} color="#fff" />
              </View>
              <View style={[styles.patternCircle, { top: -20, right: -20, width: 80, height: 80 }]} />
              <View style={[styles.patternCircle, { bottom: -30, left: -10, width: 60, height: 60 }]} />
            </LinearGradient>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)"]}
            style={styles.imageOverlay}
          />
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            <Ionicons name={getStatusIcon()} size={11} color="#fff" />
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavorite(campaign.id);
            }}
            style={styles.favoriteButton}
            hitSlop={8}
          >
            <Ionicons
              name={favorited ? "heart" : "heart-outline"}
              size={20}
              color={favorited ? "#EF4444" : "#fff"}
            />
          </Pressable>
          <View style={styles.priceTag}>
            {isActiveFlashSale && (campaign as any).originalPrice && (
              <Text style={styles.originalPrice}>${parseFloat((campaign as any).originalPrice).toFixed(0)}</Text>
            )}
            <Text style={styles.priceTagValue}>${parseFloat(campaign.productPrice).toFixed(0)}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {campaign.title}
          </Text>
          <View style={styles.prizeRow}>
            <Text style={[styles.prizeText, { color: colors.textSecondary }]} numberOfLines={1}>
              {campaign.prizeName}
            </Text>
            <View style={[styles.prizeIconWrap, { backgroundColor: isDark ? "rgba(167,139,250,0.15)" : "rgba(124,58,237,0.1)" }]}>
              <Ionicons name="trophy" size={14} color={colors.accent} />
            </View>
          </View>
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.soldText, { color: colors.textSecondary }]}>
                {campaign.soldQuantity}/{campaign.totalQuantity}
              </Text>
              <Text style={[styles.progressPercent, { color: getStatusColor() }]}>{progressPercent}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.progressBg }]}>
              <LinearGradient
                colors={progressColor}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]}
              />
            </View>
          </View>

          {isActiveFlashSale && (
            <View style={[styles.countdownRow, { backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" }]}>
              <Text style={styles.countdownLabel2}>ساعة</Text>
              <Text style={styles.countdownNum}>{String(flashCountdown.hours).padStart(2, "0")}</Text>
              <Text style={styles.countdownSep}>:</Text>
              <Text style={styles.countdownNum}>{String(flashCountdown.minutes).padStart(2, "0")}</Text>
              <Text style={styles.countdownSep}>:</Text>
              <Text style={styles.countdownNum}>{String(flashCountdown.seconds).padStart(2, "0")}</Text>
              <Text style={[styles.flashLabel, { color: "#EF4444" }]}>🔥 ينتهي خلال</Text>
            </View>
          )}

          {campaign.endsAt && !isCompleted && !isSoldOut && !countdown.expired && !isActiveFlashSale && (
            <View style={[styles.countdownRow, { backgroundColor: isDark ? "rgba(167,139,250,0.06)" : "rgba(124,58,237,0.05)" }]}>
              <Text style={[styles.countdownLabel2, { color: colors.textSecondary }]}>ث</Text>
              <Text style={[styles.countdownNum, { color: colors.accent }]}>{String(countdown.seconds).padStart(2, "0")}</Text>
              <Text style={[styles.countdownSep, { color: colors.accent }]}>:</Text>
              <Text style={[styles.countdownNum, { color: colors.accent }]}>{String(countdown.minutes).padStart(2, "0")}</Text>
              <Text style={[styles.countdownSep, { color: colors.accent }]}>:</Text>
              <Text style={[styles.countdownNum, { color: colors.accent }]}>{String(countdown.hours).padStart(2, "0")}</Text>
              {countdown.days > 0 && (
                <>
                  <Text style={[styles.countdownSep, { color: colors.accent }]}>:</Text>
                  <Text style={[styles.countdownNum, { color: colors.accent }]}>{countdown.days}</Text>
                  <Text style={[styles.countdownLabel2, { color: colors.textSecondary }]}>يوم</Text>
                </>
              )}
              <Ionicons name="timer-outline" size={14} color={colors.accent} />
            </View>
          )}

          <View style={styles.ctaButton}>
            <LinearGradient
              colors={
                isCompleted
                  ? [colors.success, "#059669"]
                  : isSoldOut
                  ? [colors.warning, "#D97706"]
                  : [colors.accent, colors.accentPink]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons
                name={isCompleted ? "trophy" : isSoldOut ? "eye" : "chevron-back"}
                size={16}
                color="#fff"
              />
              <Text style={styles.ctaText}>{getCtaText()}</Text>
            </LinearGradient>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  imageArea: {
    height: 200,
    position: "relative",
  },
  campaignImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    end: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    start: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  priceTag: {
    position: "absolute",
    bottom: 12,
    start: 12,
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    gap: 4,
    backgroundColor: "rgba(124,58,237,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  originalPrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    textDecorationLine: "line-through",
    marginBottom: 1,
  },
  priceTagValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  content: {
    padding: 16,
    paddingTop: 14,
    gap: 10,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  prizeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  prizeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  prizeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  progressSection: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressPercent: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.light.accent,
  },
  soldText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  progressBar: {
    height: 7,
    backgroundColor: Colors.light.progressBg,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  countdownRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  flashLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    writingDirection: "rtl",
    marginStart: 2,
  },
  countdownNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    minWidth: 22,
    textAlign: "center",
  },
  countdownLabel2: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    writingDirection: "rtl",
  },
  countdownSep: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 2,
  },
  ctaGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
});
