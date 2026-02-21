import React, { useCallback } from "react";
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
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import CampaignCard from "@/components/CampaignCard";
import { queryClient } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

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
          colors={["#0A1628", "#152238", "#1A2D4A"]}
          style={styles.hero}
        >
          <View style={[styles.heroContent, { paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16 }]}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.greeting}>
                  {user ? `أهلاً، ${user.username}` : "مرحباً"}
                </Text>
                <Text style={styles.heroTitle}>لاكي درو</Text>
              </View>
              {!user && (
                <Pressable
                  onPress={() => router.push("/auth")}
                  style={styles.signInBtn}
                >
                  <Ionicons name="log-in-outline" size={20} color={Colors.light.accent} />
                  <Text style={styles.signInText}>تسجيل الدخول</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.heroSubtitle}>
              اشترِ المنتجات، احصل على تذاكر السحب، واربح جوائز كبرى
            </Text>

            {activeCampaigns.length > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{activeCampaigns.length}</Text>
                  <Text style={styles.statLabel}>سحوبات نشطة</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {activeCampaigns.reduce(
                      (sum, c) => sum + (c.totalQuantity - c.soldQuantity),
                      0
                    )}
                  </Text>
                  <Text style={styles.statLabel}>تذاكر متبقية</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {campaigns?.filter((c) => c.status === "completed").length || 0}
                  </Text>
                  <Text style={styles.statLabel}>فائزون</Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        {activeCampaigns.length > 0 && (
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={20} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>الحملات النشطة</Text>
          </View>
        )}
      </View>
    );
  }

  function renderOtherSection() {
    if (otherCampaigns.length === 0) return null;
    return (
      <View>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={20} color={Colors.light.success} />
          <Text style={styles.sectionTitle}>الحملات السابقة</Text>
        </View>
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
            <Ionicons name="calendar-outline" size={48} color={Colors.light.tabIconDefault} />
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
    paddingBottom: 24,
  },
  heroContent: {
    paddingHorizontal: 20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 20,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(212, 168, 83, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 83, 0.3)",
  },
  signInText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.accent,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.light.accent,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
  },
  cardPadding: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
});
