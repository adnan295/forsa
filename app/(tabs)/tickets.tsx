import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/query-client";
import type { Ticket, Order } from "@shared/schema";

type TabKey = "orders" | "tickets";

const getPaymentStatusAr = (s: string) => {
  const map: Record<string, string> = { pending_payment: "في انتظار الدفع", pending_review: "قيد المراجعة", confirmed: "تم التأكيد", rejected: "مرفوض" };
  return map[s] || s;
};
const getPaymentColor = (s: string) => {
  const map: Record<string, string> = { pending_payment: "#F39C12", pending_review: "#3498DB", confirmed: "#2ECC71", rejected: "#E74C3C" };
  return map[s] || "#666";
};
const getPaymentIcon = (s: string): keyof typeof Ionicons.glyphMap => {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = { pending_payment: "time", pending_review: "hourglass", confirmed: "checkmark-circle", rejected: "close-circle" };
  return map[s] || "help-circle";
};
const getShippingStatusAr = (s: string) => {
  const map: Record<string, string> = { pending: "قيد الانتظار", processing: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };
  return map[s] || s;
};
const getShippingColor = (s: string) => {
  const map: Record<string, string> = { pending: "#F39C12", processing: "#3498DB", shipped: "#9B59B6", delivered: "#2ECC71", cancelled: "#E74C3C" };
  return map[s] || "#666";
};
const getShippingIcon = (s: string): keyof typeof Ionicons.glyphMap => {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = { pending: "cube-outline", processing: "build-outline", shipped: "airplane-outline", delivered: "checkmark-done", cancelled: "ban" };
  return map[s] || "help-circle";
};

function OrderItem({ order }: { order: Order }) {
  const paymentColor = getPaymentColor(order.paymentStatus);
  const shippingColor = getShippingColor(order.shippingStatus);

  return (
    <Pressable
      style={styles.orderCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/order/[id]", params: { id: order.id } });
      }}
    >
      <View style={styles.orderTop}>
        <View style={styles.orderIdArea}>
          <View style={styles.orderIconWrap}>
            <Ionicons name="receipt" size={18} color={Colors.light.accent} />
          </View>
          <View>
            <Text style={styles.orderIdText}>#{order.id.slice(0, 8)}</Text>
            <Text style={styles.orderDate}>
              {new Date(order.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
            </Text>
          </View>
        </View>
        <View style={styles.orderAmountArea}>
          <Text style={styles.orderAmount}>{parseFloat(order.totalAmount).toFixed(2)} ر.س</Text>
          <Text style={styles.orderQty}>{order.quantity} منتج</Text>
        </View>
      </View>

      <View style={styles.orderDivider} />

      <View style={styles.orderPills}>
        <View style={[styles.pill, { backgroundColor: paymentColor + "12", borderColor: paymentColor + "30" }]}>
          <Ionicons name={getPaymentIcon(order.paymentStatus)} size={13} color={paymentColor} />
          <Text style={[styles.pillText, { color: paymentColor }]}>
            {getPaymentStatusAr(order.paymentStatus)}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: shippingColor + "12", borderColor: shippingColor + "30" }]}>
          <Ionicons name={getShippingIcon(order.shippingStatus)} size={13} color={shippingColor} />
          <Text style={[styles.pillText, { color: shippingColor }]}>
            {getShippingStatusAr(order.shippingStatus)}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-back" size={18} color={Colors.light.textSecondary} />
      </View>
    </Pressable>
  );
}

