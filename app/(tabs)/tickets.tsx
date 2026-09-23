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
  I18nManager,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { buildMediaUrl, queryClient } from "@/lib/query-client";
import { useDesignScale } from "@/lib/design-scale";
import { shortTicketCode, voucherWord } from "@/lib/vouchers";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { EmptyState } from "@/components/ui";
import AppTopBar from "@/components/AppTopBar";
import DrawHero from "@/components/DrawHero";
import type { CurrentDraw } from "@/components/DrawBanner";
import type { Order, Ticket } from "@shared/schema";

const c = Colors.light;

const CHEVRON_BACK = I18nManager.isRTL ? "chevron-back" : "chevron-forward";

interface Winner {
  drawId: string;
  prizeName: string;
  prizeImageUrl: string | null;
  ticketNumber: string | null;
  drawnAt: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** يعزل الأرقام والرموز اللاتينية داخل جملة عربية حتى لا تنقلب ($23 لا 23$) */
const ltr = (value: string) => `\u2066${value}\u2069`;

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

type TicketStatus = "valid" | "winner" | "pending";

const STATUS: Record<TicketStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; fg: string; bg: string }> = {
  valid: { label: "قسيمة صالحة", icon: "checkmark", fg: StatusColors.success.fg, bg: StatusColors.success.bg },
  winner: { label: "قسيمة فائزة", icon: "trophy", fg: c.goldText, bg: c.goldSoft },
  pending: { label: "بانتظار الجولة", icon: "time-outline", fg: StatusColors.info.fg, bg: StatusColors.info.bg },
};

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

function TicketRow({ ticket, order, status }: { ticket: Ticket; order?: Order; status: TicketStatus }) {
  const dp = useDesignScale();
  const st = STATUS[status];
  const code = shortTicketCode(ticket.ticketNumber);

  return (
    <View
      style={[s.row, { minHeight: dp(100) }]}
      accessible
      accessibilityLabel={`${st.label}، رقم ${ticket.ticketNumber}، الطلب ${ticket.orderId.slice(0, 8)}`}
    >
      <View style={[s.statusPill, { backgroundColor: st.bg }]}>
        <Ionicons name={st.icon} size={12} color={st.fg} />
        <Text style={[s.statusText, { color: st.fg }]}>{st.label}</Text>
      </View>

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
      </View>

      <LinearGradient
        colors={status === "winner" ? [c.gold, "#E09A12"] : [c.primary, c.navySoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.stub, { width: dp(200), height: dp(76) }]}
      >
        <View style={s.stubInner}>
          <MaterialCommunityIcons name="ticket-confirmation" size={20} color={c.surface} style={s.stubIcon} />
          <Text style={s.stubCode} numberOfLines={1}>{code}</Text>
        </View>
        <Perforation side="start" />
        <Perforation side="end" />
      </LinearGradient>
    </View>
  );
}

