import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: stats } = useQuery<{
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
        <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top, alignItems: "center" }}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color={Colors.light.tabIconDefault} />
          </View>
          <Text style={styles.emptyTitle}>سجّل الدخول لحسابك</Text>
          <Text style={styles.emptyText}>
            أدِر ملفك الشخصي واطلع على نشاطك
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
        paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <LinearGradient
          colors={["#0A1628", "#1A2D4A"]}
          style={styles.profileGradient}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{user.username}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFD700" />
              <Text style={styles.adminText}>Admin</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {isAdmin && stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>لوحة التحكم</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="bar-chart"
              label="إجمالي الحملات"
              value={stats.totalCampaigns.toString()}
              color="#3498DB"
            />
            <StatCard
              icon="flame"
              label="نشطة"
              value={stats.activeCampaigns.toString()}
              color={Colors.light.accent}
            />
            <StatCard
              icon="checkmark-circle"
              label="مكتملة"
              value={stats.completedCampaigns.toString()}
              color={Colors.light.success}
            />
            <StatCard
              icon="cash"
              label="الإيرادات"
              value={`$${stats.totalRevenue}`}
              color="#9B59B6"
            />
          </View>
        </View>
      )}

      {isAdmin && (
        <View style={styles.section}>
          <Pressable
            onPress={() => router.push("/admin")}
            style={({ pressed }) => [
              styles.adminPanelButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <LinearGradient
              colors={["#0A1628", "#1A2D4A"]}
              style={styles.adminPanelGradient}
            >
              <Ionicons name="grid" size={28} color={Colors.light.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.adminPanelTitle}>لوحة التحكم الكاملة</Text>
                <Text style={styles.adminPanelSub}>إدارة الطلبات، المستخدمين، الحملات، الدفع والمزيد</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={Colors.light.accent} />
            </LinearGradient>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="log-out-outline" size={22} color={Colors.light.danger} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
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
  profileCard: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#0A1628",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  profileGradient: {
    padding: 28,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(212, 168, 83, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: Colors.light.accent,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: Colors.light.accent,
  },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 4,
    writingDirection: "rtl",
  },
  profileEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    writingDirection: "rtl",
  },
  adminBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
  },
  adminText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFD700",
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.progressBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
    writingDirection: "rtl",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    writingDirection: "rtl",
  },
  signInButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  signInButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 14,
    textAlign: "right",
    writingDirection: "rtl",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  drawSection: {
    marginTop: 16,
  },
  drawTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 10,
    textAlign: "right",
    writingDirection: "rtl",
  },
  drawItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  drawInfo: {
    flex: 1,
  },
  drawItemTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  drawItemSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
    textAlign: "right",
    writingDirection: "rtl",
  },
  drawButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  drawButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  logoutButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    shadowColor: "#0A1628",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.12)",
  },
  logoutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.danger,
    writingDirection: "rtl",
  },
  adminPanelButton: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0A1628",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  adminPanelGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 20,
    gap: 14,
  },
  adminPanelTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.accent,
    textAlign: "right",
    writingDirection: "rtl",
  },
  adminPanelSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
});

const statStyles = StyleSheet.create({
  card: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
    marginBottom: 2,
    textAlign: "right",
    writingDirection: "rtl",
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
});

