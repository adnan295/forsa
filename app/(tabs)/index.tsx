import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { queryClient, buildMediaUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import type { Campaign } from "@shared/schema";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - 48) / 2;

// ─── Mini Countdown ──────────────────────────────────────────
function useTick(endsAt?: string | Date | null) {
  const [left, setLeft] = useState({ h: 0, m: 0, s: 0, expired: true });
  useEffect(() => {
    if (!endsAt) return;
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
      return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000), expired: false };
    };
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

// ─── Grid Card ───────────────────────────────────────────────
function GridCard({ campaign, index, onPress }: { campaign: Campaign; index: number; onPress: () => void }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const ty = useSharedValue(20);
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(campaign.id);
  const tick = useTick(campaign.endsAt);
  const progress = campaign.totalQuantity > 0 ? campaign.soldQuantity / campaign.totalQuantity : 0;
  const isCompleted = campaign.status === "completed";
  const isSoldOut = campaign.status === "sold_out" || campaign.status === "drawing";

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }));
    ty.value = withDelay(delay, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: ty.value }],
  }));

  const getTag = () => {
    if (isCompleted) return { label: "مكتمل", color: "#10B981" };
    if (isSoldOut) return { label: "نفذ", color: "#94A3B8" };
    return null;
  };
  const tag = getTag();

  return (
    <Animated.View style={[anim, { width: CARD_W }]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        style={g.card}
      >
        {/* Image */}
        <View style={g.imgBox}>
          {campaign.imageUrl ? (
            <Image source={{ uri: buildMediaUrl(campaign.imageUrl)! }} style={g.img} resizeMode="cover" />
          ) : (
            <LinearGradient colors={["#1A1A1A", "#333333"]} style={g.img}>
              <Ionicons name="gift-outline" size={32} color="#FFD000" />
            </LinearGradient>
          )}
          {/* Price chip */}
          <View style={g.priceChip}>
            <Text style={g.priceText}>${parseFloat(campaign.productPrice).toFixed(0)}</Text>
          </View>
          {/* Fav */}
          <Pressable
            onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFavorite(campaign.id); }}
            style={g.favBtn} hitSlop={8}
          >
            <Ionicons name={favorited ? "heart" : "heart-outline"} size={16} color={favorited ? "#EF4444" : "#fff"} />
          </Pressable>
          {/* Tag */}
          {tag && (
            <View style={[g.tag, { backgroundColor: tag.color }]}>
              <Text style={g.tagText}>{tag.label}</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={g.body}>
          <Text style={g.title} numberOfLines={2}>{campaign.title}</Text>

          {/* Prize */}
          <View style={g.prizeRow}>
            <Ionicons name="trophy" size={11} color="#FFD000" />
            <Text style={g.prizeText} numberOfLines={1}>{campaign.prizeName}</Text>
          </View>

          {/* Progress */}
          <View style={g.barBg}>
            <View style={[g.barFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
          <Text style={g.remaining}>
            {campaign.totalQuantity - campaign.soldQuantity} تذكرة متبقية
          </Text>

          {/* Countdown */}
          {campaign.endsAt && !isCompleted && !isSoldOut && !tick.expired && (
            <View style={g.tickRow}>
              <Text style={g.tickNum}>{String(tick.s).padStart(2,"0")}</Text>
              <Text style={g.tickSep}>:</Text>
              <Text style={g.tickNum}>{String(tick.m).padStart(2,"0")}</Text>
              <Text style={g.tickSep}>:</Text>
              <Text style={g.tickNum}>{String(tick.h).padStart(2,"0")}</Text>
              <Ionicons name="timer-outline" size={11} color="#94A3B8" />
            </View>
          )}

          {/* CTA */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
            style={[g.cta, isCompleted && { backgroundColor: "#10B981" }, isSoldOut && { backgroundColor: "#CBD5E1" }]}
          >
            <Text style={[g.ctaText, isSoldOut && { color: "#64748B" }]}>
              {isCompleted ? "عرض النتائج" : isSoldOut ? "نفذت الكمية" : "اشترِ الآن"}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Featured Hero Card ───────────────────────────────────────
function HeroCard({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) {
  const scale = useSharedValue(1);
  const progress = campaign.totalQuantity > 0 ? campaign.soldQuantity / campaign.totalQuantity : 0;

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      style={hero.card}
    >
      <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))}>
        <View style={hero.imgBox}>
          {campaign.imageUrl ? (
            <Image source={{ uri: buildMediaUrl(campaign.imageUrl)! }} style={hero.img} resizeMode="cover" />
          ) : (
            <LinearGradient colors={["#1A1A1A", "#2D2D2D", "#FFD000"]} style={hero.img}>
              <Ionicons name="gift-outline" size={52} color="#fff" />
            </LinearGradient>
          )}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.75)"]} style={hero.overlay} />

          <View style={hero.badge}>
            <View style={hero.liveDoc}/>
            <Text style={hero.badgeText}>عرض مميز</Text>
          </View>

          <View style={hero.bottomRow}>
            <Pressable style={hero.ctaBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}>
              <Text style={hero.ctaBtnText}>اشترِ الآن</Text>
            </Pressable>
            <View>
              <Text style={hero.heroTitle} numberOfLines={1}>{campaign.title}</Text>
              <Text style={hero.heroSub} numberOfLines={1}>🏆 {campaign.prizeName}</Text>
              <View style={hero.barBg}>
                <View style={[hero.barFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Recent Purchase Toast ────────────────────────────────────
function PurchaseToast() {
  const { data: purchases } = useQuery<{ campaignTitle: string; minutesAgo: number }[]>({
    queryKey: ["/api/recent-purchases"], staleTime: 60000,
  });
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);
  const op = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: (1 - op.value) * 12 }] }));

  useEffect(() => {
    if (!purchases?.length) return;
    const fn = () => {
      setIdx(p => (p + 1) % purchases.length);
      setShow(true);
      op.value = withTiming(1, { duration: 300 });
      setTimeout(() => { op.value = withTiming(0, { duration: 300 }); setTimeout(() => setShow(false), 400); }, 4500);
    };
    const t = setTimeout(fn, 6000);
    const iv = setInterval(fn, 30000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [purchases]);

  if (!purchases?.length || !show) return null;
  const item = purchases[idx % purchases.length];
  return (
    <Animated.View style={[toast.wrap, anim]}>
      <View style={toast.box}>
        <Ionicons name="bag-check" size={14} color="#10B981" />
        <Text style={toast.text} numberOfLines={1}>
          مستخدم اشترى {item.campaignTitle} منذ {item.minutesAgo > 60 ? `${Math.floor(item.minutesAgo / 60)} ساعة` : `${item.minutesAgo} دقيقة`}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { totalItems } = useCart();

  const { data: campaigns, isLoading, refetch, isRefetching } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"], refetchInterval: 10000, staleTime: 5000,
  });
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"], enabled: !!user, refetchInterval: 15000, staleTime: 10000,
  });
  const unreadCount = unreadData?.count || 0;

  const active = campaigns?.filter(c => c.status === "active") || [];
  const featured = active[0];
  const rest = active.slice(1);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    refetch();
  }, [refetch]);

  // Pair items for 2-column grid rows
  const rows: Campaign[][] = [];
  for (let i = 0; i < rest.length; i += 2) {
    rows.push(rest.slice(i, i + 2));
  }

  function Header() {
    return (
      <View style={s.header}>
        {/* Nav */}
        <View style={[s.nav, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
          <View style={s.navLeft}>
            <Pressable onPress={() => router.push("/cart" as any)} style={s.navBtn} testID="cart-button">
              <Ionicons name="cart-outline" size={24} color="#1A1A1A" />
              {totalItems > 0 && <View style={s.dot}><Text style={s.dotText}>{totalItems}</Text></View>}
            </Pressable>
            {user && (
              <Pressable onPress={() => router.push("/notifications" as any)} style={s.navBtn} testID="notifications-button">
                <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
                {unreadCount > 0 && <View style={s.dot}><Text style={s.dotText}>{unreadCount}</Text></View>}
              </Pressable>
            )}
          </View>
          <View style={s.navCenter}>
            <Text style={s.logo}>فرصة</Text>
            <View style={s.logoUnder} />
          </View>
          <View style={s.navRight}>
            {user ? (
              <Text style={s.username} numberOfLines={1}>{user.username}</Text>
            ) : (
              <Pressable onPress={() => router.push("/auth")} style={s.loginBtn}>
                <Text style={s.loginText}>دخول</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Stats strip */}
        <View style={s.strip}>
          <View style={s.stripItem}>
            <Text style={s.stripNum}>{campaigns?.filter(c => c.status === "completed").length || 0}</Text>
            <Text style={s.stripLabel}>فائز</Text>
          </View>
          <View style={s.stripDiv} />
          <View style={s.stripItem}>
            <Text style={s.stripNum}>{active.reduce((n, c) => n + (c.totalQuantity - c.soldQuantity), 0)}</Text>
            <Text style={s.stripLabel}>تذكرة متاحة</Text>
          </View>
          <View style={s.stripDiv} />
          <View style={s.stripItem}>
            <Text style={s.stripNum}>{active.length}</Text>
            <Text style={s.stripLabel}>عرض نشط</Text>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#FFD000" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: row, index: rowIdx }) => (
          <View style={s.row}>
            {row.map((c, ci) => (
              <GridCard
                key={c.id}
                campaign={c}
                index={rowIdx * 2 + ci + 1}
                onPress={() => router.push({ pathname: "/campaign/[id]", params: { id: c.id } })}
              />
            ))}
            {row.length === 1 && <View style={{ width: CARD_W }} />}
          </View>
        )}
        ListHeaderComponent={
          <View>
            <Header />
            {featured && (
              <View style={s.featuredWrap}>
                <HeroCard
                  campaign={featured}
                  onPress={() => router.push({ pathname: "/campaign/[id]", params: { id: featured.id } })}
                />
              </View>
            )}
            {rest.length > 0 && (
              <View style={s.sectionHead}>
                <View style={s.sectionPill}>
                  <Text style={s.sectionPillText}>{rest.length}</Text>
                </View>
                <Text style={s.sectionTitle}>جميع العروض</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="storefront-outline" size={52} color="#FFD000" />
            <Text style={s.emptyTitle}>لا توجد عروض حالياً</Text>
            <Text style={s.emptyText}>ترقّب! جوائز مذهلة في الطريق</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 + 24 : 104 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FFD000" />}
        showsVerticalScrollIndicator={false}
      />
      <PurchaseToast />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const g = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  imgBox: { height: 130, position: "relative", backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%", position: "absolute" },
  priceChip: {
    position: "absolute", bottom: 8, start: 8,
    backgroundColor: "#FFD000", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
  },
  priceText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#1A1A1A" },
  favBtn: {
    position: "absolute", top: 8, start: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center",
  },
  tag: {
    position: "absolute", top: 8, end: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  tagText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff" },
  body: { padding: 10, gap: 5 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#1A1A1A", textAlign: "right", writingDirection: "rtl" },
  prizeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  prizeText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#888", flex: 1, textAlign: "right", writingDirection: "rtl" },
  barBg: { height: 4, backgroundColor: "#F0F0F0", borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#FFD000", borderRadius: 2 },
  remaining: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#AAA", textAlign: "right", writingDirection: "rtl" },
  tickRow: { flexDirection: "row-reverse", alignItems: "center", gap: 2, justifyContent: "flex-end" },
  tickNum: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#475569", minWidth: 16, textAlign: "center" },
  tickSep: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#CBD5E1" },
  cta: {
    backgroundColor: "#FFD000", borderRadius: 10,
    paddingVertical: 8, alignItems: "center", marginTop: 2,
  },
  ctaText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#1A1A1A", writingDirection: "rtl" },
});

const hero = StyleSheet.create({
  card: { marginHorizontal: 16, borderRadius: 20, overflow: "hidden" },
  imgBox: { height: 220, position: "relative", backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%", position: "absolute" },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 150 },
  badge: {
    position: "absolute", top: 14, end: 14,
    flexDirection: "row-reverse", alignItems: "center", gap: 5,
    backgroundColor: "#FFD000", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  liveDoc: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1A1A1A" },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#1A1A1A" },
  bottomRow: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row-reverse", alignItems: "flex-end",
    paddingHorizontal: 14, paddingBottom: 14, gap: 10,
  },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff", textAlign: "right", writingDirection: "rtl", flex: 1 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", textAlign: "right", writingDirection: "rtl", marginBottom: 6, flex: 1 },
  barBg: { height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden", flex: 1 },
  barFill: { height: "100%", backgroundColor: "#FFD000", borderRadius: 2 },
  ctaBtn: { backgroundColor: "#FFD000", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexShrink: 0 },
  ctaBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#1A1A1A", writingDirection: "rtl" },
});

const toast = StyleSheet.create({
  wrap: { position: "absolute", bottom: Platform.OS === "web" ? 100 : 110, start: 16, end: 16, alignItems: "center", zIndex: 99 },
  box: {
    flexDirection: "row-reverse", alignItems: "center", gap: 8,
    backgroundColor: "#1A1A1A", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, maxWidth: 380, borderWidth: 1, borderColor: "rgba(255,208,0,0.3)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  text: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#fff", flex: 1, textAlign: "right", writingDirection: "rtl" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F8F8" },
  header: { backgroundColor: "#fff", marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  nav: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  navLeft: { flexDirection: "row", gap: 4, width: 90, justifyContent: "flex-start" },
  navCenter: { alignItems: "center" },
  navRight: { width: 90, alignItems: "flex-end" },
  navBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", position: "relative" },
  dot: {
    position: "absolute", top: 4, end: 4, minWidth: 16, height: 16,
    borderRadius: 8, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center",
  },
  dotText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#fff" },
  logo: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#1A1A1A" },
  logoUnder: { height: 3, width: 32, backgroundColor: "#FFD000", borderRadius: 2, marginTop: 1, alignSelf: "center" },
  username: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#666", maxWidth: 80 },
  loginBtn: { backgroundColor: "#FFD000", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  loginText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#1A1A1A" },
  strip: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-around",
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F0F0F0",
  },
  stripItem: { alignItems: "center", gap: 2 },
  stripNum: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#1A1A1A" },
  stripLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#888", writingDirection: "rtl" },
  stripDiv: { width: 1, height: 28, backgroundColor: "#EBEBEB" },
  featuredWrap: { marginBottom: 16 },
  sectionHead: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#1A1A1A", writingDirection: "rtl" },
  sectionPill: { backgroundColor: "#FFD000", paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8 },
  sectionPillText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#1A1A1A" },
  row: { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 16, marginBottom: 16 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#1A1A1A", textAlign: "center", writingDirection: "rtl" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#888", textAlign: "center", writingDirection: "rtl" },
});
