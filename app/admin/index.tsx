import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Switch,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, getApiUrl, buildMediaUrl } from "@/lib/query-client";

type AdminTab = "dashboard" | "orders" | "users" | "campaigns" | "payments" | "coupons" | "notifications" | "activity" | "support" | "settings";

const TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: "dashboard", label: "الرئيسية", icon: "grid" },
  { key: "notifications", label: "الإشعارات", icon: "notifications" },
  { key: "orders", label: "الطلبات", icon: "receipt" },
  { key: "support", label: "تذاكر الدعم", icon: "chatbubbles" },
  { key: "users", label: "المستخدمين", icon: "people" },
  { key: "campaigns", label: "الحملات", icon: "megaphone" },
  { key: "payments", label: "الدفع", icon: "card" },
  { key: "coupons", label: "الكوبونات", icon: "pricetag" },
  { key: "activity", label: "السجل", icon: "time" },
  { key: "settings", label: "الإعدادات", icon: "settings" },
];

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const tabOpacity = useSharedValue(1);
  const tabTranslateY = useSharedValue(0);

  const tabContentStyle = useAnimatedStyle(() => ({
    opacity: tabOpacity.value,
    transform: [{ translateY: tabTranslateY.value }],
  }));

  const switchTab = (tab: AdminTab) => {
    tabOpacity.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.ease) }, () => {
      tabTranslateY.value = 8;
    });
    setTimeout(() => {
      setActiveTab(tab);
      tabOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      tabTranslateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
    }, 130);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!user || user.role !== "admin") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>غير مصرح لك بالدخول</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#7C3AED", "#A855F7", "#EC4899"]} style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>لوحة التحكم</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => switchTab(tab.key)}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? Colors.light.accent : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <Animated.View style={[styles.content, tabContentStyle]}>
        {activeTab === "dashboard" && <DashboardSection />}
        {activeTab === "notifications" && <NotificationsSection />}
        {activeTab === "orders" && <OrdersSection />}
        {activeTab === "users" && <UsersSection />}
        {activeTab === "campaigns" && <CampaignsSection />}
        {activeTab === "payments" && <PaymentsSection />}
        {activeTab === "coupons" && <CouponsSection />}
        {activeTab === "support" && <SupportTicketsSection />}
        {activeTab === "activity" && <ActivitySection />}
        {activeTab === "settings" && <AccountSettingsSection />}
      </Animated.View>
    </View>
  );
}

