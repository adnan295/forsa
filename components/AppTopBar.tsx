import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useDesignScale } from "@/lib/design-scale";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Logo } from "@/components/ui";

const c = Colors.light;

/** شريط التطبيق في الرئيسية وقسائمي: السلة والإشعارات، والشعار مع الشعار اللفظي */
export default function AppTopBar() {
  const insets = useSafeAreaInsets();
  const dp = useDesignScale();
  const { user } = useAuth();
  const { totalItems } = useCart();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 15000,
    staleTime: 10000,
  });
  const unreadCount = unreadData?.count ?? 0;

  return (
    <View style={[s.topBar, { paddingTop: insets.top + Spacing.sm, paddingHorizontal: dp(16) }]}>
      <View style={s.actions}>
        <Pressable
          onPress={() => router.push("/cart" as any)}
          style={s.iconBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="السلة"
          testID="cart-button"
        >
          <Ionicons name="cart-outline" size={28} color={c.navy} />
          {totalItems > 0 && (
            <View style={[s.badge, { backgroundColor: c.primary }]}>
              <Text style={s.badgeText}>{totalItems}</Text>
            </View>
          )}
        </Pressable>

        {user ? (
          <Pressable
            onPress={() => router.push("/notifications" as any)}
            style={s.iconBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروءة` : "الإشعارات"}
            testID="notifications-button"
          >
            <Ionicons name="notifications-outline" size={28} color={c.navy} />
            {unreadCount > 0 && (
              <View style={[s.badge, { backgroundColor: StatusColors.error.fg }]}>
                <Text style={s.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push("/auth")} style={s.loginBtn}>
            <Text style={s.loginText}>دخول</Text>
          </Pressable>
        )}
      </View>

      <View style={s.brand}>
        <Logo size={30} />
        <Text style={s.tagline}>تسوق أكثر .. فرصتك أكبر</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.surface,
    paddingBottom: Spacing.md,
  },
  brand: { alignItems: "flex-end" },
  tagline: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: c.navy,
    writingDirection: "rtl",
    marginTop: -2,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 0,
    start: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: c.surface,
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 11, color: c.surface },
  loginBtn: {
    backgroundColor: c.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.button,
  },
  loginText: { fontFamily: Fonts.medium, fontSize: FontSize.label, color: c.surface, writingDirection: "rtl" },
});
