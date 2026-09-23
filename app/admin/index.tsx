import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Switch,
  Image,
} from "react-native";
import { Alert } from "@/lib/alert";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { Logo, StatTile, StatusBadge } from "@/components/ui";
import { isConfiguredBankTransfer } from "@shared/commerce";
import { parseProductSpecs } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, getApiUrl, buildMediaUrl } from "@/lib/query-client";
import DrawHero from "@/components/DrawHero";
import { isReadyToShip, printShippingLabels, type LabelOrder } from "@/lib/shipping-label";
import type { CurrentDraw } from "@/components/DrawBanner";

type AdminTab = "dashboard" | "orders" | "users" | "products" | "draws" | "payments" | "coupons" | "notifications" | "activity" | "support" | "settings";

const TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: "dashboard", label: "الرئيسية", icon: "grid" },
  { key: "notifications", label: "الإشعارات", icon: "notifications" },
  { key: "orders", label: "الطلبات", icon: "receipt" },
  { key: "support", label: "تذاكر الدعم", icon: "chatbubbles" },
  { key: "users", label: "المستخدمين", icon: "people" },
  { key: "products", label: "المنتجات", icon: "cube" },
  { key: "draws", label: "جولات السحب", icon: "gift" },
  { key: "payments", label: "الحسابات البنكية", icon: "business" },
  { key: "coupons", label: "الكوبونات", icon: "pricetag" },
  { key: "activity", label: "السجل", icon: "time" },
  { key: "settings", label: "الإعدادات", icon: "settings" },
];

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const { width } = useWindowDimensions();
  /** القائمة الجانبية على الشاشات العريضة، وشريط أفقي على الجوال */
  const wideLayout = width >= 900;

  const switchTab = (tab: AdminTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
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

  const activeLabel = TABS.find((t) => t.key === activeTab)?.label ?? "";

  const Sidebar = (
    <View style={[shell.sidebar, { paddingTop: Platform.OS === "web" ? 24 : insets.top + 16 }]}>
      <View style={shell.sidebarBrand}>
        <Logo onNavy size={26} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={shell.sidebarNav}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => switchTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[shell.sideItem, active && shell.sideItemActive]}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={active ? "#FFFFFF" : "rgba(255,255,255,0.65)"}
              />
              <Text style={[shell.sideLabel, active && shell.sideLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable onPress={() => router.back()} style={shell.sideExit}>
        <Ionicons name="exit-outline" size={19} color="rgba(255,255,255,0.65)" />
        <Text style={shell.sideLabel}>رجوع للتطبيق</Text>
      </Pressable>
    </View>
  );

  const Body = (
    <View style={shell.main}>
      {!wideLayout && (
        <View style={[shell.mobileBar, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 8 }]}>
          <View style={shell.mobileBarTop}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={shell.mobileBack}>
              <Ionicons name="chevron-back" size={24} color={Colors.light.navy} />
            </Pressable>
            <Text style={shell.mobileTitle}>لوحة الإدارة</Text>
            <Logo />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={shell.mobileTabs}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => switchTab(tab.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[shell.mobileTab, active && shell.mobileTabActive]}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={17}
                    color={active ? "#FFFFFF" : Colors.light.textSecondary}
                  />
                  <Text style={[shell.mobileTabText, active && shell.mobileTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {wideLayout && (
        <View style={shell.desktopHead}>
          <Text style={shell.desktopTitle}>{activeLabel}</Text>
          <Text style={shell.desktopSub}>إدارة المنصة ومتابعة الأداء في NAYVO</Text>
        </View>
      )}

      <View style={styles.content}>
        {activeTab === "dashboard" && <DashboardSection wide={wideLayout} onNavigate={switchTab} />}
        {activeTab === "notifications" && <NotificationsSection />}
        {activeTab === "orders" && <OrdersSection />}
        {activeTab === "users" && <UsersSection />}
        {activeTab === "products" && <ProductsSection />}
        {activeTab === "draws" && <DrawsSection />}
        {activeTab === "payments" && <PaymentsSection />}
        {activeTab === "coupons" && <CouponsSection />}
        {activeTab === "support" && <SupportTicketsSection />}
        {activeTab === "activity" && <ActivitySection />}
        {activeTab === "settings" && <AccountSettingsSection />}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, wideLayout && shell.wideRow]}>
      {wideLayout && Sidebar}
      {Body}
    </View>
  );
}

const shell = StyleSheet.create({
  wideRow: { flexDirection: "row" },

  sidebar: {
    width: 232,
    backgroundColor: Colors.light.navy,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  sidebarBrand: { alignItems: "center", paddingVertical: 20 },
  sidebarNav: { gap: 4, paddingBottom: 16 },
  sideItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
  },
  sideItemActive: { backgroundColor: Colors.light.primary },
  sideLabel: {
    flex: 1,
    fontFamily: "Tajawal_500Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "right",
    writingDirection: "rtl",
  },
  sideLabelActive: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold" },
  sideExit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
  },

  main: { flex: 1, backgroundColor: Colors.light.background },

  mobileBar: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  mobileBarTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  mobileBack: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  mobileTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 17,
    color: Colors.light.navy,
    writingDirection: "rtl",
  },
  mobileTabs: { paddingHorizontal: 16, gap: 8 },
  mobileTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
  },
  mobileTabActive: { backgroundColor: Colors.light.primary },
  mobileTabText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  mobileTabTextActive: { color: "#FFFFFF" },

  desktopHead: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 4,
    gap: 2,
  },
  desktopTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 24,
    color: Colors.light.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  desktopSub: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
});

