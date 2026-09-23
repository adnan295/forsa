import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Alert } from "@/lib/alert";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/query-client";
import { translateError } from "@/lib/errors";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Header, StatTile, EmptyState } from "@/components/ui";

const c = Colors.light;

interface UserStats {
  orderCount: number;
  ticketCount: number;
  totalSpent: string;
}

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuRow({ item, first }: { item: MenuItem; first: boolean }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.menuRow,
        !first && s.menuRowDivided,
        pressed && { backgroundColor: c.primarySoft },
      ]}
    >
      <Ionicons name="chevron-back" size={18} color={c.textMuted} />
      <Text style={[s.menuLabel, item.danger && { color: StatusColors.error.fg }]}>
        {item.label}
      </Text>
      <Ionicons
        name={item.icon}
        size={20}
        color={item.danger ? StatusColors.error.fg : c.textSecondary}
      />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
    staleTime: 10000,
  });

  async function handleLogout() {
    Alert.alert("تسجيل الخروج", "متأكد إنك بدك تسجّل خروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await logout();
          queryClient.clear();
          router.replace("/(tabs)");
        },
      },
    ]);
  }

  // شرط آبل: حذف الحساب متاح من داخل التطبيق، بتأكيد صريح
  function handleDeleteAccount() {
    Alert.alert(
      "حذف الحساب نهائياً",
      "رح ينحذف حسابك وبياناتك وقسائمك، والطلبات يلي لسا قيد الدفع أو المراجعة بتنلغى. ما فيك ترجع عن هالخطوة.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "احذف حسابي",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              queryClient.clear();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace("/(tabs)");
              Alert.alert("تم حذف الحساب", "شكراً لأنك جرّبت NAYVO");
            } catch (error: any) {
              Alert.alert("تعذّر حذف الحساب", translateError(error?.message));
            }
          },
        },
      ],
    );
  }

  if (!user) {
    return (
      <View style={s.root}>
        <Header title="حسابي" />
        <EmptyState
          icon="person-outline"
          title="سجّل الدخول لحسابك"
          body="تابع طلباتك وفرصك وبياناتك من مكان واحد"
          action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
        />
      </View>
    );
  }

  const joinedAt = new Date(user.createdAt ?? Date.now()).toLocaleDateString("ar-EG", {
    month: "long",
    year: "numeric",
  });

  const menu: MenuItem[] = [
    { icon: "person-outline", label: "بياناتي", onPress: () => router.push("/edit-profile" as any) },
    { icon: "location-outline", label: "عناويني", onPress: () => router.push("/edit-profile" as any) },
    { icon: "notifications-outline", label: "الإشعارات", onPress: () => router.push("/notifications" as any) },
    { icon: "heart-outline", label: "المفضلة", onPress: () => router.push("/favorites" as any) },
    { icon: "help-circle-outline", label: "المساعدة", onPress: () => router.push("/faq" as any) },
    { icon: "document-text-outline", label: "الشروط والخصوصية", onPress: () => router.push({ pathname: "/info", params: { type: "terms" } } as any) },
  ];

  if (isAdmin) {
    menu.push({
      icon: "settings-outline",
      label: "لوحة الإدارة",
      onPress: () => router.push("/admin" as any),
    });
  }

  menu.push({ icon: "log-out-outline", label: "تسجيل الخروج", onPress: handleLogout, danger: true });
  if (!isAdmin) {
    menu.push({ icon: "trash-outline", label: "حذف الحساب", onPress: handleDeleteAccount, danger: true });
  }

  return (
    <View style={s.root}>
      <Header title="حسابي" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* ───── البطاقة الشخصية ───── */}
        <View style={s.identity}>
          <View style={s.avatar}>
            <Ionicons name="person" size={40} color={c.textMuted} />
          </View>
          <Text style={s.name}>{user.fullName || user.username}</Text>
          <Text style={s.joined}>عضو منذ {joinedAt}</Text>
        </View>

        {/* ───── الإحصاءات ───── */}
        <View style={s.stats}>
          <Pressable style={s.statPress} onPress={() => router.push("/(tabs)/tickets" as any)}>
            <StatTile
              icon="ticket"
              tone="gold"
              value={stats?.ticketCount ?? 0}
              label="قسائمي"
            />
          </Pressable>

          <Pressable style={s.statPress} onPress={() => router.push("/orders" as any)}>
            <StatTile
              icon="cube"
              tone="primary"
              value={stats?.orderCount ?? 0}
              label="طلباتي"
            />
          </Pressable>
        </View>

        {/* ───── القائمة ───── */}
        <View style={s.menu}>
          {menu.map((item, i) => (
            <MenuRow key={item.label} item={item} first={i === 0} />
          ))}
        </View>

        <Text style={s.version}>NAYVO · الإصدار 1.1.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: {
    padding: Spacing.screen,
    paddingBottom: Platform.OS === "web" ? 110 : 120,
    gap: Spacing.md,
  },

  identity: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    paddingVertical: Spacing.xl,
    alignItems: "center",
    gap: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.navy,
    textAlign: "center",
    writingDirection: "rtl",
  },
  joined: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },

  stats: { flexDirection: "row", gap: Spacing.md },
  statPress: { flex: 1 },

  menu: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  menuRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle,
  },
  menuLabel: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },

  version: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: Spacing.sm,
  },
});

