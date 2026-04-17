import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import CampaignCard from "@/components/CampaignCard";
import { queryClient } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

function RecentPurchaseBanner() {
  const { isDark } = useTheme();
  const { data: purchases } = useQuery<{ campaignTitle: string; minutesAgo: number }[]>({
    queryKey: ["/api/recent-purchases"],
    staleTime: 60000,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: (1 - opacity.value) * 16 }],
  }));

  useEffect(() => {
    if (!purchases || purchases.length === 0) return;
    const showBanner = () => {
      setCurrentIndex((prev) => (prev + 1) % purchases.length);
      setVisible(true);
      opacity.value = withTiming(1, { duration: 400 });
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 400 });
        setTimeout(() => setVisible(false), 500);
      }, 5000);
    };
    const initialTimer = setTimeout(showBanner, 5000);
    const interval = setInterval(showBanner, 30000);
    return () => { clearTimeout(initialTimer); clearInterval(interval); };
  }, [purchases]);

  if (!purchases || purchases.length === 0 || !visible) return null;
  const item = purchases[currentIndex % purchases.length];

  return (
    <Animated.View style={[proofStyles.container, animatedStyle]}>
      <View style={proofStyles.banner}>
        <View style={proofStyles.iconWrap}>
          <Ionicons name="bag-check" size={14} color="#10B981" />
        </View>
        <Text style={proofStyles.text} numberOfLines={1}>
          مستخدم اشترى {item.campaignTitle} منذ {item.minutesAgo > 60 ? `${Math.floor(item.minutesAgo / 60)} ساعة` : `${item.minutesAgo} دقائق`}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { totalItems } = useCart();

  const {
    data: campaigns,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 15000,
    staleTime: 10000,
  });
  const unreadCount = unreadData?.count || 0;

  const activeCampaigns = campaigns?.filter((c) => c.status === "active") || [];
  const displayCampaigns = campaigns?.filter((c) => c.status === "active") || [];

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    refetch();
  }, [refetch]);

  function renderHeader() {
    return (
      <View>
        <LinearGradient
          colors={["#0F172A", "#1E293B", "#0F3460"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />
          <View style={styles.decoCircle3} />
          <View style={[styles.goldAccentLine]} />

          <View style={[styles.heroContent, { paddingTop: Platform.OS === "web" ? 67 + 20 : insets.top + 20 }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroButtons}>
                {user && (
                  <Pressable
                    onPress={() => router.push("/notifications" as any)}
                    style={styles.iconBtn}
                    testID="notifications-button"
                  >
                    <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.9)" />
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                      </View>
                    )}
                  </Pressable>
                )}
                <Pressable
                  onPress={() => router.push("/cart" as any)}
                  style={styles.iconBtn}
                  testID="cart-button"
                >
                  <Ionicons name="cart-outline" size={20} color="rgba(255,255,255,0.9)" />
                  {totalItems > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
                    </View>
                  )}
                </Pressable>
                {!user && (
                  <Pressable onPress={() => router.push("/auth")} style={styles.loginBtn}>
                    <Text style={styles.loginText}>دخول</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.greetingArea}>
                <Text style={styles.greeting}>
                  {user ? `أهلاً، ${user.username} 👋` : "أهلاً بك 👋"}
                </Text>
                <View style={styles.brandRow}>
                  <View style={styles.goldDot} />
                  <Text style={styles.heroTitle}>فرصة</Text>
                </View>
              </View>
            </View>

            <Text style={styles.tagline}>اشترِ منتجاتك وفوز بجوائز حقيقية</Text>

            {(campaigns?.length ?? 0) > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{activeCampaigns.length}</Text>
                  <Text style={styles.statLabel}>عرض نشط</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>
                    {activeCampaigns.reduce((s, c) => s + (c.totalQuantity - c.soldQuantity), 0)}
                  </Text>
                  <Text style={styles.statLabel}>تذكرة متبقية</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{campaigns?.filter(c => c.status === "completed").length || 0}</Text>
                  <Text style={styles.statLabel}>فائز سابق</Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={[styles.sectionRow, { backgroundColor: colors.background }]}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{displayCampaigns.length}</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>العروض المتاحة 🔥</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayCampaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.cardPadding}>
            <CampaignCard
              campaign={item}
              index={index}
              onPress={() =>
                router.push({
                  pathname: "/campaign/[id]",
                  params: { id: item.id },
                })
              }
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="sparkles-outline" size={40} color="#D97706" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>لا توجد عروض حالياً</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              ترقّب! حملات وجوائز مذهلة في الطريق إليك
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 + 24 : 104 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#D97706"
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <RecentPurchaseBanner />
    </View>
  );
}

const proofStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 84 + 16 : 96,
    start: 16,
    end: 16,
    alignItems: "center",
    zIndex: 100,
  },
  banner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    maxWidth: 400,
    width: "100%",
    backgroundColor: "rgba(15,23,42,0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 7,
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.3)",
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(16,185,129,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    overflow: "hidden",
    paddingBottom: 32,
  },
  heroContent: {
    paddingHorizontal: 20,
    zIndex: 2,
    gap: 14,
  },
  heroTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingArea: {
    alignItems: "flex-end",
    gap: 4,
  },
  brandRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    marginTop: 2,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    writingDirection: "rtl",
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
    letterSpacing: -1,
  },
  heroButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  badge: {
    position: "absolute",
    top: -5,
    end: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#0F172A",
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#0F172A",
  },
  loginBtn: {
    backgroundColor: "rgba(245,158,11,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
  },
  loginText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FCD34D",
    writingDirection: "rtl",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textAlign: "right",
    writingDirection: "rtl",
  },
  statsRow: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FCD34D",
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    writingDirection: "rtl",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "center",
  },
  decoCircle1: {
    position: "absolute",
    top: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(245,158,11,0.04)",
  },
  decoCircle2: {
    position: "absolute",
    top: 30,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  decoCircle3: {
    position: "absolute",
    bottom: -40,
    left: "40%",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(245,158,11,0.05)",
  },
  goldAccentLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(245,158,11,0.25)",
  },
  sectionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    textAlign: "right",
    writingDirection: "rtl",
  },
  sectionBadge: {
    backgroundColor: "#D97706",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 28,
    alignItems: "center",
  },
  sectionBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  cardPadding: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 70,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(217,119,6,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "center",
    writingDirection: "rtl",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
  },
});
