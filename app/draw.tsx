import React, { useState, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { buildMediaUrl, queryClient } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing } from "@/constants/colors";
import { Header, Button, ChanceNote, EmptyState, NavRow } from "@/components/ui";
import DrawBanner, { type CurrentDraw } from "@/components/DrawBanner";
import type { Ticket } from "@shared/schema";

const c = Colors.light;

type Tab = "current" | "past";

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

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function WinnerCard({ winner }: { winner: DrawWinner }) {
  const prizeImage = buildMediaUrl(winner.prizeImageUrl);

  return (
    <View style={s.winnerCard}>
      <View style={s.winnerImageWrap}>
        {prizeImage ? (
          <Image
            source={{ uri: prizeImage }}
            style={s.winnerImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <Ionicons name="trophy" size={40} color={c.gold} />
        )}
      </View>

      <Text style={s.winnerPrize}>الجائزة: {winner.prizeName}</Text>

      {winner.winnerUsername && (
        <Text style={s.winnerName}>الفائز: {winner.winnerUsername}</Text>
      )}

      {winner.ticketNumber && (
        <Text style={s.winnerTicket}>
          القسيمة: <Text style={s.winnerTicketNum}>{winner.ticketNumber}</Text>
        </Text>
      )}

      <View style={s.winnerMeta}>
        <View style={s.winnerMetaItem}>
          <Ionicons name="calendar-outline" size={14} color={c.textMuted} />
          <Text style={s.winnerMetaText}>{formatDate(winner.drawnAt)}</Text>
        </View>
        <View style={s.winnerMetaItem}>
          <Ionicons name="ticket-outline" size={14} color={c.textMuted} />
          <Text style={s.winnerMetaText}>
            {winner.totalTickets.toLocaleString("en-US")} فرصة
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DrawScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("current");

  const { data: draw, isLoading, refetch, isRefetching } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const { data: winners } = useQuery<DrawWinner[]>({
    queryKey: ["/api/winners"],
    staleTime: 30000,
  });

  const { data: myTickets } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: !!user,
    staleTime: 10000,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    queryClient.invalidateQueries({ queryKey: ["/api/winners"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    refetch();
  }, [refetch]);

  const myChances = draw && myTickets ? myTickets.filter((t) => t.drawId === draw.id) : [];
  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;
  const prizeImage = draw ? buildMediaUrl(draw.prizeImageUrl) : null;

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="السحوبات والفائزون" showBack />

      <View style={s.tabs}>
        {(
          [
            { key: "current" as const, label: "السحب الحالي" },
            { key: "past" as const, label: "السابقة" },
          ]
        ).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(t.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[s.tab, active && s.tabActive]}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
        }
      >
        {tab === "current" ? (
          draw ? (
            <>
              <DrawBanner draw={draw} showLabel={false} />

              {(prizeImage || draw.prizeDescription) && (
                <View style={s.card}>
                  {prizeImage && (
                    <View style={s.prizeImageWrap}>
                      <Image
                        source={{ uri: prizeImage }}
                        style={s.prizeImage}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    </View>
                  )}
                  <Text style={s.cardTitle}>{draw.prizeName}</Text>
                  {draw.prizeDescription ? (
                    <Text style={s.cardBody}>{draw.prizeDescription}</Text>
                  ) : null}
                </View>
              )}

              {ticketPrice > 0 && (
                <ChanceNote>كل {ticketPrice.toFixed(0)}$ من مشترياتك = فرصة سحب</ChanceNote>
              )}

              {user && (
                <View style={s.card}>
                  <View style={s.myChancesRow}>
                    <View style={s.myChancesBox}>
                      <Text style={s.myChancesNum}>{myChances.length}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>فرصي في هذا السحب</Text>
                      <Text style={s.cardBody}>
                        {myChances.length === 0
                          ? "ما عندك فرص بعد — اشترِ من المتجر"
                          : `نسبتك ${((myChances.length / Math.max(draw.soldTickets, 1)) * 100).toFixed(1)}% من الفرص المباعة`}
                      </Text>
                    </View>
                  </View>

                  {myChances.length > 0 && (
                    <Button
                      label="عرض قسائمي"
                      variant="secondary"
                      small
                      onPress={() => router.push("/(tabs)/tickets" as any)}
                    />
                  )}
                </View>
              )}

              {draw.status === "active" && (
                <Button
                  label="تسوّق واحصل على فرص"
                  icon="storefront"
                  onPress={() => router.push("/(tabs)/products" as any)}
                />
              )}

              <NavRow
                icon="help-circle-outline"
                title="كيف يتم السحب؟"
                subtitle="تعرّف على آلية السحب خطوة بخطوة حسب الشروط المعتمدة."
                onPress={() => router.push({ pathname: "/info", params: { type: "terms" } } as any)}
              />

              <NavRow
                icon="chatbubble-ellipses-outline"
                title="الأسئلة الشائعة"
                subtitle="إجابات على أكثر الأسئلة شيوعاً حول السحب والمشتريات."
                onPress={() => router.push("/faq" as any)}
              />
            </>
          ) : (
            <EmptyState
              icon="gift-outline"
              title="ما في سحب مفتوح"
              body="ترقّب الجائزة القادمة. فرصك من أي شراء بتنحفظ وبتنضاف للسحب الجاي تلقائياً."
              action={{ label: "شوف الفائزين السابقين", onPress: () => setTab("past") }}
            />
          )
        ) : (winners ?? []).length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="لا يوجد فائزون بعد"
            body="بتظهر هنا نتائج السحوبات المكتملة والفائزون بالجوائز"
          />
        ) : (
          (winners ?? []).map((w) => <WinnerCard key={w.drawId} winner={w} />)
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background },

  tabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.screen,
    paddingBottom: Spacing.md,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  tab: {
    flex: 1,
    height: 42,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.background,
  },
  tabActive: { backgroundColor: c.primary },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
  tabTextActive: { color: c.surface },

  content: { padding: Spacing.screen, paddingBottom: 40, gap: Spacing.md },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  cardBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  prizeImageWrap: {
    height: 170,
    borderRadius: Radius.button,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  prizeImage: { width: "100%", height: "100%" },

  myChancesRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  myChancesBox: {
    width: 56,
    height: 56,
    borderRadius: Radius.card,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  myChancesNum: { fontFamily: Fonts.bold, fontSize: FontSize.h2, color: c.primary },

  winnerCard: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  winnerImageWrap: {
    width: 110,
    height: 130,
    borderRadius: Radius.button,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  winnerImage: { width: "100%", height: "100%" },
  winnerPrize: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    textAlign: "center",
    writingDirection: "rtl",
  },
  winnerName: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: c.text,
    textAlign: "center",
    writingDirection: "rtl",
  },
  winnerTicket: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },
  winnerTicketNum: { fontFamily: Fonts.bold, color: c.navy, writingDirection: "ltr" },
  winnerMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  winnerMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  winnerMetaText: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    writingDirection: "rtl",
  },
});
