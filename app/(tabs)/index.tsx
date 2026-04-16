import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Pressable,
  Dimensions,
  ScrollView,
  TextInput,
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
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import CampaignCard from "@/components/CampaignCard";
import { queryClient } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

type CategoryKey = "all" | "electronics" | "fashion" | "beauty" | "accessories" | "other";
type PriceRangeKey = "all" | "under50" | "50to100" | "over100";

const PRICE_RANGE_TABS: { key: PriceRangeKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "under50", label: "أقل من 50$" },
  { key: "50to100", label: "50-100$" },
  { key: "over100", label: "أكثر من 100$" },
];

const CATEGORY_TABS: { key: CategoryKey; label: string; icon: string }[] = [
  { key: "all", label: "الكل", icon: "apps" },
  { key: "electronics", label: "إلكترونيات", icon: "phone-portrait" },
  { key: "fashion", label: "أزياء", icon: "shirt" },
  { key: "beauty", label: "جمال", icon: "sparkles" },
  { key: "accessories", label: "إكسسوارات", icon: "watch" },
  { key: "other", label: "أخرى", icon: "grid" },
];

function RecentPurchaseBanner() {
  const { isDark, colors } = useTheme();
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
      <View style={[proofStyles.banner, { backgroundColor: isDark ? "rgba(55,65,81,0.97)" : "rgba(17,24,39,0.93)" }]}>
        <View style={proofStyles.iconWrap}>
          <Ionicons name="bag-check" size={14} color={colors.success} />
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
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [activePriceRange, setActivePriceRange] = useState<PriceRangeKey>("all");
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

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

  const filteredCampaigns = useMemo(() => {
    let list = campaigns || [];
    if (!showCompleted) list = list.filter(c => c.status === "active");
    if (activeCategory !== "all") list = list.filter(c => (c.category || "other") === activeCategory);
    if (activePriceRange !== "all") {
      list = list.filter(c => {
        const price = parseFloat(c.productPrice) || 0;
        if (isNaN(price)) return true;
        if (activePriceRange === "under50") return price < 50;
        if (activePriceRange === "50to100") return price >= 50 && price <= 100;
        if (activePriceRange === "over100") return price > 100;
        return true;
      });
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.prizeName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [campaigns, showCompleted, activeCategory, activePriceRange, searchText]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    refetch();
  }, [refetch]);

  const hasActiveFilters = activeCategory !== "all" || activePriceRange !== "all" || showCompleted || searchText.trim().length > 0;

  function renderHeader() {
    return (
      <View>
        <LinearGradient
          colors={["#6D28D9", "#8B5CF6", "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <View style={styles.deco3} />

          <View style={[styles.heroContent, { paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16 }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroButtons}>
                {user && (
                  <Pressable
                    onPress={() => router.push("/notifications" as any)}
                    style={styles.iconBtn}
                    testID="notifications-button"
                  >
                    <Ionicons name="notifications-outline" size={20} color="#fff" />
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
                  <Ionicons name="cart-outline" size={20} color="#fff" />
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
                <Text style={styles.heroTitle}>فرصة</Text>
              </View>
            </View>
            <Text style={styles.tagline}>اشترِ واربح جوائز حقيقية</Text>
            {(campaigns?.length ?? 0) > 0 && (
              <View style={styles.statsPills}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillNum}>{campaigns?.filter(c => c.status === "completed").length || 0}</Text>
                  <Text style={styles.statPillLabel}>فائز</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statPill}>
                  <Text style={styles.statPillNum}>
                    {activeCampaigns.reduce((s, c) => s + (c.totalQuantity - c.soldQuantity), 0)}
                  </Text>
                  <Text style={styles.statPillLabel}>تذكرة متبقية</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statPill}>
                  <Text style={styles.statPillNum}>{activeCampaigns.length}</Text>
                  <Text style={styles.statPillLabel}>حملة نشطة</Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>
        <View style={[styles.filtersSection, { backgroundColor: colors.background }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => setSearchText("")} style={{ opacity: searchText.length > 0 ? 1 : 0 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="ابحث عن منتج أو جائزة..."
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              testID="search-input"
            />
            <Ionicons name="search-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.categoryWrap}>
            <Pressable
              onPress={() => {
                setShowPriceFilter(!showPriceFilter);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.filterIconBtn,
                { backgroundColor: colors.card, borderColor: (showPriceFilter || activePriceRange !== "all") ? colors.accent : colors.border },
                (showPriceFilter || activePriceRange !== "all") && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="options"
                size={17}
                color={(showPriceFilter || activePriceRange !== "all") ? "#fff" : colors.textSecondary}
              />
            </Pressable>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORY_TABS.map((cat) => {
                const active = activeCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => {
                      setActiveCategory(cat.key);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.catChip,
                      { backgroundColor: active ? colors.accent : colors.card, borderColor: active ? colors.accent : colors.border },
                    ]}
                  >
                    <Text style={[styles.catChipText, { color: active ? "#fff" : colors.textSecondary }]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          {showPriceFilter && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.priceScroll}
            >
              {PRICE_RANGE_TABS.map((pr) => {
                const active = activePriceRange === pr.key;
                return (
                  <Pressable
                    key={pr.key}
                    onPress={() => {
                      setActivePriceRange(pr.key);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.priceChip,
                      { backgroundColor: active ? colors.accentPink : colors.card, borderColor: active ? colors.accentPink : colors.border },
                    ]}
                  >
                    <Text style={[styles.priceChipText, { color: active ? "#fff" : colors.textSecondary }]}>
                      {pr.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.bottomFilterRow}>
            <View style={styles.resultPill}>
              <Text style={[styles.resultCount, { color: colors.accent }]}>
                {filteredCampaigns.length}
              </Text>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>نتيجة</Text>
            </View>
            <Pressable
              onPress={() => {
                setShowCompleted(!showCompleted);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.completedToggle}
            >
              <Text style={[styles.completedText, { color: showCompleted ? colors.accent : colors.textSecondary }]}>
                عرض المنتهية
              </Text>
              <Ionicons
                name={showCompleted ? "checkbox" : "square-outline"}
                size={17}
                color={showCompleted ? colors.accent : colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.sectionLeft}>
            {hasActiveFilters && (
              <Pressable
                onPress={() => {
                  setSearchText("");
                  setActiveCategory("all");
                  setActivePriceRange("all");
                  setShowCompleted(false);
                  setShowPriceFilter(false);
                }}
                style={[styles.clearBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>مسح</Text>
                <Ionicons name="close" size={13} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {searchText ? "نتائج البحث" : showCompleted ? "جميع الحملات" : "العروض المتاحة 🔥"}
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredCampaigns}
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
            <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(167,139,250,0.12)" : "rgba(124,58,237,0.07)" }]}>
              <Ionicons
                name={searchText ? "search-outline" : "sparkles-outline"}
                size={34}
                color={colors.accent}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchText ? "لا توجد نتائج" : "لا توجد حملات حالياً"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchText
                ? "جرّب كلمات بحث مختلفة أو تصفّح جميع الحملات"
                : "ترقّب! حملات وجوائز مذهلة في الطريق إليك"}
            </Text>
            {hasActiveFilters && (
              <Pressable
                onPress={() => {
                  setSearchText("");
                  setActiveCategory("all");
                  setActivePriceRange("all");
                  setShowCompleted(false);
                  setShowPriceFilter(false);
                }}
                style={[styles.clearAllBtn, { backgroundColor: isDark ? "rgba(167,139,250,0.12)" : "rgba(124,58,237,0.08)" }]}
              >
                <Text style={[styles.clearAllText, { color: colors.accent }]}>مسح الفلاتر</Text>
              </Pressable>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 + 24 : 104 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.accent}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 7,
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
    paddingBottom: 28,
  },
  heroContent: {
    paddingHorizontal: 20,
    zIndex: 2,
    gap: 12,
  },
  heroTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingArea: {
    alignItems: "flex-end",
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    writingDirection: "rtl",
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
    letterSpacing: -0.5,
  },
  heroButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    end: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#7C3AED",
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
  },
  loginBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 13,
  },
  loginText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  tagline: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 4,
  },
  statsPills: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 0,
    marginTop: 4,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statPillNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  statPillLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    writingDirection: "rtl",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
  },
  deco1: {
    position: "absolute",
    top: -50,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  deco2: {
    position: "absolute",
    top: 20,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  deco3: {
    position: "absolute",
    bottom: -30,
    left: "30%",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(236,72,153,0.12)",
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 4,
    gap: 10,
    borderWidth: 1.5,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "right",
    writingDirection: "rtl",
  },
  categoryWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  categoryScroll: {
    flexDirection: "row-reverse",
    gap: 7,
    paddingEnd: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  catChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    writingDirection: "rtl",
  },
  filterIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    flexShrink: 0,
  },
  priceScroll: {
    flexDirection: "row-reverse",
    gap: 7,
  },
  priceChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  priceChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    writingDirection: "rtl",
  },
  bottomFilterRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completedToggle: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  completedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    writingDirection: "rtl",
  },
  resultPill: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: 4,
  },
  resultCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.accent,
  },
  resultLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    writingDirection: "rtl",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "right",
    writingDirection: "rtl",
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    writingDirection: "rtl",
  },
  cardPadding: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    writingDirection: "rtl",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  clearAllBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    writingDirection: "rtl",
  },
});
