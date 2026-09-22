import React, { useMemo, useState, useCallback } from "react";
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
import { Header, StatusBadge, EmptyState } from "@/components/ui";
import type { Order, OrderItem } from "@shared/schema";

const c = Colors.light;

type OrderWithItems = Order & { items?: OrderItem[] };
type Filter = "all" | "active" | "done";

/** الحالة المعروضة للطلب — الدفع أولاً، وبعد تأكيده الشحن */
function orderState(order: Order): {
  label: string;
  kind: "success" | "warning" | "error" | "info";
  done: boolean;
} {
  if (order.paymentStatus === "rejected") {
    return { label: "دفع مرفوض", kind: "error", done: true };
  }
  if (order.shippingStatus === "cancelled") {
    return { label: "ملغي", kind: "error", done: true };
  }
  if (order.paymentStatus !== "confirmed") {
    return { label: "قيد التأكيد", kind: "warning", done: false };
  }
  if (order.shippingStatus === "delivered") {
    return { label: "تم التسليم", kind: "success", done: true };
  }
  if (order.shippingStatus === "shipped") {
    return { label: "تم الشحن", kind: "info", done: false };
  }
  return { label: "قيد التنفيذ", kind: "info", done: false };
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const state = orderState(order);
  const items = order.items ?? [];
  const names = items.map((i) => i.productName).join(" + ");
  const thumbs = items.slice(0, 3);

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.thumbs}>
          {thumbs.length > 0 ? (
            thumbs.map((item) => {
              const uri = buildMediaUrl(item.productImageUrl);
              return (
                <View key={item.id} style={s.thumb}>
                  {uri ? (
                    <Image
                      source={{ uri }}
                      style={s.thumbImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Ionicons name="cube-outline" size={20} color={c.textMuted} />
                  )}
                </View>
              );
            })
          ) : (
            <View style={s.thumb}>
              <Ionicons name="cube-outline" size={20} color={c.textMuted} />
            </View>
          )}
        </View>

        <View style={s.cardInfo}>
          <Text style={s.orderId}>#{order.id.slice(0, 8)}</Text>
          <Text style={s.orderDate}>
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </Text>
          <View style={s.badgeWrap}>
            <StatusBadge kind={state.kind} label={state.label} />
          </View>
          <Text style={s.orderAmount}>${parseFloat(order.totalAmount).toFixed(0)}</Text>
        </View>
      </View>

      {names ? (
        <Text style={s.orderNames} numberOfLines={2}>
          {names}
        </Text>
      ) : null}

      {order.ticketsAwarded > 0 && (
        <View style={s.chancesRow}>
          <Ionicons name="ticket" size={14} color={c.goldText} />
          <Text style={s.chancesText}>{order.ticketsAwarded} فرصة من هذا الطلب</Text>
        </View>
      )}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/order/[id]", params: { id: order.id } });
        }}
        accessibilityRole="button"
        style={s.detailsLink}
      >
        <Text style={s.detailsText}>تفاصيل الطلب</Text>
        <Ionicons name="chevron-back" size={16} color={c.primary} />
      </Pressable>
    </View>
  );
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: orders, isLoading, refetch, isRefetching } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
    staleTime: 5000,
  });

  const filtered = useMemo(() => {
    const list = orders ?? [];
    if (filter === "all") return list;
    const wantDone = filter === "done";
    return list.filter((o) => orderState(o).done === wantDone);
  }, [orders, filter]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    refetch();
  }, [refetch]);

  if (!user) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="طلباتي" showBack />
        <EmptyState
          icon="receipt-outline"
          title="سجّل الدخول لعرض طلباتك"
          action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
        />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="طلباتي" showBack />

      <View style={s.tabs}>
        {(
          [
            { key: "all" as const, label: "الكل" },
            { key: "active" as const, label: "قيد التنفيذ" },
            { key: "done" as const, label: "المكتملة" },
          ]
        ).map((t) => {
          const active = filter === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(t.key);
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
          {filtered.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title={filter === "all" ? "ما في طلبات بعد" : "ما في طلبات بهذه الحالة"}
              body={
                filter === "all"
                  ? "طلباتك بتظهر هنا مع حالتها وفرصك منها"
                  : "جرّب تبويب تاني"
              }
              action={
                filter === "all"
                  ? { label: "تصفّح المتجر", onPress: () => router.push("/(tabs)/products" as any) }
                  : undefined
              }
            />
          ) : (
            filtered.map((o) => <OrderCard key={o.id} order={o} />)
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
    height: 40,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.background,
  },
  tabActive: { backgroundColor: c.primary },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
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
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  thumbs: { flexDirection: "row", gap: 6 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.button,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, alignItems: "flex-end", gap: 5 },
  orderId: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: c.navy, writingDirection: "ltr" },
  orderDate: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    writingDirection: "ltr",
  },
  badgeWrap: { alignSelf: "flex-end" },
  orderAmount: { fontFamily: Fonts.bold, fontSize: FontSize.h2, color: c.navy },

  orderNames: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
  chancesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.goldSoft,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chancesText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
    color: c.goldText,
    textAlign: "right",
    writingDirection: "rtl",
  },
  detailsLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle,
  },
  detailsText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
    color: c.primary,
    writingDirection: "rtl",
  },
});
