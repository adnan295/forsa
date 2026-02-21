import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";

type UserNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  campaignId: string | null;
  metadata: string | null;
  createdAt: string;
};

const NOTIFICATION_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  new_campaign: { icon: "megaphone", color: "#7C3AED", bg: "rgba(124, 58, 237, 0.1)" },
  low_stock: { icon: "flash", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
  sold_out: { icon: "flame", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" },
  draw_completed: { icon: "dice", color: "#6366F1", bg: "rgba(99, 102, 241, 0.1)" },
  winner_announced: { icon: "trophy", color: "#EC4899", bg: "rgba(236, 72, 153, 0.1)" },
  you_won: { icon: "star", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" },
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return date.toLocaleDateString("ar");
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    data: notifications,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<UserNotification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleNotificationPress = useCallback((notification: UserNotification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.campaignId) {
      router.push(`/campaign/${notification.campaignId}` as any);
    }
  }, []);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const renderNotification = ({ item }: { item: UserNotification }) => {
    const config = NOTIFICATION_CONFIG[item.type] || { icon: "notifications", color: "#6B7280", bg: "rgba(107, 114, 128, 0.1)" };

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={24} color={config.color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.notificationTitle, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
        </View>
      </Pressable>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={48} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>سجل دخولك أولاً</Text>
          <Text style={styles.emptyText}>يجب تسجيل الدخول لعرض الإشعارات</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push("/auth")}>
            <Text style={styles.loginBtnText}>تسجيل الدخول</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7C3AED", "#6D28D9", "#5B21B6"]}
        style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>الإشعارات</Text>
          {unreadCount > 0 && (
            <Pressable
              onPress={() => markAllReadMutation.mutate()}
              style={styles.markAllBtn}
              disabled={markAllReadMutation.isPending}
            >
              <Text style={styles.markAllText}>قراءة الكل</Text>
            </Pressable>
          )}
          {unreadCount === 0 && <View style={{ width: 80 }} />}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={Colors.light.accent}
            />
          }
          scrollEnabled={!!(notifications && notifications.length > 0)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={36} color={Colors.light.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
              <Text style={styles.emptyText}>ستظهر هنا إشعاراتك عند وجود تحديثات جديدة</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#fff",
    writingDirection: "rtl",
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  markAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#fff",
    writingDirection: "rtl",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  notificationCard: {
    flexDirection: "row-reverse",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  unreadCard: {
    borderColor: "rgba(124, 58, 237, 0.3)",
    backgroundColor: "rgba(124, 58, 237, 0.02)",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    flex: 1,
  },
  unreadTitle: {
    fontFamily: "Inter_700Bold",
    color: "#7C3AED",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7C3AED",
  },
  notificationBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
  timeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    writingDirection: "rtl",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },
  loginBtn: {
    marginTop: 20,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
