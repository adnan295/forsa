import React, { useState } from "react";
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
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";

type AdminTab = "dashboard" | "orders" | "users" | "campaigns" | "payments" | "coupons" | "activity";

const TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: "dashboard", label: "الرئيسية", icon: "grid" },
  { key: "orders", label: "الطلبات", icon: "receipt" },
  { key: "users", label: "المستخدمين", icon: "people" },
  { key: "campaigns", label: "الحملات", icon: "megaphone" },
  { key: "payments", label: "الدفع", icon: "card" },
  { key: "coupons", label: "الكوبونات", icon: "pricetag" },
  { key: "activity", label: "السجل", icon: "time" },
];

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

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
      <LinearGradient colors={["#0A1628", "#152238"]} style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
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
              onPress={() => { setActiveTab(tab.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? Colors.light.accent : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <View style={styles.content}>
        {activeTab === "dashboard" && <DashboardSection />}
        {activeTab === "orders" && <OrdersSection />}
        {activeTab === "users" && <UsersSection />}
        {activeTab === "campaigns" && <CampaignsSection />}
        {activeTab === "payments" && <PaymentsSection />}
        {activeTab === "coupons" && <CouponsSection />}
        {activeTab === "activity" && <ActivitySection />}
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
        <StatCard icon="cash" label="إجمالي الإيرادات" value={`$${stats?.totalRevenue || "0"}`} color="#9B59B6" />
        <StatCard icon="receipt" label="إجمالي الطلبات" value={stats?.totalOrders?.toString() || "0"} color="#3498DB" />
        <StatCard icon="people" label="المستخدمين" value={stats?.totalUsers?.toString() || "0"} color="#2ECC71" />
        <StatCard icon="flame" label="حملات نشطة" value={stats?.activeCampaigns?.toString() || "0"} color={Colors.light.accent} />
        <StatCard icon="today" label="طلبات اليوم" value={stats?.ordersToday?.toString() || "0"} color="#E74C3C" />
        <StatCard icon="person-add" label="مستخدمين جدد (أسبوع)" value={stats?.newUsersThisWeek?.toString() || "0"} color="#1ABC9C" />
      </View>

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

  return (
    <>
      <FlatList
        data={orders || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={<Text style={styles.sectionTitle}>جميع الطلبات ({orders?.length || 0})</Text>}
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
              <Text style={styles.orderAmount}>${item.totalAmount}</Text>
              <View style={[styles.statusPill, { backgroundColor: item.status === "paid" ? "#2ECC7120" : "#F39C1220" }]}>
                <Text style={[styles.statusPillText, { color: item.status === "paid" ? "#2ECC71" : "#F39C12" }]}>{getOrderStatusAr(item.status)}</Text>
              </View>
              <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString("ar-SA")}</Text>
            </View>
          </Pressable>
        )}
      />
      <ShippingModal
        visible={showShippingModal}
        order={selectedOrder}
        onClose={() => setShowShippingModal(false)}
        onUpdate={(data) => selectedOrder && shippingMutation.mutate({ id: selectedOrder.id, data })}
        loading={shippingMutation.isPending}
      />
    </>
  );
}

function ShippingModal({ visible, order, onClose, onUpdate, loading }: any) {
  const [status, setStatus] = useState(order?.shippingStatus || "pending");
  const [tracking, setTracking] = useState(order?.trackingNumber || "");
  const [address, setAddress] = useState(order?.shippingAddress || "");

  React.useEffect(() => {
    if (order) {
      setStatus(order.shippingStatus || "pending");
      setTracking(order.trackingNumber || "");
      setAddress(order.shippingAddress || "");
    }
  }, [order]);

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
            <Text style={modalStyles.title}>تحديث الشحن</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
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
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.createBtnText}>تحديث</Text>}
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

  if (isLoading) return <LoadingView />;

  return (
    <FlatList
      data={users || []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.sectionPadding}
      ListHeaderComponent={<Text style={styles.sectionTitle}>المستخدمين ({users?.length || 0})</Text>}
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
                <Text style={styles.userStatText}>${item.totalSpent || "0"}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    />
  );
}

