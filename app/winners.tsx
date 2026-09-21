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
import { buildMediaUrl } from "@/lib/query-client";

/** الشكل اللي بيرجّعه GET /api/winners */
interface DrawWinner {
  drawId: string;
  drawTitle: string;
  prizeName: string;
  prizeImageUrl: string | null;
  ticketNumber: string | null;
  drawnAt: string | null;
  totalTickets: number;
  winnerUsername: string | null;
}

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

  const { data: winners = [], isLoading } = useQuery<DrawWinner[]>({
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
        colors={["#0B2142", "#164A9E"]}
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
        {winners.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={["rgba(255,208,0,0.12)", "rgba(230,184,0,0.12)"]}
              style={styles.emptyIconWrap}
            >
              <Ionicons name="trophy-outline" size={40} color={Colors.light.accent} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>لا يوجد فائزون بعد</Text>
            <Text style={styles.emptyText}>
              ستظهر هنا نتائج جولات السحب المكتملة والفائزون بالجوائز
            </Text>
          </View>
        ) : (
          winners.map((w) => <WinnerCard key={w.drawId} winner={w} />)
        )}
      </ScrollView>
    </View>
  );
}

function WinnerCard({ winner }: { winner: DrawWinner }) {
  const imageUri = buildMediaUrl(winner.prizeImageUrl);

  return (
    <View style={styles.card}>
      <View style={styles.cardImageArea}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["#0B2142", "#164A9E", "#164A9E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardImagePlaceholder}
          >
            <Ionicons name="trophy" size={28} color={Colors.light.accent} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.5)"]}
          style={styles.cardImageOverlay}
        />
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#fff" />
          <Text style={styles.completedBadgeText}>تم السحب</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {winner.drawTitle}
        </Text>

        <View style={styles.infoRow}>
          <View style={[styles.infoIconWrap, { backgroundColor: "rgba(255,208,0,0.18)" }]}>
            <Ionicons name="trophy" size={14} color={Colors.light.accentDark} />
          </View>
          <View style={styles.infoTextArea}>
            <Text style={styles.infoLabel}>الجائزة</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {winner.prizeName}
            </Text>
          </View>
        </View>

        {winner.winnerUsername ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
              <Ionicons name="person" size={14} color={Colors.light.warning} />
            </View>
            <View style={styles.infoTextArea}>
              <Text style={styles.infoLabel}>الفائز</Text>
              <Text style={[styles.infoValue, { color: Colors.light.warning }]}>
                {winner.winnerUsername}
              </Text>
            </View>
          </View>
        ) : null}

        {winner.ticketNumber && (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: "rgba(255,208,0,0.12)" }]}>
              <Ionicons name="ticket" size={14} color={Colors.light.accentDark} />
            </View>
            <View style={styles.infoTextArea}>
              <Text style={styles.infoLabel}>تذكرة الفوز</Text>
              <Text style={[styles.infoValue, { color: Colors.light.accentDark }]}>
                {winner.ticketNumber}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={[styles.infoIconWrap, { backgroundColor: "rgba(59,130,246,0.1)" }]}>
            <Ionicons name="people" size={14} color="#175CD3" />
          </View>
          <View style={styles.infoTextArea}>
            <Text style={styles.infoLabel}>إجمالي التذاكر</Text>
            <Text style={styles.infoValue}>{winner.totalTickets.toLocaleString("en-US")}</Text>
          </View>
        </View>

        {winner.drawnAt && (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
              <Ionicons name="calendar" size={14} color={Colors.light.success} />
            </View>
            <View style={styles.infoTextArea}>
              <Text style={styles.infoLabel}>تاريخ السحب</Text>
              <Text style={styles.infoValue}>{formatDrawDate(winner.drawnAt)}</Text>
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
    flexDirection: "row",
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
    fontFamily: "Tajawal_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    writingDirection: "rtl",
    textAlign: "center",
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
    fontFamily: "Tajawal_700Bold",
    fontSize: 20,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
    writingDirection: "rtl",
  },
  emptyText: {
    fontFamily: "Tajawal_400Regular",
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
    shadowColor: "#0B2142",
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
    start: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.light.success,
  },
  completedBadgeText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 17,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  infoRow: {
    flexDirection: "row",
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
    fontFamily: "Tajawal_400Regular",
    fontSize: 11,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
});
