import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

type UserStats = {
  totalOrders: number;
  confirmedOrders: number;
  totalTickets: number;
  winningTickets: number;
  totalSpent: string;
};

function formatJoinDate(dateStr: string | undefined) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  const { data: adminStats } = useQuery<{
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalRevenue: string;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  async function handleLogout() {
    await logout();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top, alignItems: "center", paddingHorizontal: 32 }}>
          <LinearGradient
            colors={["#7C3AED", "#EC4899"]}
            style={styles.emptyIconCircle}
          >
            <Ionicons name="person" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>سجّل الدخول لحسابك</Text>
          <Text style={styles.emptyText}>
            أدِر ملفك الشخصي، تابع طلباتك، واطلع على سحوباتك
          </Text>
          <Pressable
            onPress={() => router.push("/auth")}
            style={styles.signInButton}
          >
            <LinearGradient
              colors={[Colors.light.accent, Colors.light.accentPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInGradient}
            >
              <Text style={styles.signInButtonText}>تسجيل الدخول</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const isProfileComplete = !!(user.fullName && user.phone && user.address && user.city && user.country);

  const menuItems = [
    {
      icon: "person-circle-outline" as const,
      label: "تعديل الملف الشخصي",
      subtitle: isProfileComplete ? "مكتمل ✓" : "أكمل بياناتك للشراء",
      color: isProfileComplete ? "#10B981" : "#EF4444",
      onPress: () => router.push("/edit-profile" as any),
    },
    {
      icon: "receipt-outline" as const,
      label: "طلباتي",
      subtitle: `${stats?.totalOrders || 0} طلب`,
      color: "#7C3AED",
      onPress: () => router.push("/(tabs)/tickets" as any),
    },
    {
      icon: "ticket-outline" as const,
      label: "تذاكر السحب",
      subtitle: `${stats?.totalTickets || 0} تذكرة سحب`,
      color: "#EC4899",
      onPress: () => router.push("/(tabs)/tickets" as any),
    },
    {
      icon: "trophy-outline" as const,
      label: "جوائزي",
      subtitle: stats?.winningTickets ? `${stats.winningTickets} فوز` : "لم تفز بعد",
      color: "#F59E0B",
      onPress: () => router.push("/(tabs)/tickets" as any),
    },
  ];

  const settingsItems = [
    {
      icon: "help-circle-outline" as const,
      label: "الأسئلة الشائعة",
      color: "#7C3AED",
      onPress: () => router.push("/faq" as any),
    },
    {
      icon: "information-circle-outline" as const,
      label: "عن التطبيق",
      color: "#6366F1",
      onPress: () => router.push({ pathname: "/info", params: { type: "about" } }),
    },
    {
      icon: "document-text-outline" as const,
      label: "الشروط والأحكام",
      color: "#8B5CF6",
      onPress: () => router.push({ pathname: "/info", params: { type: "terms" } }),
    },
    {
      icon: "shield-checkmark-outline" as const,
      label: "سياسة الخصوصية",
      color: "#06B6D4",
      onPress: () => router.push({ pathname: "/info", params: { type: "privacy" } }),
    },
    {
      icon: "chatbubble-ellipses-outline" as const,
      label: "تواصل معنا",
      color: "#10B981",
      onPress: () => router.push({ pathname: "/info", params: { type: "contact" } }),
    },
    {
      icon: "star-outline" as const,
      label: "قيّم التطبيق",
      color: "#F59E0B",
      onPress: () => {},
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? 67 : insets.top,
        paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#7C3AED", "#6D28D9", "#5B21B6"]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user.fullName || user.username}</Text>
                {isAdmin && (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#FFD700" />
                    <Text style={styles.adminText}>مدير</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              {(user as any).createdAt && (
                <View style={styles.joinDateRow}>
                  <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.joinDate}>
                    عضو منذ {formatJoinDate((user as any).createdAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
      </LinearGradient>

      <View style={styles.statsCardWrapper}>
        <View style={styles.statsCard}>
          <StatItem
            value={stats?.totalOrders?.toString() || "0"}
            label="الطلبات"
            icon="receipt"
            color="#7C3AED"
          />
          <View style={styles.statDivider} />
          <StatItem
            value={stats?.totalTickets?.toString() || "0"}
            label="التذاكر"
            icon="ticket"
            color="#EC4899"
          />
          <View style={styles.statDivider} />
          <StatItem
            value={`$${stats?.totalSpent || "0"}`}
            label="المشتريات"
            icon="wallet"
            color="#10B981"
          />
        </View>
      </View>

      {isAdmin && (
        <View style={styles.section}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/admin");
            }}
            style={({ pressed }) => [
              styles.adminCard,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={["#7C3AED", "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.adminCardGradient}
            >
              <View style={styles.adminCardIcon}>
                <Ionicons name="grid" size={24} color="#fff" />
              </View>
              <View style={styles.adminCardContent}>
                <Text style={styles.adminCardTitle}>لوحة التحكم</Text>
                <Text style={styles.adminCardSub}>
                  إدارة الطلبات والمستخدمين والحملات
                </Text>
              </View>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </Pressable>

          {adminStats && (
            <View style={styles.adminStatsRow}>
              <MiniStat value={adminStats.activeCampaigns.toString()} label="نشطة" color="#7C3AED" />
              <MiniStat value={adminStats.totalCampaigns.toString()} label="الحملات" color="#3B82F6" />
              <MiniStat value={`$${adminStats.totalRevenue}`} label="الإيرادات" color="#10B981" />
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>نشاطي</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  item.onPress();
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: "#F9FAFB" },
                ]}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: item.color + "12" }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.menuTextArea}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-back" size={18} color={Colors.light.textSecondary} />
              </Pressable>
              {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الإعدادات والمساعدة</Text>
        <View style={styles.menuCard}>
          {settingsItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  item.onPress();
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: "#F9FAFB" },
                ]}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: item.color + "12" }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.menuTextArea}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-back" size={18} color={Colors.light.textSecondary} />
              </Pressable>
              {index < settingsItems.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.light.danger} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </View>

      <View style={styles.versionArea}>
        <Text style={styles.versionText}>لاكي درو v1.0.0</Text>
        <Text style={styles.versionSub}>صُنع بحب</Text>
      </View>
    </ScrollView>
  );
}

function StatItem({ value, label, icon, color }: {
  value: string;
  label: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={styles.statItem}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.miniStatItem}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
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
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
    writingDirection: "rtl",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  signInButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 24,
    width: "100%",
  },
  signInGradient: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
  },
  signInButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 50,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  headerContent: {
    zIndex: 2,
  },
  headerDecor1: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerDecor2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(236,72,153,0.12)",
  },
  avatarRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  adminBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFD700",
    writingDirection: "rtl",
  },
  userEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    writingDirection: "rtl",
    marginTop: 4,
  },
  joinDateRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  joinDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    writingDirection: "rtl",
  },
  statsCardWrapper: {
    paddingHorizontal: 16,
    marginTop: -30,
    marginBottom: 8,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    flexDirection: "row-reverse",
    paddingVertical: 20,
    paddingHorizontal: 8,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: "right",
    writingDirection: "rtl",
    paddingHorizontal: 4,
  },
  adminCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  adminCardGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  adminCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  adminCardContent: {
    flex: 1,
  },
  adminCardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
  },
  adminCardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  adminStatsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 12,
  },
  miniStatItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  miniStatValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 2,
  },
  miniStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextArea: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  menuSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.danger,
    writingDirection: "rtl",
  },
  versionArea: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  versionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  versionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#D1D5DB",
  },
});
