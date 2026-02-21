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

  function getStatusColor() {
    if (isCompleted) return Colors.light.success;
    if (isSoldOut) return Colors.light.warning;
    return Colors.light.accent;
  }

  function getStatusText() {
    if (isCompleted) return "مكتمل";
    if (campaign.status === "drawing") return "جاري السحب...";
    if (isSoldOut) return "نفذت الكمية";
    return "نشط";
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
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
              colors={["#1A2D4A", "#0F1C30", "#0A1628"]}
              style={styles.imagePlaceholder}
            >
              <Ionicons name="gift" size={44} color={Colors.light.accent} />
            </LinearGradient>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {campaign.title}
          </Text>

          <View style={styles.prizeRow}>
            <Ionicons name="trophy" size={14} color={Colors.light.accent} />
            <Text style={styles.prizeText} numberOfLines={1}>
              {campaign.prizeName}
            </Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progress * 100, 100)}%`,
                    backgroundColor: getStatusColor(),
                  },
                ]}
              />
            </View>
            <View style={styles.progressInfo}>
              <Text style={styles.soldText}>
                {campaign.soldQuantity}/{campaign.totalQuantity} مباع
              </Text>
              {!isCompleted && !isSoldOut && (
                <Text style={styles.remainingText}>{remaining} متبقي</Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.price}>
              ${parseFloat(campaign.productPrice).toFixed(2)}
            </Text>
            {!isCompleted && !isSoldOut && (
              <View style={styles.buyHint}>
                <Text style={styles.buyHintText}>اشترِ الآن</Text>
                <Ionicons name="arrow-back" size={14} color={Colors.light.accent} />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageArea: {
    height: 160,
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
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
  content: {
    padding: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 6,
    textAlign: "right",
    writingDirection: "rtl",
  },
  prizeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
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
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.progressBg,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  soldText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  remainingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.accent,
    writingDirection: "rtl",
  },
  footer: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
    writingDirection: "rtl",
  },
  buyHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  buyHintText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.accent,
    writingDirection: "rtl",
  },
});
