import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { getApiUrl } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing } from "@/constants/colors";
import { Header, Button, StatusBadge, EmptyState } from "@/components/ui";

const c = Colors.light;

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referredUsers: { username: string; joinedAt: string }[];
}

export default function ReferralScreen() {
  const { user } = useAuth();
  const [copied, setCopied] = React.useState<"code" | "link" | null>(null);

  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referral"],
    enabled: !!user,
  });

  const code = data?.referralCode ?? "";
  const inviteLink = code ? `${getApiUrl().replace(/\/$/, "")}/?ref=${code}` : "";
  const shareMessage = `جرّب «فرصة» معي — كل مشترياتك بتعطيك فرص للسحب على جوائز.\nكود الدعوة: ${code}\n${inviteLink}`;

  async function copy(value: string, which: "code" | "link") {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  async function shareInvite() {
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web") {
      await copy(shareMessage, "link");
      return;
    }
    try {
      await Share.share({ message: shareMessage });
    } catch {
      // المستخدم ألغى المشاركة — ما في شي نعمله
    }
  }

  if (!user) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="دعوة الأصدقاء" showBack />
        <EmptyState
          icon="people-outline"
          title="سجّل الدخول لدعوة أصحابك"
          action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="دعوة الأصدقاء" showBack />
        <View style={s.loading}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </View>
    );
  }

  const invites = data?.referredUsers ?? [];

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="دعوة الأصدقاء" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* ───── البطل ───── */}
        <View style={s.hero}>
          <View style={s.heroArt}>
            <View style={[s.heroBubble, s.heroBubbleStart]}>
              <Ionicons name="person" size={17} color={c.primary} />
            </View>
            <View style={[s.heroBubble, s.heroBubbleEnd]}>
              <Ionicons name="person" size={17} color={c.primary} />
            </View>
            <View style={s.heroGift}>
              <Ionicons name="gift" size={52} color={c.primary} />
            </View>
          </View>

          <Text style={s.heroTitle}>شارك فرصة مع أصحابك</Text>
          <Text style={s.heroSub}>ادعُ أصدقائك ليستمتعوا بتجربة فرصة</Text>
        </View>

        {/* ───── الكود ───── */}
        <Pressable
          onPress={() => copy(code, "code")}
          accessibilityRole="button"
          accessibilityLabel={`نسخ كود الدعوة ${code}`}
          style={({ pressed }) => [s.codeBox, pressed && { backgroundColor: c.primarySoft }]}
        >
          <Ionicons
            name={copied === "code" ? "checkmark-circle" : "copy-outline"}
            size={20}
            color={copied === "code" ? c.primary : c.textMuted}
          />
          <Text style={s.codeText}>{code || "—"}</Text>
        </Pressable>

        <View style={s.actions}>
          <Button
            label={copied === "link" ? "تم النسخ" : "نسخ الرابط"}
            variant="secondary"
            icon={copied === "link" ? "checkmark" : "link-outline"}
            onPress={() => copy(inviteLink, "link")}
            style={s.actionBtn}
          />
          <Button
            label="مشاركة الدعوة"
            variant="secondary"
            icon="share-social-outline"
            onPress={shareInvite}
            style={s.actionBtn}
          />
        </View>

        {/* ───── سجل الدعوات ───── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>سجل الدعوات</Text>

          {invites.length === 0 ? (
            <Text style={s.emptyLog}>لسا ما في دعوات — شارك كودك وبتظهر هنا</Text>
          ) : (
            invites.map((inv, i) => (
              <View key={`${inv.username}-${i}`} style={[s.logRow, i > 0 && s.logRowDivided]}>
                <StatusBadge kind="success" label="انضمّ" icon="checkmark-circle" />

                <View style={s.logInfo}>
                  <Text style={s.logName}>{inv.username}</Text>
                  <Text style={s.logDate}>
                    {new Date(inv.joinedAt).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </Text>
                </View>

                <View style={s.logAvatar}>
                  <Ionicons name="person" size={18} color={c.textMuted} />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: Spacing.screen, paddingBottom: 40, gap: Spacing.md },

  hero: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    gap: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  heroArt: {
    width: 150,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  heroGift: {
    width: 92,
    height: 92,
    borderRadius: Radius.hero,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBubble: {
    position: "absolute",
    top: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBubbleStart: { start: 0 },
  heroBubbleEnd: { end: 0 },
  heroTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.navy,
    textAlign: "center",
    writingDirection: "rtl",
  },
  heroSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },

  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  codeText: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    /** ثابت الاتجاه حتى ما ينعكس ضمن النص العربي */
    writingDirection: "ltr",
    letterSpacing: 1,
  },

  actions: { flexDirection: "row", gap: Spacing.md },
  actionBtn: { flex: 1 },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  emptyLog: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },

  logRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  logRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle,
    paddingTop: Spacing.md,
  },
  logAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  logName: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    writingDirection: "rtl",
  },
  logDate: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    writingDirection: "ltr",
  },
});
