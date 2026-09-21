import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  Linking,
  AppState,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
import { getNotificationPermissionStatus } from "@/lib/push-notifications";
import DrawBanner, { type CurrentDraw } from "@/components/DrawBanner";
import type { Product } from "@shared/schema";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - 48) / 2;

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "الكل", icon: "apps" },
  { key: "electronics", label: "إلكترونيات", icon: "phone-portrait" },
  { key: "fashion", label: "أزياء", icon: "shirt" },
  { key: "beauty", label: "جمال", icon: "sparkles" },
  { key: "accessories", label: "إكسسوارات", icon: "watch" },
  { key: "home", label: "منزل", icon: "home" },
  { key: "other", label: "أخرى", icon: "ellipsis-horizontal" },
];

// ─── بطاقة منتج بالشبكة ────────────────────────────────────────
function GridCard({
  product,
  ticketPrice,
  index,
  onPress,
  onAdd,
  inCart,
}: {
  product: Product;
  ticketPrice: number;
  index: number;
  onPress: () => void;
  onAdd: () => void;
  inCart: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const ty = useSharedValue(20);
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(product.id);

  const price = parseFloat(product.price);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;
  const tickets = ticketPrice > 0 ? Math.floor(price / ticketPrice) : 0;

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }));
    ty.value = withDelay(delay, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: ty.value }],
  }));

  const imageUri = buildMediaUrl(product.imageUrl);

  return (
    <Animated.View style={[anim, { width: CARD_W }]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        style={g.card}
      >
        <View style={g.imgBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={g.img} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          ) : (
            <LinearGradient colors={["#1A1A1A", "#333333"]} style={g.img}>
              <View style={g.imgPlaceholderInner}>
                <Ionicons name="cube-outline" size={32} color="#FFD000" />
              </View>
            </LinearGradient>
          )}

          <View style={g.priceChip}>
            <Text style={g.priceText}>${price.toFixed(0)}</Text>
          </View>

          <Pressable
            onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFavorite(product.id); }}
            style={g.favBtn}
            hitSlop={8}
          >
            <Ionicons name={favorited ? "heart" : "heart-outline"} size={16} color={favorited ? "#EF4444" : "#fff"} />
          </Pressable>

          {(outOfStock || lowStock) && (
            <View style={[g.tag, { backgroundColor: outOfStock ? "#94A3B8" : "#F59E0B" }]}>
              <Text style={g.tagText}>{outOfStock ? "نفذ" : `باقي ${product.stock}`}</Text>
            </View>
          )}
        </View>

        <View style={g.body}>
          <Text style={g.title} numberOfLines={2}>{product.name}</Text>

          {tickets > 0 && (
            <View style={g.ticketRow}>
              <Ionicons name="ticket" size={11} color="#FFD000" />
              <Text style={g.ticketText} numberOfLines={1}>
                {tickets} {tickets === 1 ? "تذكرة" : "تذاكر"} للسحب
              </Text>
            </View>
          )}

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (outOfStock) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAdd();
            }}
            disabled={outOfStock}
            style={[g.addBtn, outOfStock && g.addBtnDisabled, inCart > 0 && g.addBtnInCart]}
          >
            <Ionicons
              name={inCart > 0 ? "checkmark" : "add"}
              size={15}
              color={outOfStock ? "#999" : "#1A1A1A"}
            />
            <Text style={[g.addBtnText, outOfStock && { color: "#999" }]}>
              {outOfStock ? "غير متوفر" : inCart > 0 ? `بالسلة (${inCart})` : "أضف"}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── إشعار شراء حديث ──────────────────────────────────────────
