import React, { useCallback } from "react";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Header, EmptyState } from "@/components/ui";

const c = Colors.light;

interface UserNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  drawId: string | null;
  productId: string | null;
  createdAt: string;
}

/** أيقونة ولون كل نوع إشعار */
const NOTIFICATION_STYLE: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; fg: string; bg: string }
> = {
  you_won: { icon: "trophy", fg: c.goldText, bg: c.goldSoft },
  winner_announced: { icon: "megaphone", fg: c.goldText, bg: c.goldSoft },
  draw_completed: { icon: "gift", fg: c.goldText, bg: c.goldSoft },
  draw_full: { icon: "flame", fg: StatusColors.warning.fg, bg: StatusColors.warning.bg },
  new_draw: { icon: "sparkles", fg: c.primary, bg: c.primarySoft },
  tickets_awarded: { icon: "ticket", fg: StatusColors.success.fg, bg: StatusColors.success.bg },
  shipping_update: { icon: "cube", fg: StatusColors.info.fg, bg: StatusColors.info.bg },
  support_reply: { icon: "chatbubble-ellipses", fg: StatusColors.info.fg, bg: StatusColors.info.bg },
};

const DEFAULT_STYLE = { icon: "notifications" as const, fg: c.primary, bg: c.primarySoft };

function timeAgo(iso: string): string {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

export default function NotificationsScreen() {
  const { user } = useAuth();

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery<UserNotification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 20000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => apiRequest("PUT", "/api/notifications/read-all"),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    refetch();
  }, [refetch]);

  function openNotification(item: UserNotification) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!item.isRead) markRead.mutate(item.id);

    if (item.drawId) router.push("/draw" as any);
    else if (item.productId) router.push({ pathname: "/product/[id]", params: { id: item.productId } });
  }

  if (!user) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="الإشعارات" showBack />
        <EmptyState
          icon="notifications-outline"
          title="سجّل الدخول لعرض إشعاراتك"
          action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
        />
      </View>
    );
  }

  const list = notifications ?? [];
  const unreadCount = list.filter((n) => !n.isRead).length;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title="الإشعارات"
        showBack
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="تعليم الكل كمقروء"
              style={s.markAllBtn}
            >
              <Text style={s.markAllText}>تعليم الكل</Text>
            </Pressable>
          ) : null
        }
      />

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
          {list.length === 0 ? (
            <EmptyState
              icon="notifications-off-outline"
              title="ما في إشعارات"
              body="رح نخبّرك بكل جديد عن فرصك وطلباتك"
            />
          ) : (
            list.map((item) => {
              const style = NOTIFICATION_STYLE[item.type] ?? DEFAULT_STYLE;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => openNotification(item)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    s.card,
                    !item.isRead && s.cardUnread,
                    pressed && { opacity: 0.95 },
                  ]}
                >
                  <View style={s.cardRow}>
                    <View style={s.cardText}>
                      <View style={s.titleRow}>
                        {!item.isRead && <View style={s.unreadDot} />}
                        <Text style={[s.title, !item.isRead && s.titleUnread]} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </View>
                      <Text style={s.body}>{item.body}</Text>
                      <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
                    </View>

                    <View style={[s.icon, { backgroundColor: style.bg }]}>
                      <Ionicons name={style.icon} size={20} color={style.fg} />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: Spacing.screen, paddingBottom: 40, gap: Spacing.sm },

  markAllBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  markAllText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
    color: c.primary,
    writingDirection: "rtl",
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  cardUnread: { backgroundColor: c.primarySoft, borderColor: c.primarySoft },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  cardText: { flex: 1, gap: 4 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
  },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.primary },
  title: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  titleUnread: { fontFamily: Fonts.bold },
  body: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 21,
  },
  time: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: c.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
});
