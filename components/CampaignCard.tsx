import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
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
    if (isCompleted) return "Completed";
    if (campaign.status === "drawing") return "Drawing...";
    if (isSoldOut) return "Sold Out";
    return "Active";
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
          <LinearGradient
            colors={["#1A2D4A", "#0F1C30", "#0A1628"]}
            style={styles.imagePlaceholder}
          >
            <Ionicons name="gift" size={44} color={Colors.light.accent} />
          </LinearGradient>
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
                {campaign.soldQuantity}/{campaign.totalQuantity} sold
              </Text>
              {!isCompleted && !isSoldOut && (
                <Text style={styles.remainingText}>{remaining} left</Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.price}>
              ${parseFloat(campaign.productPrice).toFixed(2)}
            </Text>
            {!isCompleted && !isSoldOut && (
              <View style={styles.buyHint}>
                <Text style={styles.buyHintText}>Buy Now</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.light.accent} />
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
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 6,
  },
  prizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  prizeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
    flex: 1,
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
    flexDirection: "row",
    justifyContent: "space-between",
  },
  soldText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  remainingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.accent,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
  },
  buyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  buyHintText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.accent,
  },
});