function SalesChart() {
  const { data: chartData } = useQuery<{ date: string; total: string; count: number }[]>({
    queryKey: ["/api/admin/sales-chart"],
    refetchInterval: 30000,
  });

  if (!chartData || chartData.length === 0) return null;

  const totals = chartData.map((d) => parseFloat(d.total));
  const maxVal = Math.max(...totals, 1);

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[d.getDay()];
  };

  const totalSales = totals.reduce((s, v) => s + v, 0);
  const totalOrders = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.headerRow}>
        <Text style={styles.sectionTitle}>المبيعات (آخر 7 أيام)</Text>
        <View style={chartStyles.summaryRow}>
          <View style={chartStyles.summaryItem}>
            <Text style={chartStyles.summaryValue}>{totalSales.toFixed(0)} $</Text>
            <Text style={chartStyles.summaryLabel}>إجمالي</Text>
          </View>
          <View style={[chartStyles.summaryItem, { marginEnd: 16 }]}>
            <Text style={chartStyles.summaryValue}>{totalOrders}</Text>
            <Text style={chartStyles.summaryLabel}>طلب</Text>
          </View>
        </View>
      </View>
      <View style={chartStyles.barsContainer}>
        {chartData.map((day, i) => {
          const val = parseFloat(day.total);
          const heightPercent = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const barColor = val > 0 ? Colors.light.accent : Colors.light.progressBg;
          return (
            <View key={day.date} style={chartStyles.barCol}>
              <Text style={chartStyles.barValue}>
                {val > 0 ? `${val >= 1000 ? (val / 1000).toFixed(1) + "k" : val.toFixed(0)} $` : ""}
              </Text>
              <View style={chartStyles.barTrack}>
                <View
                  style={[
                    chartStyles.barFill,
                    {
                      height: `${Math.max(heightPercent, 3)}%`,
                      backgroundColor: barColor,
                      opacity: val > 0 ? 1 : 0.3,
                    },
                  ]}
                />
              </View>
              <Text style={chartStyles.barLabel}>{getDayLabel(day.date)}</Text>
              <Text style={chartStyles.barCount}>
                {day.count > 0 ? `${day.count}` : "-"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DashboardSection() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/dashboard"],
    refetchInterval: 10000,
  });

  if (isLoading) return <LoadingView />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sectionPadding}>
      <Text style={styles.sectionTitle}>نظرة عامة</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="cash" label="إجمالي الإيرادات" value={`${stats?.totalRevenue || "0"} $`} color="#9B59B6" />
        <StatCard icon="receipt" label="إجمالي الطلبات" value={stats?.totalOrders?.toString() || "0"} color="#3498DB" />
        <StatCard icon="people" label="المستخدمين" value={stats?.totalUsers?.toString() || "0"} color="#2ECC71" />
        <StatCard icon="flame" label="حملات نشطة" value={stats?.activeCampaigns?.toString() || "0"} color={Colors.light.accent} />
        <StatCard icon="today" label="طلبات اليوم" value={stats?.ordersToday?.toString() || "0"} color="#E74C3C" />
        <StatCard icon="person-add" label="مستخدمين جدد (أسبوع)" value={stats?.newUsersThisWeek?.toString() || "0"} color="#1ABC9C" />
        <StatCard icon="trending-up" label="معدل التحويل" value={`${stats?.conversionRate || "0"}%`} color="#E67E22" />
        <StatCard icon="cart" label="متوسط قيمة الطلب" value={`${stats?.averageOrderValue || "0"} $`} color="#8E44AD" />
      </View>

      <SalesChart />

      {stats?.topCampaigns && stats.topCampaigns.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>أفضل الحملات مبيعاً</Text>
          {stats.topCampaigns.map((c: any, i: number) => (
            <View key={i} style={styles.topCampaignItem}>
              <View style={styles.topCampaignRank}>
                <Text style={styles.topCampaignRankText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topCampaignTitle}>{c.title}</Text>
                <Text style={styles.topCampaignSub}>{c.soldQuantity} مبيعات</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function OrdersSection() {
  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/orders"],
    refetchInterval: 10000,
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showShippingModal, setShowShippingModal] = useState(false);

  const shippingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/admin/orders/${id}/shipping`, data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setShowShippingModal(false);
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/admin/orders/${id}/payment`, data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  if (isLoading) return <LoadingView />;

  const getShippingStatusAr = (s: string) => {
    const map: Record<string, string> = { pending: "قيد الانتظار", processing: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };
    return map[s] || s;
  };
  const getShippingColor = (s: string) => {
    const map: Record<string, string> = { pending: "#F39C12", processing: "#3498DB", shipped: "#9B59B6", delivered: "#2ECC71", cancelled: "#E74C3C" };
    return map[s] || "#666";
  };
  const getOrderStatusAr = (s: string) => {
    const map: Record<string, string> = { pending: "معلق", paid: "مدفوع", failed: "فشل", refunded: "مسترد" };
    return map[s] || s;
  };
  const getPaymentStatusAr = (s: string) => {
    const map: Record<string, string> = { pending_payment: "في انتظار الدفع", pending_review: "قيد المراجعة", confirmed: "تم التأكيد", rejected: "مرفوض" };
    return map[s] || s;
  };
  const getPaymentColor = (s: string) => {
    const map: Record<string, string> = { pending_payment: "#F39C12", pending_review: "#3498DB", confirmed: "#2ECC71", rejected: "#E74C3C" };
    return map[s] || "#666";
  };

  return (
    <>
      <FlatList
        data={orders || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.sectionTitle}>جميع الطلبات ({orders?.length || 0})</Text>
              <Pressable
                onPress={async () => {
                  try {
                    const url = `${getApiUrl()}/api/admin/orders/export/csv`;
                    if (Platform.OS === "web") {
                      window.open(url, "_blank");
                    } else {
                      Alert.alert("تصدير CSV", "التصدير متاح عبر المتصفح فقط حالياً");
                    }
                  } catch (e) {}
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#2ECC7115", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Ionicons name="download-outline" size={16} color="#2ECC71" />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#2ECC71" }}>CSV</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد طلبات</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.orderCard} onPress={() => { setSelectedOrder(item); setShowShippingModal(true); }}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderIdText}>#{item.id.slice(0, 8)}</Text>
              <View style={[styles.statusPill, { backgroundColor: getShippingColor(item.shippingStatus) + "20" }]}>
                <Text style={[styles.statusPillText, { color: getShippingColor(item.shippingStatus) }]}>{getShippingStatusAr(item.shippingStatus)}</Text>
              </View>
            </View>
            <View style={styles.orderRow}>
              <Ionicons name="person" size={14} color={Colors.light.textSecondary} />
              <Text style={styles.orderDetailText}>{item.username || "مستخدم"}</Text>
            </View>
            <View style={styles.orderRow}>
              <Ionicons name="megaphone" size={14} color={Colors.light.textSecondary} />
              <Text style={styles.orderDetailText}>{item.campaignTitle || "حملة"}</Text>
            </View>
            <View style={styles.orderFooter}>
              <Text style={styles.orderAmount}>{item.totalAmount} $</Text>
              <View style={[styles.statusPill, { backgroundColor: item.status === "paid" ? "#2ECC7120" : "#F39C1220" }]}>
                <Text style={[styles.statusPillText, { color: item.status === "paid" ? "#2ECC71" : "#F39C12" }]}>{getOrderStatusAr(item.status)}</Text>
              </View>
              {item.paymentStatus && (
                <View style={[styles.statusPill, { backgroundColor: getPaymentColor(item.paymentStatus) + "20" }]}>
                  <Text style={[styles.statusPillText, { color: getPaymentColor(item.paymentStatus) }]}>{getPaymentStatusAr(item.paymentStatus)}</Text>
                </View>
              )}
              <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString("ar-SA")}</Text>
            </View>
          </Pressable>
        )}
      />
      <ShippingModal
        visible={showShippingModal}
        order={selectedOrder}
        onClose={() => setShowShippingModal(false)}
        onUpdate={(data: any) => selectedOrder && shippingMutation.mutate({ id: selectedOrder.id, data })}
        onPaymentUpdate={(data: any) => selectedOrder && paymentMutation.mutate({ id: selectedOrder.id, data })}
        loading={shippingMutation.isPending}
        paymentLoading={paymentMutation.isPending}
      />
    </>
  );
}

function ShippingModal({ visible, order, onClose, onUpdate, onPaymentUpdate, loading, paymentLoading }: any) {
  const [status, setStatus] = useState(order?.shippingStatus || "pending");
  const [tracking, setTracking] = useState(order?.trackingNumber || "");
  const [address, setAddress] = useState(order?.shippingAddress || "");
  const [rejectionReason, setRejectionReason] = useState("");

  React.useEffect(() => {
    if (order) {
      setStatus(order.shippingStatus || "pending");
      setTracking(order.trackingNumber || "");
      setAddress(order.shippingAddress || "");
      setRejectionReason("");
    }
  }, [order]);

  const getPaymentStatusAr = (s: string) => {
    const map: Record<string, string> = { pending_payment: "في انتظار الدفع", pending_review: "قيد المراجعة", confirmed: "تم التأكيد", rejected: "مرفوض" };
    return map[s] || s;
  };
  const getPaymentColor = (s: string) => {
    const map: Record<string, string> = { pending_payment: "#F39C12", pending_review: "#3498DB", confirmed: "#2ECC71", rejected: "#E74C3C" };
    return map[s] || "#666";
  };

  const statuses = [
    { key: "pending", label: "قيد الانتظار" },
    { key: "processing", label: "قيد التجهيز" },
    { key: "shipped", label: "تم الشحن" },
    { key: "delivered", label: "تم التوصيل" },
    { key: "cancelled", label: "ملغي" },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>إدارة الطلب</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            {order && (order.shippingFullName || order.shippingPhone || order.shippingCity || order.shippingAddress || order.shippingCountry) && (
              <View style={orderMgmtStyles.infoSection}>
                <Text style={orderMgmtStyles.infoSectionTitle}>عنوان الشحن</Text>
                {order.shippingFullName && (
                  <View style={orderMgmtStyles.infoRow}>
                    <Ionicons name="person" size={14} color={Colors.light.textSecondary} />
                    <Text style={orderMgmtStyles.infoText}>{order.shippingFullName}</Text>
                  </View>
                )}
                {order.shippingPhone && (
                  <View style={orderMgmtStyles.infoRow}>
                    <Ionicons name="call" size={14} color={Colors.light.textSecondary} />
                    <Text style={orderMgmtStyles.infoText}>{order.shippingPhone}</Text>
                  </View>
                )}
                {(order.shippingCity || order.shippingCountry) && (
                  <View style={orderMgmtStyles.infoRow}>
                    <Ionicons name="location" size={14} color={Colors.light.textSecondary} />
                    <Text style={orderMgmtStyles.infoText}>{[order.shippingCity, order.shippingCountry].filter(Boolean).join("، ")}</Text>
                  </View>
                )}
                {order.shippingAddress && (
                  <View style={orderMgmtStyles.infoRow}>
                    <Ionicons name="home" size={14} color={Colors.light.textSecondary} />
                    <Text style={orderMgmtStyles.infoText}>{order.shippingAddress}</Text>
                  </View>
                )}
              </View>
            )}

            {order?.paymentStatus && (
              <View style={orderMgmtStyles.infoSection}>
                <Text style={orderMgmtStyles.infoSectionTitle}>حالة الدفع</Text>
                <View style={[styles.statusPill, { backgroundColor: getPaymentColor(order.paymentStatus) + "20", alignSelf: "flex-end", marginBottom: 8 }]}>
                  <Text style={[styles.statusPillText, { color: getPaymentColor(order.paymentStatus) }]}>{getPaymentStatusAr(order.paymentStatus)}</Text>
                </View>

                {order.receiptUrl && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={orderMgmtStyles.receiptLabel}>صورة الإيصال:</Text>
                    <Image
                      source={{ uri: buildMediaUrl(order.receiptUrl) ?? "" }}
                      style={orderMgmtStyles.receiptImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {order.paymentStatus === "pending_review" && (
                  <View style={orderMgmtStyles.paymentActions}>
                    <Pressable
                      onPress={() => onPaymentUpdate({ paymentStatus: "confirmed" })}
                      disabled={paymentLoading}
                      style={[orderMgmtStyles.confirmBtn, paymentLoading && { opacity: 0.6 }]}
                    >
                      {paymentLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={orderMgmtStyles.confirmBtnText}>تأكيد الدفع</Text>
                        </>
                      )}
                    </Pressable>
                    <View style={{ marginTop: 8 }}>
                      <TextInput
                        style={orderMgmtStyles.rejectionInput}
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        placeholder="سبب الرفض (اختياري)"
                        placeholderTextColor={Colors.light.tabIconDefault}
                        textAlign="right"
                      />
                      <Pressable
                        onPress={() => onPaymentUpdate({ paymentStatus: "rejected", rejectionReason: rejectionReason || undefined })}
                        disabled={paymentLoading}
                        style={[orderMgmtStyles.rejectBtn, paymentLoading && { opacity: 0.6 }]}
                      >
                        {paymentLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                          <>
                            <Ionicons name="close-circle" size={18} color="#fff" />
                            <Text style={orderMgmtStyles.rejectBtnText}>رفض الدفع</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}

            <Text style={modalStyles.inputLabel}>حالة الشحن</Text>
            <View style={styles.statusPicker}>
              {statuses.map((s) => (
                <Pressable key={s.key} onPress={() => setStatus(s.key)} style={[styles.statusOption, status === s.key && styles.statusOptionActive]}>
                  <Text style={[styles.statusOptionText, status === s.key && styles.statusOptionTextActive]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
            <ModalInput label="رقم التتبع" value={tracking} onChangeText={setTracking} placeholder="أدخل رقم التتبع" />
            <ModalInput label="عنوان الشحن" value={address} onChangeText={setAddress} placeholder="أدخل عنوان الشحن" multiline />
            <Pressable
              onPress={() => onUpdate({ shippingStatus: status, trackingNumber: tracking, shippingAddress: address })}
              disabled={loading}
              style={[modalStyles.createBtn, loading && { opacity: 0.6 }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.createBtnText}>تحديث الشحن</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function UsersSection() {
  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const verifyMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PUT", `/api/admin/verify-user/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      Alert.alert("تم", "تم تفعيل البريد الإلكتروني بنجاح");
    },
    onError: () => {
      Alert.alert("خطأ", "تعذر تفعيل البريد");
    },
  });

  function handleVerify(userId: string, username: string) {
    Alert.alert("تفعيل البريد", `تفعيل بريد المستخدم ${username}؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "تفعيل", onPress: () => verifyMutation.mutate(userId) },
    ]);
  }

  if (isLoading) return <LoadingView />;

  return (
    <FlatList
      data={users || []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.sectionPadding}
      ListHeaderComponent={
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.sectionTitle}>المستخدمين ({users?.length || 0})</Text>
          <Pressable
            onPress={() => {
              try {
                const url = `${getApiUrl()}/api/admin/users/export/csv`;
                if (Platform.OS === "web") {
                  window.open(url, "_blank");
                } else {
                  Alert.alert("تصدير CSV", "التصدير متاح عبر المتصفح فقط حالياً");
                }
              } catch (e) {}
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#2ECC7115", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          >
            <Ionicons name="download-outline" size={16} color="#2ECC71" />
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#2ECC71" }}>CSV</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد مستخدمين</Text>}
      renderItem={({ item }) => (
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{item.username?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.username}</Text>
              {item.role === "admin" && (
                <View style={styles.adminPill}><Text style={styles.adminPillText}>أدمن</Text></View>
              )}
              {item.emailVerified ? (
                <View style={styles.verifiedPill}><Ionicons name="checkmark-circle" size={12} color="#10B981" /><Text style={styles.verifiedPillText}>مفعّل</Text></View>
              ) : (
                <Pressable onPress={() => handleVerify(item.id, item.username)} style={styles.unverifiedPill}>
                  <Ionicons name="close-circle" size={12} color="#EF4444" />
                  <Text style={styles.unverifiedPillText}>تفعيل</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
            <View style={styles.userStatsRow}>
              <View style={styles.userStat}>
                <Ionicons name="receipt" size={12} color={Colors.light.textSecondary} />
                <Text style={styles.userStatText}>{item.orderCount || 0} طلب</Text>
              </View>
              <View style={styles.userStat}>
                <Ionicons name="ticket" size={12} color={Colors.light.textSecondary} />
                <Text style={styles.userStatText}>{item.ticketCount || 0} تذكرة</Text>
              </View>
              <View style={styles.userStat}>
                <Ionicons name="cash" size={12} color={Colors.light.textSecondary} />
                <Text style={styles.userStatText}>{item.totalSpent || "0"} $</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    />
  );
}

type TicketStatusFilter = "all" | "open" | "in_progress" | "closed";

function SupportTicketsSection() {
  const { data: tickets, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/support-tickets"],
    refetchInterval: 10000,
  });
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  if (isLoading) return <LoadingView />;

  const filteredTickets = (tickets || []).filter((t: any) =>
    statusFilter === "all" ? true : t.status === statusFilter
  );

  const getStatusAr = (s: string) => {
    const map: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };
    return map[s] || s;
  };
  const getStatusColor = (s: string) => {
    const map: Record<string, string> = { open: "#F39C12", in_progress: "#3498DB", closed: "#2ECC71" };
    return map[s] || "#666";
  };
  const getPriorityAr = (s: string) => {
    const map: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية" };
    return map[s] || s;
  };
  const getPriorityColor = (s: string) => {
    const map: Record<string, string> = { low: "#2ECC71", medium: "#F39C12", high: "#E74C3C" };
    return map[s] || "#666";
  };

  const filters: { key: TicketStatusFilter; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "open", label: "مفتوحة" },
    { key: "in_progress", label: "قيد المعالجة" },
    { key: "closed", label: "مغلقة" },
  ];

  const openCount = (tickets || []).filter((t: any) => t.status === "open").length;
  const inProgressCount = (tickets || []).filter((t: any) => t.status === "in_progress").length;

  return (
    <>
      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={styles.sectionTitle}>تذاكر الدعم ({tickets?.length || 0})</Text>
              {(openCount > 0 || inProgressCount > 0) && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {openCount > 0 && (
                    <View style={[styles.statusPill, { backgroundColor: "#F39C1220" }]}>
                      <Text style={[styles.statusPillText, { color: "#F39C12" }]}>{openCount} جديدة</Text>
                    </View>
                  )}
                  {inProgressCount > 0 && (
                    <View style={[styles.statusPill, { backgroundColor: "#3498DB20" }]}>
                      <Text style={[styles.statusPillText, { color: "#3498DB" }]}>{inProgressCount} قيد المعالجة</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <View style={[styles.statusPicker, { marginBottom: 16 }]}>
              {filters.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => { setStatusFilter(f.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.statusOption, statusFilter === f.key && styles.statusOptionActive]}
                >
                  <Text style={[styles.statusOptionText, statusFilter === f.key && styles.statusOptionTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد تذاكر</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.orderCard}
            onPress={() => { setSelectedTicket(item); setShowDetailModal(true); }}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderIdText} numberOfLines={1}>#{item.id.slice(0, 8)}</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                  <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>{getStatusAr(item.status)}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: getPriorityColor(item.priority) + "20" }]}>
                  <Text style={[styles.statusPillText, { color: getPriorityColor(item.priority) }]}>{getPriorityAr(item.priority)}</Text>
                </View>
              </View>
            </View>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 4 }}>{item.subject}</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginBottom: 8 }} numberOfLines={2}>{item.message}</Text>
            <View style={styles.orderFooter}>
              <View style={styles.orderRow}>
                <Ionicons name="person" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.orderDetailText}>{item.username || "مستخدم"}</Text>
              </View>
              <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString("ar-SA")}</Text>
            </View>
          </Pressable>
        )}
      />
      <TicketDetailModal
        visible={showDetailModal}
        ticket={selectedTicket}
        onClose={() => setShowDetailModal(false)}
      />
    </>
  );
}

function TicketDetailModal({ visible, ticket, onClose }: { visible: boolean; ticket: any; onClose: () => void }) {
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState(ticket?.status || "open");

  React.useEffect(() => {
    if (ticket) {
      setReply(ticket.adminReply || "");
      setStatus(ticket.status || "open");
    }
  }, [ticket]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/admin/support-tickets/${ticket.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      onClose();
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const getStatusAr = (s: string) => {
    const map: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };
    return map[s] || s;
  };
  const getPriorityAr = (s: string) => {
    const map: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية" };
    return map[s] || s;
  };
  const getPriorityColor = (s: string) => {
    const map: Record<string, string> = { low: "#2ECC71", medium: "#F39C12", high: "#E74C3C" };
    return map[s] || "#666";
  };

  const statuses = [
    { key: "open", label: "مفتوحة" },
    { key: "in_progress", label: "قيد المعالجة" },
    { key: "closed", label: "مغلقة" },
  ];

  if (!ticket) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>تفاصيل التذكرة</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <View style={orderMgmtStyles.infoSection}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text style={orderMgmtStyles.infoSectionTitle}>{ticket.subject}</Text>
                <View style={[styles.statusPill, { backgroundColor: getPriorityColor(ticket.priority) + "20" }]}>
                  <Text style={[styles.statusPillText, { color: getPriorityColor(ticket.priority) }]}>{getPriorityAr(ticket.priority)}</Text>
                </View>
              </View>
              <View style={orderMgmtStyles.infoRow}>
                <Ionicons name="person" size={14} color={Colors.light.textSecondary} />
                <Text style={orderMgmtStyles.infoText}>{ticket.username || "مستخدم"}</Text>
              </View>
              <View style={orderMgmtStyles.infoRow}>
                <Ionicons name="time" size={14} color={Colors.light.textSecondary} />
                <Text style={orderMgmtStyles.infoText}>{new Date(ticket.createdAt).toLocaleString("ar-SA")}</Text>
              </View>
            </View>

            <View style={orderMgmtStyles.infoSection}>
              <Text style={orderMgmtStyles.infoSectionTitle}>رسالة المستخدم</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", lineHeight: 22 }}>{ticket.message}</Text>
            </View>

            <Text style={modalStyles.inputLabel}>حالة التذكرة</Text>
            <View style={styles.statusPicker}>
              {statuses.map((s) => (
                <Pressable key={s.key} onPress={() => setStatus(s.key)} style={[styles.statusOption, status === s.key && styles.statusOptionActive]}>
                  <Text style={[styles.statusOptionText, status === s.key && styles.statusOptionTextActive]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>

            <ModalInput label="الرد على التذكرة" value={reply} onChangeText={setReply} placeholder="اكتب ردك هنا..." multiline />

            <Pressable
              onPress={() => mutation.mutate({ status, adminReply: reply || undefined })}
              disabled={mutation.isPending}
              style={[modalStyles.createBtn, mutation.isPending && { opacity: 0.6 }]}
            >
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.createBtnText}>حفظ التحديث</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CampaignsSection() {
  const { data: campaigns, isLoading } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);

  const drawMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/draw/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم اختيار الفائز!", `الفائز: ${data.winner.username}\nالتذكرة: ${data.ticket.ticketNumber}`);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/campaigns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const handleDraw = (c: any) => {
    Alert.alert("اختيار الفائز", `هل أنت متأكد من اختيار الفائز لحملة "${c.title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "اختيار", style: "destructive", onPress: () => drawMutation.mutate(c.id) },
    ]);
  };

  const handleDelete = (c: any) => {
    Alert.alert("حذف الحملة", `هل أنت متأكد من حذف "${c.title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(c.id) },
    ]);
  };

  const getStatusAr = (s: string) => {
    const map: Record<string, string> = { active: "نشط", sold_out: "نفذت الكمية", drawing: "جاري الاختيار", completed: "مكتمل" };
    return map[s] || s;
  };
  const getStatusColor = (s: string) => {
    const map: Record<string, string> = { active: "#2ECC71", sold_out: "#F39C12", drawing: "#9B59B6", completed: "#3498DB" };
    return map[s] || "#666";
  };

  if (isLoading) return <LoadingView />;

  return (
    <>
      <FlatList
        data={campaigns || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>الحملات ({campaigns?.length || 0})</Text>
              <Pressable onPress={() => setShowCreateModal(true)} style={styles.addBtn}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>جديد</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.campaignCard}>
            <View style={styles.campaignHeader}>
              <Text style={styles.campaignTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>{getStatusAr(item.status)}</Text>
              </View>
            </View>
            <View style={styles.campaignInfo}>
              <Text style={styles.campaignInfoText}>الجائزة: {item.prizeName}</Text>
              <Text style={styles.campaignInfoText}>السعر: {item.productPrice} $</Text>
              <Text style={styles.campaignInfoText}>المباع: {item.soldQuantity}/{item.totalQuantity}</Text>
              {item.products && item.products.length > 0 && (
                <View>
                  <Text style={[styles.campaignInfoText, { color: Colors.light.accent }]}>
                    الموديلات: {item.products.length}
                  </Text>
                  {item.products.map((p: any) => (
                    <Text key={p.id} style={[styles.campaignInfoText, { fontSize: 11, color: Colors.light.textLight, paddingStart: 8 }]}>
                      • {p.nameAr || p.name}: {p.soldQuantity}/{p.quantity} ({p.price} $)
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.campaignProgressWrap}>
              <View style={styles.campaignProgressBg}>
                <View style={[styles.campaignProgressFill, { width: `${Math.min((item.soldQuantity / item.totalQuantity) * 100, 100)}%`, backgroundColor: getStatusColor(item.status) }]} />
              </View>
            </View>
            <View style={styles.campaignActions}>
              <Pressable onPress={() => setEditingCampaign(item)} style={[styles.actionBtn, { backgroundColor: Colors.light.accent }]}>
                <Ionicons name="create" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>الموديلات</Text>
              </Pressable>
              {(item.status === "sold_out" || item.status === "drawing") && (
                <Pressable onPress={() => handleDraw(item)} style={[styles.actionBtn, { backgroundColor: "#9B59B6" }]}>
                  <Ionicons name="dice" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>اختيار</Text>
                </Pressable>
              )}
              {item.soldQuantity === 0 && (
                <Pressable onPress={() => handleDelete(item)} style={[styles.actionBtn, { backgroundColor: "#E74C3C" }]}>
                  <Ionicons name="trash" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>حذف</Text>
                </Pressable>
              )}
            </View>
            {item.winnerId && (
              <View style={styles.winnerBanner}>
                <Ionicons name="trophy" size={16} color="#FFD700" />
                <Text style={styles.winnerText}>الفائز: تذكرة {item.winnerTicketId}</Text>
              </View>
            )}
          </View>
        )}
      />
      <CreateCampaignModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} />
      {editingCampaign && (
        <EditCampaignProductsModal campaign={editingCampaign} onClose={() => setEditingCampaign(null)} />
      )}
    </>
  );
}

function EditCampaignProductsModal({ campaign, onClose }: { campaign: any; onClose: () => void }) {
  const existingProducts: any[] = campaign.products || [];
  const [products, setProducts] = useState<ProductVariant[]>(
    existingProducts.map((p: any) => ({
      key: p.id,
      name: p.name || "",
      nameAr: p.nameAr || "",
      price: String(p.price),
      quantity: String(p.quantity),
      imageUrl: p.imageUrl || "",
    }))
  );
  const [newProducts, setNewProducts] = useState<ProductVariant[]>([]);
  const [productError, setProductError] = useState<string | null>(null);

  const addNewProduct = () => {
    setNewProducts((prev) => [
      ...prev,
      { key: Date.now().toString(), name: "", nameAr: "", price: "", quantity: "", imageUrl: "" },
    ]);
  };

  const updateProduct = (key: string, field: keyof ProductVariant, value: string) => {
    setProducts((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  };

  const updateNewProduct = (key: string, field: keyof ProductVariant, value: string) => {
    setNewProducts((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  };

  const removeNewProduct = (key: string) => {
    setNewProducts((prev) => prev.filter((v) => v.key !== key));
  };

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/campaign-products/${productId}`);
      return res.json();
    },
    onSuccess: (_data: any, productId: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProducts((prev) => prev.filter((v) => v.key !== productId));
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (err: any) => {
      const msg = (err as any)?.message || "حدث خطأ أثناء حذف المنتج";
      setProductError(msg);
    },
  });

  const handleDeleteProduct = (p: ProductVariant) => {
    Alert.alert("حذف الموديل", `هل تريد حذف "${p.nameAr || p.name}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف", style: "destructive", onPress: () => {
          setProductError(null);
          deleteMutation.mutate(p.key);
        },
      },
    ]);
  };

  const handleSave = () => {
    const totalCount = products.length + newProducts.filter(p => p.name && p.price && p.quantity).length;
    if (totalCount < 2) {
      setProductError("يجب الإبقاء على منتجين (موديلين) على الأقل في الحملة");
      return;
    }
    setProductError(null);
    saveMutation.mutate();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const p of products) {
        const orig = existingProducts.find((ep: any) => ep.id === p.key);
        if (orig && (orig.name !== p.name || orig.nameAr !== p.nameAr || String(orig.price) !== p.price || String(orig.quantity) !== p.quantity || (orig.imageUrl || "") !== p.imageUrl)) {
          await apiRequest("PUT", `/api/admin/campaign-products/${p.key}`, {
            name: p.name,
            nameAr: p.nameAr,
            price: p.price,
            quantity: parseInt(p.quantity),
            imageUrl: p.imageUrl || undefined,
          });
        }
      }
      for (const p of newProducts) {
        if (!p.name || !p.price || !p.quantity) continue;
        await apiRequest("POST", `/api/admin/campaigns/${campaign.id}/products`, {
          name: p.name,
          nameAr: p.nameAr || p.name,
          price: p.price,
          quantity: parseInt(p.quantity),
          imageUrl: p.imageUrl || undefined,
        });
      }
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onClose();
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  return (
    <Modal visible={true} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>موديلات: {campaign.title}</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
            {products.length > 0 && (
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" as const, marginBottom: 8 }}>الموديلات الحالية ({products.length})</Text>
            )}
            {products.map((v, idx) => (
              <View key={v.key} style={{ backgroundColor: "#F9FAFB", borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.light.border }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent }}>موديل {idx + 1}</Text>
                  <Pressable onPress={() => handleDeleteProduct(v)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.light.danger} />
                  </Pressable>
                </View>
                <ModalInput label="الاسم (إنجليزي)" value={v.name} onChangeText={(t) => updateProduct(v.key, "name", t)} placeholder="256GB Black" />
                <ModalInput label="الاسم (عربي)" value={v.nameAr} onChangeText={(t) => updateProduct(v.key, "nameAr", t)} placeholder="256 جيجا أسود" />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ModalInput label="السعر ($)" value={v.price} onChangeText={(t) => updateProduct(v.key, "price", t)} placeholder="29.99" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ModalInput label="الكمية" value={v.quantity} onChangeText={(t) => updateProduct(v.key, "quantity", t)} placeholder="1000" keyboardType="number-pad" />
                  </View>
                </View>
                <ModalInput label="رابط الصورة" value={v.imageUrl} onChangeText={(t) => updateProduct(v.key, "imageUrl", t)} placeholder="https://example.com/image.jpg" />
              </View>
            ))}

            {newProducts.length > 0 && (
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#2ECC71", textAlign: "right", writingDirection: "rtl" as const, marginBottom: 8, marginTop: 4 }}>موديلات جديدة ({newProducts.length})</Text>
            )}
            {newProducts.map((v, idx) => (
              <View key={v.key} style={{ backgroundColor: "#F0FFF4", borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#2ECC7140" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#2ECC71" }}>جديد {idx + 1}</Text>
                  <Pressable onPress={() => removeNewProduct(v.key)}>
                    <Ionicons name="close-circle" size={22} color={Colors.light.danger} />
                  </Pressable>
                </View>
                <ModalInput label="الاسم (إنجليزي) *" value={v.name} onChangeText={(t) => updateNewProduct(v.key, "name", t)} placeholder="256GB Black" />
                <ModalInput label="الاسم (عربي)" value={v.nameAr} onChangeText={(t) => updateNewProduct(v.key, "nameAr", t)} placeholder="256 جيجا أسود" />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ModalInput label="السعر ($) *" value={v.price} onChangeText={(t) => updateNewProduct(v.key, "price", t)} placeholder="29.99" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ModalInput label="الكمية *" value={v.quantity} onChangeText={(t) => updateNewProduct(v.key, "quantity", t)} placeholder="1000" keyboardType="number-pad" />
                  </View>
                </View>
                <ModalInput label="رابط الصورة" value={v.imageUrl} onChangeText={(t) => updateNewProduct(v.key, "imageUrl", t)} placeholder="https://example.com/image.jpg" />
              </View>
            ))}

            <Pressable onPress={addNewProduct} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: "rgba(124,58,237,0.06)", borderRadius: 12, borderWidth: 1, borderColor: Colors.light.accent + "30", borderStyle: "dashed", marginBottom: 16 }}>
              <Ionicons name="add-circle" size={20} color={Colors.light.accent} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.accent }}>إضافة موديل جديد</Text>
            </Pressable>
          </ScrollView>

          {productError && (
            <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 10 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#991B1B", textAlign: "right", writingDirection: "rtl" as const }}>{productError}</Text>
            </View>
          )}

          <View style={modalStyles.footer}>
            <Pressable onPress={onClose} style={modalStyles.cancelBtn}>
              <Text style={modalStyles.cancelText}>إلغاء</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[modalStyles.submitBtn, saveMutation.isPending && { opacity: 0.6 }]}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.submitText}>حفظ التغييرات</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PaymentsSection() {
  const { data: methods, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/payment-methods"] });
  const [showCreate, setShowCreate] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/payment-methods/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }),
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/payment-methods/${id}`);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  if (isLoading) return <LoadingView />;

  const isBankType = (m: any) => {
    const n = ((m.name || "") + " " + (m.nameAr || "")).toLowerCase();
    return n.includes("bank") || n.includes("تحويل") || n.includes("حوالة");
  };

  return (
    <>
      <FlatList
        data={methods || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>طرق الدفع ({methods?.length || 0})</Text>
            <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>إضافة</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Ionicons name={item.icon as any || "card"} size={24} color={item.enabled ? Colors.light.accent : Colors.light.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentName}>{item.nameAr}</Text>
                <Text style={styles.paymentNameEn}>{item.name}</Text>
                {item.description && <Text style={styles.paymentDesc}>{item.description}</Text>}
              </View>
              <Switch value={item.enabled} onValueChange={(v) => toggleMutation.mutate({ id: item.id, enabled: v })} trackColor={{ true: Colors.light.accent }} />
            </View>
            {isBankType(item) && (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
                {item.bankName ? (
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary, writingDirection: "rtl" }}>البنك:</Text>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.text }}>{item.bankName}</Text>
                  </View>
                ) : null}
                {item.accountName ? (
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary, writingDirection: "rtl" }}>الحساب:</Text>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.text }}>{item.accountName}</Text>
                  </View>
                ) : null}
                {item.iban ? (
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary, writingDirection: "rtl" }}>IBAN:</Text>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.light.text }}>{item.iban}</Text>
                  </View>
                ) : null}
                {!item.bankName && !item.accountName && !item.iban && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
                    <Ionicons name="warning" size={14} color={Colors.light.warning} />
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.warning, writingDirection: "rtl" }}>بيانات البنك غير مكتملة - اضغط تعديل لإضافتها</Text>
                  </View>
                )}
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pressable
                onPress={() => setEditingMethod(item)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.accent + "12", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Ionicons name="create-outline" size={14} color={Colors.light.accent} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.accent }}>تعديل</Text>
              </Pressable>
              <Pressable
                onPress={() => Alert.alert("حذف", `حذف طريقة الدفع "${item.nameAr}"؟`, [
                  { text: "إلغاء", style: "cancel" },
                  { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                ])}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.danger + "12", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Ionicons name="trash-outline" size={14} color={Colors.light.danger} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.danger }}>حذف</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <CreatePaymentModal visible={showCreate} onClose={() => setShowCreate(false)} />
      {editingMethod && <EditPaymentModal visible={!!editingMethod} method={editingMethod} onClose={() => setEditingMethod(null)} />}
    </>
  );
}