function TicketItem({ ticket }: { ticket: Ticket }) {
  const isWinner = !!ticket.isWinner;

  return (
    <View style={[styles.ticketCard, isWinner && styles.winnerCard]}>
      <View style={styles.ticketNotch} />
      <View style={styles.ticketNotchRight} />

      <View style={styles.ticketLeft}>
        <View style={[styles.ticketIconWrap, isWinner && styles.ticketIconWrapWinner]}>
          <Ionicons
            name={isWinner ? "trophy" : "ticket"}
            size={22}
            color={isWinner ? "#FFD700" : Colors.light.accent}
          />
        </View>
      </View>

      <View style={styles.ticketDashed} />

      <View style={styles.ticketRight}>
        <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
        <Text style={styles.ticketDate}>
          {new Date(ticket.createdAt).toLocaleDateString("ar-SA", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        {isWinner && (
          <View style={styles.winnerBadge}>
            <Ionicons name="star" size={11} color="#FFD700" />
            <Text style={styles.winnerText}>فائز</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("orders");

  const {
    data: tickets,
    isLoading: ticketsLoading,
    refetch: refetchTickets,
    isRefetching: ticketsRefetching,
  } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: !!user,
    staleTime: 5000,
  });

  const {
    data: orders,
    isLoading: ordersLoading,
    refetch: refetchOrders,
    isRefetching: ordersRefetching,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
    staleTime: 5000,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    refetchTickets();
    refetchOrders();
  }, [refetchTickets, refetchOrders]);

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top, alignItems: "center" }}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="receipt-outline" size={40} color={Colors.light.tabIconDefault} />
          </View>
          <Text style={styles.emptyTitle}>سجّل الدخول لعرض طلباتك</Text>
          <Text style={styles.emptyText}>
            ستظهر طلباتك وتذاكرك هنا بعد شراء المنتجات
          </Text>
          <Pressable
            onPress={() => router.push("/auth")}
            style={styles.signInButton}
          >
            <LinearGradient
              colors={[Colors.light.accent, Colors.light.accentDark]}
              style={styles.signInGradient}
            >
              <Text style={styles.signInButtonText}>تسجيل الدخول</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const isLoading = ticketsLoading || ordersLoading;
  const isRefetching = ticketsRefetching || ordersRefetching;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  const renderItem = ({ item, section }: any) => {
    if (section.key === "orders") {
      return <OrderItem order={item} />;
    }
    return <TicketItem ticket={item} />;
  };

  const currentData = activeTab === "orders" ? (orders || []) : (tickets || []);
  const sections = currentData.length > 0 ? [{ key: activeTab, data: currentData }] : [];

  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <LinearGradient
        colors={activeTab === "orders" ? ["rgba(124,58,237,0.08)", "rgba(236,72,153,0.08)"] : ["rgba(236,72,153,0.08)", "rgba(124,58,237,0.08)"]}
        style={styles.emptyIconWrap}
      >
        <Ionicons
          name={activeTab === "orders" ? "bag-outline" : "sparkles-outline"}
          size={36}
          color={activeTab === "orders" ? Colors.light.accent : Colors.light.accentPink}
        />
      </LinearGradient>
      <Text style={styles.emptyTitle}>
        {activeTab === "orders" ? "لا توجد طلبات بعد" : "لا توجد تذاكر بعد"}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === "orders"
          ? "اكتشف المنتجات المميزة واحصل على فرصة للفوز بهدية!"
          : "كل منتج تشتريه يمنحك فرصة للحصول على هدية!"}
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/" as any)}
        style={styles.emptyActionBtn}
      >
        <LinearGradient
          colors={[Colors.light.accent, Colors.light.accentPink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyActionGradient}
        >
          <Ionicons name="compass" size={18} color="#fff" />
          <Text style={styles.emptyActionText}>تصفّح المنتجات</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerArea, { paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16 }]}>
        <Text style={styles.screenTitle}>طلباتي</Text>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => {
              setActiveTab("orders");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.tabBtn, activeTab === "orders" && styles.tabBtnActive]}
          >
            <Ionicons name="receipt" size={16} color={activeTab === "orders" ? "#fff" : Colors.light.textSecondary} />
            <Text style={[styles.tabBtnText, activeTab === "orders" && styles.tabBtnTextActive]}>
              الطلبات ({orders?.length || 0})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveTab("tickets");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.tabBtn, activeTab === "tickets" && styles.tabBtnActive]}
          >
            <Ionicons name="ticket" size={16} color={activeTab === "tickets" ? "#fff" : Colors.light.textSecondary} />
            <Text style={[styles.tabBtnText, activeTab === "tickets" && styles.tabBtnTextActive]}>
              التذاكر ({tickets?.length || 0})
            </Text>
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        renderSectionHeader={() => null}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : 100 },
        ]}
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerArea: {
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.text,
    marginBottom: 14,
    paddingHorizontal: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  tabRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginBottom: 16,
  },
  tabBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tabBtnActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
    shadowOpacity: 0.12,
  },
  tabBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },

  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  orderTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderIdArea: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  orderIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(124, 58, 237, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  orderIdText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
  },
  orderDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  orderAmountArea: {
    alignItems: "flex-start",
  },
  orderAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
  },
  orderQty: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
    marginTop: 2,
  },
  orderDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  orderPills: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    writingDirection: "rtl",
  },

  ticketCard: {
    flexDirection: "row-reverse",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    position: "relative",
  },
  winnerCard: {
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOpacity: 0.2,
  },
  ticketNotch: {
    position: "absolute",
    top: "50%",
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    marginTop: -8,
    zIndex: 2,
  },
  ticketNotchRight: {
    position: "absolute",
    top: "50%",
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    marginTop: -8,
    zIndex: 2,
  },
  ticketLeft: {
    width: 74,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  ticketIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(124, 58, 237, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketIconWrapWinner: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
  },
  ticketDashed: {
    width: 1,
    borderLeftWidth: 1.5,
    borderLeftColor: Colors.light.border,
    borderStyle: "dashed",
    marginVertical: 12,
  },
  ticketRight: {
    flex: 1,
    padding: 16,
    paddingRight: 12,
    justifyContent: "center",
  },
  ticketNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.light.text,
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  ticketDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  winnerBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  winnerText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#B8860B",
    writingDirection: "rtl",
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
    marginTop: 4,
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
  emptyActionBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 20,
  },
  emptyActionGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyActionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  signInButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 20,
  },
  signInGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  signInButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
});
