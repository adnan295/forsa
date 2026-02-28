import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
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
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import CampaignCard from "@/components/CampaignCard";
import { queryClient } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

type FilterKey = "all" | "active" | "completed";
type CategoryKey = "all" | "electronics" | "fashion" | "beauty" | "accessories" | "other";

const CATEGORY_TABS: { key: CategoryKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "الكل", icon: "grid" },
  { key: "electronics", label: "إلكترونيات", icon: "laptop" },
  { key: "fashion", label: "أزياء", icon: "shirt" },
  { key: "beauty", label: "جمال", icon: "sparkles" },
  { key: "accessories", label: "إكسسوارات", icon: "watch" },
  { key: "other", label: "أخرى", icon: "ellipsis-horizontal" },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;

const BANNERS = [
  {
    id: "1",
    title: "هدايا حصرية",
    subtitle: "اشترِ منتجاتنا واحصل على هدايا قيمة",
    icon: "diamond" as const,
    colors: ["#7C3AED", "#A855F7", "#C084FC"] as [string, string, string],
  },
  {
    id: "2",
    title: "فرصة الفوز الكبرى",
    subtitle: "كل منتج يمنحك فرصة للفوز بالجائزة",
    icon: "trophy" as const,
    colors: ["#EC4899", "#F472B6", "#FBCFE8"] as [string, string, string],
  },
  {
    id: "3",
    title: "عروض محدودة",
    subtitle: "لا تفوت الفرصة - الكمية محدودة",
    icon: "flash" as const,
    colors: ["#6D28D9", "#7C3AED", "#A78BFA"] as [string, string, string],
  },
];

function BannerCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const reversedBanners = useMemo(() => [...BANNERS].reverse(), []);
  const [activeIndex, setActiveIndex] = useState(reversedBanners.length - 1);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (!initialScrollDone.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: (reversedBanners.length - 1) * (BANNER_WIDTH + 12), animated: false });
        initialScrollDone.current = true;
      }, 50);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = activeIndex <= 0 ? reversedBanners.length - 1 : activeIndex - 1;
      scrollRef.current?.scrollTo({ x: nextIndex * (BANNER_WIDTH + 12), animated: true });
      setActiveIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  return (
    <View style={bannerStyles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={BANNER_WIDTH + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={bannerStyles.scrollContent}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 12));
          setActiveIndex(Math.max(0, Math.min(index, reversedBanners.length - 1)));
        }}
      >
        {reversedBanners.map((banner) => (
          <View key={banner.id} style={bannerStyles.bannerWrap}>
            <LinearGradient
              colors={banner.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={bannerStyles.banner}
            >
              <View style={bannerStyles.bannerContent}>
                <View style={bannerStyles.bannerTextArea}>
                  <Text style={bannerStyles.bannerTitle}>{banner.title}</Text>
                  <Text style={bannerStyles.bannerSubtitle}>{banner.subtitle}</Text>
                </View>
                <View style={bannerStyles.bannerIconWrap}>
                  <Ionicons name={banner.icon} size={28} color="#fff" />
                </View>
              </View>
              <View style={bannerStyles.decor1} />
              <View style={bannerStyles.decor2} />
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      <View style={bannerStyles.dots}>
        {reversedBanners.map((_, i) => (
          <View
            key={i}
            style={[
              bannerStyles.dot,
              i === activeIndex && bannerStyles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function StatChip({ icon, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
}) {
  return (
    <View style={statStyles.chip}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.8)" />
      <Text style={statStyles.chipValue}>{value}</Text>
      <Text style={statStyles.chipLabel}>{label}</Text>
    </View>
  );
}

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
    transform: [{ translateY: (1 - opacity.value) * 20 }],
  }));

  useEffect(() => {
    if (!purchases || purchases.length === 0) return;

    const showBanner = () => {
      setCurrentIndex((prev) => (prev + 1) % purchases.length);
      setVisible(true);
      opacity.value = withTiming(1, { duration: 400 });

      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 400 });
        setTimeout(() => {
          setVisible(false);
        }, 500);
      }, 5000);
    };

    const initialTimer = setTimeout(showBanner, 5000);
    const interval = setInterval(showBanner, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [purchases]);

  if (!purchases || purchases.length === 0 || !visible) return null;

  const item = purchases[currentIndex % purchases.length];

  return (
    <Animated.View style={[proofStyles.container, animatedStyle]}>
      <View style={proofStyles.banner}>
        <View style={proofStyles.iconWrap}>
          <Ionicons name="bag-check" size={16} color="#10B981" />
        </View>
        <Text style={proofStyles.text} numberOfLines={1}>
          مستخدم اشترى {item.campaignTitle} منذ {item.minutesAgo > 60 ? `${Math.floor(item.minutesAgo / 60)} ساعة` : `${item.minutesAgo} دقائق`}
        </Text>
      </View>
    </Animated.View>
  );
}

const proofStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 84 + 16 : 96,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 100,
  },
  banner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(31, 41, 55, 0.92)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: 400,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
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

const FILTER_TABS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "الكل", icon: "apps" },
  { key: "active", label: "نشطة", icon: "flame" },
  { key: "completed", label: "منتهية", icon: "trophy" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { totalItems } = useCart();
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

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
  const otherCampaigns = campaigns?.filter((c) => c.status !== "active") || [];

  const filteredCampaigns = useMemo(() => {
    let list = campaigns || [];
    if (activeFilter === "active") list = list.filter(c => c.status === "active");
    else if (activeFilter === "completed") list = list.filter(c => c.status !== "active");
    if (activeCategory !== "all") list = list.filter(c => (c.category || "other") === activeCategory);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.prizeName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [campaigns, activeFilter, activeCategory, searchText]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    refetch();
  }, [refetch]);

  function renderHeader() {
    return (
      <View>
        <LinearGradient
          colors={["#7C3AED", "#6D28D9", "#5B21B6"]}
          style={styles.hero}
        >
          <View style={[styles.heroContent, { paddingTop: Platform.OS === "web" ? 67 + 20 : insets.top + 20 }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroTitleArea}>
                <Text style={styles.greeting}>
                  {user ? `أهلاً، ${user.username}` : "مرحباً بك"}
                </Text>
                <Text style={styles.heroTitle}>لاكي درو</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {user && (
                  <Pressable
                    onPress={() => router.push("/notifications" as any)}
                    style={styles.cartBtn}
                    testID="notifications-button"
                  >
                    <Ionicons name="notifications-outline" size={22} color="#fff" />
                    {unreadCount > 0 && (
                      <View style={[styles.cartBadge, { backgroundColor: "#EF4444" }]}>
                        <Text style={styles.cartBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                      </View>
                    )}
                  </Pressable>
                )}
                <Pressable
                  onPress={() => router.push("/cart" as any)}
                  style={styles.cartBtn}
                  testID="cart-button"
                >
                  <Ionicons name="cart-outline" size={22} color="#fff" />
                  {totalItems > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{totalItems > 99 ? "99+" : totalItems}</Text>
                    </View>
                  )}
                </Pressable>
                {!user && (
                  <Pressable
                    onPress={() => router.push("/auth")}
                    style={styles.signInBtn}
                  >
                    <Text style={styles.signInText}>دخول</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {activeCampaigns.length > 0 && (
              <View style={styles.statsRow}>
                <StatChip icon="flame" value={activeCampaigns.length} label="نشطة" />
                <StatChip
                  icon="cube"
                  value={activeCampaigns.reduce((sum, c) => sum + (c.totalQuantity - c.soldQuantity), 0)}
                  label="متبقي"
                />
                <StatChip
                  icon="trophy"
                  value={campaigns?.filter((c) => c.status === "completed").length || 0}
                  label="فائزون"
                />
              </View>
            )}
          </View>

          <View style={styles.heroDecoCircle} />
          <View style={styles.heroDecoCircle2} />
        </LinearGradient>

        <View style={styles.bannerSection}>
          <BannerCarousel />
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.light.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن منتج أو جائزة..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
              writingDirection="rtl"
              testID="search-input"
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color={Colors.light.textSecondary} />
              </Pressable>
            )}
          </View>

          <View style={styles.filterRow}>
            {FILTER_TABS.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setActiveFilter(tab.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.filterChip,
                  activeFilter === tab.key && styles.filterChipActive,
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={activeFilter === tab.key ? "#fff" : Colors.light.textSecondary}
                />
                <Text style={[
                  styles.filterChipText,
                  activeFilter === tab.key && styles.filterChipTextActive,
                ]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORY_TABS.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => {
                  setActiveCategory(cat.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.categoryChip,
                  activeCategory === cat.key && styles.categoryChipActive,
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={activeCategory === cat.key ? Colors.light.accent : Colors.light.textSecondary}
                />
                <Text style={[
                  styles.categoryChipText,
                  activeCategory === cat.key && styles.categoryChipTextActive,
                ]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {filteredCampaigns.length > 0 && (
          <View style={styles.sectionHeader}>
            <Ionicons
              name={activeFilter === "completed" ? "trophy" : "flame"}
              size={18}
              color={activeFilter === "completed" ? Colors.light.success : Colors.light.accent}
            />
            <Text style={styles.sectionTitle}>
              {activeFilter === "all" ? "جميع الحملات" : activeFilter === "active" ? "الحملات النشطة" : "الحملات المنتهية"}
            </Text>
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>{filteredCampaigns.length}</Text>
            </View>
            <View style={styles.sectionHeaderLine} />
          </View>
        )}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredCampaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardPadding}>
            <CampaignCard
              campaign={item}
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
            <LinearGradient
              colors={["rgba(124,58,237,0.08)", "rgba(236,72,153,0.08)"]}
              style={styles.emptyIconWrap}
            >
              <Ionicons
                name={searchText ? "search-outline" : "sparkles-outline"}
                size={36}
                color={Colors.light.accent}
              />
            </LinearGradient>
            <Text style={styles.emptyTitle}>
              {searchText ? "لا توجد نتائج" : "لا توجد حملات حالياً"}
            </Text>
            <Text style={styles.emptyText}>
              {searchText
                ? "جرب كلمات بحث مختلفة أو تصفّح جميع الحملات"
                : "ترقب! حملات وجوائز مذهلة في الطريق إليك"}
            </Text>
            {searchText && (
              <Pressable
                onPress={() => {
                  setSearchText("");
                  setActiveFilter("all");
                  setActiveCategory("all");
                }}
                style={styles.clearSearchBtn}
              >
                <Text style={styles.clearSearchText}>مسح البحث</Text>
              </Pressable>
            )}
          </View>
        }
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.light.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <RecentPurchaseBanner />
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    marginTop: -8,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  bannerWrap: {
    width: BANNER_WIDTH,
  },
  banner: {
    borderRadius: 20,
    padding: 24,
    minHeight: 120,
    overflow: "hidden",
    justifyContent: "center",
  },
  bannerContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  bannerTextArea: {
    flex: 1,
    paddingLeft: 14,
  },
  bannerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    color: "#FFFFFF",
    marginBottom: 6,
    textAlign: "right",
    writingDirection: "rtl",
  },
  bannerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
  bannerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  decor1: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  decor2: {
    position: "absolute",
    bottom: -50,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.light.accent,
    borderRadius: 3,
  },
});

const statStyles = StyleSheet.create({
  chip: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  chipValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  chipLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    writingDirection: "rtl",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.background,
  },
  hero: {
    paddingBottom: 28,
    overflow: "hidden",
  },
  heroContent: {
    paddingHorizontal: 20,
    zIndex: 2,
  },
  heroTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  heroTitleArea: {},
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
  },
  cartBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EC4899",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  cartBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#fff",
  },
  signInBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  signInText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  statsRow: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  heroDecoCircle: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroDecoCircle2: {
    position: "absolute",
    bottom: -40,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(236, 72, 153, 0.1)",
  },
  bannerSection: {
    marginTop: 0,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 2,
    gap: 10,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  filterRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  categoryRow: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingTop: 4,
  },
  categoryChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  categoryChipActive: {
    backgroundColor: "rgba(124, 58, 237, 0.08)",
    borderColor: Colors.light.accent,
  },
  categoryChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  categoryChipTextActive: {
    color: Colors.light.accent,
    fontFamily: "Inter_600SemiBold",
  },
  filterChip: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  filterChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  resultCount: {
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  resultCountText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.light.accent,
  },
  clearSearchBtn: {
    marginTop: 16,
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearSearchText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.accent,
    writingDirection: "rtl",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
    marginLeft: 12,
  },
  cardPadding: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.progressBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 8,
    writingDirection: "rtl",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