function CampaignsSection() {
  const { data: campaigns, isLoading } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const drawMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/draw/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم السحب!", `الفائز: ${data.winner.username}\nالتذكرة: ${data.ticket.ticketNumber}`);
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
    Alert.alert("سحب الفائز", `هل أنت متأكد من إجراء السحب لحملة "${c.title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "سحب", style: "destructive", onPress: () => drawMutation.mutate(c.id) },
    ]);
  };

  const handleDelete = (c: any) => {
    Alert.alert("حذف الحملة", `هل أنت متأكد من حذف "${c.title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(c.id) },
    ]);
  };

  const getStatusAr = (s: string) => {
    const map: Record<string, string> = { active: "نشط", sold_out: "نفذت الكمية", drawing: "جاري السحب", completed: "مكتمل" };
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
              <Text style={styles.campaignInfoText}>السعر: ${item.productPrice}</Text>
              <Text style={styles.campaignInfoText}>المباع: {item.soldQuantity}/{item.totalQuantity}</Text>
            </View>
            <View style={styles.campaignProgressWrap}>
              <View style={styles.campaignProgressBg}>
                <View style={[styles.campaignProgressFill, { width: `${Math.min((item.soldQuantity / item.totalQuantity) * 100, 100)}%`, backgroundColor: getStatusColor(item.status) }]} />
              </View>
            </View>
            <View style={styles.campaignActions}>
              {(item.status === "sold_out" || item.status === "drawing") && (
                <Pressable onPress={() => handleDraw(item)} style={[styles.actionBtn, { backgroundColor: "#9B59B6" }]}>
                  <Ionicons name="dice" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>سحب</Text>
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
    </>
  );
}

function PaymentsSection() {
  const { data: methods, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/payment-methods"] });
  const [showCreate, setShowCreate] = useState(false);

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
            <Pressable
              onPress={() => Alert.alert("حذف", `حذف طريقة الدفع "${item.nameAr}"؟`, [
                { text: "إلغاء", style: "cancel" },
                { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
              ])}
              style={styles.deletePaymentBtn}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.light.danger} />
            </Pressable>
          </View>
        )}
      />
      <CreatePaymentModal visible={showCreate} onClose={() => setShowCreate(false)} />
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

function LoadingView() {
  return (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color={Colors.light.accent} />
    </View>
  );
}

function CreateCampaignModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [prizeName, setPrizeName] = useState("");
  const [prizeDesc, setPrizeDesc] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onClose();
      setTitle(""); setDescription(""); setPrice(""); setQuantity(""); setPrizeName(""); setPrizeDesc("");
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>حملة جديدة</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <ModalInput label="العنوان *" value={title} onChangeText={setTitle} placeholder="اسم الحملة" />
            <ModalInput label="الوصف *" value={description} onChangeText={setDescription} placeholder="وصف المنتج" multiline />
            <ModalInput label="السعر ($) *" value={price} onChangeText={setPrice} placeholder="29.99" keyboardType="decimal-pad" />
            <ModalInput label="الكمية الإجمالية *" value={quantity} onChangeText={setQuantity} placeholder="4000" keyboardType="number-pad" />
            <ModalInput label="اسم الجائزة *" value={prizeName} onChangeText={setPrizeName} placeholder="iPhone 16 Pro Max" />
            <ModalInput label="وصف الجائزة" value={prizeDesc} onChangeText={setPrizeDesc} placeholder="تفاصيل إضافية" multiline />
            <Pressable
              onPress={() => {
                if (!title || !description || !price || !quantity || !prizeName) { Alert.alert("خطأ", "يرجى ملء جميع الحقول المطلوبة"); return; }
                mutation.mutate({ title, description, productPrice: price, totalQuantity: parseInt(quantity), prizeName, prizeDescription: prizeDesc || undefined });
              }}
              disabled={mutation.isPending}
              style={[modalStyles.createBtn, mutation.isPending && { opacity: 0.6 }]}
            >
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.createBtnText}>إنشاء الحملة</Text>}
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

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/payment-methods", data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      onClose();
      setName(""); setNameAr(""); setIcon("card"); setDesc("");
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
            <Pressable
              onPress={() => {
                if (!name || !nameAr) { Alert.alert("خطأ", "يرجى ملء الحقول المطلوبة"); return; }
                mutation.mutate({ name, nameAr, icon, description: desc || undefined });
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

function ModalInput({ label, value, onChangeText, placeholder, multiline, keyboardType }: { label: string; value: string; onChangeText: (t: string) => void; placeholder: string; multiline?: boolean; keyboardType?: any }) {
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.light.danger, marginBottom: 16, writingDirection: "rtl" },
  backBtn: { backgroundColor: Colors.light.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff", writingDirection: "rtl" },
  header: { paddingBottom: 0 },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerBackBtn: { padding: 8 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", writingDirection: "rtl" },
  tabsRow: { flexDirection: "row-reverse", paddingHorizontal: 12, paddingBottom: 12, gap: 4 },
  tab: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: "rgba(212, 168, 83, 0.15)" },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.5)", writingDirection: "rtl" },
  tabTextActive: { color: Colors.light.accent, fontFamily: "Inter_600SemiBold" },
  content: { flex: 1 },
  sectionPadding: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.light.text, marginBottom: 14, textAlign: "right", writingDirection: "rtl" },
  sectionHeaderRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  addBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: Colors.light.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff", writingDirection: "rtl" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 2, textAlign: "right", writingDirection: "rtl" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl" },

  topCampaignItem: { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  topCampaignRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.light.accent + "18", alignItems: "center", justifyContent: "center" },
  topCampaignRankText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.light.accent },
  topCampaignTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  topCampaignSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl" },

  orderCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  orderHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderIdText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.light.text, writingDirection: "rtl" },
  orderRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 },
  orderDetailText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" },
  orderFooter: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.light.border },
  orderAmount: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.light.text },
  orderDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontFamily: "Inter_600SemiBold", fontSize: 11, writingDirection: "rtl" },

  statusPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.light.progressBg },
  statusOptionActive: { backgroundColor: Colors.light.accent },
  statusOptionText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" },
  statusOptionTextActive: { color: "#fff" },

  userCard: { flexDirection: "row-reverse", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.light.accent + "18", alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.light.accent },
  userNameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  adminPill: { backgroundColor: "#FFD70020", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminPillText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#FFD700", writingDirection: "rtl" },
  userStatsRow: { flexDirection: "row-reverse", gap: 12, marginTop: 8 },
  userStat: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  userStatText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, writingDirection: "rtl" },

  campaignCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  campaignHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  campaignTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.light.text, flex: 1, textAlign: "right", writingDirection: "rtl" },
  campaignInfo: { marginBottom: 10 },
  campaignInfoText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginBottom: 2 },
  campaignProgressWrap: { marginBottom: 10 },
  campaignProgressBg: { height: 6, backgroundColor: Colors.light.progressBg, borderRadius: 3, overflow: "hidden" },
  campaignProgressFill: { height: "100%", borderRadius: 3 },
  campaignActions: { flexDirection: "row-reverse", gap: 8 },
  actionBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff", writingDirection: "rtl" },
  winnerBanner: { flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: "#FFD70012", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
  winnerText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#B8912D", writingDirection: "rtl" },

  paymentCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  paymentRow: { flexDirection: "row-reverse", alignItems: "center", gap: 14 },
  paymentName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  paymentNameEn: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right" },
  paymentDesc: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  deletePaymentBtn: { alignSelf: "flex-start", padding: 8, marginTop: 8 },

  couponCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  couponHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  couponCodeBadge: { backgroundColor: Colors.light.accent + "18", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  couponCode: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.light.accent, letterSpacing: 1 },
  couponDetails: { flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 12 },
  couponStat: { alignItems: "center" },
  couponStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary, marginBottom: 2, writingDirection: "rtl" },
  couponStatValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.light.text },
  deleteCouponBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, alignSelf: "flex-start", padding: 4 },
  deleteCouponText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.danger, writingDirection: "rtl" },

  activityItem: { flexDirection: "row-reverse", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  activityDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  activityTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.tabIconDefault, textAlign: "right", writingDirection: "rtl", marginTop: 4 },

  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", marginTop: 40, writingDirection: "rtl" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  container: { backgroundColor: Colors.light.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary, marginBottom: 6, textAlign: "right", writingDirection: "rtl" },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border, textAlign: "right", writingDirection: "rtl" },
  createBtn: { backgroundColor: Colors.light.accent, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  createBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff", writingDirection: "rtl" },
});
