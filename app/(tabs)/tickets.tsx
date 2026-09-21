import React, { useCallback, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing } from "@/constants/colors";
import { Header, StatusBadge, EmptyState, NavRow } from "@/components/ui";
import DrawBanner, { type CurrentDraw } from "@/components/DrawBanner";
import type { Order, Ticket } from "@shared/schema";

const c = Colors.light;

type SubTab = "chances" | "orders";
type OrderWithItems = Order & { items?: { productName: string; quantity: number }[] };

const PAYMENT_STATUS: Record<
  string,
  { label: string; kind: "success" | "warning" | "error" | "info" }
> = {
  confirmed: { label: "مؤكدة", kind: "success" },
  pending_review: { label: "قيد التأكيد", kind: "warning" },
  pending_payment: { label: "بانتظار الدفع", kind: "warning" },
  rejected: { label: "مرفوضة", kind: "error" },
};

const SHIPPING_STATUS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: "قيد المعالجة", icon: "cube-outline" },
  processing: { label: "جاري التجهيز", icon: "construct-outline" },
  shipped: { label: "تم الشحن", icon: "airplane-outline" },
  delivered: { label: "تم التوصيل", icon: "checkmark-done" },
  cancelled: { label: "ملغي", icon: "ban-outline" },
};

/** قسيمة سحب — بطاقة بيضاء بحدود متقطعة ورقم كحلي */
function ChanceCard({ ticket, drawTitle }: { ticket: Ticket; drawTitle: string }) {
  return (
    <View style={[s.chanceCard, ticket.isWinner && s.chanceCardWinner]}>
      <View style={s.chanceTop}>
        <StatusBadge
          kind={ticket.isWinner ? "success" : "success"}
          label={ticket.isWinner ? "فائزة" : "مؤكدة"}
          icon={ticket.isWinner ? "trophy" : "checkmark-circle"}
        />
        <Text style={s.chanceNumber}>{ticket.ticketNumber}</Text>
      </View>
      <View style={s.chanceDivider} />
      <Text style={s.chanceDraw}>{drawTitle}</Text>
    </View>
  );
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const payment = PAYMENT_STATUS[order.paymentStatus] ?? {
    label: order.paymentStatus,
    kind: "info" as const,
  };
  const shipping = SHIPPING_STATUS[order.shippingStatus] ?? {
    label: order.shippingStatus,
    icon: "help-circle-outline" as const,
  };
  const summary = (order.items ?? []).map((i) => `${i.productName} ×${i.quantity}`).join("، ");

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/order/[id]", params: { id: order.id } });
      }}
      accessibilityRole="button"
      style={({ pressed }) => [s.orderCard, pressed && { opacity: 0.95 }]}
    >
      <View style={s.orderTop}>
        <Text style={s.orderAmount}>${parseFloat(order.totalAmount).toFixed(0)}</Text>
        <View style={s.orderIdBlock}>
          <Text style={s.orderId}>#{order.id.slice(0, 8)}</Text>
          <Text style={s.orderDate}>
            {new Date(order.createdAt).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>

      {summary ? (
        <Text style={s.orderSummary} numberOfLines={2}>
          {summary}
        </Text>
      ) : null}

      {order.ticketsAwarded > 0 && (
        <View style={s.orderChances}>
          <Ionicons name="ticket" size={14} color={c.goldText} />
          <Text style={s.orderChancesText}>
            حصلت على {order.ticketsAwarded} فرصة من هذا الطلب
          </Text>
        </View>
      )}

      <View style={s.orderPills}>
        <Ionicons name="chevron-back" size={17} color={c.textMuted} />
        <View style={{ flex: 1 }} />
        <View style={s.shippingPill}>
          <Ionicons name={shipping.icon} size={13} color={c.textSecondary} />
          <Text style={s.shippingText}>{shipping.label}</Text>
        </View>
        <StatusBadge kind={payment.kind} label={payment.label} />
      </View>
    </Pressable>
  );
}

