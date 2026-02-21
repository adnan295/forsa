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
  Dimensions,
  ScrollView,
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
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import CampaignCard from "@/components/CampaignCard";
import { queryClient } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;

const BANNERS = [
  {
    id: "1",
    title: "سحوبات حصرية",
    subtitle: "اشترك الآن واربح جوائز قيمة",
    icon: "diamond" as const,
    colors: ["#1A2D4A", "#0F1C30", "#0A1628"] as [string, string, string],
    accentColor: Colors.light.accent,
  },
  {
    id: "2",
    title: "فرصة الفوز الكبرى",
    subtitle: "كل تذكرة تقربك من الجائزة",
    icon: "trophy" as const,
    colors: ["#2C1810", "#1A0F08", "#0D0704"] as [string, string, string],
    accentColor: "#FFD700",
  },
  {
    id: "3",
    title: "عروض محدودة",
    subtitle: "لا تفوت الفرصة - الكمية محدودة",
    icon: "flash" as const,
    colors: ["#1A1A2E", "#16213E", "#0F3460"] as [string, string, string],
    accentColor: "#E74C3C",
  },
];

function BannerCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % BANNERS.length;
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
          setActiveIndex(Math.max(0, Math.min(index, BANNERS.length - 1)));
        }}
      >
        {BANNERS.map((banner) => (
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
                <View style={[bannerStyles.bannerIconWrap, { backgroundColor: banner.accentColor + "20" }]}>
                  <Ionicons name={banner.icon} size={32} color={banner.accentColor} />
                </View>
              </View>

              <View style={[bannerStyles.bannerDecor1, { backgroundColor: banner.accentColor + "08" }]} />
              <View style={[bannerStyles.bannerDecor2, { backgroundColor: banner.accentColor + "06" }]} />
              <View style={[bannerStyles.bannerAccentLine, { backgroundColor: banner.accentColor }]} />
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      <View style={bannerStyles.dots}>
        {BANNERS.map((_, i) => (
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

function StatChip({ icon, value, label, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <View style={statStyles.chip}>
      <View style={[statStyles.chipIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={statStyles.chipValue}>{value}</Text>
      <Text style={statStyles.chipLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

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

  const activeCampaigns = campaigns?.filter((c) => c.status === "active") || [];
  const otherCampaigns = campaigns?.filter((c) => c.status !== "active") || [];

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    refetch();
  }, [refetch]);

  function renderHeader() {
    return (
      <View>
        <LinearGradient
          colors={["#0A1628", "#111D32", "#152238"]}
          style={styles.hero}
        >
          <View style={[styles.heroContent, { paddingTop: Platform.OS === "web" ? 67 + 20 : insets.top + 20 }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroTitleArea}>
                <Text style={styles.greeting}>
                  {user ? `أهلاً، ${user.username}` : "مرحباً بك"}
                </Text>
                <View style={styles.logoRow}>
                  <Ionicons name="diamond" size={22} color={Colors.light.accent} />
                  <Text style={styles.heroTitle}>لاكي درو</Text>
                </View>
              </View>
              {!user && (
                <Pressable
                  onPress={() => router.push("/auth")}
                  style={styles.signInBtn}
                >
                  <LinearGradient
                    colors={[Colors.light.accent, Colors.light.accentDark]}
                    style={styles.signInGradient}
                  >
                    <Ionicons name="log-in-outline" size={18} color="#fff" />
                    <Text style={styles.signInText}>دخول</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>

            {activeCampaigns.length > 0 && (
              <View style={styles.statsRow}>
                <StatChip
                  icon="flame"
                  value={activeCampaigns.length}
                  label="نشطة"
                  color={Colors.light.accent}
                />
                <StatChip
                  icon="ticket"
                  value={activeCampaigns.reduce((sum, c) => sum + (c.totalQuantity - c.soldQuantity), 0)}
                  label="متبقية"
                  color="#3498DB"
                />
                <StatChip
                  icon="trophy"
                  value={campaigns?.filter((c) => c.status === "completed").length || 0}
                  label="فائزون"
                  color="#2ECC71"
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

        {activeCampaigns.length > 0 && (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Ionicons name="flame" size={16} color={Colors.light.accent} />
            </View>
            <Text style={styles.sectionTitle}>الحملات النشطة</Text>
            <View style={styles.sectionHeaderLine} />
          </View>
        )}
      </View>
    );
  }

  function renderOtherSection() {
    if (otherCampaigns.length === 0) return null;
    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionHeaderIcon, { backgroundColor: "rgba(46, 204, 113, 0.12)" }]}>
          <Ionicons name="trophy" size={16} color={Colors.light.success} />
        </View>
        <Text style={styles.sectionTitle}>الحملات السابقة</Text>
        <View style={styles.sectionHeaderLine} />
      </View>
    );
  }

  const allCampaignsForList = [...activeCampaigns, ...otherCampaigns];

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
        data={allCampaignsForList}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View>
            {index === activeCampaigns.length && otherCampaigns.length > 0 && renderOtherSection()}
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
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={40} color={Colors.light.tabIconDefault} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد حملات حالياً</Text>
            <Text style={styles.emptyText}>
              تابعنا لاحقاً للحملات والجوائز المثيرة
            </Text>
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
    borderRadius: 18,
    padding: 22,
    minHeight: 130,
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
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 6,
    textAlign: "right",
    writingDirection: "rtl",
  },
  bannerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
  bannerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerDecor1: {
    position: "absolute",
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  bannerDecor2: {
    position: "absolute",
    bottom: -40,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  bannerAccentLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.border,
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
    gap: 6,
  },
  chipIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  chipLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
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
  logoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 6,
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
  signInBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  signInGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  signInText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  statsRow: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroDecoCircle: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(212, 168, 83, 0.04)",
  },
  heroDecoCircle2: {
    position: "absolute",
    bottom: -30,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(212, 168, 83, 0.03)",
  },
  bannerSection: {
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(212, 168, 83, 0.12)",
    alignItems: "center",
    justifyContent: "center",
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
    width: 80,
    height: 80,
    borderRadius: 24,
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
