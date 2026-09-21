import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/lib/auth-context";
import { buildMediaUrl, queryClient } from "@/lib/query-client";
import DrawBanner, { type CurrentDraw } from "@/components/DrawBanner";
import type { Ticket } from "@shared/schema";

/** كيف بيشتغل السحب — شرح مختصر للمستخدم */
const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: "cart", title: "اشترِ من المتجر", body: "أي منتج من الكتالوج، بأي كمية" },
  { icon: "checkmark-circle", title: "يتأكّد دفعك", body: "بعد ما نراجع الدفع بتنمنحك التذاكر تلقائياً" },
  { icon: "ticket", title: "خذ تذاكرك", body: "كل مبلغ محدّد من مشترياتك = تذكرة سحب" },
  { icon: "trophy", title: "ننتظر اكتمال العدد", body: "لما تنباع كل تذاكر الجولة منعمل السحب" },
];

export default function DrawScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: draw, isLoading, refetch, isRefetching } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const { data: myTickets } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: !!user,
    staleTime: 10000,
  });

  const ticketsInThisDraw =
    draw && myTickets ? myTickets.filter((t) => t.drawId === draw.id) : [];
  const pendingTickets = myTickets ? myTickets.filter((t) => t.drawId === null) : [];

  function onRefresh() {
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    refetch();
  }

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#FFD000" />
      </View>
    );
  }

  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;
  const prizeImage = draw ? buildMediaUrl(draw.prizeImageUrl) : null;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-forward" size={22} color="#1A1A1A" />
        </Pressable>
        <Text style={s.headerTitle}>السحب</Text>
        <Pressable onPress={() => router.push("/winners" as any)} style={s.backBtn} hitSlop={8}>
          <Ionicons name="trophy-outline" size={21} color="#1A1A1A" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FFD000" />}
      >
        {draw ? (
          <>
            <DrawBanner draw={draw} />

            {/* صورة الجائزة ووصفها */}
            {(prizeImage || draw.prizeDescription) && (
              <View style={s.card}>
                {prizeImage && (
                  <Image
                    source={{ uri: prizeImage }}
                    style={s.prizeImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                )}
                <View style={s.cardBody}>
                  <Text style={s.cardTitle}>{draw.prizeName}</Text>
                  {draw.prizeDescription ? (
                    <Text style={s.cardText}>{draw.prizeDescription}</Text>
                  ) : null}
                </View>
              </View>
            )}

            {/* تذاكري بهالجولة */}
            {user && (
              <View style={s.card}>
                <View style={s.cardBody}>
                  <View style={s.myTicketsHead}>
                    <View style={s.myTicketsCount}>
                      <Text style={s.myTicketsNum}>{ticketsInThisDraw.length}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>تذاكري بهذه الجولة</Text>
                      <Text style={s.cardText}>
                        {ticketsInThisDraw.length === 0
                          ? "ما عندك تذاكر بعد — اشترِ من المتجر لتحصل عليها"
                          : `فرصتك ${((ticketsInThisDraw.length / Math.max(draw.soldTickets, 1)) * 100).toFixed(1)}% من التذاكر المباعة`}
                      </Text>
                    </View>
                  </View>

                  {ticketsInThisDraw.length > 0 && (
                    <View style={s.ticketChips}>
                      {ticketsInThisDraw.slice(0, 12).map((t) => (
                        <View key={t.id} style={s.ticketChip}>
                          <Ionicons name="ticket-outline" size={11} color="#8A7500" />
                          <Text style={s.ticketChipText}>{t.ticketNumber}</Text>
                        </View>
                      ))}
                      {ticketsInThisDraw.length > 12 && (
                        <Pressable onPress={() => router.push("/(tabs)/tickets" as any)} style={s.moreChip}>
                          <Text style={s.moreChipText}>+{ticketsInThisDraw.length - 12} أخرى</Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {pendingTickets.length > 0 && (
                    <View style={s.pendingNote}>
                      <Ionicons name="time-outline" size={14} color="#F59E0B" />
                      <Text style={s.pendingText}>
                        عندك {pendingTickets.length} تذكرة بانتظار فتح الجولة القادمة
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* دعوة للشراء */}
            {draw.status === "active" && (
              <Pressable onPress={() => router.push("/(tabs)" as any)} style={s.ctaWrap}>
                <LinearGradient
                  colors={["#FFD000", "#E6B800"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.cta}
                >
                  <Ionicons name="storefront" size={18} color="#1A1A1A" />
                  <Text style={s.ctaText}>تسوّق واحصل على تذاكر</Text>
                </LinearGradient>
              </Pressable>
            )}
          </>
        ) : (
          <View style={s.emptyCard}>
            <Ionicons name="gift-outline" size={52} color="#FFD000" />
            <Text style={s.emptyTitle}>ما في جولة سحب مفتوحة</Text>
            <Text style={s.emptyText}>
              ترقّب الجائزة القادمة. تذاكرك من أي شراء بتنحفظ وبتنضاف للجولة الجاية تلقائياً.
            </Text>
            <Pressable onPress={() => router.push("/winners" as any)} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>شوف الفائزين السابقين</Text>
            </Pressable>
          </View>
        )}

        {/* كيف بيشتغل */}
        <View style={s.card}>
          <View style={s.cardBody}>
            <Text style={s.cardTitle}>كيف بتاخد تذاكر؟</Text>
            <View style={s.steps}>
              {STEPS.map((step, i) => (
                <View key={i} style={s.step}>
                  <View style={s.stepIcon}>
                    <Ionicons name={step.icon} size={17} color="#1A1A1A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepBody}>
                      {i === 2 && ticketPrice > 0
                        ? `كل ${ticketPrice.toFixed(0)}$ من مشترياتك = تذكرة سحب وحدة`
                        : step.body}
                    </Text>
                  </View>
                  <Text style={s.stepNum}>{i + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F8F8" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#1A1A1A", writingDirection: "rtl" },

  card: {
    backgroundColor: "#fff", borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  prizeImage: { width: "100%", height: 190 },
  cardBody: { padding: 16, gap: 10 },
  cardTitle: {
    fontFamily: "Inter_700Bold", fontSize: 16, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl",
  },
  cardText: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: "#777",
    textAlign: "right", writingDirection: "rtl", lineHeight: 21,
  },

  myTicketsHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  myTicketsCount: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: "#FFFBE6",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFE566",
  },
  myTicketsNum: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#1A1A1A" },
  ticketChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ticketChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#FFFBE6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: "#FFE566",
  },
  ticketChipText: { fontFamily: "Inter_500Medium", fontSize: 10, color: "#8A7500" },
  moreChip: {
    backgroundColor: "#F5F5F5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    justifyContent: "center",
  },
  moreChipText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#666", writingDirection: "rtl" },
  pendingNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF7E6", padding: 10, borderRadius: 10,
  },
  pendingText: {
    fontFamily: "Inter_500Medium", fontSize: 12, color: "#B45309",
    flex: 1, textAlign: "right", writingDirection: "rtl",
  },

  ctaWrap: { borderRadius: 16, overflow: "hidden" },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15,
  },
  ctaText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#1A1A1A", writingDirection: "rtl" },

  emptyCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 28, alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#1A1A1A", writingDirection: "rtl" },
  emptyText: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: "#888",
    textAlign: "center", writingDirection: "rtl", lineHeight: 21,
  },
  emptyBtn: {
    marginTop: 4, paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: "#F5F5F5", borderRadius: 12,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#1A1A1A", writingDirection: "rtl" },

  steps: { gap: 12 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFBE6",
    alignItems: "center", justifyContent: "center",
  },
  stepTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl",
  },
  stepBody: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: "#888",
    textAlign: "right", writingDirection: "rtl", lineHeight: 19,
  },
  stepNum: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#F0F0F0" },
});
