import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Share,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getApiUrl } from "@/lib/query-client";

type ReferralData = {
  referralCode: string;
  referralCount: number;
  referredUsers: { username: string; joinedAt: string }[];
};

type WalletData = {
  balance: number;
  transactions: { type: string; amount: string; description: string; createdAt: string }[];
};

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referral"],
    enabled: !!user,
  });

  const { data: walletData } = useQuery<WalletData>({
    queryKey: ["/api/user/wallet"],
    enabled: !!user,
  });

  const referralEarnings = walletData?.transactions
    .filter((t) => t.type === "referral_reward")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) ?? 0;

  async function handleCopyCode() {
    if (!data?.referralCode) return;
    await Clipboard.setStringAsync(data.referralCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("تم النسخ", "تم نسخ رمز الإحالة");
  }

  async function handleShare() {
    if (!data?.referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const message = `انضم إلى فرصة واحصل على فرصة للفوز بهدايا رائعة!\n\nاستخدم رمز الإحالة: ${data.referralCode}`;
      await Share.share({ message });
    } catch (e) {}
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>يرجى تسجيل الدخول أولاً</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? 67 : insets.top,
        paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>برنامج الإحالة</Text>
        <View style={{ width: 40 }} />
      </View>

      <LinearGradient
        colors={["#7C3AED", "#A855F7", "#EC4899"]}
        style={styles.heroGradient}
      >
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroContent}>
          <View style={styles.giftIconWrap}>
            <Ionicons name="gift" size={36} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>ادعُ أصدقاءك</Text>
          <Text style={styles.heroSubtitle}>
            ادعُ صديقاً واحصل على 10 ريال في محفظتك، ويحصل صديقك على 5 ريال ترحيباً
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.codeSection}>
        <Text style={styles.codeSectionLabel}>رمز الإحالة الخاص بك</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeText}>
            {isLoading ? "..." : data?.referralCode || "---"}
          </Text>
          <Pressable onPress={handleCopyCode} style={styles.copyBtn}>
            <Ionicons name="copy-outline" size={22} color={Colors.light.accent} />
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={handleCopyCode} style={styles.actionBtn}>
            <LinearGradient
              colors={[Colors.light.accent, Colors.light.accentDark]}
              style={styles.actionGradient}
            >
              <Ionicons name="copy" size={20} color="#fff" />
              <Text style={styles.actionText}>نسخ الرمز</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={handleShare} style={styles.actionBtn}>
            <LinearGradient
              colors={[Colors.light.accentPink, Colors.light.accentPinkDark]}
              style={styles.actionGradient}
            >
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.actionText}>مشاركة</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statsCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#7C3AED15" }]}>
            <Ionicons name="people" size={24} color="#7C3AED" />
          </View>
          <Text style={styles.statValue}>{data?.referralCount ?? 0}</Text>
          <Text style={styles.statLabel}>دعوات ناجحة</Text>
        </View>
        <View style={styles.statsCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#10B98115" }]}>
            <Ionicons name="wallet" size={24} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{referralEarnings.toFixed(0)} ر</Text>
          <Text style={styles.statLabel}>أرباح الإحالة</Text>
        </View>
        <View style={styles.statsCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#F59E0B15" }]}>
            <Ionicons name="cash" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{walletData?.balance ? parseFloat(String(walletData.balance)).toFixed(0) : 0} ر</Text>
          <Text style={styles.statLabel}>رصيد المحفظة</Text>
        </View>
      </View>

      {data && data.referredUsers.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>الأصدقاء المدعوون</Text>
          <View style={styles.listCard}>
            {data.referredUsers.map((u, index) => (
              <React.Fragment key={u.username}>
                <View style={styles.listItem}>
                  <View style={styles.listAvatar}>
                    <Text style={styles.listAvatarText}>
                      {u.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listUsername}>{u.username}</Text>
                    <Text style={styles.listDate}>
                      انضم {formatDate(u.joinedAt)}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.light.success} />
                </View>
                {index < data.referredUsers.length - 1 && (
                  <View style={styles.listDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {data && data.referredUsers.length === 0 && !isLoading && (
        <View style={styles.emptySection}>
          <Ionicons name="people-outline" size={48} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>لا توجد دعوات بعد</Text>
          <Text style={styles.emptySubtitle}>
            شارك رمز الإحالة مع أصدقائك للبدء
          </Text>
        </View>
      )}
    </ScrollView>
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
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
    writingDirection: "rtl",
  },
  heroGradient: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    padding: 28,
  },
  heroDecor1: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroDecor2: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(236,72,153,0.15)",
  },
  heroContent: {
    alignItems: "center",
    zIndex: 2,
  },
  giftIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#fff",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  codeSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  codeSectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  codeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: Colors.light.accent + "20",
    borderStyle: "dashed",
    gap: 16,
  },
  codeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.light.accent,
    letterSpacing: 6,
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.accent + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    borderRadius: 16,
  },
  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
    writingDirection: "rtl",
  },
  statsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    flexDirection: "row-reverse",
    gap: 10,
  },
  statsCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
    marginTop: 4,
  },
  listSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  listTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  listItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  listAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.light.accent + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  listAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.accent,
  },
  listInfo: {
    flex: 1,
  },
  listUsername: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  listDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  listDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 16,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.light.text,
    writingDirection: "rtl",
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 8,
    lineHeight: 22,
  },
});