function SalesChart() {
  const { data: chartData, error: loadError, refetch } = useQuery<{ date: string; total: string; count: number }[]>({
    queryKey: ["/api/admin/sales-chart"],
    refetchInterval: 30000,
  });

  if (loadError) return <LoadError onRetry={() => refetch()} />;
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

/** حالة الطلب كما تظهر في جدول لوحة الإدارة */
function orderRowState(order: any): { label: string; kind: "success" | "warning" | "error" | "info" } {
  if (order.paymentStatus === "rejected") return { label: "مرفوض", kind: "error" };
  if (order.paymentStatus !== "confirmed") return { label: "قيد التأكيد", kind: "warning" };
  if (order.shippingStatus === "delivered") return { label: "مكتمل", kind: "success" };
  if (order.shippingStatus === "cancelled") return { label: "ملغي", kind: "error" };
  return { label: "قيد التنفيذ", kind: "info" };
}

function DashboardSection({
  wide,
  onNavigate,
}: {
  wide: boolean;
  onNavigate: (tab: AdminTab) => void;
}) {
  const { data: stats, isLoading, error: loadError, refetch } = useQuery<any>({
    queryKey: ["/api/admin/dashboard"],
    refetchInterval: 10000,
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/admin/orders"],
    refetchInterval: 15000,
  });

  if (isLoading) return <LoadingView />;
  if (loadError) return <LoadError onRetry={() => refetch()} />;

  const draw = stats?.activeDraw ?? null;
  const soldTickets = draw?.soldTickets ?? 0;
  const targetTickets = draw?.targetTickets ?? 0;
  const remaining = Math.max(0, targetTickets - soldTickets);
  const progress = targetTickets > 0 ? Math.min(soldTickets / targetTickets, 1) : 0;
  const recentOrders = (orders ?? []).slice(0, 5);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dash.content}>
      {!wide && (
        <View style={dash.mobileHead}>
          <View style={dash.demoBadge}>
            <Ionicons name="server-outline" size={13} color={Colors.light.textSecondary} />
            <Text style={dash.demoText}>بيانات مباشرة</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={dash.mobileTitle}>لوحة الإدارة</Text>
            <Text style={dash.mobileSub}>إدارة المنصة ومتابعة الأداء في NAYVO</Text>
          </View>
        </View>
      )}

      {/* ───── بطاقات الأرقام ───── */}
      <View style={dash.statsGrid}>
        <StatTile
          icon="bar-chart"
          tone="primary"
          value={`$${stats?.totalRevenue ?? "0"}`}
          label="التحويلات المؤكدة"
          style={wide ? dash.statWide : dash.statNarrow}
        />
        <StatTile
          icon="ticket"
          tone="success"
          value={soldTickets}
          label="فرص الجولة الحالية"
          style={wide ? dash.statWide : dash.statNarrow}
        />
        <StatTile
          icon="trophy"
          tone="navy"
          value={remaining}
          label="المتبقي للسحب"
          style={wide ? dash.statWide : dash.statNarrow}
        />
        <StatTile
          icon="cart"
          tone="warning"
          value={stats?.pendingReviewOrders ?? 0}
          label="إيصالات بانتظار المراجعة"
          style={wide ? dash.statWide : dash.statNarrow}
        />
      </View>

      <View style={[dash.panels, wide && dash.panelsWide]}>
        {/* ───── أحدث الطلبات ───── */}
        <View style={[dash.panel, wide && dash.panelGrow]}>
          <View style={dash.panelHead}>
            <Pressable onPress={() => onNavigate("orders")} hitSlop={8} accessibilityRole="button">
              <Text style={dash.panelLink}>عرض الكل ‹</Text>
            </Pressable>
            <Text style={dash.panelTitle}>أحدث الطلبات</Text>
          </View>

          <View style={dash.tableHead}>
            <Text style={[dash.th, dash.colDate]}>التاريخ</Text>
            <Text style={[dash.th, dash.colState]}>الحالة</Text>
            {wide && <Text style={[dash.th, dash.colPay]}>الدفع</Text>}
            <Text style={[dash.th, dash.colAmount]}>القيمة</Text>
            <Text style={[dash.th, dash.colId]}>الطلب</Text>
          </View>

          {recentOrders.length === 0 ? (
            <Text style={dash.emptyRow}>ما في طلبات بعد</Text>
          ) : (
            recentOrders.map((o) => {
              const state = orderRowState(o);
              return (
                <View key={o.id} style={dash.tr}>
                  <Text style={[dash.td, dash.colDate]}>
                    {new Date(o.createdAt).toLocaleDateString("en-GB")}
                  </Text>
                  <View style={dash.colState}>
                    <StatusBadge kind={state.kind} label={state.label} />
                  </View>
                  {wide && (
                    <Text style={[dash.td, dash.colPay]} numberOfLines={1}>
                      {o.paymentMethod || "—"}
                    </Text>
                  )}
                  <Text style={[dash.td, dash.colAmount, dash.tdStrong]}>
                    ${parseFloat(o.totalAmount).toFixed(0)}
                  </Text>
                  <Text style={[dash.td, dash.colId, dash.tdStrong]}>#{o.id.slice(0, 6)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* ───── السحب الحالي ───── */}
        <View style={[dash.panel, wide && dash.panelSide]}>
          <View style={dash.panelHead}>
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.light.textMuted} />
            <Text style={dash.panelTitle}>السحب الحالي</Text>
          </View>

          {draw ? (
            <>
              <View style={dash.drawRow}>
                <View style={dash.drawImage}>
                  {draw.prizeImageUrl ? (
                    <Image
                      source={{ uri: buildMediaUrl(draw.prizeImageUrl)! }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="trophy" size={28} color={Colors.light.gold} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={dash.drawTitle}>{draw.title}</Text>
                  <Text style={dash.drawPrize}>الجائزة: {draw.prizeName}</Text>
                </View>
              </View>

              <View style={dash.progressRow}>
                <Text style={dash.progressPercent}>{(progress * 100).toFixed(1)}%</Text>
                <View style={dash.progressTrack}>
                  <View style={[dash.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
                </View>
              </View>

              <Text style={dash.drawCount}>
                {soldTickets} من {targetTickets} فرصة
              </Text>

              <Pressable
                onPress={() => onNavigate("draws")}
                accessibilityRole="button"
                style={dash.drawBtn}
              >
                <Ionicons name="settings-outline" size={17} color="#FFFFFF" />
                <Text style={dash.drawBtnText}>إدارة السحب</Text>
              </Pressable>
            </>
          ) : (
            <View style={dash.noDraw}>
              <Ionicons name="gift-outline" size={34} color={Colors.light.border} />
              <Text style={dash.noDrawText}>ما في سحب مفتوح</Text>
              <Pressable onPress={() => onNavigate("draws")} style={dash.drawBtn}>
                <Ionicons name="add" size={17} color="#FFFFFF" />
                <Text style={dash.drawBtnText}>إنشاء جولة</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <SalesChart />

      {stats?.topProducts && stats.topProducts.length > 0 && (
        <View style={dash.panel}>
          <Text style={dash.panelTitle}>أفضل المنتجات مبيعاً</Text>
          {stats.topProducts.map((p: any, i: number) => (
            <View key={i} style={styles.topProductItem}>
              <View style={styles.topProductRank}>
                <Text style={styles.topProductRankText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topProductTitle}>{p.name}</Text>
                <Text style={styles.topProductSub}>{p.soldCount} مبيعات</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const dash = StyleSheet.create({
  content: { padding: 16, gap: 16 },

  mobileHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  mobileTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 20,
    color: Colors.light.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  mobileSub: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  demoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.border,
  },
  demoText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statWide: { minWidth: 210 },
  statNarrow: { minWidth: "45%" },

  panels: { gap: 16 },
  panelsWide: { flexDirection: "row", alignItems: "flex-start" },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.border,
  },
  panelGrow: { flex: 2 },
  panelSide: { flex: 1, minWidth: 280 },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
    color: Colors.light.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  panelLink: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: Colors.light.primary,
    writingDirection: "rtl",
  },

  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  th: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
    color: Colors.light.textMuted,
    writingDirection: "rtl",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.borderSubtle,
  },
  td: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  tdStrong: { fontFamily: "Tajawal_700Bold", color: Colors.light.navy },
  colDate: { width: 86, textAlign: "left", writingDirection: "ltr" },
  colState: { width: 104, alignItems: "flex-start" },
  colPay: { flex: 1, textAlign: "right", writingDirection: "rtl" },
  colAmount: { width: 62, textAlign: "right" },
  colId: { width: 66, textAlign: "right", writingDirection: "ltr" },
  emptyRow: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    paddingVertical: 20,
  },

  drawRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  drawImage: {
    width: 62,
    height: 78,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  drawTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 17,
    color: Colors.light.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  drawPrize: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressPercent: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: Colors.light.primary },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.light.borderSubtle,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: Colors.light.primary },
  drawCount: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  drawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  drawBtnText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 15,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  noDraw: { alignItems: "center", gap: 12, paddingVertical: 20 },
  noDrawText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
});

/** طباعة ملصقات الشحن بكبسة — تعرض سبب الفشل إن لم تتوفر طابعة */
async function handlePrintLabels(list: LabelOrder[]) {
  if (list.length === 0) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await printShippingLabels(list);
  } catch (err: any) {
    Alert.alert("تعذّرت الطباعة", err?.message || "تأكد من اتصال الطابعة وحاول مرة ثانية");
  }
}

function OrdersSection() {
  const { data: orders, isLoading, error: loadError, refetch } = useQuery<any[]>({
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
      for (const key of ["/api/admin/dashboard", "/api/admin/draws", "/api/admin/users", "/api/admin/products", "/api/admin/sales-chart", "/api/draws/current"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  if (isLoading) return <LoadingView />;
  if (loadError) return <LoadError onRetry={() => refetch()} />;

  const readyToShip = (orders ?? []).filter(isReadyToShip);

  const getShippingStatusAr = (s: string) => {
    const map: Record<string, string> = { pending: "قيد الانتظار", processing: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };
    return map[s] || s;
  };
  const getShippingColor = (s: string) => {
    const map: Record<string, string> = { pending: "#B54708", processing: "#175CD3", shipped: "#164A9E", delivered: "#067647", cancelled: "#B42318" };
    return map[s] || "#475467";
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
    const map: Record<string, string> = { pending_payment: "#B54708", pending_review: "#175CD3", confirmed: "#067647", rejected: "#B42318" };
    return map[s] || "#475467";
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
                    const url = new URL("/api/admin/orders/export/csv", getApiUrl()).toString();
                    if (Platform.OS === "web") {
                      window.open(url, "_blank");
                    } else {
                      Alert.alert("تصدير CSV", "التصدير متاح عبر المتصفح فقط حالياً");
                    }
                  } catch {}
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#06764715", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Ionicons name="download-outline" size={16} color="#067647" />
                <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#067647" }}>CSV</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => handlePrintLabels(readyToShip)}
              disabled={readyToShip.length === 0}
              accessibilityRole="button"
              style={[orderMgmtStyles.printAllBtn, readyToShip.length === 0 && { opacity: 0.5 }]}
            >
              <Ionicons name="print-outline" size={18} color="#fff" />
              <Text style={orderMgmtStyles.printAllText}>
                {readyToShip.length > 0
                  ? `طباعة ملصقات الطلبات الجاهزة للشحن (${readyToShip.length})`
                  : "ما في طلبات جاهزة للشحن حالياً"}
              </Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد طلبات</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.orderCard} onPress={() => { setSelectedOrder(item); setShowShippingModal(true); }}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderIdText}>#{item.id.slice(0, 8)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); handlePrintLabels([item]); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="طباعة ملصق الشحن"
                  style={orderMgmtStyles.printBtn}
                >
                  <Ionicons name="print-outline" size={16} color={Colors.light.navy} />
                  <Text style={orderMgmtStyles.printBtnText}>ملصق</Text>
                </Pressable>
                <View style={[styles.statusPill, { backgroundColor: getShippingColor(item.shippingStatus) + "20" }]}>
                  <Text style={[styles.statusPillText, { color: getShippingColor(item.shippingStatus) }]}>{getShippingStatusAr(item.shippingStatus)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.orderRow}>
              <Ionicons name="person" size={14} color={Colors.light.textSecondary} />
              <Text style={styles.orderDetailText}>{item.username || "مستخدم"}</Text>
            </View>
            <View style={styles.orderRow}>
              <Ionicons name="megaphone" size={14} color={Colors.light.textSecondary} />
              <Text style={styles.orderDetailText} numberOfLines={2}>{item.summary || "—"}</Text>
            </View>
            <View style={styles.orderFooter}>
              <Text style={styles.orderAmount}>{item.totalAmount} $</Text>
              <View style={[styles.statusPill, { backgroundColor: item.status === "paid" ? "#06764720" : "#B5470820" }]}>
                <Text style={[styles.statusPillText, { color: item.status === "paid" ? "#067647" : "#B54708" }]}>{getOrderStatusAr(item.status)}</Text>
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
        order={orders?.find(o => o.id === selectedOrder?.id) ?? selectedOrder}
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
  }, [order?.id, order?.shippingStatus, order?.trackingNumber, order?.shippingAddress]);

  const getPaymentStatusAr = (s: string) => {
    const map: Record<string, string> = { pending_payment: "في انتظار الدفع", pending_review: "قيد المراجعة", confirmed: "تم التأكيد", rejected: "مرفوض" };
    return map[s] || s;
  };
  const getPaymentColor = (s: string) => {
    const map: Record<string, string> = { pending_payment: "#B54708", pending_review: "#175CD3", confirmed: "#067647", rejected: "#B42318" };
    return map[s] || "#475467";
  };

  const statuses = [
    { key: "pending", label: "قيد الانتظار" },
    { key: "processing", label: "قيد التجهيز" },
    { key: "shipped", label: "تم الشحن" },
    { key: "delivered", label: "تم التوصيل" },
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
                <Pressable
                  onPress={() => handlePrintLabels([order])}
                  accessibilityRole="button"
                  style={[orderMgmtStyles.printAllBtn, { marginTop: 0, marginBottom: 10 }]}
                >
                  <Ionicons name="print-outline" size={18} color="#fff" />
                  <Text style={orderMgmtStyles.printAllText}>طباعة ملصق الشحن</Text>
                </Pressable>
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

            {order && <View style={orderMgmtStyles.infoSection}>
              <Text style={orderMgmtStyles.infoSectionTitle}>المنتجات والمبلغ المطلوب تحويله</Text>
              {(order.items ?? []).map((item: any) => <Text key={item.id} style={orderMgmtStyles.infoText}>{item.productName} × {item.quantity} — {item.lineTotal} $</Text>)}
              <Text style={orderMgmtStyles.infoText}>المنتجات: {order.subtotal} $ · الخصم: {order.discountAmount} $ · التوصيل: {order.deliveryFee} $</Text>
              <Text style={orderMgmtStyles.infoText}>المجموع المطلوب: {order.totalAmount} $ — تحويل بنكي</Text>
              <Text style={orderMgmtStyles.infoText}>الفرص المثبتة عند الشراء: {order.expectedTickets} · القسائم الصادرة: {order.ticketsAwarded}</Text>
              {order.rejectionReason ? <Text style={styles.errorText}>سبب الرفض: {order.rejectionReason}</Text> : null}
            </View>}
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

                {["pending_payment", "pending_review"].includes(order.paymentStatus) && (
                  <View style={orderMgmtStyles.paymentActions}>
                    <Pressable
                      onPress={() => Alert.alert("تأكيد التحويل البنكي", `هل وصل مبلغ ${order.totalAmount} $ فعلياً إلى البنك؟ سيتم منح ${order.expectedTickets} تذكرة.`, [
                        { text: "رجوع", style: "cancel" },
                        { text: "وصل التحويل — تأكيد", onPress: () => onPaymentUpdate({ paymentStatus: "confirmed" }) },
                      ])}
                      disabled={paymentLoading || !order.receiptUrl}
                      style={[orderMgmtStyles.confirmBtn, (paymentLoading || !order.receiptUrl) && { opacity: 0.6 }]}
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
                textContentType="none"
                        style={orderMgmtStyles.rejectionInput}
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        placeholder="سبب الرفض (اختياري)"
                        placeholderTextColor={Colors.light.tabIconDefault}
                        textAlign="right"
                      />
                      <Pressable
                        onPress={() => Alert.alert("رفض الطلب", "لن تُمنح قسائم وسيُعاد المخزون. هذا لا يعيد حوالة بنكية تلقائياً.", [
                          { text: "رجوع", style: "cancel" },
                          { text: "رفض الطلب", style: "destructive", onPress: () => onPaymentUpdate({ paymentStatus: "rejected", rejectionReason: rejectionReason || undefined }) },
                        ])}
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

            {order?.paymentStatus !== "confirmed" && <Text style={styles.emptyText}>تحديث الشحن متاح بعد تأكيد وصول التحويل البنكي.</Text>}
            <Text style={modalStyles.inputLabel}>حالة الشحن</Text>
            <View style={styles.statusPicker}>
              {statuses.map((s) => (
                <Pressable key={s.key} disabled={order?.paymentStatus !== "confirmed" || statuses.findIndex(x => x.key === s.key) < statuses.findIndex(x => x.key === order.shippingStatus)} onPress={() => setStatus(s.key)} style={[styles.statusOption, status === s.key && styles.statusOptionActive]}>
                  <Text style={[styles.statusOptionText, status === s.key && styles.statusOptionTextActive]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
            <ModalInput label="رقم التتبع" value={tracking} onChangeText={setTracking} placeholder="أدخل رقم التتبع" />
            <ModalInput label="عنوان الشحن" value={address} onChangeText={setAddress} placeholder="أدخل عنوان الشحن" multiline />
            <Pressable
              onPress={() => onUpdate({ shippingStatus: status, trackingNumber: tracking, shippingAddress: address })}
              disabled={loading || order?.paymentStatus !== "confirmed"}
              style={[modalStyles.createBtn, (loading || order?.paymentStatus !== "confirmed") && { opacity: 0.6 }]}
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
  const { data: users, isLoading, error: loadError, refetch } = useQuery<any[]>({
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
  if (loadError) return <LoadError onRetry={() => refetch()} />;

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
                const url = new URL("/api/admin/users/export/csv", getApiUrl()).toString();
                if (Platform.OS === "web") {
                  window.open(url, "_blank");
                } else {
                  Alert.alert("تصدير CSV", "التصدير متاح عبر المتصفح فقط حالياً");
                }
              } catch {}
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#06764715", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          >
            <Ionicons name="download-outline" size={16} color="#067647" />
            <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#067647" }}>CSV</Text>
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
                <View style={styles.verifiedPill}><Ionicons name="checkmark-circle" size={12} color="#067647" /><Text style={styles.verifiedPillText}>مفعّل</Text></View>
              ) : (
                <Pressable onPress={() => handleVerify(item.id, item.username)} style={styles.unverifiedPill}>
                  <Ionicons name="close-circle" size={12} color="#B42318" />
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
  const { data: tickets, isLoading, error: loadError, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/support-tickets"],
    refetchInterval: 10000,
  });
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  if (isLoading) return <LoadingView />;
  if (loadError) return <LoadError onRetry={() => refetch()} />;

  const filteredTickets = (tickets || []).filter((t: any) =>
    statusFilter === "all" ? true : t.status === statusFilter
  );

  const getStatusAr = (s: string) => {
    const map: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };
    return map[s] || s;
  };
  const getStatusColor = (s: string) => {
    const map: Record<string, string> = { open: "#B54708", in_progress: "#175CD3", closed: "#067647" };
    return map[s] || "#475467";
  };
  const getPriorityAr = (s: string) => {
    const map: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية" };
    return map[s] || s;
  };
  const getPriorityColor = (s: string) => {
    const map: Record<string, string> = { low: "#067647", medium: "#B54708", high: "#B42318" };
    return map[s] || "#475467";
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
                    <View style={[styles.statusPill, { backgroundColor: "#B5470820" }]}>
                      <Text style={[styles.statusPillText, { color: "#B54708" }]}>{openCount} جديدة</Text>
                    </View>
                  )}
                  {inProgressCount > 0 && (
                    <View style={[styles.statusPill, { backgroundColor: "#175CD320" }]}>
                      <Text style={[styles.statusPillText, { color: "#175CD3" }]}>{inProgressCount} قيد المعالجة</Text>
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
            <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 4 }}>{item.subject}</Text>
            <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginBottom: 8 }} numberOfLines={2}>{item.message}</Text>
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

  const getPriorityAr = (s: string) => {
    const map: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية" };
    return map[s] || s;
  };
  const getPriorityColor = (s: string) => {
    const map: Record<string, string> = { low: "#067647", medium: "#B54708", high: "#B42318" };
    return map[s] || "#475467";
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
              <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", lineHeight: 22 }}>{ticket.message}</Text>
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

/** رفع صورة للسيرفر — مشترك بين نماذج المنتجات والجولات */
async function uploadAdminImage(imageUri: string | null, imageFile: any): Promise<string | undefined> {
  if (!imageUri && !imageFile) return undefined;
  try {
    const url = new URL("/api/admin/products/upload-image", getApiUrl());
    const formData = new FormData();

    if (Platform.OS === "web" && imageFile) {
      formData.append("image", imageFile);
    } else if (imageUri) {
      formData.append("image", { uri: imageUri, name: "image.jpg", type: "image/jpeg" } as any);
    } else {
      return undefined;
    }

    const res = await fetch(url.toString(), { method: "POST", body: formData, credentials: "include" });
    if (!res.ok) throw new Error("فشل رفع الصورة");
    const data = await res.json();
    return data.imageUrl;
  } catch (err) {
    console.error("Image upload error:", err);
    return undefined;
  }
}

/** منتقي صورة مشترك */
async function pickAdminImage(
  setImageUri: (v: string | null) => void,
  setImageFile: (v: any) => void
) {
  if (Platform.OS === "web") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImageUri(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  } else {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }
}

const PRODUCT_CATEGORIES = [
  { key: "electronics", label: "إلكترونيات" },
  { key: "fashion", label: "أزياء" },
  { key: "beauty", label: "جمال" },
  { key: "accessories", label: "إكسسوارات" },
  { key: "home", label: "منزل" },
  { key: "other", label: "أخرى" },
];

function ProductsSection() {
  const { data: products, isLoading, error: loadError, refetch } = useQuery<any[]>({ queryKey: ["/api/admin/products"] });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/products/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/products/${id}`);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const handleDelete = (p: any) => {
    Alert.alert("حذف المنتج", `حذف "${p.name}" نهائياً؟ إذا عليه طلبات سابقة عطّله بدل ما تحذفه.`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  };

  if (isLoading) return <LoadingView />;
  if (loadError) return <LoadError onRetry={() => refetch()} />;

  return (
    <>
      <FlatList
        data={products || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>المنتجات ({products?.length || 0})</Text>
            <Pressable
              onPress={() => { setEditing(null); setShowForm(true); }}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>منتج جديد</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 50, gap: 10 }}>
            <Ionicons name="cube-outline" size={44} color={Colors.light.border} />
            <Text style={styles.catalogInfoText}>ما في منتجات بعد — ضيف أول منتج</Text>
          </View>
        }
        renderItem={({ item }) => {
          const outOfStock = item.stock !== null && item.stock <= 0;
          return (
            <View style={[styles.catalogCard, !item.isActive && { opacity: 0.6 }]}>
              <View style={styles.catalogHeader}>
                <Text style={styles.catalogTitle} numberOfLines={1}>{item.name}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: (item.isActive ? "#067647" : "#667085") + "20" },
                  ]}
                >
                  <Text
                    style={[styles.statusPillText, { color: item.isActive ? "#067647" : "#667085" }]}
                  >
                    {item.isActive ? "ظاهر" : "مخفي"}
                  </Text>
                </View>
              </View>

              <View style={styles.catalogInfo}>
                <Text style={styles.catalogInfoText}>السعر: {parseFloat(item.price).toFixed(2)} $</Text>
                <Text style={[styles.catalogInfoText, outOfStock && { color: "#B42318" }]}>
                  المخزون: {item.stock === null ? "غير محدود" : item.stock}
                </Text>
                <Text style={styles.catalogInfoText}>الكمية ضمن الطلبات: {item.soldCount}</Text>
                <Text style={styles.catalogInfoText}>
                  التصنيف: {PRODUCT_CATEGORIES.find((c) => c.key === item.category)?.label || item.category}
                </Text>
              </View>

              <View style={styles.catalogActions}>
                <Pressable
                  onPress={() => { setEditing(item); setShowForm(true); }}
                  style={[styles.actionBtn, { backgroundColor: Colors.light.accent }]}
                >
                  <Ionicons name="create" size={16} color="#0B2142" />
                  <Text style={[styles.actionBtnText, { color: "#0B2142" }]}>تعديل</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleMutation.mutate({ id: item.id, isActive: !item.isActive })}
                  style={[styles.actionBtn, { backgroundColor: item.isActive ? "#667085" : "#067647" }]}
                >
                  <Ionicons name={item.isActive ? "eye-off" : "eye"} size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>{item.isActive ? "إخفاء" : "إظهار"}</Text>
                </Pressable>
                {item.soldCount === 0 && (
                  <Pressable
                    onPress={() => handleDelete(item)}
                    style={[styles.actionBtn, { backgroundColor: "#B42318" }]}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>حذف</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />
      {showForm && (
        <ProductFormModal
          product={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </>
  );
}

function ProductFormModal({ product, onClose }: { product: any | null; onClose: () => void }) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [unlimitedStock, setUnlimitedStock] = useState(product ? product.stock === null : false);
  const [stock, setStock] = useState(product?.stock != null ? String(product.stock) : "");
  const [category, setCategory] = useState(product?.category || "other");
  const [specs, setSpecs] = useState<string[]>(() =>
    parseProductSpecs(product?.specsJson).map((sp) => sp.text)
  );
  const [imageUri, setImageUri] = useState<string | null>(product?.imageUrl || null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let imageUrl = product?.imageUrl;
      if (imageChanged) {
        imageUrl = (await uploadAdminImage(imageUri, imageFile)) ?? null;
      }
      setUploading(false);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: price.trim(),
        stock: unlimitedStock ? null : Number(stock) || 0,
        category,
        imageUrl,
        specsJson: JSON.stringify(
          specs.map((t) => t.trim()).filter(Boolean).map((text) => ({ text }))
        ),
      };

      const res = isEdit
        ? await apiRequest("PUT", `/api/admin/products/${product.id}`, payload)
        : await apiRequest("POST", "/api/admin/products", payload);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onClose();
    },
    onError: (err: any) => {
      setUploading(false);
      const msg = err.message || "فشلت العملية";
      setError(msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    },
  });

  function submit() {
    setError(null);
    if (name.trim().length < 2) return setError("اسم المنتج مطلوب");
    const priceNum = parseFloat(price);
    if (!priceNum || priceNum <= 0) return setError("السعر لازم يكون أكبر من صفر");
    if (!unlimitedStock && (!stock.trim() || !Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      return setError("حدّد المخزون أو فعّل المخزون غير المحدود");
    }
    mutation.mutate();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{isEdit ? "تعديل منتج" : "منتج جديد"}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 16, gap: 4 }}>
            <ModalInput label="اسم المنتج" value={name} onChangeText={setName} placeholder="مثال: سماعات لاسلكية" />
            <ModalInput
              label="الوصف"
              value={description}
              onChangeText={setDescription}
              placeholder="وصف مختصر للمنتج"
              multiline
            />
            <ModalInput label="السعر ($)" value={price} onChangeText={setPrice} placeholder="50" keyboardType="numeric" />

            <Text style={modalStyles.inputLabel}>المخزون</Text>
            <View style={modalStyles.switchRow}>
              <Switch
                value={unlimitedStock}
                onValueChange={setUnlimitedStock}
                trackColor={{ true: Colors.light.accent }}
              />
              <Text style={modalStyles.switchLabel}>مخزون غير محدود</Text>
            </View>
            {!unlimitedStock && (
              <ModalInput label="" value={stock} onChangeText={setStock} placeholder="عدد القطع المتوفرة" keyboardType="numeric" />
            )}

            <Text style={modalStyles.inputLabel}>المواصفات (تظهر كنقاط بصفحة المنتج)</Text>
            {specs.map((spec, i) => (
              <View key={i} style={modalStyles.specRow}>
                <Pressable
                  onPress={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                  hitSlop={8}
                  accessibilityLabel="حذف المواصفة"
                  style={modalStyles.specRemove}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.light.danger} />
                </Pressable>
                <TextInput
                  value={spec}
                  onChangeText={(t) =>
                    setSpecs((prev) => prev.map((v, idx) => (idx === i ? t : v)))
                  }
                  placeholder="مثال: قدرة 2000 واط"
                  placeholderTextColor={Colors.light.textMuted}
                  style={[modalStyles.input, { flex: 1 }]}
                />
              </View>
            ))}
            <Pressable
              onPress={() => setSpecs((prev) => [...prev, ""])}
              style={modalStyles.specAdd}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color={Colors.light.accent} />
              <Text style={modalStyles.specAddText}>إضافة مواصفة</Text>
            </Pressable>

            <Text style={modalStyles.inputLabel}>التصنيف</Text>
            <View style={modalStyles.chipRow}>
              {PRODUCT_CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[modalStyles.chip, category === c.key && modalStyles.chipActive]}
                >
                  <Text style={[modalStyles.chipText, category === c.key && modalStyles.chipTextActive]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={modalStyles.inputLabel}>صورة المنتج</Text>
            <Pressable
              onPress={() => { setImageChanged(true); pickAdminImage(setImageUri, setImageFile); }}
              style={modalStyles.imagePicker}
            >
              {imageUri ? (
                <Image source={{ uri: buildMediaUrl(imageUri)! }} style={modalStyles.imagePreview} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={30} color={Colors.light.accent} />
                  <Text style={modalStyles.imagePickerText}>اختر صورة</Text>
                </>
              )}
            </Pressable>

            {error && (
              <View style={modalStyles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.light.danger} />
                <Text style={modalStyles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={modalStyles.footerRow}>
            <Pressable onPress={onClose} style={modalStyles.cancelButton}>
              <Text style={modalStyles.cancelButtonText}>إلغاء</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={mutation.isPending || uploading}
              style={[modalStyles.submitButton, (mutation.isPending || uploading) && { opacity: 0.5 }]}
            >
              {mutation.isPending || uploading ? (
                <ActivityIndicator color="#0B2142" size="small" />
              ) : (
                <Text style={modalStyles.submitButtonText}>{isEdit ? "حفظ" : "إضافة"}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const DRAW_STATUS_AR: Record<string, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  ready_to_draw: "جاهزة للسحب",
  completed: "تم السحب",
  cancelled: "ملغاة",
};
const DRAW_STATUS_COLOR: Record<string, string> = {
  scheduled: "#667085",
  active: "#067647",
  ready_to_draw: "#B54708",
  completed: "#175CD3",
  cancelled: "#B42318",
};

function DrawsSection() {
  const { data: draws, isLoading, error: loadError, refetch } = useQuery<any[]>({ queryKey: ["/api/admin/draws"] });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const drawMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/draws/${id}/draw-winner`);
      return res.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "تم اختيار الفائز! 🏆",
        `الفائز: ${data.winner.username}\nالتذكرة: ${data.ticket.ticketNumber}` +
          (data.nextDraw ? `\n\nتم تفعيل الجولة التالية: ${data.nextDraw.title}` : "\n\nما في جولة تالية مجدولة"),
      );
      queryClient.invalidateQueries({ queryKey: ["/api/admin/draws"] });
      queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/draws/${id}/activate`);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/draws"] });
      queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/draws/${id}`);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/draws"] });
      queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  function handleDraw(d: any) {
    if (d.status !== "ready_to_draw" || d.soldTickets !== d.targetTickets) {
      Alert.alert("الجولة غير جاهزة", "يجب اكتمال التذاكر المؤكدة قبل اختيار الفائز");
      return;
    }
    Alert.alert(
      "اختيار الفائز",
      `اختيار الفائز بجولة "${d.title}"؟ العملية ما بترجع.`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "اسحب", style: "destructive", onPress: () => drawMutation.mutate(d.id) },
      ]
    );
  }

  function handleDelete(d: any) {
    Alert.alert(
      "حذف الجولة",
      d.soldTickets > 0
        ? `الجولة فيها ${d.soldTickets} تذكرة — رح ترجع معلّقة وتنضاف لجولة لاحقة. متأكد؟`
        : `حذف "${d.title}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(d.id) },
      ]
    );
  }

  if (isLoading) return <LoadingView />;
  if (loadError) return <LoadError onRetry={() => refetch()} />;

  return (
    <>
      <FlatList
        data={draws || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>جولات السحب ({draws?.length || 0})</Text>
            <Pressable
              onPress={() => { setEditing(null); setShowForm(true); }}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>جولة جديدة</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 50, gap: 10 }}>
            <Ionicons name="gift-outline" size={44} color={Colors.light.border} />
            <Text style={styles.catalogInfoText}>ما في جولات — أنشئ أول جولة سحب</Text>
          </View>
        }
        renderItem={({ item }) => {
          const progress = item.targetTickets > 0
            ? Math.min(item.soldTickets / item.targetTickets, 1)
            : 0;
          const color = DRAW_STATUS_COLOR[item.status] || "#475467";
          return (
            <View style={styles.catalogCard}>
              <View style={styles.catalogHeader}>
                <Text style={styles.catalogTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusPill, { backgroundColor: color + "20" }]}>
                  <Text style={[styles.statusPillText, { color }]}>
                    {DRAW_STATUS_AR[item.status] || item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.catalogInfo}>
                <Text style={styles.catalogInfoText}>الجائزة: {item.prizeName}</Text>
                <Text style={styles.catalogInfoText}>
                  كل {parseFloat(item.ticketPrice).toFixed(2)} $ من المشتريات = تذكرة
                </Text>
                <Text style={styles.catalogInfoText}>
                  التذاكر: {item.soldTickets} / {item.targetTickets}
                </Text>
                <Text style={styles.catalogInfoText}>المشاركون: {item.participants ?? 0}</Text>
              </View>

              <View style={styles.drawProgressWrap}>
                <View style={styles.drawProgressBg}>
                  <View
                    style={[
                      styles.drawProgressFill,
                      { width: `${progress * 100}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.catalogActions}>
                {item.status !== "completed" && (
                  <Pressable
                    onPress={() => { setEditing(item); setShowForm(true); }}
                    style={[styles.actionBtn, { backgroundColor: Colors.light.accent }]}
                  >
                    <Ionicons name="create" size={16} color="#0B2142" />
                    <Text style={[styles.actionBtnText, { color: "#0B2142" }]}>تعديل</Text>
                  </Pressable>
                )}
                {item.status === "scheduled" && (
                  <Pressable
                    onPress={() => activateMutation.mutate(item.id)}
                    style={[styles.actionBtn, { backgroundColor: "#067647" }]}
                  >
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>تفعيل</Text>
                  </Pressable>
                )}
                {item.status === "ready_to_draw" && item.soldTickets >= item.targetTickets && (
                  <Pressable
                    onPress={() => handleDraw(item)}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: item.status === "ready_to_draw" ? "#B54708" : "#164A9E" },
                    ]}
                  >
                    <Ionicons name="dice" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>اسحب</Text>
                  </Pressable>
                )}
                {item.status !== "completed" && (
                  <Pressable
                    onPress={() => handleDelete(item)}
                    style={[styles.actionBtn, { backgroundColor: "#B42318" }]}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>حذف</Text>
                  </Pressable>
                )}
              </View>

              {item.status === "completed" && (
                <View style={styles.winnerBanner}>
                  <Ionicons name="trophy" size={16} color="#F5B731" />
                  <Text style={styles.winnerText}>
                    الفائز: {item.winnerUsername || "—"} · تذكرة {item.winnerTicketNumber}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />
      {showForm && (
        <DrawFormModal
          draw={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </>
  );
}

function DrawFormModal({ draw, onClose }: { draw: any | null; onClose: () => void }) {
  const isEdit = !!draw;
  const [title, setTitle] = useState(draw?.title || "");
  const [prizeName, setPrizeName] = useState(draw?.prizeName || "");
  const [prizeDescription, setPrizeDescription] = useState(draw?.prizeDescription || "");
  const [ticketPrice, setTicketPrice] = useState(draw ? String(draw.ticketPrice) : "10");
  const [targetTickets, setTargetTickets] = useState(draw ? String(draw.targetTickets) : "1000");
  const [imageUri, setImageUri] = useState<string | null>(draw?.prizeImageUrl || null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [bannerUri, setBannerUri] = useState<string | null>(draw?.bannerImageUrl || null);
  const [bannerFile, setBannerFile] = useState<any>(null);
  const [bannerChanged, setBannerChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let prizeImageUrl = draw?.prizeImageUrl;
      if (imageChanged) {
        prizeImageUrl = (await uploadAdminImage(imageUri, imageFile)) ?? null;
      }
      let bannerImageUrl = draw?.bannerImageUrl ?? null;
      if (bannerChanged) {
        if (bannerUri) {
          const uploaded = await uploadAdminImage(bannerUri, bannerFile);
          if (!uploaded) throw new Error("فشل رفع صورة البانر");
          bannerImageUrl = uploaded;
        } else {
          bannerImageUrl = null;
        }
      }
      setUploading(false);

      const payload = {
        title: title.trim(),
        prizeName: prizeName.trim(),
        prizeDescription: prizeDescription.trim() || null,
        prizeImageUrl,
        bannerImageUrl,
        ticketPrice: ticketPrice.trim(),
        targetTickets: Number(targetTickets),
      };

      const res = isEdit
        ? await apiRequest("PUT", `/api/admin/draws/${draw.id}`, payload)
        : await apiRequest("POST", "/api/admin/draws", payload);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/draws"] });
      queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
      onClose();
    },
    onError: (err: any) => {
      setUploading(false);
      const msg = err.message || "فشلت العملية";
      setError(msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    },
  });

  function submit() {
    setError(null);
    if (title.trim().length < 2) return setError("عنوان الجولة مطلوب");
    if (prizeName.trim().length < 2) return setError("اسم الجائزة مطلوب");
    const priceNum = parseFloat(ticketPrice);
    if (!priceNum || priceNum <= 0) return setError("قيمة المشتريات لكل تذكرة يجب أن تكون أكبر من صفر");
    const targetNum = Number(targetTickets);
    if (!Number.isInteger(targetNum) || targetNum < 1) return setError("عدد التذاكر المستهدف مطلوب");
    mutation.mutate();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{isEdit ? "تعديل الجولة" : "جولة سحب جديدة"}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 16, gap: 4 }}>
            <ModalInput label="عنوان الجولة" value={title} onChangeText={setTitle} placeholder="مثال: جولة يناير" />
            <ModalInput label="اسم الجائزة" value={prizeName} onChangeText={setPrizeName} placeholder="مثال: iPhone 16 Pro" />
            <ModalInput
              label="وصف الجائزة"
              value={prizeDescription}
              onChangeText={setPrizeDescription}
              placeholder="تفاصيل إضافية عن الجائزة"
              multiline
            />
            <ModalInput
              label="قيمة المشتريات لكل تذكرة ($)"
              value={ticketPrice}
              onChangeText={setTicketPrice}
              placeholder="10"
              keyboardType="numeric"
            />
            <ModalInput
              label="عدد التذاكر المستهدف"
              value={targetTickets}
              onChangeText={setTargetTickets}
              placeholder="1000"
              keyboardType="numeric"
            />

            <View style={modalStyles.hintBox}>
              <Ionicons name="information-circle" size={16} color={Colors.light.accentDark} />
              <Text style={modalStyles.hintText}>
                كل {parseFloat(ticketPrice) || 0}$ من مشتريات العميل = تذكرة وحدة. لما تصدر{" "}
                {Number(targetTickets) || 0} تذكرة بتصير الجولة جاهزة للسحب.
              </Text>
            </View>

            <Text style={modalStyles.inputLabel}>صورة الجائزة</Text>
            <Pressable
              onPress={() => { setImageChanged(true); pickAdminImage(setImageUri, setImageFile); }}
              style={modalStyles.imagePicker}
            >
              {imageUri ? (
                <Image source={{ uri: buildMediaUrl(imageUri)! }} style={modalStyles.imagePreview} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={30} color={Colors.light.accent} />
                  <Text style={modalStyles.imagePickerText}>اختر صورة</Text>
                </>
              )}
            </Pressable>

            <Text style={modalStyles.inputLabel}>بانر الصفحة الرئيسية (اختياري)</Text>
            <View style={modalStyles.hintBox}>
              <Ionicons name="information-circle" size={16} color={Colors.light.accentDark} />
              <Text style={modalStyles.hintText}>
                صمّم البانر بمقاس 1600×810 (نسبة 800×405). عدّاد القسائم بينرسم فوقه تلقائياً بالجهة اليمنى
                من الأسفل، فخلّي هالمساحة فاضية. بدون بانر بيظهر البانر الافتراضي من بيانات الجولة.
              </Text>
            </View>
            {bannerUri ? (
              <>
                <DrawHero
                  draw={{
                    ...(draw ?? { id: "preview", status: "active", soldTickets: 0 }),
                    prizeName: prizeName || "الجائزة",
                    targetTickets: Number(targetTickets) || 0,
                    bannerImageUrl: bannerUri,
                  } as CurrentDraw}
                />
                <View style={modalStyles.bannerActions}>
                  <Pressable
                    onPress={() => { setBannerChanged(true); pickAdminImage(setBannerUri, setBannerFile); }}
                    style={modalStyles.bannerAction}
                  >
                    <Ionicons name="image-outline" size={16} color={Colors.light.accent} />
                    <Text style={modalStyles.bannerActionText}>تغيير البانر</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setBannerChanged(true); setBannerUri(null); setBannerFile(null); }}
                    style={modalStyles.bannerAction}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.light.danger} />
                    <Text style={[modalStyles.bannerActionText, { color: Colors.light.danger }]}>إزالة البانر</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable
                onPress={() => { setBannerChanged(true); pickAdminImage(setBannerUri, setBannerFile); }}
                style={modalStyles.imagePicker}
              >
                <Ionicons name="images-outline" size={30} color={Colors.light.accent} />
                <Text style={modalStyles.imagePickerText}>اختر صورة البانر</Text>
              </Pressable>
            )}

            {error && (
              <View style={modalStyles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.light.danger} />
                <Text style={modalStyles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={modalStyles.footerRow}>
            <Pressable onPress={onClose} style={modalStyles.cancelButton}>
              <Text style={modalStyles.cancelButtonText}>إلغاء</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={mutation.isPending || uploading}
              style={[modalStyles.submitButton, (mutation.isPending || uploading) && { opacity: 0.5 }]}
            >
              {mutation.isPending || uploading ? (
                <ActivityIndicator color="#0B2142" size="small" />
              ) : (
                <Text style={modalStyles.submitButtonText}>{isEdit ? "حفظ" : "إنشاء"}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PaymentsSection() {
  const { data: methods, isLoading, error: loadError, refetch } = useQuery<any[]>({ queryKey: ["/api/admin/payment-methods"] });
  const [showCreate, setShowCreate] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/payment-methods/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }); },
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
  if (loadError) return <LoadError onRetry={() => refetch()} />;


  return (
    <>
      <FlatList
        data={methods || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sectionPadding}
        ListHeaderComponent={
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>الحسابات البنكية ({methods?.length || 0})</Text>
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
              <Switch disabled={toggleMutation.isPending} value={item.enabled} onValueChange={(v) => { if (v && !isConfiguredBankTransfer(item)) { setEditingMethod(item); return; } toggleMutation.mutate({ id: item.id, enabled: v }); }} trackColor={{ true: Colors.light.accent }} />
            </View>
            {(
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
                {item.bankName ? (
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.textSecondary, writingDirection: "rtl" }}>البنك:</Text>
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.text }}>{item.bankName}</Text>
                  </View>
                ) : null}
                {item.accountName ? (
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.textSecondary, writingDirection: "rtl" }}>الحساب:</Text>
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.text }}>{item.accountName}</Text>
                  </View>
                ) : null}
                {item.iban ? (
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.textSecondary, writingDirection: "rtl" }}>IBAN:</Text>
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 11, color: Colors.light.text }}>{item.iban}</Text>
                  </View>
                ) : null}
                {!isConfiguredBankTransfer(item) && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
                    <Ionicons name="warning" size={14} color={Colors.light.warning} />
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.warning, writingDirection: "rtl" }}>بيانات البنك غير مكتملة - اضغط تعديل لإضافتها</Text>
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
                <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.accent }}>تعديل</Text>
              </Pressable>
              <Pressable
                onPress={() => Alert.alert("حذف", `حذف الحساب البنكي "${item.nameAr}"؟`, [
                  { text: "إلغاء", style: "cancel" },
                  { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                ])}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.danger + "12", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Ionicons name="trash-outline" size={14} color={Colors.light.danger} />
                <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.danger }}>حذف</Text>
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
  const { data: coupons, isLoading, error: loadError, refetch } = useQuery<any[]>({ queryKey: ["/api/admin/coupons"] });
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
  if (loadError) return <LoadError onRetry={() => refetch()} />;

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
  const { data: logs, isLoading, error: loadError, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-log"],
    refetchInterval: 10000,
  });

  const getTypeIcon = (type: string) => {
    const map: Record<string, string> = { user_register: "person-add", purchase: "cart", draw: "trophy", product_created: "cube", draw_created: "gift", payment_confirmed: "checkmark-circle", payment_rejected: "close-circle", shipping_update: "airplane" };
    return map[type] || "time";
  };
  const getTypeColor = (type: string) => {
    const map: Record<string, string> = { user_register: "#067647", purchase: "#175CD3", draw: "#F5B731", product_created: "#164A9E", draw_created: "#164A9E", payment_confirmed: "#067647", payment_rejected: "#B42318", shipping_update: "#B54708" };
    return map[type] || Colors.light.textSecondary;
  };

  if (isLoading) return <LoadingView />;
  if (loadError) return <LoadError onRetry={() => refetch()} />;

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