function PurchaseToast() {
  const { data: purchases } = useQuery<{ productName: string; minutesAgo: number }[]>({
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
          مستخدم اشترى {item.productName} منذ {item.minutesAgo > 60 ? `${Math.floor(item.minutesAgo / 60)} ساعة` : `${item.minutesAgo} دقيقة`}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── بانر صلاحية الإشعارات ────────────────────────────────────
function NotificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [permStatus, setPermStatus] = useState<"granted" | "denied" | "undetermined" | null>(null);
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  function checkAndUpdate() {
    if (Platform.OS === "web" || !user) return;
    getNotificationPermissionStatus().then((status) => {
      setPermStatus(status);
      if (status === "denied") {
        translateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
        opacity.value = withTiming(1, { duration: 350 });
      } else if (status === "granted") {
        translateY.value = withTiming(-60, { duration: 250 });
        opacity.value = withTiming(0, { duration: 250 });
      }
    });
  }

  useEffect(() => {
    checkAndUpdate();
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") checkAndUpdate();
    });
    return () => sub.remove();
  }, [user]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  function handleDismiss() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    translateY.value = withTiming(-60, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 });
    setTimeout(() => setDismissed(true), 260);
  }

  if (dismissed || permStatus !== "denied" || Platform.OS === "web" || !user) return null;

  return (
    <Animated.View style={[nb.wrap, animStyle]}>
      <View style={nb.inner}>
        <View style={nb.iconWrap}>
          <Ionicons name="notifications-off" size={20} color="#F59E0B" />
        </View>
        <View style={nb.textWrap}>
          <Text style={nb.title}>الإشعارات معطّلة</Text>
          <Text style={nb.sub}>فعّل الإشعارات لتصلك تنبيهات السحب والعروض</Text>
        </View>
        <View style={nb.actions}>
          <Pressable
            style={nb.settingsBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Linking.openSettings(); }}
            testID="notif-banner-settings"
          >
            <Text style={nb.settingsBtnText}>تفعيل</Text>
          </Pressable>
          <Pressable style={nb.closeBtn} onPress={handleDismiss} testID="notif-banner-dismiss" hitSlop={8}>
            <Ionicons name="close" size={18} color="#94A3B8" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── الشاشة الرئيسية ──────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { totalItems, addItem, getQuantity } = useCart();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: products, isLoading, refetch, isRefetching } = useQuery<Product[]>({
    queryKey: ["/api/products"], refetchInterval: 20000, staleTime: 10000,
  });
  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"], refetchInterval: 15000, staleTime: 5000,
  });
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"], enabled: !!user, refetchInterval: 15000, staleTime: 10000,
  });
  const unreadCount = unreadData?.count || 0;

  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (category !== "all") list = list.filter((p) => p.category === category);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [products, category, search]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    refetch();
  }, [refetch]);

  const rows: Product[][] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(filtered.slice(i, i + 2));
  }

  function handleAdd(product: Product) {
    addItem(product, 1);
  }

  function Header() {
    return (
      <View style={s.header}>
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

        <View style={s.searchRow}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن منتج…"
            placeholderTextColor="#AAA"
            style={s.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#CCC" />
            </Pressable>
          )}
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
            {row.map((p, ci) => (
              <GridCard
                key={p.id}
                product={p}
                ticketPrice={ticketPrice}
                index={rowIdx * 2 + ci}
                inCart={getQuantity(p.id)}
                onAdd={() => handleAdd(p)}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
              />
            ))}
            {row.length === 1 && <View style={{ width: CARD_W }} />}
          </View>
        )}
        ListHeaderComponent={
          <View>
            <Header />
            <NotificationBanner />

            {draw ? (
              <View style={s.drawWrap}>
                <DrawBanner draw={draw} onPress={() => router.push("/draw" as any)} />
              </View>
            ) : (
              <View style={s.noDrawWrap}>
                <Ionicons name="gift-outline" size={20} color="#999" />
                <Text style={s.noDrawText}>ما في جولة سحب مفتوحة حالياً — ترقّب الجائزة القادمة</Text>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.catRow}
            >
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => { Haptics.selectionAsync(); setCategory(c.key); }}
                    style={[s.catChip, active && s.catChipActive]}
                  >
                    <Ionicons name={c.icon} size={14} color={active ? "#1A1A1A" : "#888"} />
                    <Text style={[s.catChipText, active && s.catChipTextActive]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filtered.length > 0 && (
              <View style={s.sectionHead}>
                <View style={s.sectionPill}>
                  <Text style={s.sectionPillText}>{filtered.length}</Text>
                </View>
                <Text style={s.sectionTitle}>
                  {category === "all" ? "كل المنتجات" : CATEGORIES.find((c) => c.key === category)?.label}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="storefront-outline" size={52} color="#FFD000" />
            <Text style={s.emptyTitle}>
              {search || category !== "all" ? "ما في نتائج" : "لا توجد منتجات حالياً"}
            </Text>
            <Text style={s.emptyText}>
              {search || category !== "all" ? "جرّب بحث أو تصنيف تاني" : "ترقّب! منتجات وجوائز بالطريق"}
            </Text>
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

// ─── الأنماط ──────────────────────────────────────────────────
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
  imgPlaceholderInner: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  body: { padding: 10, gap: 7 },
  title: {
    fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl", lineHeight: 19, minHeight: 38,
  },
  ticketRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ticketText: {
    fontFamily: "Inter_500Medium", fontSize: 11, color: "#888",
    flex: 1, textAlign: "right", writingDirection: "rtl",
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    backgroundColor: "#FFD000", paddingVertical: 8, borderRadius: 10,
  },
  addBtnInCart: { backgroundColor: "#FFE566" },
  addBtnDisabled: { backgroundColor: "#F0F0F0" },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#1A1A1A", writingDirection: "rtl" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F8F8" },
  header: { backgroundColor: "#fff", marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  nav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
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
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#F5F5F5", borderRadius: 12, paddingHorizontal: 12, height: 42,
  },
  searchInput: {
    flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl", padding: 0,
  },
  drawWrap: { marginHorizontal: 16, marginBottom: 16 },
  noDrawWrap: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 16, padding: 16,
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#F0F0F0",
  },
  noDrawText: {
    fontFamily: "Inter_500Medium", fontSize: 13, color: "#888",
    textAlign: "center", writingDirection: "rtl", flexShrink: 1,
  },
  catRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 14 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#EBEBEB",
  },
  catChipActive: { backgroundColor: "#FFD000", borderColor: "#FFD000" },
  catChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#888", writingDirection: "rtl" },
  catChipTextActive: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#1A1A1A", writingDirection: "rtl" },
  sectionPill: { backgroundColor: "#FFD000", paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8 },
  sectionPillText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#1A1A1A" },
  row: { flexDirection: "row", paddingHorizontal: 16, gap: 16, marginBottom: 16 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#1A1A1A", textAlign: "center", writingDirection: "rtl" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#888", textAlign: "center", writingDirection: "rtl" },
});

const toast = StyleSheet.create({
  wrap: { position: "absolute", bottom: Platform.OS === "web" ? 100 : 110, start: 16, end: 16, alignItems: "center", zIndex: 99 },
  box: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#1A1A1A", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, maxWidth: 380, borderWidth: 1, borderColor: "rgba(255,208,0,0.3)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  text: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#fff", flex: 1, textAlign: "right", writingDirection: "rtl" },
});

const nb = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#92400E",
    textAlign: "right",
    writingDirection: "rtl",
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#B45309",
    textAlign: "right",
    writingDirection: "rtl",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  settingsBtn: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  settingsBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#fff",
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
