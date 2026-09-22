import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { queryClient } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing } from "@/constants/colors";
import { Header, ChanceNote, EmptyState } from "@/components/ui";
import DrawBanner, { type CurrentDraw } from "@/components/DrawBanner";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@shared/schema";

const c = Colors.light;
/** عدد المنتجات المعروضة في قسم «منتجات مميزة» */
const FEATURED_COUNT = 4;

export default function HomeScreen() {
  const { user } = useAuth();
  const { addItem, getQuantity, totalItems } = useCart();

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
  const featured = (products ?? []).slice(0, FEATURED_COUNT);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    refetch();
  }, [refetch]);

  const bell = (
    <View style={s.headerActions}>
      <Pressable
        onPress={() => router.push("/cart" as any)}
        style={s.iconBtn}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="السلة"
        testID="cart-button"
      >
        <Ionicons name="cart-outline" size={24} color={c.navy} />
        {totalItems > 0 && (
          <View style={s.dot}>
            <Text style={s.dotText}>{totalItems}</Text>
          </View>
        )}
      </Pressable>

      {user ? (
        <Pressable
          onPress={() => router.push("/notifications" as any)}
          style={s.iconBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="الإشعارات"
          testID="notifications-button"
        >
          <Ionicons name="notifications-outline" size={24} color={c.navy} />
          {unreadCount > 0 && (
            <View style={s.dot}>
              <Text style={s.dotText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push("/auth")} style={s.loginBtn}>
          <Text style={s.loginText}>دخول</Text>
        </Pressable>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* الشعار يمين والإشعارات يسار — بدون عنوان */}
      <View style={s.headerWrap}>
        <Header right={bell} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
        }
      >
        {draw ? (
          <>
            <DrawBanner draw={draw} onPress={() => router.push("/draw" as any)} />
            {ticketPrice > 0 && (
              <ChanceNote>
                كل {ticketPrice.toFixed(0)}$ من مشترياتك = فرصة سحب
              </ChanceNote>
            )}
          </>
        ) : (
          <View style={s.noDraw}>
            <Ionicons name="gift-outline" size={22} color={c.textMuted} />
            <Text style={s.noDrawText}>ما في سحب مفتوح حالياً — ترقّب الجائزة القادمة</Text>
          </View>
        )}

        <View style={s.sectionHead}>
          <Pressable
            onPress={() => router.push("/(tabs)/products" as any)}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={s.sectionLink}>عرض الكل</Text>
          </Pressable>
          <Text style={s.sectionTitle}>منتجات مميزة</Text>
        </View>

        {featured.length === 0 ? (
          <EmptyState
            icon="storefront-outline"
            title="لا توجد منتجات حالياً"
            body="ترقّب! منتجات وجوائز بالطريق"
          />
        ) : (
          <View style={s.grid}>
            {featured.map((p) => (
              <View key={p.id} style={s.gridCell}>
                <ProductCard
                  product={p}
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
  headerWrap: { backgroundColor: c.surface },

  headerActions: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  iconBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  dot: {
    position: "absolute",
    top: 0,
    end: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  dotText: { fontFamily: Fonts.bold, fontSize: 10, color: c.surface },
  loginBtn: {
    backgroundColor: c.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.button,
  },
  loginText: { fontFamily: Fonts.medium, fontSize: FontSize.label, color: c.surface, writingDirection: "rtl" },

  content: {
    padding: Spacing.screen,
    paddingBottom: Platform.OS === "web" ? 110 : 120,
    gap: Spacing.md,
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

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.navy,
    writingDirection: "rtl",
  },
  sectionLink: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.primary,
    writingDirection: "rtl",
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  gridCell: { width: "47.8%", flexGrow: 1 },
});
