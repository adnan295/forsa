import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { IS_RTL } from "@/lib/rtl";
import { buildMediaUrl, queryClient } from "@/lib/query-client";
import { useDesignScale } from "@/lib/design-scale";
import { shortTicketCode, voucherWord } from "@/lib/vouchers";
import Colors, { Fonts, FontSize, Radius, Spacing } from "@/constants/colors";
import { EmptyState } from "@/components/ui";
import type { CurrentDraw } from "@/components/DrawBanner";
import type { Order, Ticket } from "@shared/schema";

const c = Colors.light;

/** النص الملاصق لجهة القسيمة — يسار الشاشة في الواجهة العربية */
const TOWARD_END = IS_RTL ? "left" : "right";

interface Winner {
  drawId: string;
  prizeName: string;
  prizeImageUrl: string | null;
  ticketNumber: string | null;
  drawnAt: string | null;
}

type Tab = "current" | "past";

const pad = (n: number) => String(n).padStart(2, "0");
const formatCount = (n: number) => n.toLocaleString("en-US");

/** يعزل الأرقام والرموز اللاتينية داخل جملة عربية حتى لا تنقلب ($23 لا 23$) */
const ltr = (value: string) => `⁦${value}⁩`;

function formatDate(value: string | Date) {
  const d = new Date(value);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function formatTime(value: string | Date) {
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMoney(value: string | undefined) {
  if (value === undefined) return "—";
  const n = parseFloat(value);
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

function formatPercent(sold: number, target: number) {
  if (target <= 0) return "0%";
  return `${Math.min(100, (sold / target) * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

/** ثقوب حافة القسيمة */
function Perforation({ side }: { side: "start" | "end" }) {
  return (
    <View style={[s.perforation, side === "start" ? { start: -4 } : { end: -4 }]} pointerEvents="none">
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={s.hole} />
      ))}
    </View>
  );
}

function TicketRow({ ticket, order }: { ticket: Ticket; order?: Order }) {
  const dp = useDesignScale();
  const code = shortTicketCode(ticket.ticketNumber);
  const pending = ticket.drawId === null;

  return (
    <View
      style={[s.row, { minHeight: dp(100) }]}
      accessible
      accessibilityLabel={`${ticket.isWinner ? "قسيمة فائزة، " : ""}رقم ${ticket.ticketNumber}، الطلب ${ticket.orderId.slice(0, 8)}`}
    >
      <View style={s.dateCol}>
        <Text style={s.dateText}>{formatDate(ticket.createdAt)}</Text>
        <Text style={s.dateText}>{formatTime(ticket.createdAt)}</Text>
      </View>

      <View style={s.orderCol}>
        <Text style={s.orderLine} numberOfLines={1}>
          رقم الطلب: <Text style={s.orderStrong}>{ltr(`#${ticket.orderId.slice(0, 8)}`)}</Text>
        </Text>
        <Text style={s.orderLine} numberOfLines={1}>
          قيمة المشتريات: <Text style={s.orderStrong}>{ltr(formatMoney(order?.ticketEligibleAmount))}</Text>
        </Text>
        {(ticket.isWinner || pending) && (
          <Text style={[s.rowNote, ticket.isWinner && { color: c.goldText }]}>
            {ticket.isWinner ? "🏆 قسيمة فائزة" : "بانتظار الجولة القادمة"}
          </Text>
        )}
      </View>

      <LinearGradient
        colors={ticket.isWinner ? [c.gold, "#E09A12"] : [c.primary, "#0A4FC4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.stub, { width: dp(206), height: dp(86) }]}
      >
        <View style={s.stubInner}>
          <MaterialCommunityIcons name="ticket-confirmation" size={22} color={c.surface} style={s.tilted} />
          <Text style={s.stubCode} numberOfLines={1}>{code}</Text>
        </View>
        <Perforation side="start" />
        <Perforation side="end" />
      </LinearGradient>
    </View>
  );
}

function PastDrawCard({ winner }: { winner: Winner }) {
  const dp = useDesignScale();
  const image = buildMediaUrl(winner.prizeImageUrl);
  return (
    <View style={s.pastCard}>
      <View style={s.pastDate}>
        <View style={s.pastDateLabel}>
          <Ionicons name="calendar-outline" size={14} color={c.navy} />
          <Text style={s.pastCaption}>تاريخ السحب</Text>
        </View>
        <Text style={s.pastDateValue}>{winner.drawnAt ? formatDate(winner.drawnAt) : "—"}</Text>
        <Text style={s.pastCongrats}>🎉 مبروك للفائز!</Text>
      </View>

      <View style={s.pastInfo}>
        <Text style={s.pastCaption}>الجائزة</Text>
        <Text style={s.pastPrize} numberOfLines={2}>{winner.prizeName}</Text>
        {!!winner.ticketNumber && (
          <Text style={s.pastCaption}>
            القسيمة الفائزة: <Text style={s.orderStrong}>{ltr(shortTicketCode(winner.ticketNumber))}</Text>
          </Text>
        )}
      </View>

      <View style={[s.pastImage, { width: dp(125), height: dp(150) }]}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" />
        ) : (
          <Ionicons name="gift" size={36} color={c.gold} />
        )}
      </View>
    </View>
  );
}

export default function TicketsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const dp = useDesignScale();
  const margin = dp(16);
  const [tab, setTab] = useState<Tab>("current");
  const [newestFirst, setNewestFirst] = useState(true);

  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const { data: tickets, isLoading, refetch, isRefetching } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: !!user,
    staleTime: 5000,
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
    staleTime: 10000,
  });

  const { data: winners, isLoading: winnersLoading } = useQuery<Winner[]>({
    queryKey: ["/api/winners"],
    staleTime: 60000,
  });

  const ordersById = useMemo(() => new Map((orders ?? []).map((o) => [o.id, o])), [orders]);

  // قسائم الجولة الحالية والقسائم المنتظرة لجولة قادمة
  const myTickets = useMemo(() => {
    const list = (tickets ?? []).filter((t) => (draw && t.drawId === draw.id) || t.drawId === null);
    return list.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return newestFirst ? diff : -diff;
    });
  }, [tickets, draw, newestFirst]);

  const count = draw ? (tickets ?? []).filter((t) => t.drawId === draw.id).length : 0;
  const sold = draw?.soldTickets ?? 0;
  const target = draw?.targetTickets ?? 0;
  const fill = target > 0 ? Math.min(1, sold / target) : 0;

  // لا يوجد تاريخ انتهاء للجولات — السحب يُجرى عند اكتمال العدد
  const roundNote =
    draw?.status === "ready_to_draw"
      ? "اكتمل العدد — السحب قريباً"
      : draw?.status === "scheduled"
      ? "تبدأ قريباً"
      : "السحب عند اكتمال العدد";

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    queryClient.invalidateQueries({ queryKey: ["/api/winners"] });
    refetch();
  }, [refetch]);

  const header = (
    <View style={[s.header, { paddingTop: insets.top + Spacing.md, paddingHorizontal: margin }]}>
      <Text style={s.title}>قسائمي</Text>
      <Text style={s.subtitle}>كل عملية شراء تقربك من الجائزة الكبرى</Text>
    </View>
  );

  if (!user) {
    return (
      <View style={s.root}>
        {header}
        <EmptyState
          icon="ticket-outline"
          title="سجّل الدخول لعرض قسائمك"
          body="بتظهر هنا قسائمك بالسحب"
          action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
        />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {header}

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, { paddingHorizontal: margin }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />}
        >
          {draw && (
            <Pressable
              onPress={() => router.push("/draw" as any)}
              accessibilityRole="button"
              accessibilityLabel={`الجولة الحالية، ${formatCount(sold)} من ${formatCount(target)} قسيمة`}
              style={({ pressed }) => [s.round, { minHeight: dp(186) }, pressed && { opacity: 0.96 }]}
            >
              <View style={s.roundMain}>
                <View style={s.roundTop}>
                  <View style={s.roundCount}>
                    <Text style={s.countLine}>
                      <Text style={s.countStrong}>{formatCount(sold)}</Text>
                      {" من "}
                      <Text style={s.countStrong}>{formatCount(target)}</Text>
                      {" قسيمة"}
                    </Text>
                    <Text style={s.muted}>متبقي {formatCount(Math.max(0, target - sold))} قسيمة</Text>
                  </View>
                  <View style={s.roundInfo}>
                    <Text style={s.roundTitle}>الجولة الحالية</Text>
                    <Text style={s.muted} numberOfLines={1}>{roundNote}</Text>
                  </View>
                </View>

                <View style={s.track}>
                  {fill > 0 && <View style={[s.fill, { width: `${fill * 100}%` }]} />}
                </View>
                <Text style={s.percent}>{formatPercent(sold, target)}</Text>
              </View>

              <View style={[s.roundIcon, { width: dp(110), height: dp(110), borderRadius: dp(55) }]}>
                <MaterialCommunityIcons name="ticket-confirmation" size={34} color={c.primary} style={s.tilted} />
              </View>
            </Pressable>
          )}

          {draw && (
            <View style={[s.summary, { minHeight: dp(175) }]}>
              <Text style={s.summaryCaption}>لديك حالياً</Text>
              <View style={s.summaryRow}>
                <Text style={s.summaryNumber}>
                  {count} {voucherWord(count)}
                </Text>
                <View style={s.summaryIcon}>
                  <MaterialCommunityIcons
                    name="ticket-confirmation-outline"
                    size={38}
                    color={c.navy}
                    style={[s.tilted, s.summaryIconBack]}
                  />
                  <MaterialCommunityIcons name="ticket-confirmation" size={38} color={c.navy} style={s.tilted} />
                </View>
              </View>
              <Text style={s.summaryCaption}>في هذه الجولة</Text>
            </View>
          )}

          <View style={[s.segment, { height: dp(72) }]} accessibilityRole="tablist">
            {(
              [
                ["current", "قسائمي الحالية"],
                ["past", "السحوبات السابقة"],
              ] as const
            ).map(([key, label]) => {
              const active = tab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTab(key);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[s.segmentItem, active && s.segmentActive]}
                >
                  <Text style={[s.segmentText, active && s.segmentTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {tab === "current" ? (
            myTickets.length === 0 ? (
              <EmptyState
                icon="ticket-outline"
                title="ما عندك قسائم بعد"
                body={
                  draw
                    ? `كل ${parseFloat(draw.ticketPrice).toFixed(0)}$ من مشترياتك بتعطيك قسيمة سحب`
                    : "القسائم بتنضاف لما تشتري من المتجر"
                }
              />
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setNewestFirst((v) => !v);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={s.sortBtn}
                >
                  <Ionicons name="chevron-down" size={14} color={c.navy} />
                  <Text style={s.sortText}>{newestFirst ? "الأحدث أولاً" : "الأقدم أولاً"}</Text>
                  <Ionicons name="swap-vertical" size={18} color={c.navy} />
                </Pressable>

                <View style={{ gap: dp(16) }}>
                  {myTickets.map((t) => (
                    <TicketRow key={t.id} ticket={t} order={ordersById.get(t.orderId)} />
                  ))}
                </View>
              </>
            )
          ) : winnersLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: Spacing.xl }} />
          ) : (winners ?? []).length === 0 ? (
            <EmptyState icon="trophy-outline" title="ما في سحوبات سابقة بعد" body="أول سحب رح يظهر هون مع الفائز" />
          ) : (
            <View style={{ gap: dp(16) }}>
              {(winners ?? []).map((w) => (
                <PastDrawCard key={w.drawId} winner={w} />
              ))}
            </View>
          )}

          <Pressable
            onPress={() => router.push("/(tabs)/products" as any)}
            accessibilityRole="button"
            style={({ pressed }) => [s.shopBtn, { height: dp(78) }, pressed && { backgroundColor: c.primaryPressed }]}
          >
            <Ionicons name="cart-outline" size={22} color={c.surface} />
            <Text style={s.shopBtnText}>تسوق واحصل على قسائم أكثر</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { alignItems: "flex-start", gap: 4, paddingBottom: Spacing.sm },
  title: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 36, color: c.navy, writingDirection: "rtl" },
  subtitle: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: c.textSecondary, writingDirection: "rtl" },

  content: {
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === "web" ? 110 : 120,
    gap: Spacing.md,
  },

  tilted: { transform: [{ rotate: "-35deg" }] },
  muted: { fontFamily: Fonts.regular, fontSize: 12, color: c.textMuted, writingDirection: "rtl" },

  round: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    padding: Spacing.lg,
    shadowColor: c.navy,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  roundMain: { flex: 1, gap: Spacing.sm },
  roundTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: Spacing.sm },
  roundCount: { alignItems: "flex-start", gap: 4 },
  countLine: { fontFamily: Fonts.regular, fontSize: 13, color: c.navy, writingDirection: "rtl" },
  countStrong: { fontFamily: Fonts.bold, fontSize: 17 },
  roundInfo: { flexShrink: 1, alignItems: "flex-end", gap: 4 },
  roundTitle: { fontFamily: Fonts.bold, fontSize: 15, color: c.navy, writingDirection: "rtl" },
  track: {
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: "#DCE4F0",
    overflow: "hidden",
    alignItems: "flex-end",
    marginTop: Spacing.xs,
  },
  fill: { height: "100%", borderRadius: Radius.pill, backgroundColor: c.primary },
  percent: {
    alignSelf: "flex-end",
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: c.navy,
    writingDirection: "ltr",
  },
  roundIcon: { backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" },

  summary: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "#E4ECF8",
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  summaryCaption: { fontFamily: Fonts.medium, fontSize: 14, color: c.navy, writingDirection: "rtl" },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: Spacing.lg },
  summaryNumber: { fontFamily: Fonts.bold, fontSize: 34, lineHeight: 44, color: c.navy, writingDirection: "rtl" },
  summaryIcon: { width: 52, height: 44, alignItems: "center", justifyContent: "center" },
  summaryIconBack: { position: "absolute", top: -6, start: 6, opacity: 0.55 },

  segment: {
    flexDirection: "row",
    backgroundColor: "#E9EDF3",
    borderRadius: Radius.card,
    padding: 3,
  },
  segmentItem: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 13 },
  segmentActive: { backgroundColor: c.navy },
  segmentText: { fontFamily: Fonts.bold, fontSize: 15, color: c.text, writingDirection: "rtl" },
  segmentTextActive: { color: c.surface },

  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" },
  sortText: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: c.navy, writingDirection: "rtl" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    paddingStart: Spacing.md,
    paddingEnd: Spacing.sm,
    paddingVertical: Spacing.sm,
    shadowColor: c.navy,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateCol: { alignItems: "flex-start", gap: 4 },
  dateText: { fontFamily: Fonts.regular, fontSize: 12, color: c.textSecondary, writingDirection: "ltr" },
  orderCol: { flex: 1, alignItems: "flex-end", gap: 4 },
  orderLine: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: c.text,
    textAlign: TOWARD_END,
    writingDirection: "rtl",
  },
  orderStrong: { fontFamily: Fonts.bold, color: c.navy },
  rowNote: { fontFamily: Fonts.medium, fontSize: 10.5, color: c.textMuted, writingDirection: "rtl" },

  stub: { borderRadius: 6, justifyContent: "center", overflow: "hidden" },
  stubInner: {
    flex: 1,
    margin: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.55)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stubCode: { fontFamily: Fonts.bold, fontSize: 18, color: c.surface, writingDirection: "ltr" },
  perforation: { position: "absolute", top: 4, bottom: 4, justifyContent: "space-between" },
  hole: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.surface },

  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: c.primary,
    borderRadius: Radius.card,
    marginTop: Spacing.sm,
  },
  shopBtnText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: c.surface, writingDirection: "rtl" },

  pastCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    padding: Spacing.md,
  },
  pastDate: { alignItems: "flex-start", gap: 6 },
  pastDateLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  pastCaption: { fontFamily: Fonts.regular, fontSize: 11, color: c.textSecondary, writingDirection: "rtl" },
  pastDateValue: { fontFamily: Fonts.medium, fontSize: 13, color: c.navy, writingDirection: "ltr" },
  pastCongrats: { fontFamily: Fonts.medium, fontSize: 11, color: c.text, writingDirection: "rtl" },
  pastInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  pastPrize: { fontFamily: Fonts.bold, fontSize: 18, color: c.navy, textAlign: TOWARD_END },
  pastImage: { alignItems: "center", justifyContent: "center" },
});
