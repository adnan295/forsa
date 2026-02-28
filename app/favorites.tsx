import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFavorites } from "@/lib/favorites-context";
import CampaignCard from "@/components/CampaignCard";
import type { Campaign } from "@shared/schema";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, favoritesCount } = useFavorites();

  const { data: allCampaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const favoriteCampaigns = (allCampaigns || []).filter((c) =>
    favorites.includes(c.id)
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7C3AED", "#A855F7", "#EC4899"]}
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={8}
          >
            <View style={styles.backCircle}>
              <Ionicons name="arrow-forward" size={22} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>المفضلة</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{favoritesCount}</Text>
          </View>
        </View>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
      </LinearGradient>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      ) : favoriteCampaigns.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-outline" size={48} color={Colors.light.accentLight} />
          </View>
          <Text style={styles.emptyTitle}>لا توجد مفضلات</Text>
          <Text style={styles.emptyText}>
            أضف حملات إلى المفضلة بالضغط على أيقونة القلب
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)")}
            style={styles.browseButton}
          >
            <LinearGradient
              colors={[Colors.light.accent, Colors.light.accentPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.browseGradient}
            >
              <Text style={styles.browseText}>تصفح الحملات</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={favoriteCampaigns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16),
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CampaignCard
              campaign={item}
              onPress={() => router.push(`/campaign/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    zIndex: 2,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  headerDecor1: {
    position: "absolute",
    top: -40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerDecor2: {
    position: "absolute",
    bottom: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(236,72,153,0.12)",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(124,58,237,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
    writingDirection: "rtl",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  browseButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 24,
    width: "100%",
  },
  browseGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
  },
  browseText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
});
