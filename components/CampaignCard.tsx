import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

interface Props {
  campaign: Campaign;
  onPress: () => void;
}

export default function CampaignCard({ campaign, onPress }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const progress = campaign.totalQuantity > 0
    ? campaign.soldQuantity / campaign.totalQuantity
    : 0;
  const remaining = campaign.totalQuantity - campaign.soldQuantity;
  const isCompleted = campaign.status === "completed";
  const isSoldOut = campaign.status === "sold_out" || campaign.status === "drawing";
  const progressPercent = Math.round(progress * 100);

  function getStatusColor() {
    if (isCompleted) return Colors.light.success;
    if (isSoldOut) return Colors.light.warning;
    return Colors.light.accent;
  }

  function getStatusText() {
    if (isCompleted) return "مكتمل";
    if (campaign.status === "drawing") return "جاري السحب";
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
        style={styles.card}
      >
        <View style={styles.imageArea}>
          {campaign.imageUrl ? (
            <Image
              source={{ uri: `${getApiUrl()}${campaign.imageUrl}`.replace(/\/+/g, '/').replace(':/', '://') }}
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

          <View style={styles.priceTag}>
            <Text style={styles.priceTagCurrency}>$</Text>
            <Text style={styles.priceTagValue}>
              {parseFloat(campaign.productPrice).toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {campaign.title}
          </Text>

          <View style={styles.prizeRow}>
            <View style={styles.prizeIconWrap}>
              <Ionicons name="trophy" size={13} color={Colors.light.accent} />
            </View>
            <Text style={styles.prizeText} numberOfLines={1}>
              {campaign.prizeName}
            </Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
              <Text style={styles.soldText}>
                {campaign.soldQuantity}/{campaign.totalQuantity}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={
                  isCompleted
                    ? [Colors.light.success, "#059669"]
                    : isSoldOut
                    ? [Colors.light.warning, "#D97706"]
                    : [Colors.light.accent, Colors.light.accentPink]
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

          <View style={styles.footer}>
            {!isCompleted && !isSoldOut ? (
              <View style={styles.remainingWrap}>
                <Ionicons name="time-outline" size={14} color={Colors.light.accent} />
                <Text style={styles.remainingText}>{remaining} متبقي</Text>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.buyHint}>
              <Text style={styles.buyHintText}>
                {isCompleted ? "عرض النتائج" : isSoldOut ? "عرض" : "اشترِ الآن"}
              </Text>
              <Ionicons name="arrow-back" size={14} color={Colors.light.accent} />
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
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  priceTag: {
    position: "absolute",
    bottom: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(124, 58, 237, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  priceTagCurrency: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 1,
    marginRight: 2,
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
});
