import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

type WinnerCampaign = Campaign & { winnerUsername: string };

function formatDrawDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function WinnersScreen() {
  const insets = useSafeAreaInsets();

  const { data: completedCampaigns = [], isLoading } = useQuery<WinnerCampaign[]>({
    queryKey: ["/api/winners"],
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7C3AED", "#6D28D9", "#5B21B6"]}
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16 },
        ]}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>الفائزون</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {completedCampaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={["rgba(124,58,237,0.08)", "rgba(236,72,153,0.08)"]}
              style={styles.emptyIconWrap}
            >
              <Ionicons name="trophy-outline" size={40} color={Colors.light.accent} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>لا يوجد فائزون بعد</Text>
            <Text style={styles.emptyText}>
              ستظهر هنا نتائج السحوبات المكتملة والفائزون بالجوائز
            </Text>
          </View>
        ) : (
          completedCampaigns.map((campaign) => (
            <WinnerCard key={campaign.id} campaign={campaign} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function WinnerCard({ campaign }: { campaign: WinnerCampaign }) {
  const imageUri = campaign.imageUrl
    ? `${getApiUrl()}${campaign.imageUrl}`
        .replace(/\/+/g, "/")
        .replace(":/", "://")
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardImageArea}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#7C3AED", "#A855F7", "#C084FC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardImagePlaceholder}
          >
            <Ionicons name="trophy" size={28} color="#fff" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.5)"]}
          style={styles.cardImageOverlay}
        />
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#fff" />
          <Text style={styles.completedBadgeText}>مكتمل</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {campaign.title}
        </Text>

        <View style={styles.infoRow}>
          <View style={[styles.infoIconWrap, { backgroundColor: "rgba(124,58,237,0.1)" }]}>
            <Ionicons name="trophy" size={14} color={Colors.light.accent} />
          </View>
          <View style={styles.infoTextArea}>
            <Text style={styles.infoLabel}>الجائزة</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {campaign.prizeName}
            </Text>
          </View>
        </View>

        {campaign.winnerUsername ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
              <Ionicons name="person" size={14} color={Colors.light.warning} />
            </View>
            <View style={styles.infoTextArea}>
              <Text style={styles.infoLabel}>الفائز</Text>
              <Text style={[styles.infoValue, { color: Colors.light.warning }]}>
                {campaign.winnerUsername}
              </Text>
            </View>
          </View>
        ) : null}

        {campaign.winnerTicketId && (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: "rgba(236,72,153,0.1)" }]}>
              <Ionicons name="ticket" size={14} color={Colors.light.accentPink} />
            </View>
            <View style={styles.infoTextArea}>
              <Text style={styles.infoLabel}>تذكرة الفوز</Text>
              <Text style={[styles.infoValue, { color: Colors.light.accentPink }]}>
                #{campaign.winnerTicketId}
              </Text>
            </View>
          </View>
        )}

        {campaign.drawAt && (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
              <Ionicons name="calendar" size={14} color={Colors.light.success} />
            </View>
            <View style={styles.infoTextArea}>
              <Text style={styles.infoLabel}>تاريخ السحب</Text>
              <Text style={styles.infoValue}>
                {formatDrawDate(campaign.drawAt as any)}
              </Text>
            </View>
          </View>
        )}
      </View>
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
  header: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  headerDecor1: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerDecor2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(236,72,153,0.12)",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
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
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardImageArea: {
    height: 140,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  completedBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.light.success,
  },
  completedBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextArea: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
});