type ReminderSetting = { type: string; label: string; description: string; enabled: boolean };

/** مفاتيح تشغيل التذكيرات الدورية. التغيير يُطبَّق في الدورة التالية (خلال ساعة). */
function RemindersCard() {
  const { data: reminders } = useQuery<ReminderSetting[]>({ queryKey: ["/api/admin/reminders"] });

  const toggle = useMutation({
    mutationFn: async ({ type, enabled }: { type: string; enabled: boolean }) => {
      await apiRequest("PUT", `/api/admin/reminders/${type}`, { enabled });
    },
    // يظهر التغيير فوراً ويُعاد لحالته إذا فشل الحفظ
    onMutate: async ({ type, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/reminders"] });
      const previous = queryClient.getQueryData<ReminderSetting[]>(["/api/admin/reminders"]);
      queryClient.setQueryData<ReminderSetting[]>(["/api/admin/reminders"], (old) =>
        old?.map((r) => (r.type === type ? { ...r, enabled } : r)));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["/api/admin/reminders"], context.previous);
      Alert.alert("تعذّر الحفظ", "لم يتغيّر إعداد التذكير، حاول مجدداً.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/reminders"] }),
  });

  if (!reminders) return null;

  return (
    <View style={{ backgroundColor: Colors.light.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.borderSubtle, padding: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Ionicons name="alarm-outline" size={18} color={Colors.light.primary} />
        <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 15, color: Colors.light.text }}>التذكيرات التلقائية</Text>
      </View>
      <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: Colors.light.textMuted, marginBottom: 12 }}>
        تُفحص كل ساعة. التغيير يسري في الدورة التالية.
      </Text>
      {reminders.map((r, i) => (
        <View
          key={r.type}
          style={{
            flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10,
            borderTopWidth: i === 0 ? 0 : 1, borderTopColor: Colors.light.borderSubtle,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 14, color: r.enabled ? Colors.light.text : Colors.light.textMuted }}>
              {r.label}
            </Text>
            <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 }}>
              {r.description}
            </Text>
          </View>
          <Switch
            value={r.enabled}
            disabled={toggle.isPending}
            onValueChange={(enabled) => {
              Haptics.selectionAsync();
              toggle.mutate({ type: r.type, enabled });
            }}
            trackColor={{ true: Colors.light.primary }}
            accessibilityLabel={`${r.enabled ? "إيقاف" : "تفعيل"} ${r.label}`}
          />
        </View>
      ))}
    </View>
  );
}

