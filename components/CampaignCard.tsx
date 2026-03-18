import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
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
import { getApiUrl } from "@/lib/query-client";
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
  const entranceTranslateY = useSharedValue(30);
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(campaign.id);
  const countdown = useCountdown(campaign.endsAt);
  const flashCountdown = useCountdown((campaign as any).flashSaleEndsAt);
  const isActiveFlashSale = !!(campaign as any).isFlashSale && !flashCountdown.expired;

  useEffect(() => {
    const delay = Math.min(index * 80, 400);
    entranceOpacity.value = withDelay(
      delay,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })
    );
    entranceTranslateY.value = withDelay(
      delay,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: entranceTranslateY.value }],
    opacity: entranceOpacity.value,
  }));

  const progress = campaign.totalQuantity > 0
    ? campaign.soldQuantity / campaign.totalQuantity
    : 0;
  const remaining = campaign.totalQuantity - campaign.soldQuantity;
  const isCompleted = campaign.status === "completed";
  const isSoldOut = campaign.status === "sold_out" || campaign.status === "drawing";
  const progressPercent = Math.round(progress * 100);

  function getStatusColor() {
    if (isCompleted) return colors.success;
    if (isSoldOut) return colors.warning;
    return colors.accent;
  }

  function getStatusText() {
    if (isCompleted) return "مكتمل";
    if (campaign.status === "drawing") return "جاري الاختيار";
    if (isSoldOut) return "نفذت الكمية";
    return "نشط";
  }

  function getStatusIcon(): keyof typeof Ionicons.glyphMap {
    if (isCompleted) return "checkmark-circle";
    if (campaign.status === "drawing") return "dice";
    if (isSoldOut) return "alert-circle";
    return "flash";
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        <View style={styles.imageArea}>
          {campaign.imageUrl ? (
            <Image
              source={{ uri: `${getApiUrl()}${campaign.imageUrl}`.replace(/\/+/g, '/').replace(':/', '://') }}
              style={styles.campaignImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={["#7C3AED", "#A855F7", "#C084FC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imagePlaceholder}
            >
              <View style={styles.placeholderIcon}>
                <Ionicons name="gift" size={32} color="#fff" />
              </View>
              <View style={styles.placeholderPattern}>
                <View style={[styles.patternCircle, { top: -20, right: -20, width: 80, height: 80 }]} />
                <View style={[styles.patternCircle, { bottom: -30, left: -10, width: 60, height: 60 }]} />
              </View>
            </LinearGradient>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"]}
            style={styles.imageOverlay}
          />

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Ionicons name={getStatusIcon()} size={11} color="#fff" />
            <Text style={styles.statusText}>{getStatusText()}</Text>
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
              size={22}
              color={favorited ? "#EF4444" : "#fff"}
            />
          </Pressable>

          {isActiveFlashSale && (
            <View style={styles.flashBadge}>
              <Text style={styles.flashBadgeText}>🔥 عرض محدود</Text>
            </View>
          )}

          <View style={styles.priceTag}>
            {isActiveFlashSale && (campaign as any).originalPrice && (
              <Text style={styles.originalPrice}>
                ${parseFloat((campaign as any).originalPrice).toFixed(0)}
              </Text>
            )}
            <Text style={styles.priceTagCurrency}>$</Text>
            <Text style={styles.priceTagValue}>
              {parseFloat(campaign.productPrice).toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {campaign.title}
          </Text>

          <View style={styles.prizeRow}>
            <View style={styles.prizeIconWrap}>
              <Ionicons name="trophy" size={13} color={colors.accent} />
            </View>
            <Text style={[styles.prizeText, { color: colors.textSecondary }]} numberOfLines={1}>
              {campaign.prizeName}
            </Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressPercent, { color: colors.accent }]}>{progressPercent}%</Text>
              <Text style={[styles.soldText, { color: colors.textSecondary }]}>
                {campaign.soldQuantity}/{campaign.totalQuantity}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.progressBg }]}>
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
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress * 100, 100)}%` },
                ]}
              />
            </View>
          </View>

          {isActiveFlashSale && (
            <View style={[styles.countdownRow, { backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }]}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11, color: "#EF4444", writingDirection: "rtl" as const, marginEnd: 4 }}>🔥 ينتهي:</Text>
              <View style={styles.countdownUnit}>
                <Text style={styles.countdownNum}>{String(flashCountdown.hours).padStart(2, "0")}</Text>
                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>ساعة</Text>
              </View>
              <Text style={styles.countdownSep}>:</Text>
              <View style={styles.countdownUnit}>
                <Text style={styles.countdownNum}>{String(flashCountdown.minutes).padStart(2, "0")}</Text>
                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>دقيقة</Text>
              </View>
              <Text style={styles.countdownSep}>:</Text>
              <View style={styles.countdownUnit}>
                <Text style={styles.countdownNum}>{String(flashCountdown.seconds).padStart(2, "0")}</Text>
                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>ثانية</Text>
              </View>
            </View>
          )}

          {campaign.endsAt && !isCompleted && !isSoldOut && !countdown.expired && (
            <View style={styles.countdownRow}>
              <Ionicons name="timer-outline" size={14} color="#EF4444" />
              <View style={styles.countdownUnit}>
                <Text style={styles.countdownNum}>{countdown.days}</Text>
                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>يوم</Text>
              </View>
              <Text style={styles.countdownSep}>:</Text>
              <View style={styles.countdownUnit}>
                <Text style={styles.countdownNum}>{String(countdown.hours).padStart(2, "0")}</Text>
                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>ساعة</Text>
              </View>
              <Text style={styles.countdownSep}>:</Text>
              <View style={styles.countdownUnit}>
                <Text style={styles.countdownNum}>{String(countdown.minutes).padStart(2, "0")}</Text>
                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>دقيقة</Text>
              </View>
              <Text style={styles.countdownSep}>:</Text>
              <View style={styles.countdownUnit}>
                <Text style={styles.countdownNum}>{String(countdown.seconds).padStart(2, "0")}</Text>
                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>ثانية</Text>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            {!isCompleted && !isSoldOut ? (
              <View style={styles.remainingWrap}>
                <Ionicons name="time-outline" size={14} color={colors.accent} />
                <Text style={[styles.remainingText, { color: colors.accent }]}>{remaining} متبقي</Text>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.buyHint}>
              <Text style={[styles.buyHintText, { color: colors.accent }]}>
                {isCompleted ? "عرض النتائج" : isSoldOut ? "عرض" : "اشترِ الآن"}
              </Text>
              <Ionicons name="arrow-back" size={14} color={colors.accent} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  imageArea: {
    height: 180,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  statusBadge: {
    position: "absolute",
    top: 14,
    start: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  favoriteButton: {
    position: "absolute",
    top: 14,
    end: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  flashBadge: {
    position: "absolute",
    bottom: 56,
    start: 14,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  flashBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  priceTag: {
    position: "absolute",
    bottom: 14,
    start: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(124, 58, 237, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  originalPrice: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  priceTagCurrency: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 1,
    marginEnd: 2,
  },
  priceTagValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  content: {
    padding: 16,
    paddingTop: 14,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "right",
    writingDirection: "rtl",
  },
  prizeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  prizeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(124, 58, 237, 0.08)",
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressPercent: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.light.accent,
  },
  soldText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.light.progressBg,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  footer: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  remainingWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  remainingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.accent,
    writingDirection: "rtl",
  },
  buyHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(124, 58, 237, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  buyHintText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.accent,
    writingDirection: "rtl",
  },
  countdownRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.06)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  countdownUnit: {
    alignItems: "center",
    minWidth: 32,
  },
  countdownNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#EF4444",
  },
  countdownLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  countdownSep: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#EF4444",
    marginTop: -6,
  },
});
