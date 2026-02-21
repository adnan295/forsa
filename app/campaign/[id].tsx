import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getApiUrl } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const {
    data: campaign,
    isLoading,
  } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", id],
    refetchInterval: 5000,
    staleTime: 3000,
  });


  if (isLoading || !campaign) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  const progress = campaign.totalQuantity > 0
    ? campaign.soldQuantity / campaign.totalQuantity
    : 0;
  const remaining = campaign.totalQuantity - campaign.soldQuantity;
  const isActive = campaign.status === "active";
  const isCompleted = campaign.status === "completed";
  const isSoldOut = campaign.status === "sold_out" || campaign.status === "drawing";
  const totalPrice = (parseFloat(campaign.productPrice) * quantity).toFixed(2);
  const maxQty = Math.min(remaining, 10);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isActive ? 120 : 40 }}
      >
        <View style={styles.heroSection}>
          {campaign.imageUrl ? (
            <Image
              source={{ uri: `${getApiUrl()}${campaign.imageUrl}`.replace(/\/+/g, '/').replace(':/', '://') }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : null}
          <LinearGradient
            colors={campaign.imageUrl ? ["transparent", "rgba(10,22,40,0.7)", "rgba(10,22,40,0.95)"] : ["#0A1628", "#152238", "#1A2D4A"]}
            style={styles.heroOverlay}
          >
            <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              </Pressable>

              <View style={styles.heroCenter}>
                {!campaign.imageUrl && (
                  <Animated.View style={[styles.prizeIcon, pulseStyle]}>
                    <Ionicons name="gift" size={56} color={Colors.light.accent} />
                  </Animated.View>
                )}
                <Text style={styles.heroTitle}>{campaign.title}</Text>
                <View style={styles.prizeBadge}>
                  <Ionicons name="trophy" size={16} color="#FFD700" />
                  <Text style={styles.prizeTitle}>{campaign.prizeName}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>تقدم الحملة</Text>
              <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
              </Text>
            </View>

            <View style={styles.progressBarWrap}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={[Colors.light.accent, Colors.light.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(progress * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatNum}>
                  {campaign.soldQuantity}
                </Text>
                <Text style={styles.progressStatLabel}>مباع</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatNum}>
                  {campaign.totalQuantity}
                </Text>
                <Text style={styles.progressStatLabel}>الإجمالي</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={[styles.progressStatNum, { color: Colors.light.accent }]}>
                  {remaining}
                </Text>
                <Text style={styles.progressStatLabel}>متبقي</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>عن المنتج</Text>
            <Text style={styles.detailText}>{campaign.description}</Text>
          </View>

          {campaign.prizeDescription && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>تفاصيل الجائزة</Text>
              <Text style={styles.detailText}>{campaign.prizeDescription}</Text>
            </View>
          )}

          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>سعر التذكرة</Text>
              <Text style={styles.priceValue}>
                ${parseFloat(campaign.productPrice).toFixed(2)}
              </Text>
            </View>
            <Ionicons name="pricetag" size={28} color={Colors.light.accent} />
          </View>

          {isCompleted && campaign.winnerTicketId && (
            <View style={styles.winnerCard}>
              <LinearGradient
                colors={["#FFD700", "#FFA500"]}
                style={styles.winnerGradient}
              >
                <Ionicons name="trophy" size={32} color="#fff" />
                <Text style={styles.winnerTitle}>تم إعلان الفائز!</Text>
                <Text style={styles.winnerTicket}>
                  التذكرة: {campaign.winnerTicketId}
                </Text>
              </LinearGradient>
            </View>
          )}

          {isSoldOut && (
            <View style={styles.soldOutBanner}>
              <Ionicons name="hourglass" size={24} color={Colors.light.warning} />
              <Text style={styles.soldOutText}>
                نفذت جميع العناصر! السحب سيبدأ قريباً.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {isActive && (
        <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16) }]}>
          <View style={styles.bottomContent}>
            <View>
              <Text style={styles.bottomPrice}>${totalPrice}</Text>
              <Text style={styles.bottomQty}>{quantity} تذكرة</Text>
            </View>
            <Pressable
              onPress={() => {
                if (!user) {
                  router.push("/auth");
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: "/checkout", params: { campaignId: id, quantity: String(quantity) } });
              }}
              style={({ pressed }) => [
                styles.buyButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <LinearGradient
                colors={[Colors.light.accent, Colors.light.accentDark]}
                style={styles.buyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="cart" size={20} color="#fff" />
                <Text style={styles.buyButtonText}>اشترِ الآن</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    position: "relative",
    minHeight: 280,
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    flex: 1,
    paddingBottom: 32,
  },
  backButton: {
    padding: 16,
    alignSelf: "flex-end",
  },
  heroCenter: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  prizeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(212, 168, 83, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  prizeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  prizeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFD700",
  },
  content: {
    padding: 16,
    marginTop: -16,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  progressTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  progressPercent: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.accent,
  },
  progressBarWrap: {
    marginBottom: 16,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: Colors.light.progressBg,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  progressStat: {
    alignItems: "center",
  },
  progressStatNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
  },
  progressStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
    writingDirection: "rtl",
  },
  detailSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "right",
    writingDirection: "rtl",
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    textAlign: "right",
    writingDirection: "rtl",
  },
  priceCard: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  priceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  priceValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.text,
  },
  winnerCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  winnerGradient: {
    padding: 24,
    alignItems: "center",
  },
  winnerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#fff",
    marginTop: 10,
    writingDirection: "rtl",
  },
  winnerTicket: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    writingDirection: "rtl",
  },
  soldOutBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(243, 156, 18, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(243, 156, 18, 0.3)",
    marginBottom: 12,
  },
  soldOutText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.warning,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  bottomContent: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  bottomQty: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  buyButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  buyButtonGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buyButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
});

