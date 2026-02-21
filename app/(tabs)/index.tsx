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
    colors: ["#7C3AED", "#A855F7", "#C084FC"] as [string, string, string],
  },
  {
    id: "2",
    title: "فرصة الفوز الكبرى",
    subtitle: "كل تذكرة تقربك من الجائزة",
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
              {!user && (
                <Pressable
                  onPress={() => router.push("/auth")}
                  style={styles.signInBtn}
                >
                  <Text style={styles.signInText}>دخول</Text>
                </Pressable>
              )}
            </View>

            {activeCampaigns.length > 0 && (
              <View style={styles.statsRow}>
                <StatChip icon="flame" value={activeCampaigns.length} label="نشطة" />
                <StatChip
                  icon="ticket"
                  value={activeCampaigns.reduce((sum, c) => sum + (c.totalQuantity - c.soldQuantity), 0)}
                  label="متبقية"
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

        {activeCampaigns.length > 0 && (
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={18} color={Colors.light.accent} />
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
        <Ionicons name="trophy" size={18} color={Colors.light.success} />
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
              <Ionicons name="calendar-outline" size={36} color={Colors.light.tabIconDefault} />
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
