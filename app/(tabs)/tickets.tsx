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
const getShippingStatusAr = (s: string) => {
  const map: Record<string, string> = { pending: "قيد الانتظار", processing: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };
  return map[s] || s;
};
const getShippingColor = (s: string) => {
  const map: Record<string, string> = { pending: "#F39C12", processing: "#3498DB", shipped: "#9B59B6", delivered: "#2ECC71", cancelled: "#E74C3C" };
  return map[s] || "#666";
};

function OrderItem({ order }: { order: Order }) {
  return (
    <Pressable
      style={styles.orderCard}
      onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdRow}>
          <Ionicons name="receipt" size={18} color={Colors.light.accent} />
          <Text style={styles.orderIdText}>#{order.id.slice(0, 8)}</Text>
        </View>
        <Ionicons name="chevron-back" size={18} color={Colors.light.textSecondary} />
      </View>
      <View style={styles.orderBody}>
        <View style={styles.orderInfoRow}>
          <Text style={styles.orderAmount}>${order.totalAmount}</Text>
          <Text style={styles.orderQty}>{order.quantity} تذكرة</Text>
        </View>
        <View style={styles.orderPills}>
          <View style={[styles.pill, { backgroundColor: getPaymentColor(order.paymentStatus) + "18" }]}>
            <Text style={[styles.pillText, { color: getPaymentColor(order.paymentStatus) }]}>
              {getPaymentStatusAr(order.paymentStatus)}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: getShippingColor(order.shippingStatus) + "18" }]}>
            <Text style={[styles.pillText, { color: getShippingColor(order.shippingStatus) }]}>
              {getShippingStatusAr(order.shippingStatus)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.orderDate}>
        {new Date(order.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
      </Text>
    </Pressable>
  );
}

function TicketItem({ ticket }: { ticket: Ticket }) {
  return (
    <View style={[styles.ticketCard, ticket.isWinner && styles.winnerCard]}>
      <View style={styles.ticketLeft}>
        <View style={styles.ticketIconWrap}>
          <Ionicons
            name={ticket.isWinner ? "trophy" : "ticket"}
            size={24}
            color={ticket.isWinner ? "#FFD700" : Colors.light.accent}
          />
        </View>
      </View>
      <View style={styles.ticketMiddle}>
        <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
        <Text style={styles.ticketDate}>
          {new Date(ticket.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        {ticket.isWinner && (
          <View style={styles.winnerBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.winnerText}>فائز</Text>
          </View>
        )}
      </View>
      <View style={styles.ticketRight}>
        <View style={styles.dashedLine} />
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
        <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}>
          <Ionicons name="receipt-outline" size={56} color={Colors.light.tabIconDefault} />
          <Text style={styles.emptyTitle}>سجّل الدخول لعرض طلباتك</Text>
          <Text style={styles.emptyText}>
            ستظهر طلباتك وتذاكر السحب هنا بعد الشراء
          </Text>
          <Pressable
            onPress={() => router.push("/auth")}
            style={styles.signInButton}
          >
            <Text style={styles.signInButtonText}>تسجيل الدخول</Text>
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
      <Ionicons
        name={activeTab === "orders" ? "receipt-outline" : "ticket-outline"}
        size={48}
        color={Colors.light.tabIconDefault}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === "orders" ? "لا توجد طلبات بعد" : "لا توجد تذاكر بعد"}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === "orders"
          ? "ستظهر طلباتك هنا بعد الشراء"
          : "اشترِ من حملة للحصول على تذاكر السحب"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16, paddingHorizontal: 16 }}>
        <Text style={styles.screenTitle}>طلباتي</Text>
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab("orders")}
            style={[styles.tabBtn, activeTab === "orders" && styles.tabBtnActive]}
          >
            <Ionicons name="receipt" size={16} color={activeTab === "orders" ? Colors.light.accent : Colors.light.textSecondary} />
            <Text style={[styles.tabBtnText, activeTab === "orders" && styles.tabBtnTextActive]}>
              الطلبات ({orders?.length || 0})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("tickets")}
            style={[styles.tabBtn, activeTab === "tickets" && styles.tabBtnActive]}
          >
            <Ionicons name="ticket" size={16} color={activeTab === "tickets" ? Colors.light.accent : Colors.light.textSecondary} />
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
  listContent: {
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.text,
    marginBottom: 12,
    paddingHorizontal: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  tabRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tabBtnActive: {
    backgroundColor: Colors.light.accent + "12",
    borderColor: Colors.light.accent,
  },
  tabBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  tabBtnTextActive: {
    color: Colors.light.accent,
    fontFamily: "Inter_600SemiBold",
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderIdRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  orderIdText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.light.text,
  },
  orderBody: {
    marginBottom: 8,
  },
  orderInfoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
  },
  orderQty: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  orderPills: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    writingDirection: "rtl",
  },
  orderDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  ticketCard: {
    flexDirection: "row-reverse",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  winnerCard: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  ticketLeft: {
    width: 70,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212, 168, 83, 0.06)",
  },
  ticketIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(212, 168, 83, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketMiddle: {
    flex: 1,
    padding: 16,
  },
  ticketNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.light.text,
    letterSpacing: 0.5,
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
    marginTop: 6,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  winnerText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#B8860B",
    letterSpacing: 1,
    writingDirection: "rtl",
  },
  ticketRight: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dashedLine: {
    width: 2,
    height: "70%",
    borderLeftWidth: 2,
    borderLeftColor: Colors.light.border,
    borderStyle: "dashed",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    marginTop: 16,
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
  },
  signInButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: "center",
  },
  signInButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
});