function NotificationsSection() {
  const { data: notifications, isLoading, error: loadError, refetch } = useQuery<any[]>({
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
  if (loadError) return <LoadError onRetry={() => refetch()} />;

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  const getNotifIcon = (type: string) => {
    if (type === "new_order") return "cart";
    if (type === "receipt_uploaded") return "image";
    if (type === "new_user") return "person-add";
    if (type === "broadcast") return "megaphone";
    return "notifications";
  };
  const getNotifColor = (type: string) => {
    if (type === "new_order") return "#0B2142";
    if (type === "receipt_uploaded") return "#175CD3";
    if (type === "new_user") return "#067647";
    if (type === "broadcast") return "#B54708";
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
            <RemindersCard />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>الإشعارات ({notifications?.length || 0})</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => { setShowBroadcastModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#B5470815", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Ionicons name="megaphone-outline" size={16} color="#B54708" />
                  <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#B54708" }}>إرسال إشعار</Text>
                </Pressable>
                {unreadCount > 0 && (
                  <Pressable
                    onPress={() => markAllReadMutation.mutate()}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.accent + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <Ionicons name="checkmark-done" size={16} color={Colors.light.accent} />
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.accent }}>قراءة الكل ({unreadCount})</Text>
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
            style={[styles.orderCard, { borderEndWidth: 3, borderEndColor: item.isRead ? "transparent" : getNotifColor(item.type), backgroundColor: item.isRead ? "#fff" : "#F7F9FC" }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: getNotifColor(item.type) + "15", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={getNotifIcon(item.type) as any} size={18} color={getNotifColor(item.type)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: item.isRead ? "Tajawal_400Regular" : "Tajawal_500Medium", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" }}>{item.message}</Text>
                <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 11, color: Colors.light.textSecondary, textAlign: "right", marginTop: 4 }}>
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

function LoadError({ onRetry }: { onRetry: () => void }) {
  return <View style={[styles.container, styles.centered]}><Text style={styles.errorText}>تعذّر تحميل البيانات. تحقق من الاتصال وحاول مجدداً.</Text><Pressable onPress={onRetry} style={styles.backBtn}><Text style={styles.backBtnText}>إعادة المحاولة</Text></Pressable></View>;
}

function LoadingView() {
  return (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color={Colors.light.accent} />
    </View>
  );
}

function CreatePaymentModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [icon, setIcon] = useState("business");
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
      setName(""); setNameAr(""); setIcon("business"); setDesc(""); setBankName(""); setAccountName(""); setIban("");
    },
    onError: (err: any) => Alert.alert("خطأ", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>إضافة حساب بنكي</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <ModalInput label="الاسم (إنجليزي) *" value={name} onChangeText={setName} placeholder="Bank Transfer" />
            <ModalInput label="الاسم (عربي) *" value={nameAr} onChangeText={setNameAr} placeholder="تحويل بنكي" />
            <ModalInput label="وصف" value={desc} onChangeText={setDesc} placeholder="وصف اختياري" />
            <ModalInput label="اسم البنك" value={bankName} onChangeText={setBankName} placeholder="اسم البنك" />
            <ModalInput label="اسم صاحب الحساب" value={accountName} onChangeText={setAccountName} placeholder="الاسم كما في الحساب البنكي" />
            <ModalInput label="رقم الحساب / IBAN" value={iban} onChangeText={setIban} placeholder="رقم الحساب البنكي" />
            <Pressable
              onPress={() => {
                if (!name.trim() || !nameAr.trim() || !bankName.trim() || !accountName.trim() || !iban.trim()) { Alert.alert("بيانات ناقصة", "أدخل اسم البنك وصاحب الحساب ورقم الحساب واسم العرض"); return; }
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
            <Text style={modalStyles.title}>تعديل حساب بنكي</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.light.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <ModalInput label="الاسم (إنجليزي) *" value={name} onChangeText={setName} placeholder="Bank Transfer" />
            <ModalInput label="الاسم (عربي) *" value={nameAr} onChangeText={setNameAr} placeholder="تحويل بنكي" />
            <ModalInput label="وصف" value={desc} onChangeText={setDesc} placeholder="وصف اختياري" />
            <View style={{ backgroundColor: "rgba(124,58,237,0.04)", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.light.accent + "20" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Ionicons name="business" size={16} color={Colors.light.accent} />
                <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 14, color: Colors.light.accent, writingDirection: "rtl" }}>بيانات الحساب البنكي</Text>
              </View>
              <ModalInput label="اسم البنك" value={bankName} onChangeText={setBankName} placeholder="اسم البنك" />
              <ModalInput label="اسم صاحب الحساب" value={accountName} onChangeText={setAccountName} placeholder="الاسم كما في الحساب البنكي" />
              <ModalInput label="رقم الحساب / IBAN" value={iban} onChangeText={setIban} placeholder="رقم الحساب البنكي" />
            </View>
            <Pressable
              onPress={() => {
                if (!name.trim() || !nameAr.trim() || !bankName.trim() || !accountName.trim() || !iban.trim()) { Alert.alert("بيانات ناقصة", "أدخل اسم البنك وصاحب الحساب ورقم الحساب واسم العرض"); return; }
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
                const percent = Number(discount), uses = Number(maxUses);
                if (!Number.isInteger(percent) || percent < 1 || percent > 100 || !Number.isInteger(uses) || uses < 1) { Alert.alert("خطأ", "الخصم بين 1 و100، وعدد الاستخدامات عدد صحيح موجب"); return; }
                mutation.mutate({ code: code.trim(), discountPercent: percent, maxUses: uses });
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
                textContentType="none"
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
  const { user, refreshUser } = useAuth();
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
      refreshUser();
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
    if (email && email !== user?.email) {
      payload.email = email;
      payload.currentPassword = currentPassword;
    }
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
  cardTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 14 },
  saveBtn: { backgroundColor: Colors.light.accent, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  createBtn: { backgroundColor: "#067647", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontFamily: "Tajawal_500Medium", fontSize: 16, color: "#fff", writingDirection: "rtl" },
});

const styles = StyleSheet.create({
  activeDrawCard: {
    backgroundColor: "#FFF4D6",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F5B731",
  },
  activeDrawHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeDrawTitle: {
    flex: 1,
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  activeDrawSub: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
    color: "#754500",
    textAlign: "right",
    writingDirection: "rtl",
  },
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Tajawal_500Medium", fontSize: 16, color: Colors.light.danger, marginBottom: 16, writingDirection: "rtl" },
  backBtn: { backgroundColor: Colors.light.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#fff", writingDirection: "rtl" },
  header: { paddingBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerBackBtn: { padding: 8 },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#fff", writingDirection: "rtl" },
  tabsRow: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 12, gap: 4 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: "rgba(212, 168, 83, 0.15)" },
  tabText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "rgba(255,255,255,0.5)", writingDirection: "rtl" },
  tabTextActive: { color: Colors.light.accent, fontFamily: "Tajawal_500Medium" },
  content: { flex: 1 },
  sectionPadding: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: Colors.light.text, marginBottom: 14, textAlign: "right", writingDirection: "rtl" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#fff", writingDirection: "rtl" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 2, textAlign: "right", writingDirection: "rtl" },
  statLabel: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl" },

  topProductItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  topProductRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.light.accent + "18", alignItems: "center", justifyContent: "center" },
  topProductRankText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: Colors.light.accent },
  topProductTitle: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  topProductSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl" },

  orderCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderIdText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: Colors.light.text, writingDirection: "rtl" },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  orderDetailText: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.light.border },
  orderAmount: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: Colors.light.text },
  orderDate: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: Colors.light.textSecondary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontFamily: "Tajawal_500Medium", fontSize: 11, writingDirection: "rtl" },

  statusPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.light.progressBg },
  statusOptionActive: { backgroundColor: Colors.light.accent },
  statusOptionText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" },
  statusOptionTextActive: { color: "#fff" },

  userCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.light.accent + "18", alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: Colors.light.accent },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { fontFamily: "Tajawal_500Medium", fontSize: 15, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  userEmail: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  adminPill: { backgroundColor: "#F5B73120", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminPillText: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#F5B731", writingDirection: "rtl" as const },
  verifiedPill: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: "#06764718", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  verifiedPillText: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#067647", writingDirection: "rtl" as const },
  unverifiedPill: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: "#B4231818", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  unverifiedPillText: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#B42318", writingDirection: "rtl" as const },
  userStatsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  userStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  userStatText: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: Colors.light.textSecondary, writingDirection: "rtl" },

  catalogCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  catalogHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  catalogTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: Colors.light.text, flex: 1, textAlign: "right", writingDirection: "rtl" },
  catalogInfo: { marginBottom: 10 },
  catalogInfoText: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginBottom: 2 },
  drawProgressWrap: { marginBottom: 10 },
  drawProgressBg: { height: 6, backgroundColor: Colors.light.progressBg, borderRadius: 3, overflow: "hidden" },
  drawProgressFill: { height: "100%", borderRadius: 3 },
  catalogActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#fff", writingDirection: "rtl" },
  winnerBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F5B73112", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
  winnerText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#754500", writingDirection: "rtl" },

  paymentCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  paymentName: { fontFamily: "Tajawal_500Medium", fontSize: 15, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  paymentNameEn: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right" },
  paymentDesc: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  deletePaymentBtn: { alignSelf: "flex-start", padding: 8, marginTop: 8 },

  couponCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  couponHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  couponCodeBadge: { backgroundColor: Colors.light.accent + "18", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  couponCode: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: Colors.light.accent, letterSpacing: 1 },
  couponDetails: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  couponStat: { alignItems: "center" },
  couponStatLabel: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: Colors.light.textSecondary, marginBottom: 2, writingDirection: "rtl" },
  couponStatValue: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: Colors.light.text },
  deleteCouponBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", padding: 4 },
  deleteCouponText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.danger, writingDirection: "rtl" },

  activityItem: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  activityDesc: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  activityTime: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: Colors.light.tabIconDefault, textAlign: "right", writingDirection: "rtl", marginTop: 4 },

  emptyText: { fontFamily: "Tajawal_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", marginTop: 40, writingDirection: "rtl" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  container: { backgroundColor: Colors.light.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: Colors.light.textSecondary, marginBottom: 6, textAlign: "right", writingDirection: "rtl" },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, fontFamily: "Tajawal_400Regular", fontSize: 15, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border, textAlign: "right", writingDirection: "rtl" },
  createBtn: { backgroundColor: Colors.light.accent, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  createBtnText: { fontFamily: "Tajawal_500Medium", fontSize: 16, color: "#0B2142", writingDirection: "rtl" },

  specRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  specRemove: { width: 28, alignItems: "center", justifyContent: "center" },
  specAdd: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.light.accentLight, marginBottom: 14,
  },
  specAddText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.accent, writingDirection: "rtl" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, justifyContent: "flex-end" },
  switchLabel: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.text, writingDirection: "rtl" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14, justifyContent: "flex-end" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: Colors.light.border },
  chipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" },
  chipTextActive: { fontFamily: "Tajawal_700Bold", color: "#0B2142" },

  hintBox: { flexDirection: "row", gap: 8, backgroundColor: "#FFF4D6", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#F5B731" },
  hintText: { flex: 1, fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#754500", textAlign: "right", writingDirection: "rtl", lineHeight: 19 },

  imagePicker: { height: 130, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: Colors.light.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14, overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%" },
  bannerActions: { flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 8, marginBottom: 14 },
  bannerAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  bannerActionText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: Colors.light.accent, writingDirection: "rtl" },
  imagePickerText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: Colors.light.textSecondary, writingDirection: "rtl" },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 10, padding: 12, marginBottom: 8 },
  errorText: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13, color: Colors.light.danger, textAlign: "right", writingDirection: "rtl" },

  footerRow: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: Colors.light.border },
  cancelButton: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.inputBg },
  cancelButtonText: { fontFamily: "Tajawal_500Medium", fontSize: 15, color: Colors.light.textSecondary, writingDirection: "rtl" },
  submitButton: { flex: 2, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.accent },
  submitButtonText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#0B2142", writingDirection: "rtl" },
});