export default function TicketsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<SubTab>("chances");

  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const {
    data: tickets,
    isLoading: ticketsLoading,
    refetch: refetchTickets,
    isRefetching,
  } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: !!user,
    staleTime: 5000,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
    staleTime: 5000,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    refetchTickets();
  }, [refetchTickets]);

  if (!user) {
    return (
      <View style={s.root}>
        <Header title="قسائمي" />
        <EmptyState
          icon="ticket-outline"
          title="سجّل الدخول لعرض قسائمك"
          body="بتظهر هنا فرصك بالسحب وطلباتك"
          action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
        />
      </View>
    );
  }

  const isLoading = tab === "chances" ? ticketsLoading : ordersLoading;
  const currentTickets = (tickets ?? []).filter((t) => draw && t.drawId === draw.id);
  const pendingTickets = (tickets ?? []).filter((t) => t.drawId === null);

  return (
    <View style={s.root}>
      <Header title="قسائمي" />

      <View style={s.tabs}>
        {(
          [
            { key: "chances" as const, label: "فرصي" },
            { key: "orders" as const, label: "طلباتي" },
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

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
        >
          {tab === "chances" ? (
            <>
              {draw && <DrawBanner draw={draw} onPress={() => router.push("/draw" as any)} />}

              {currentTickets.length === 0 && pendingTickets.length === 0 ? (
                <EmptyState
                  icon="ticket-outline"
                  title="ما عندك فرص بعد"
                  body="اشترِ من المتجر وكل مبلغ محدّد من مشترياتك بيعطيك فرصة"
                  action={{
                    label: "تصفّح المتجر",
                    onPress: () => router.push("/(tabs)/products" as any),
                  }}
                />
              ) : (
                <>
                  {currentTickets.map((t) => (
                    <ChanceCard key={t.id} ticket={t} drawTitle={draw?.title ?? "السحب الحالي"} />
                  ))}

                  {pendingTickets.length > 0 && (
                    <>
                      <Text style={s.groupTitle}>بانتظار السحب القادم</Text>
                      {pendingTickets.map((t) => (
                        <ChanceCard key={t.id} ticket={t} drawTitle="لم يُحدَّد بعد" />
                      ))}
                    </>
                  )}
                </>
              )}

              <NavRow
                icon="information-circle-outline"
                title="شروط السحب"
                subtitle="اطّلع على جميع تفاصيل وآلية السحب والمعايير المعتمدة."
                onPress={() => router.push({ pathname: "/info", params: { type: "terms" } } as any)}
              />
            </>
          ) : (orders ?? []).length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="ما في طلبات بعد"
              body="طلباتك بتظهر هنا مع حالتها وفرصك منها"
              action={{
                label: "تصفّح المتجر",
                onPress: () => router.push("/(tabs)/products" as any),
              }}
            />
          ) : (
            (orders ?? []).map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

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

  content: {
    padding: Spacing.screen,
    paddingBottom: Platform.OS === "web" ? 110 : 120,
    gap: Spacing.md,
  },
  groupTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: Spacing.sm,
  },

  chanceCard: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
  },
  chanceCardWinner: { borderColor: c.gold, backgroundColor: c.goldSoft },
  chanceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chanceNumber: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    /** ثابت الاتجاه حتى ما ينعكس ضمن النص العربي */
    writingDirection: "ltr",
  },
  chanceDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.borderSubtle },
  chanceDraw: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },

  orderCard: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderIdBlock: { alignItems: "flex-end", gap: 2 },
  orderId: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: c.navy, writingDirection: "ltr" },
  orderDate: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    writingDirection: "rtl",
  },
  orderAmount: { fontFamily: Fonts.bold, fontSize: FontSize.h3, color: c.primary },
  orderSummary: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
  orderChances: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.goldSoft,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  orderChancesText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
    color: c.goldText,
    textAlign: "right",
    writingDirection: "rtl",
  },
  orderPills: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  shippingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  shippingText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
});