export default function TicketsScreen() {
  const { user } = useAuth();
  const dp = useDesignScale();
  const margin = dp(16);
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

  const { data: winners } = useQuery<Winner[]>({
    queryKey: ["/api/winners"],
    staleTime: 60000,
  });

  const ordersById = useMemo(() => new Map((orders ?? []).map((o) => [o.id, o])), [orders]);

  const sortTickets = useCallback(
    (list: Ticket[]) =>
      [...list].sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return newestFirst ? diff : -diff;
      }),
    [newestFirst],
  );

  const currentTickets = useMemo(
    () => sortTickets((tickets ?? []).filter((t) => draw && t.drawId === draw.id)),
    [tickets, draw, sortTickets],
  );
  const pendingTickets = useMemo(
    () => sortTickets((tickets ?? []).filter((t) => t.drawId === null)),
    [tickets, sortTickets],
  );

  const lastWinner = winners?.[0];
  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;
  const count = currentTickets.length;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    queryClient.invalidateQueries({ queryKey: ["/api/winners"] });
    refetch();
  }, [refetch]);

  const shopButton = (
    <Pressable
      onPress={() => router.push("/(tabs)/products" as any)}
      accessibilityRole="button"
      style={({ pressed }) => [s.shopBtn, { height: dp(72) }, pressed && { backgroundColor: c.primaryPressed }]}
    >
      <Ionicons name="cart-outline" size={20} color={c.surface} />
      <Text style={s.shopBtnText}>تسوق واحصل على قسائم أكثر</Text>
    </Pressable>
  );

  return (
    <View style={s.root}>
      <AppTopBar />

      {user && isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, { paddingHorizontal: margin }]}
          refreshControl={
            user ? <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} /> : undefined
          }
        >
          {draw && <DrawHero draw={draw} compact onPress={() => router.push("/draw" as any)} />}

          {!user ? (
            <EmptyState
              icon="ticket-outline"
              title="سجّل الدخول لعرض قسائمك"
              body="بتظهر هنا قسائمك بالسحب"
              action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
            />
          ) : (
            <>
              {draw && (
                <View style={[s.summary, { minHeight: dp(160) }]}>
                  <LinearGradient
                    colors={[c.goldSoft, "#FCE7B0"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="cart" size={34} color={c.goldText} />
                  <View style={s.summaryRule}>
                    <Text style={s.summaryTitle}>{count > 0 ? "ممتاز!" : "ابدأ الآن!"}</Text>
                    <Text style={s.summaryBody}>
                      {`كل ${ticketPrice.toFixed(0)}$ من مشترياتك\n= قسيمة سحب`}
                    </Text>
                  </View>
                  <View style={s.summaryDivider} />
                  <View style={s.summaryCount}>
                    <Text style={s.summaryCaption}>لديك حالياً</Text>
                    <Text style={s.summaryNumber} numberOfLines={1} adjustsFontSizeToFit>
                      {count} {voucherWord(count)}
                    </Text>
                    <Text style={s.summaryCaption}>في هذه الجولة</Text>
                  </View>
                  <MaterialCommunityIcons name="ticket-confirmation" size={46} color={c.goldText} style={s.summaryTicket} />
                </View>
              )}

              {currentTickets.length === 0 && pendingTickets.length === 0 ? (
                <>
                  <EmptyState
                    icon="ticket-outline"
                    title="ما عندك قسائم بعد"
                    body={`كل ${ticketPrice > 0 ? `${ticketPrice.toFixed(0)}$` : "مبلغ محدّد"} من مشترياتك بيعطيك قسيمة سحب`}
                  />
                  {shopButton}
                </>
              ) : (
                <>
                  <View style={s.sectionHead}>
                    <View style={s.sectionTitleRow}>
                      <MaterialCommunityIcons name="ticket-confirmation" size={24} color={c.navy} style={s.sectionIcon} />
                      <Text style={s.sectionTitle}>
                        {currentTickets.length > 0 ? "قسائمي في هذه الجولة" : "قسائمي"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setNewestFirst((v) => !v);
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      style={s.sortBtn}
                    >
                      <Text style={s.sortText}>{newestFirst ? "الأحدث أولاً" : "الأقدم أولاً"}</Text>
                      <Ionicons name="swap-vertical" size={18} color={c.primary} />
                    </Pressable>
                  </View>

                  <View style={[s.list, { gap: dp(12) }]}>
                    {currentTickets.map((t) => (
                      <TicketRow
                        key={t.id}
                        ticket={t}
                        order={ordersById.get(t.orderId)}
                        status={t.isWinner ? "winner" : "valid"}
                      />
                    ))}
                  </View>

                  {pendingTickets.length > 0 && (
                    <>
                      <Text style={s.groupTitle}>بانتظار الجولة القادمة</Text>
                      <View style={[s.list, { gap: dp(12) }]}>
                        {pendingTickets.map((t) => (
                          <TicketRow key={t.id} ticket={t} order={ordersById.get(t.orderId)} status="pending" />
                        ))}
                      </View>
                    </>
                  )}

                  {shopButton}
                </>
              )}
            </>
          )}

          {lastWinner && (
            <View style={s.past}>
              <View style={s.sectionHead}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="trophy-outline" size={22} color={c.navy} />
                  <Text style={s.pastTitle}>السحوبات السابقة</Text>
                </View>
                <Pressable
                  onPress={() => router.push("/winners" as any)}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={s.sortBtn}
                >
                  <Text style={s.sortText}>عرض الكل</Text>
                  <Ionicons name={CHEVRON_BACK} size={18} color={c.primary} />
                </Pressable>
              </View>

              <View style={s.pastCard}>
                <View style={s.pastDate}>
                  <View style={s.pastDateLabel}>
                    <Ionicons name="calendar-outline" size={14} color={c.navy} />
                    <Text style={s.pastCaption}>تاريخ السحب</Text>
                  </View>
                  <Text style={s.pastDateValue}>{lastWinner.drawnAt ? formatDate(lastWinner.drawnAt) : "—"}</Text>
                  <Text style={s.pastCongrats}>🎉 مبروك للفائز!</Text>
                </View>

                <View style={s.pastInfo}>
                  <Text style={s.pastCaption}>الفائز في الجولة الماضية</Text>
                  <Text style={s.pastPrize} numberOfLines={2}>{lastWinner.prizeName}</Text>
                  {!!lastWinner.ticketNumber && (
                    <Text style={s.pastCaption}>
                      القسيمة الفائزة: <Text style={s.orderStrong}>{ltr(shortTicketCode(lastWinner.ticketNumber))}</Text>
                    </Text>
                  )}
                </View>

                <View style={[s.pastImage, { width: dp(125), height: dp(150) }]}>
                  {buildMediaUrl(lastWinner.prizeImageUrl) ? (
                    <Image
                      source={{ uri: buildMediaUrl(lastWinner.prizeImageUrl)! }}
                      style={StyleSheet.absoluteFill}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Ionicons name="gift" size={36} color={c.gold} />
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === "web" ? 110 : 120,
    gap: Spacing.md,
  },

  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: "#F3D48A",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    overflow: "hidden",
  },
  summaryRule: { flex: 1, alignItems: "flex-start", gap: 2 },
  summaryTitle: { fontFamily: Fonts.bold, fontSize: 15, color: c.goldText, writingDirection: "rtl" },
  summaryBody: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.goldText,
    writingDirection: "rtl",
  },
  summaryDivider: { width: 1, alignSelf: "stretch", marginVertical: Spacing.sm, backgroundColor: "rgba(117,69,0,0.25)" },
  summaryCount: { flex: 1, alignItems: "flex-start" },
  summaryCaption: { fontFamily: Fonts.medium, fontSize: 12.5, color: c.goldText, writingDirection: "rtl" },
  summaryNumber: {
    fontFamily: Fonts.bold,
    fontSize: 30,
    lineHeight: 38,
    color: c.goldText,
    writingDirection: "rtl",
  },
  summaryTicket: { transform: [{ rotate: "-35deg" }] },

  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.xs },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionIcon: { transform: [{ rotate: "-35deg" }] },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 17, color: c.navy, writingDirection: "rtl" },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sortText: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: c.primary, writingDirection: "rtl" },
  groupTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    writingDirection: "rtl",
    marginTop: Spacing.xs,
  },

  list: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    shadowColor: c.navy,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: Radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusText: { fontFamily: Fonts.medium, fontSize: 10, writingDirection: "rtl" },
  dateCol: { alignItems: "center", gap: 2 },
  dateText: { fontFamily: Fonts.regular, fontSize: 10, color: c.textSecondary, writingDirection: "ltr" },
  // يلتصق بجهة القسيمة كما في التصميم
  orderCol: { flex: 1, alignItems: "flex-end", gap: 4 },
  orderLine: { fontFamily: Fonts.regular, fontSize: 10.5, color: c.text, writingDirection: "rtl" },
  orderStrong: { fontFamily: Fonts.bold, color: c.navy },

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
    gap: 6,
  },
  stubIcon: { transform: [{ rotate: "-35deg" }] },
  stubCode: { fontFamily: Fonts.bold, fontSize: 16, color: c.surface, writingDirection: "ltr" },
  perforation: { position: "absolute", top: 4, bottom: 4, justifyContent: "space-between" },
  hole: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.surface },

  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: c.primary,
    borderRadius: Radius.card,
    marginTop: Spacing.xs,
  },
  shopBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.body, color: c.surface, writingDirection: "rtl" },

  past: {
    backgroundColor: "#EEF3FB",
    borderRadius: Radius.card,
    padding: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  pastTitle: { fontFamily: Fonts.bold, fontSize: 16, color: c.navy, writingDirection: "rtl" },
  pastCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.sm,
  },
  pastDate: { alignItems: "flex-start", gap: 6 },
  pastDateLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  pastCaption: { fontFamily: Fonts.regular, fontSize: 11, color: c.textSecondary, writingDirection: "rtl" },
  pastDateValue: { fontFamily: Fonts.medium, fontSize: 13, color: c.navy, writingDirection: "ltr" },
  pastCongrats: { fontFamily: Fonts.medium, fontSize: 11, color: c.text, writingDirection: "rtl" },
  pastInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  pastPrize: { fontFamily: Fonts.bold, fontSize: 18, color: c.navy, textAlign: I18nManager.isRTL ? "left" : "right" },
  pastImage: { alignItems: "center", justifyContent: "center" },
});