const orderMgmtStyles = StyleSheet.create({
  printAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.light.navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 10, marginBottom: 4 },
  printAllText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#fff", writingDirection: "rtl" },
  printBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.primarySoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  printBtnText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: Colors.light.navy, writingDirection: "rtl" },
  infoSection: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.light.border },
  infoSectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  infoText: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl" },
  receiptLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 8 },
  receiptImage: { width: "100%", height: 200, borderRadius: 10, backgroundColor: Colors.light.inputBg },
  paymentActions: { marginTop: 8 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#067647", borderRadius: 10, paddingVertical: 12 },
  confirmBtnText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#fff", writingDirection: "rtl" },
  rejectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#B42318", borderRadius: 10, paddingVertical: 12, marginTop: 8 },
  rejectBtnText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#fff", writingDirection: "rtl" },
  rejectionInput: { backgroundColor: Colors.light.inputBg, borderRadius: 10, padding: 12, fontFamily: "Tajawal_400Regular", fontSize: 14, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border, textAlign: "right", writingDirection: "rtl", marginBottom: 8 },
});

const chartStyles = StyleSheet.create({
  container: { marginTop: 24, backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  headerRow: { marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 4, marginTop: -4 },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: Colors.light.text },
  summaryLabel: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: Colors.light.textSecondary, writingDirection: "rtl" },
  barsContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 180, paddingTop: 8 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontFamily: "Tajawal_500Medium", fontSize: 9, color: Colors.light.accent, minHeight: 14, textAlign: "center" },
  barTrack: { width: 28, height: 120, backgroundColor: Colors.light.progressBg, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 6 },
  barLabel: { fontFamily: "Tajawal_500Medium", fontSize: 9, color: Colors.light.textSecondary, writingDirection: "rtl", textAlign: "center" },
  barCount: { fontFamily: "Tajawal_400Regular", fontSize: 9, color: Colors.light.tabIconDefault },
});

