import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
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
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import CampaignCard from "@/components/CampaignCard";
import { queryClient, buildMediaUrl } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

const { width: SCREEN_W } = Dimensions.get("window");

function RecentPurchaseBanner() {
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
    const t = setTimeout(showBanner, 5000);
    const id = setInterval(showBanner, 30000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [purchases]);
  if (!purchases || purchases.length === 0 || !visible) return null;
  const item = purchases[currentIndex % purchases.length];
  return (
    <Animated.View style={[proof.container, animatedStyle]}>
      <View style={proof.banner}>
        <Ionicons name="bag-check" size={14} color="#10B981" />
        <Text style={proof.text} numberOfLines={1}>
          مستخدم اشترى {item.campaignTitle} منذ {item.minutesAgo > 60 ? `${Math.floor(item.minutesAgo / 60)} ساعة` : `${item.minutesAgo} دقائق`}
        </Text>
      </View>
    </Animated.View>
  );
}

function FeaturedCard({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const remaining = campaign.totalQuantity - campaign.soldQuantity;
  const progress = campaign.totalQuantity > 0 ? campaign.soldQuantity / campaign.totalQuantity : 0;

  return (
    <Animated.View style={[animStyle, { width: SCREEN_W * 0.72, marginEnd: 12 }]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        style={feat.card}
      >
        <View style={feat.imgWrap}>
          {campaign.imageUrl ? (
            <Image
              source={{ uri: buildMediaUrl(campaign.imageUrl)! }}
              style={feat.img}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={["#7C3AED", "#A855F7", "#EC4899"]}
              style={feat.img}
            />
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={feat.imgOverlay}
          />
          <View style={feat.priceBadge}>
            <Text style={feat.priceText}>${parseFloat(campaign.productPrice).toFixed(0)}</Text>
          </View>
        </View>
        <View style={feat.body}>
          <Text style={feat.title} numberOfLines={1}>{campaign.title}</Text>
          <View style={feat.prizeRow}>
            <Ionicons name="trophy" size={12} color="#D97706" />
            <Text style={feat.prizeText} numberOfLines={1}>{campaign.prizeName}</Text>
          </View>
          <View style={feat.progressBar}>
            <View style={[feat.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
          <Text style={feat.remaining}>{remaining} تذكرة متبقية</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { totalItems } = useCart();

  const { data: campaigns, isLoading, refetch, isRefetching } = useQuery<Campaign[]>({
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
  const featuredCampaigns = activeCampaigns.slice(0, 6);
  const allActive = activeCampaigns;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    refetch();
  }, [refetch]);

  function renderHeader() {
    return (
      <View style={{ backgroundColor: colors.background }}>
        {/* ── Top Bar ── */}
        <View
          style={[
            hdr.topBar,
            {
              paddingTop: Platform.OS === "web" ? 67 : insets.top,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={hdr.topLeft}>
            <Pressable
              onPress={() => router.push("/cart" as any)}
              style={[hdr.iconBtn, { backgroundColor: isDark ? colors.card : "#F1F5F9" }]}
              testID="cart-button"
            >
              <Ionicons name="cart-outline" size={22} color={colors.text} />
              {totalItems > 0 && (
                <View style={hdr.badge}>
                  <Text style={hdr.badgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
                </View>
              )}
            </Pressable>
            {user && (
              <Pressable
                onPress={() => router.push("/notifications" as any)}
                style={[hdr.iconBtn, { backgroundColor: isDark ? colors.card : "#F1F5F9" }]}
                testID="notifications-button"
              >
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                {unreadCount > 0 && (
                  <View style={hdr.badge}>
                    <Text style={hdr.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
          <View style={hdr.topRight}>
            {user ? (
              <View style={hdr.userRow}>
                <Text style={[hdr.userName, { color: colors.text }]}>{user.username}</Text>
                <Text style={[hdr.greeting, { color: colors.textSecondary }]}>أهلاً،</Text>
              </View>
            ) : (
              <Pressable onPress={() => router.push("/auth")} style={hdr.loginBtn}>
                <Text style={hdr.loginText}>دخول</Text>
              </Pressable>
            )}
            <View style={hdr.logoBox}>
              <Text style={hdr.logoText}>ف</Text>
            </View>
          </View>
        </View>

        {/* ── Promo Banner ── */}
        <LinearGradient
          colors={isDark ? ["#1a0b3b", "#2d1065", "#1a0b3b"] : ["#6D28D9", "#7C3AED", "#9333EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={hdr.promoBanner}
        >
          <View style={hdr.promoLeft}>
            <Text style={hdr.promoSmall}>عروض حصرية</Text>
            <Text style={hdr.promoBig}>اشترِ وفوز</Text>
            <Text style={hdr.promoSub}>بجوائز حقيقية كل يوم</Text>
          </View>
          <View style={hdr.promoRight}>
            <View style={hdr.statCard}>
              <Text style={hdr.statNum}>{activeCampaigns.length}</Text>
              <Text style={hdr.statLbl}>عرض</Text>
            </View>
            <View style={[hdr.statCard, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <Text style={hdr.statNum}>
                {activeCampaigns.reduce((s, c) => s + (c.totalQuantity - c.soldQuantity), 0)}
              </Text>
              <Text style={hdr.statLbl}>تذكرة</Text>
            </View>
          </View>
          <View style={hdr.promoDeco1} />
          <View style={hdr.promoDeco2} />
        </LinearGradient>

        {/* ── Featured Campaigns ── */}
        {featuredCampaigns.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <View style={[hdr.sectionRow, { backgroundColor: colors.background }]}>
              <Text style={[hdr.sectionTitle, { color: colors.text }]}>أبرز العروض ✨</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 8,
                flexDirection: "row-reverse",
              }}
            >
              {featuredCampaigns.map((c) => (
                <FeaturedCard
                  key={c.id}
                  campaign={c}
                  onPress={() => router.push({ pathname: "/campaign/[id]", params: { id: c.id } })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── All Campaigns Header ── */}
        <View style={[hdr.allRow, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[hdr.countPill, { backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "rgba(109,40,217,0.1)" }]}>
            <Text style={hdr.countText}>{allActive.length}</Text>
          </View>
          <Text style={[hdr.allTitle, { color: colors.text }]}>جميع العروض</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={allActive}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.cardPad}>
            <CampaignCard
              campaign={item}
              index={index}
              onPress={() => router.push({ pathname: "/campaign/[id]", params: { id: item.id } })}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? "rgba(124,58,237,0.12)" : "rgba(109,40,217,0.07)" }]}>
              <Ionicons name="sparkles-outline" size={38} color="#7C3AED" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>لا توجد عروض حالياً</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>ترقّب! حملات وجوائز مذهلة في الطريق</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 + 24 : 104 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#7C3AED" />
        }
        showsVerticalScrollIndicator={false}
      />
      <RecentPurchaseBanner />
    </View>
  );
}

const proof = StyleSheet.create({
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
    backgroundColor: "rgba(15,23,42,0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#fff",
    textAlign: "right",
    writingDirection: "rtl",
  },
});

const feat = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  imgWrap: {
    height: 130,
    position: "relative",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  imgOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  priceBadge: {
    position: "absolute",
    bottom: 8,
    start: 8,
    backgroundColor: "rgba(109,40,217,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  body: {
    padding: 10,
    gap: 5,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#0F172A",
    textAlign: "right",
    writingDirection: "rtl",
  },
  prizeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  prizeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#64748B",
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7C3AED",
    borderRadius: 2,
  },
  remaining: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "right",
    writingDirection: "rtl",
  },
});

const hdr = StyleSheet.create({
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#fff",
  },
  userRow: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: 4,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  userName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  loginBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  loginText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    end: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
  },
  promoBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    minHeight: 110,
  },
  promoLeft: {
    flex: 1,
    alignItems: "flex-end",
    gap: 3,
  },
  promoSmall: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    writingDirection: "rtl",
    textAlign: "right",
  },
  promoBig: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
    textAlign: "right",
    writingDirection: "rtl",
    letterSpacing: -0.5,
  },
  promoSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "right",
    writingDirection: "rtl",
  },
  promoRight: {
    flexDirection: "row",
    gap: 8,
    marginStart: 16,
  },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 52,
  },
  statNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#fff",
  },
  statLbl: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    writingDirection: "rtl",
  },
  promoDeco1: {
    position: "absolute",
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  promoDeco2: {
    position: "absolute",
    bottom: -40,
    left: "30%",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  sectionRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    textAlign: "right",
    writingDirection: "rtl",
  },
  allRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  allTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    textAlign: "right",
    writingDirection: "rtl",
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#7C3AED",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardPad: { paddingHorizontal: 16 },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
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