function CouponsSection() {
  const { data: coupons, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/coupons"] });
  const [showCreate, setShowCreate] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/coupons/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] }),
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/coupons/${id}`);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  if (isLoading) return <LoadingView />;

  return (
    <>
      <FlatList
        data={coupons || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>الكوبونات ({coupons?.length || 0})</Text>
            <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>جديد</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد كوبونات</Text>}
        renderItem={({ item }) => (
          <View style={styles.couponCard}>
            <View style={styles.couponHeader}>
              <View style={styles.couponCodeBadge}>
                <Text style={styles.couponCode}>{item.code}</Text>
              </View>
              <Switch value={item.enabled} onValueChange={(v) => toggleMutation.mutate({ id: item.id, enabled: v })} trackColor={{ true: Colors.light.accent }} />
            </View>
            <View style={styles.couponDetails}>
              <View style={styles.couponStat}>
                <Text style={styles.couponStatLabel}>الخصم</Text>
                <Text style={styles.couponStatValue}>{item.discountPercent}%</Text>
              </View>
              <View style={styles.couponStat}>
                <Text style={styles.couponStatLabel}>الاستخدامات</Text>
                <Text style={styles.couponStatValue}>{item.usedCount}/{item.maxUses}</Text>
              </View>
              <View style={styles.couponStat}>
                <Text style={styles.couponStatLabel}>الانتهاء</Text>
                <Text style={styles.couponStatValue}>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString("ar-SA") : "بلا حد"}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => Alert.alert("حذف", `حذف الكوبون "${item.code}"؟`, [
                { text: "إلغاء", style: "cancel" },
                { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
              ])}
              style={styles.deleteCouponBtn}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.light.danger} />
              <Text style={styles.deleteCouponText}>حذف</Text>
            </Pressable>
          </View>
        )}
      />
      <CreateCouponModal visible={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function ActivitySection() {
  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-log"],
    refetchInterval: 10000,
  });

  const getTypeIcon = (type: string) => {
    const map: Record<string, string> = { user_register: "person-add", purchase: "cart", draw: "trophy", campaign_create: "megaphone", shipping_update: "airplane" };
    return map[type] || "time";
  };
  const getTypeColor = (type: string) => {
    const map: Record<string, string> = { user_register: "#2ECC71", purchase: "#3498DB", draw: "#FFD700", campaign_create: "#9B59B6", shipping_update: "#E67E22" };
    return map[type] || Colors.light.textSecondary;
  };

  if (isLoading) return <LoadingView />;

  return (
    <FlatList
      data={logs || []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.sectionPadding}
      ListHeaderComponent={<Text style={styles.sectionTitle}>سجل النشاطات</Text>}
      ListEmptyComponent={<Text style={styles.emptyText}>لا توجد نشاطات مسجلة</Text>}
      renderItem={({ item }) => (
        <View style={styles.activityItem}>
          <View style={[styles.activityIcon, { backgroundColor: getTypeColor(item.type) + "18" }]}>
            <Ionicons name={getTypeIcon(item.type) as any} size={18} color={getTypeColor(item.type)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            {item.description && <Text style={styles.activityDesc}>{item.description}</Text>}
            <Text style={styles.activityTime}>{new Date(item.createdAt).toLocaleString("ar-SA")}</Text>
          </View>
        </View>
      )}
    />
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NotificationsSection() {
  const { data: notifications, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/notifications"],
    refetchInterval: 10000,
  });
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/notifications/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/notifications/read-all");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] }),
  });

  if (isLoading) return <LoadingView />;

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  const getNotifIcon = (type: string) => {
    if (type === "new_order") return "cart";
    if (type === "receipt_uploaded") return "image";
    if (type === "new_user") return "person-add";
    if (type === "broadcast") return "megaphone";
    return "notifications";
  };
  const getNotifColor = (type: string) => {
    if (type === "new_order") return "#7C3AED";
    if (type === "receipt_uploaded") return "#3498DB";
    if (type === "new_user") return "#2ECC71";
    if (type === "broadcast") return "#E67E22";
    return Colors.light.accent;
  };

  return (
    <>
      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>الإشعارات ({notifications?.length || 0})</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => { setShowBroadcastModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E67E2215", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Ionicons name="megaphone-outline" size={16} color="#E67E22" />
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#E67E22" }}>إرسال إشعار</Text>
                </Pressable>
                {unreadCount > 0 && (
                  <Pressable
                    onPress={() => markAllReadMutation.mutate()}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.accent + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <Ionicons name="checkmark-done" size={16} color={Colors.light.accent} />
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.accent }}>قراءة الكل ({unreadCount})</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد إشعارات</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { if (!item.isRead) markReadMutation.mutate(item.id); }}
            style={[styles.orderCard, { borderEndWidth: 3, borderEndColor: item.isRead ? "transparent" : getNotifColor(item.type), backgroundColor: item.isRead ? "#fff" : "#FAFBFF" }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: getNotifColor(item.type) + "15", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={getNotifIcon(item.type) as any} size={18} color={getNotifColor(item.type)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: item.isRead ? "Inter_400Regular" : "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" }}>{item.message}</Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, textAlign: "right", marginTop: 4 }}>
                  {new Date(item.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              {!item.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getNotifColor(item.type) }} />}
            </View>
          </Pressable>
        )}
      />
      <BroadcastNotificationModal visible={showBroadcastModal} onClose={() => setShowBroadcastModal(false)} />
    </>
  );
}

function BroadcastNotificationModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const broadcastMutation = useMutation({
    mutationFn: async (data: { title: string; message: string }) => {
      const res = await apiRequest("POST", "/api/admin/broadcast-notification", data);
      return res.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم الإرسال", `تم إرسال الإشعار إلى ${data.sentTo} مستخدم`);
      setTitle("");
      setMessage("");
      onClose();
    },
    onError: (err: any) => Alert.alert("خطأ", err.message || "فشل إرسال الإشعار"),
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("خطأ", "العنوان والرسالة مطلوبان");
      return;
    }
    broadcastMutation.mutate({ title: title.trim(), message: message.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>إرسال إشعار جماعي</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <ModalInput label="عنوان الإشعار" value={title} onChangeText={setTitle} placeholder="أدخل عنوان الإشعار" />
            <ModalInput label="نص الإشعار" value={message} onChangeText={setMessage} placeholder="أدخل نص الرسالة" multiline />
            <Pressable
              onPress={handleSend}
              disabled={broadcastMutation.isPending}
              style={[modalStyles.createBtn, broadcastMutation.isPending && { opacity: 0.6 }]}
            >
              {broadcastMutation.isPending ? <ActivityIndicator color="#fff" /> : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={modalStyles.createBtnText}>إرسال للجميع</Text>
                </View>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function LoadingView() {
  return (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color={Colors.light.accent} />
    </View>
  );
}

const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: "electronics", label: "إلكترونيات" },
  { key: "fashion", label: "أزياء" },
  { key: "beauty", label: "جمال" },
  { key: "accessories", label: "إكسسوارات" },
  { key: "other", label: "أخرى" },
];

interface ProductVariant {
  key: string;
  name: string;
  nameAr: string;
  price: string;
  quantity: string;
  imageUrl: string;
}

function CreateCampaignModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [prizeName, setPrizeName] = useState("");
  const [prizeDesc, setPrizeDesc] = useState("");
  const [category, setCategory] = useState("other");
  const [endsAtText, setEndsAtText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [originalPriceText, setOriginalPriceText] = useState("");
  const [flashSaleEndsAtText, setFlashSaleEndsAtText] = useState("");

  const pickCampaignImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onload = (ev) => setImageUri(ev.target?.result as string);
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    }
  };

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageUri && !imageFile) return undefined;
    setUploading(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/admin/campaigns/upload-image", baseUrl);

      if (Platform.OS === "web" && imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const res = await fetch(url.toString(), {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("فشل رفع الصورة");
        const data = await res.json();
        return data.imageUrl;
      } else if (imageUri) {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("image", blob, "campaign.jpg");
        const res = await fetch(url.toString(), {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("فشل رفع الصورة");
        const data = await res.json();
        return data.imageUrl;
      }
      return undefined;
    } catch (err) {
      console.error("Image upload error:", err);
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onClose();
      setTitle(""); setDescription(""); setPrice(""); setQuantity(""); setPrizeName(""); setPrizeDesc(""); setCategory("other"); setEndsAtText(""); setImageUri(null); setImageFile(null); setHasVariants(false); setVariants([]); setIsFlashSale(false); setOriginalPriceText(""); setFlashSaleEndsAtText("");
    },
    onError: (err: any) => setCreateError(err.message || "حدث خطأ أثناء إنشاء الحملة"),
  });

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { key: Date.now().toString(), name: "", nameAr: "", price: "", quantity: "", imageUrl: "" },
    ]);
  };

  const removeVariant = (key: string) => {
    setVariants((prev) => prev.filter((v) => v.key !== key));
  };

  const updateVariant = (key: string, field: keyof ProductVariant, value: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, [field]: value } : v))
    );
  };

  const handleCreate = async () => {
    setCreateError(null);

    if (!title || !description || !prizeName) {
      setCreateError("يرجى ملء جميع الحقول المطلوبة (العنوان، الوصف، الجائزة)");
      return;
    }

    if (!hasVariants) {
      setCreateError("يجب تفعيل 'موديلات متعددة' وإضافة منتجين على الأقل لإنشاء الحملة");
      return;
    }

    if (variants.length < 2) {
      setCreateError("يجب إضافة منتجين (موديلين) على الأقل لإنشاء الحملة");
      return;
    }
    for (const v of variants) {
      if (!v.name || !v.price || !v.quantity) {
        setCreateError("يرجى ملء جميع حقول الموديلات (الاسم، السعر، الكمية)");
        return;
      }
    }

    let imageUrl: string | undefined;
    if (imageUri || imageFile) {
      imageUrl = await uploadImage();
    }

    const campaignData: any = {
      title,
      description,
      prizeName,
      prizeDescription: prizeDesc || undefined,
      category,
      endsAt: endsAtText && !isNaN(new Date(endsAtText).getTime()) ? new Date(endsAtText).toISOString() : undefined,
      imageUrl,
      isFlashSale,
      originalPrice: isFlashSale && originalPriceText ? originalPriceText : undefined,
      flashSaleEndsAt: isFlashSale && flashSaleEndsAtText && !isNaN(new Date(flashSaleEndsAtText).getTime()) ? new Date(flashSaleEndsAtText).toISOString() : undefined,
    };

    if (hasVariants) {
      campaignData.productPrice = variants[0].price;
      campaignData.totalQuantity = variants.reduce((s, v) => s + parseInt(v.quantity || "0"), 0);
      campaignData.products = variants.map((v) => ({
        name: v.name,
        nameAr: v.nameAr || v.name,
        price: v.price,
        quantity: v.quantity,
        imageUrl: v.imageUrl || undefined,
      }));
    } else {
      campaignData.productPrice = price;
      campaignData.totalQuantity = parseInt(quantity);
    }

    mutation.mutate(campaignData);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>حملة جديدة</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Pressable onPress={pickCampaignImage} style={{ width: "100%", height: 160, borderRadius: 16, backgroundColor: Colors.light.background, borderWidth: 2, borderColor: Colors.light.accent + "30", borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%", borderRadius: 14 }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <Ionicons name="image-outline" size={36} color={Colors.light.accent} />
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" }}>اضغط لرفع صورة المنتج</Text>
                  </View>
                )}
              </Pressable>
              {imageUri && (
                <Pressable onPress={() => { setImageUri(null); setImageFile(null); }} style={{ marginTop: 8 }}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: "#EF4444" }}>إزالة الصورة</Text>
                </Pressable>
              )}
            </View>
            <ModalInput label="العنوان *" value={title} onChangeText={setTitle} placeholder="اسم الحملة" />
            <ModalInput label="الوصف *" value={description} onChangeText={setDescription} placeholder="وصف المنتج" multiline />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="color-palette-outline" size={20} color={Colors.light.accent} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, writingDirection: "rtl" }}>موديلات متعددة</Text>
              </View>
              <Switch
                value={hasVariants}
                onValueChange={(v) => {
                  setHasVariants(v);
                  if (v && variants.length === 0) addVariant();
                }}
                trackColor={{ true: Colors.light.accent }}
              />
            </View>

            {!hasVariants ? (
              <>
                <ModalInput label="السعر ($) *" value={price} onChangeText={setPrice} placeholder="29.99" keyboardType="decimal-pad" />
                <ModalInput label="الكمية الإجمالية *" value={quantity} onChangeText={setQuantity} placeholder="4000" keyboardType="number-pad" />
              </>
            ) : (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 8 }}>الموديلات ({variants.length})</Text>
                {variants.map((v, idx) => (
                  <View key={v.key} style={{ backgroundColor: "#F9FAFB", borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.light.border }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent }}>موديل {idx + 1}</Text>
                      <Pressable onPress={() => removeVariant(v.key)}>
                        <Ionicons name="close-circle" size={22} color={Colors.light.danger} />
                      </Pressable>
                    </View>
                    <ModalInput label="الاسم (إنجليزي) *" value={v.name} onChangeText={(t) => updateVariant(v.key, "name", t)} placeholder="256GB Black" />
                    <ModalInput label="الاسم (عربي)" value={v.nameAr} onChangeText={(t) => updateVariant(v.key, "nameAr", t)} placeholder="256 جيجا أسود" />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <ModalInput label="السعر ($) *" value={v.price} onChangeText={(t) => updateVariant(v.key, "price", t)} placeholder="29.99" keyboardType="decimal-pad" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ModalInput label="الكمية *" value={v.quantity} onChangeText={(t) => updateVariant(v.key, "quantity", t)} placeholder="1000" keyboardType="number-pad" />
                      </View>
                    </View>
                    <ModalInput label="رابط الصورة (اختياري)" value={v.imageUrl} onChangeText={(t) => updateVariant(v.key, "imageUrl", t)} placeholder="https://example.com/image.jpg" />
                  </View>
                ))}
                <Pressable onPress={addVariant} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: "rgba(124,58,237,0.06)", borderRadius: 12, borderWidth: 1, borderColor: Colors.light.accent + "30", borderStyle: "dashed" }}>
                  <Ionicons name="add-circle" size={20} color={Colors.light.accent} />
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.accent }}>إضافة موديل</Text>
                </Pressable>
              </View>
            )}

            <ModalInput label="اسم الجائزة *" value={prizeName} onChangeText={setPrizeName} placeholder="iPhone 16 Pro Max" />
            <ModalInput label="وصف الجائزة" value={prizeDesc} onChangeText={setPrizeDesc} placeholder="تفاصيل إضافية" multiline />
            <View style={modalStyles.inputGroup}>
              <Text style={modalStyles.inputLabel}>التصنيف</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CATEGORY_OPTIONS.map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[styles.statusOption, category === cat.key && styles.statusOptionActive]}
                  >
                    <Text style={[styles.statusOptionText, category === cat.key && styles.statusOptionTextActive]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <ModalInput label="تاريخ الانتهاء (اختياري)" value={endsAtText} onChangeText={setEndsAtText} placeholder="2025-12-31T23:59" />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, backgroundColor: "#FFF1F1", borderRadius: 12, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 18 }}>🔥</Text>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, writingDirection: "rtl" }}>عرض محدود (Flash Sale)</Text>
              </View>
              <Switch
                value={isFlashSale}
                onValueChange={setIsFlashSale}
                trackColor={{ true: "#EF4444" }}
              />
            </View>

            {isFlashSale && (
              <View style={{ backgroundColor: "#FFF5F5", borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 }}>
                <ModalInput label="السعر الأصلي قبل الخصم ($)" value={originalPriceText} onChangeText={setOriginalPriceText} placeholder="49.99" keyboardType="decimal-pad" />
                <ModalInput label="ينتهي العرض في" value={flashSaleEndsAtText} onChangeText={setFlashSaleEndsAtText} placeholder="2025-06-30T23:59" />
              </View>
            )}

            {createError && (
              <View style={{ backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#991B1B", textAlign: "right", writingDirection: "rtl" as const }}>{createError}</Text>
              </View>
            )}

            <Pressable
              onPress={handleCreate}
              disabled={mutation.isPending || uploading}
              style={[modalStyles.createBtn, (mutation.isPending || uploading) && { opacity: 0.6 }]}
            >
              {(mutation.isPending || uploading) ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.createBtnText}>إنشاء الحملة</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CreatePaymentModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [icon, setIcon] = useState("card");
  const [desc, setDesc] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [iban, setIban] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/payment-methods", data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      onClose();
      setName(""); setNameAr(""); setIcon("card"); setDesc(""); setBankName(""); setAccountName(""); setIban("");
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>إضافة طريقة دفع</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <ModalInput label="الاسم (إنجليزي) *" value={name} onChangeText={setName} placeholder="Credit Card" />
            <ModalInput label="الاسم (عربي) *" value={nameAr} onChangeText={setNameAr} placeholder="بطاقة ائتمان" />
            <ModalInput label="أيقونة" value={icon} onChangeText={setIcon} placeholder="card" />
            <ModalInput label="وصف" value={desc} onChangeText={setDesc} placeholder="وصف اختياري" />
            <ModalInput label="اسم البنك" value={bankName} onChangeText={setBankName} placeholder="مثال: البنك الأهلي" />
            <ModalInput label="اسم صاحب الحساب" value={accountName} onChangeText={setAccountName} placeholder="الاسم كما في الحساب البنكي" />
            <ModalInput label="رقم الآيبان (IBAN)" value={iban} onChangeText={setIban} placeholder="SA..." />
            <Pressable
              onPress={() => {
                if (!name || !nameAr) { Alert.alert("خطأ", "يرجى ملء الحقول المطلوبة"); return; }
                mutation.mutate({
                  name, nameAr, icon, description: desc || undefined,
                  ...(bankName ? { bankName } : {}),
                  ...(accountName ? { accountName } : {}),
                  ...(iban ? { iban } : {}),
                });
              }}
              disabled={mutation.isPending}
              style={[modalStyles.createBtn, mutation.isPending && { opacity: 0.6 }]}
            >
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.createBtnText}>إضافة</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EditPaymentModal({ visible, method, onClose }: { visible: boolean; method: any; onClose: () => void }) {
  const [name, setName] = useState(method?.name || "");
  const [nameAr, setNameAr] = useState(method?.nameAr || "");
  const [icon, setIcon] = useState(method?.icon || "card");
  const [desc, setDesc] = useState(method?.description || "");
  const [bankName, setBankName] = useState(method?.bankName || "");
  const [accountName, setAccountName] = useState(method?.accountName || "");
  const [iban, setIban] = useState(method?.iban || "");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/admin/payment-methods/${method.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      onClose();
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>تعديل طريقة الدفع</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <ModalInput label="الاسم (إنجليزي) *" value={name} onChangeText={setName} placeholder="Credit Card" />
            <ModalInput label="الاسم (عربي) *" value={nameAr} onChangeText={setNameAr} placeholder="بطاقة ائتمان" />
            <ModalInput label="أيقونة" value={icon} onChangeText={setIcon} placeholder="card" />
            <ModalInput label="وصف" value={desc} onChangeText={setDesc} placeholder="وصف اختياري" />
            <View style={{ backgroundColor: "rgba(124,58,237,0.04)", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.light.accent + "20" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Ionicons name="business" size={16} color={Colors.light.accent} />
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.light.accent, writingDirection: "rtl" }}>بيانات الحساب البنكي</Text>
              </View>
              <ModalInput label="اسم البنك" value={bankName} onChangeText={setBankName} placeholder="مثال: البنك الأهلي السعودي" />
              <ModalInput label="اسم صاحب الحساب" value={accountName} onChangeText={setAccountName} placeholder="الاسم كما في الحساب البنكي" />
              <ModalInput label="رقم الآيبان (IBAN)" value={iban} onChangeText={setIban} placeholder="SA..." />
            </View>
            <Pressable
              onPress={() => {
                if (!name || !nameAr) { Alert.alert("خطأ", "يرجى ملء الحقول المطلوبة"); return; }
                mutation.mutate({
                  name, nameAr, icon, description: desc || undefined,
                  bankName: bankName || null,
                  accountName: accountName || null,
                  iban: iban || null,
                });
              }}
              disabled={mutation.isPending}
              style={[modalStyles.createBtn, mutation.isPending && { opacity: 0.6 }]}
            >
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.createBtnText}>حفظ التعديلات</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CreateCouponModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [maxUses, setMaxUses] = useState("100");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/coupons", data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      onClose();
      setCode(""); setDiscount(""); setMaxUses("100");
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>كوبون جديد</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <ModalInput label="كود الخصم *" value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="SAVE20" />
            <ModalInput label="نسبة الخصم (%) *" value={discount} onChangeText={setDiscount} placeholder="20" keyboardType="number-pad" />
            <ModalInput label="الحد الأقصى للاستخدام" value={maxUses} onChangeText={setMaxUses} placeholder="100" keyboardType="number-pad" />
            <Pressable
              onPress={() => {
                if (!code || !discount) { Alert.alert("خطأ", "يرجى ملء الحقول المطلوبة"); return; }
                mutation.mutate({ code, discountPercent: parseInt(discount), maxUses: parseInt(maxUses) || 100 });
              }}
              disabled={mutation.isPending}
              style={[modalStyles.createBtn, mutation.isPending && { opacity: 0.6 }]}
            >
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.createBtnText}>إنشاء الكوبون</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalInput({ label, value, onChangeText, placeholder, multiline, keyboardType, secureTextEntry }: { label: string; value: string; onChangeText: (t: string) => void; placeholder: string; multiline?: boolean; keyboardType?: any; secureTextEntry?: boolean }) {
  return (
    <View style={modalStyles.inputGroup}>
      <Text style={modalStyles.inputLabel}>{label}</Text>
      <TextInput
        style={[modalStyles.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.tabIconDefault}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

function AccountSettingsSection() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/admin/account-settings", data),
    onSuccess: () => {
      Alert.alert("✅ تم", "تم تحديث الإعدادات بنجاح");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      Alert.alert("خطأ", err?.message || "حدث خطأ");
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/create-admin", data),
    onSuccess: () => {
      Alert.alert("✅ تم", "تم إنشاء حساب الأدمن بنجاح");
      setNewAdminEmail("");
      setNewAdminUsername("");
      setNewAdminPassword("");
    },
    onError: (err: any) => {
      Alert.alert("خطأ", err?.message || "حدث خطأ");
    },
  });

  const handleUpdateAccount = () => {
    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert("خطأ", "كلمة السر الجديدة وتأكيدها غير متطابقتين");
      return;
    }
    const payload: any = {};
    if (email && email !== user?.email) payload.email = email;
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }
    if (Object.keys(payload).length === 0) {
      Alert.alert("تنبيه", "لم تقم بأي تغيير");
      return;
    }
    updateMutation.mutate(payload);
  };

  const handleCreateAdmin = () => {
    if (!newAdminEmail || !newAdminUsername || !newAdminPassword) {
      Alert.alert("خطأ", "جميع الحقول مطلوبة");
      return;
    }
    createAdminMutation.mutate({ email: newAdminEmail, username: newAdminUsername, password: newAdminPassword });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={settingsStyles.card}>
        <Text style={settingsStyles.cardTitle}>تغيير البريد الإلكتروني</Text>
        <ModalInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} placeholder="admin@example.com" keyboardType="email-address" />
      </View>

      <View style={settingsStyles.card}>
        <Text style={settingsStyles.cardTitle}>تغيير كلمة السر</Text>
        <ModalInput label="كلمة السر الحالية" value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" secureTextEntry />
        <ModalInput label="كلمة السر الجديدة" value={newPassword} onChangeText={setNewPassword} placeholder="••••••••" secureTextEntry />
        <ModalInput label="تأكيد كلمة السر" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" secureTextEntry />
      </View>

      <Pressable
        style={[settingsStyles.saveBtn, updateMutation.isPending && { opacity: 0.6 }]}
        onPress={handleUpdateAccount}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text style={settingsStyles.saveBtnText}>حفظ التغييرات</Text>
        }
      </Pressable>

      <View style={[settingsStyles.card, { marginTop: 24 }]}>
        <Text style={settingsStyles.cardTitle}>إضافة حساب أدمن جديد</Text>
        <ModalInput label="البريد الإلكتروني" value={newAdminEmail} onChangeText={setNewAdminEmail} placeholder="admin2@example.com" keyboardType="email-address" />
        <ModalInput label="اسم المستخدم" value={newAdminUsername} onChangeText={setNewAdminUsername} placeholder="admin2" />
        <ModalInput label="كلمة السر" value={newAdminPassword} onChangeText={setNewAdminPassword} placeholder="••••••••" secureTextEntry />
      </View>

      <Pressable
        style={[settingsStyles.createBtn, createAdminMutation.isPending && { opacity: 0.6 }]}
        onPress={handleCreateAdmin}
        disabled={createAdminMutation.isPending}
      >
        {createAdminMutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text style={settingsStyles.saveBtnText}>إنشاء حساب أدمن</Text>
        }
      </Pressable>
    </ScrollView>
  );
}

const settingsStyles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 14 },
  saveBtn: { backgroundColor: Colors.light.accent, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  createBtn: { backgroundColor: "#2ECC71", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff", writingDirection: "rtl" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.light.danger, marginBottom: 16, writingDirection: "rtl" },
  backBtn: { backgroundColor: Colors.light.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff", writingDirection: "rtl" },
  header: { paddingBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerBackBtn: { padding: 8 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", writingDirection: "rtl" },
  tabsRow: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 12, gap: 4 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: "rgba(212, 168, 83, 0.15)" },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.5)", writingDirection: "rtl" },
  tabTextActive: { color: Colors.light.accent, fontFamily: "Inter_600SemiBold" },
  content: { flex: 1 },
  sectionPadding: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.light.text, marginBottom: 14, textAlign: "right", writingDirection: "rtl" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff", writingDirection: "rtl" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 2, textAlign: "right", writingDirection: "rtl" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl" },

  topCampaignItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  topCampaignRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.light.accent + "18", alignItems: "center", justifyContent: "center" },
  topCampaignRankText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.light.accent },
  topCampaignTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  topCampaignSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl" },

  orderCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderIdText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.light.text, writingDirection: "rtl" },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  orderDetailText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.light.border },
  orderAmount: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.light.text },
  orderDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontFamily: "Inter_600SemiBold", fontSize: 11, writingDirection: "rtl" },

  statusPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.light.progressBg },
  statusOptionActive: { backgroundColor: Colors.light.accent },
  statusOptionText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" },
  statusOptionTextActive: { color: "#fff" },

  userCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.light.accent + "18", alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.light.accent },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  adminPill: { backgroundColor: "#FFD70020", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminPillText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#FFD700", writingDirection: "rtl" as const },
  verifiedPill: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: "#10B98118", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  verifiedPillText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#10B981", writingDirection: "rtl" as const },
  unverifiedPill: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: "#EF444418", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  unverifiedPillText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#EF4444", writingDirection: "rtl" as const },
  userStatsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  userStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  userStatText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, writingDirection: "rtl" },

  campaignCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  campaignHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  campaignTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.light.text, flex: 1, textAlign: "right", writingDirection: "rtl" },
  campaignInfo: { marginBottom: 10 },
  campaignInfoText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginBottom: 2 },
  campaignProgressWrap: { marginBottom: 10 },
  campaignProgressBg: { height: 6, backgroundColor: Colors.light.progressBg, borderRadius: 3, overflow: "hidden" },
  campaignProgressFill: { height: "100%", borderRadius: 3 },
  campaignActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff", writingDirection: "rtl" },
  winnerBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFD70012", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
  winnerText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#B8912D", writingDirection: "rtl" },

  paymentCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  paymentName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  paymentNameEn: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right" },
  paymentDesc: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  deletePaymentBtn: { alignSelf: "flex-start", padding: 8, marginTop: 8 },

  couponCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  couponHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  couponCodeBadge: { backgroundColor: Colors.light.accent + "18", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  couponCode: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.light.accent, letterSpacing: 1 },
  couponDetails: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  couponStat: { alignItems: "center" },
  couponStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, marginBottom: 2, writingDirection: "rtl" },
  couponStatValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.light.text },
  deleteCouponBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", padding: 4 },
  deleteCouponText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.danger, writingDirection: "rtl" },

  activityItem: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  activityDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  activityTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.tabIconDefault, textAlign: "right", writingDirection: "rtl", marginTop: 4 },

  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", marginTop: 40, writingDirection: "rtl" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  container: { backgroundColor: Colors.light.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary, marginBottom: 6, textAlign: "right", writingDirection: "rtl" },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border, textAlign: "right", writingDirection: "rtl" },
  createBtn: { backgroundColor: Colors.light.accent, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  createBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff", writingDirection: "rtl" },
});

const orderMgmtStyles = StyleSheet.create({
  infoSection: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border },
  infoSectionTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl" },
  receiptLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 8 },
  receiptImage: { width: "100%", height: 200, borderRadius: 10, backgroundColor: Colors.light.inputBg },
  paymentActions: { marginTop: 8 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#2ECC71", borderRadius: 10, paddingVertical: 12 },
  confirmBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff", writingDirection: "rtl" },
  rejectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#E74C3C", borderRadius: 10, paddingVertical: 12, marginTop: 8 },
  rejectBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff", writingDirection: "rtl" },
  rejectionInput: { backgroundColor: Colors.light.inputBg, borderRadius: 10, padding: 12, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border, textAlign: "right", writingDirection: "rtl", marginBottom: 8 },
});

const chartStyles = StyleSheet.create({
  container: { marginTop: 24, backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  headerRow: { marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 4, marginTop: -4 },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.light.text },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, writingDirection: "rtl" },
  barsContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 180, paddingTop: 8 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: Colors.light.accent, minHeight: 14, textAlign: "center" },
  barTrack: { width: 28, height: 120, backgroundColor: Colors.light.progressBg, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 6 },
  barLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.light.textSecondary, writingDirection: "rtl", textAlign: "center" },
  barCount: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.light.tabIconDefault },
});
