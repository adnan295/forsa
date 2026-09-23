import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform,
  I18nManager,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { queryClient } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Logo, EmptyState } from "@/components/ui";
import DrawHero from "@/components/DrawHero";
import type { CurrentDraw } from "@/components/DrawBanner";
import ProductCard from "@/components/ProductCard";
import { useDesignScale } from "@/lib/design-scale";
import type { Product } from "@shared/schema";

const c = Colors.light;
/** عدد المنتجات المعروضة في قسم «منتجات مميزة» */
const FEATURED_COUNT = 4;

/** سهم «للأمام» بحسب اتجاه الواجهة — الموبايل RTL والويب LTR */
const CHEVRON_FORWARD = I18nManager.isRTL ? "chevron-forward" : "chevron-back";
const CHEVRON_BACK = I18nManager.isRTL ? "chevron-back" : "chevron-forward";

type CategoryKey = "all" | "electronics" | "home_appliances" | "kitchen" | "beauty" | "fashion";

// بترتيب العرض على الموبايل من اليمين، و«الكل» في الطرف الأيسر كما في التصميم
const CATEGORIES: { key: CategoryKey; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: "fashion", label: "أزياء", icon: "hanger" },
  { key: "beauty", label: "عناية شخصية", icon: "bottle-tonic-outline" },
  { key: "kitchen", label: "أدوات مطبخ", icon: "chef-hat" },
  { key: "home_appliances", label: "أجهزة منزلية", icon: "home-outline" },
  { key: "electronics", label: "إلكترونيات", icon: "headphones" },
  { key: "all", label: "الكل", icon: "view-grid-outline" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // المقاسات بالنسبة لتصميم 832px: هوامش 16، بانر 800، كرتان 390 بينهما 20
  const dp = useDesignScale();
  const margin = dp(16);
  const gridGap = dp(20);
  const columns = Platform.OS === "web" && width >= 900 ? 4 : Platform.OS === "web" && width >= 600 ? 3 : 2;
  const cellWidth = Math.floor((Math.min(width, 1200) - margin * 2 - gridGap * (columns - 1)) / columns);
  const { user } = useAuth();
  const { addItem, getQuantity, totalItems } = useCart();
  const [category, setCategory] = useState<CategoryKey>("all");

  const { data: products, isLoading, refetch, isRefetching } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    refetchInterval: 20000,
    staleTime: 10000,
  });

  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const unreadCount = unreadData?.count ?? 0;
  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;

  const featured = useMemo(() => {
    const list = products ?? [];
    return (category === "all" ? list : list.filter((p) => p.category === category)).slice(0, FEATURED_COUNT);
  }, [products, category]);

  // «الأكثر مبيعاً» لمنتج واحد فقط، وعند وجود مبيعات فعلية
  const bestSellerId = useMemo(() => {
    const top = (products ?? []).reduce<Product | null>(
      (best, p) => (p.soldCount > (best?.soldCount ?? 0) ? p : best),
      null,
    );
    return top?.id ?? null;
  }, [products]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={[s.topBar, { paddingTop: insets.top + Spacing.sm, paddingHorizontal: margin }]}>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingHorizontal: margin }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {draw ? (
          <>
            <DrawHero draw={draw} onPress={() => router.push("/draw" as any)} />

            {ticketPrice > 0 && (
              <Pressable
                onPress={() => router.push("/(tabs)/products" as any)}
                accessibilityRole="button"
                style={({ pressed }) => [s.promo, { height: dp(100) }, pressed && { opacity: 0.95 }]}
              >
                <LinearGradient
                  colors={[c.goldSoft, "#FCE7B0"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.promoArrow}>
                  <Ionicons name={CHEVRON_FORWARD} size={15} color={c.navy} />
                </View>
                <View style={s.promoText}>
                  <Text style={s.promoTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                    كل {ticketPrice.toFixed(0)}$ من مشترياتك = قسيمة سحب
                  </Text>
                  <Text style={s.promoBody} numberOfLines={1}>
                    تسوق المنتجات المتنوعة واحصل على فرصتك لربح {draw.prizeName}
                  </Text>
                </View>
                <Ionicons name="gift" size={26} color={c.goldText} />
              </Pressable>
            )}
          </>
        ) : (
          <View style={s.noDraw}>
            <Ionicons name="gift-outline" size={22} color={c.textMuted} />
            <Text style={s.noDrawText}>ما في سحب مفتوح حالياً — ترقّب الجائزة القادمة</Text>
          </View>
        )}

        <View style={[s.categories, { gap: dp(10) }]}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategory(cat.key);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[s.category, { height: dp(105) }, active && s.categoryActive]}
              >
                <MaterialCommunityIcons name={cat.icon} size={20} color={active ? c.surface : c.navy} />
                <Text
                  style={[s.categoryLabel, active && { color: c.surface }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.sectionHead}>
          <View style={s.sectionTitleCol}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="flame" size={24} color={c.flame} />
              <Text style={s.sectionTitle}>منتجات مميزة</Text>
            </View>
            <Text style={s.sectionSub}>أفضل المنتجات وأكثرها طلباً</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/products" as any)}
            hitSlop={8}
            accessibilityRole="button"
            style={s.sectionLink}
          >
            <Text style={s.sectionLinkText}>عرض الكل</Text>
            <Ionicons name={CHEVRON_BACK} size={18} color={c.primary} />
          </Pressable>
        </View>

        {featured.length === 0 ? (
          <EmptyState
            icon="storefront-outline"
            title={category === "all" ? "لا توجد منتجات حالياً" : "لا منتجات في هذا القسم بعد"}
            body={category === "all" ? "ترقّب! منتجات وجوائز بالطريق" : "جرّب قسماً آخر أو تصفح كل المنتجات"}
          />
        ) : (
          <View style={[s.grid, { gap: gridGap }]}>
            {featured.map((p) => (
              <View key={p.id} style={[s.gridCell, { width: cellWidth }]}>
                <ProductCard
                  product={p}
                  showFavorite
                  ticketPrice={ticketPrice}
                  bestSeller={p.id === bestSellerId}
                  inCartQuantity={getQuantity(p.id)}
                  onAddToCart={() => addItem(p, 1)}
                  onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.surface,
    paddingHorizontal: Spacing.screen,
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

  content: {
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === "web" ? 110 : 120,
    gap: Spacing.md + 2,
  },

  promo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3D48A",
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  promoArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  promoText: { flex: 1, gap: 1 },
  promoTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: c.goldText,
    textAlign: "center",
    writingDirection: "rtl",
  },
  promoBody: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: c.goldText,
    textAlign: "center",
    writingDirection: "rtl",
    opacity: 0.85,
  },

  noDraw: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  noDrawText: {
    flexShrink: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },

  categories: { flexDirection: "row" },
  category: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 0,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  categoryActive: { backgroundColor: c.navy, borderColor: c.navy },
  categoryLabel: {
    fontFamily: Fonts.medium,
    fontSize: 9,
    color: c.text,
    writingDirection: "rtl",
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  sectionTitleCol: { alignItems: "flex-start", gap: 2 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 22, color: c.navy, writingDirection: "rtl" },
  sectionSub: { fontFamily: Fonts.regular, fontSize: 13, color: c.textMuted, writingDirection: "rtl" },
  sectionLink: { flexDirection: "row", alignItems: "center", gap: 2, paddingBottom: 2 },
  sectionLinkText: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: c.primary, writingDirection: "rtl" },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: { flexGrow: 0 },
});
