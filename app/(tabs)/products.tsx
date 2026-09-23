import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCart } from "@/lib/cart-context";
import { queryClient } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Sizing, Spacing } from "@/constants/colors";
import { Header, EmptyState } from "@/components/ui";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@shared/schema";

const c = Colors.light;

const CATEGORIES = [
  { key: "all", label: "الكل" },
  { key: "home_appliances", label: "أجهزة منزلية" },
  { key: "kitchen", label: "أدوات مطبخ" },
  { key: "electronics", label: "إلكترونيات" },
  { key: "fashion", label: "أزياء" },
  { key: "beauty", label: "جمال" },
  { key: "accessories", label: "إكسسوارات" },
  { key: "other", label: "أخرى" },
];

export default function ProductsScreen() {
  const { width } = useWindowDimensions();
  const columns = Platform.OS === "web" && width >= 900 ? 4 : Platform.OS === "web" && width >= 600 ? 3 : 2;
  const cellWidth = (Math.min(width, 1200) - Spacing.screen * 2 - Spacing.md * (columns - 1)) / columns;
  const { addItem, getQuantity } = useCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: currentDraw } = useQuery<{ ticketPrice: string } | null>({
    queryKey: ["/api/draws/current"],
    staleTime: 15000,
  });
  const ticketPrice = currentDraw ? parseFloat(currentDraw.ticketPrice) : 0;

  const { data: products, isLoading, refetch, isRefetching } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    refetchInterval: 20000,
    staleTime: 10000,
  });

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (category !== "all") list = list.filter((p) => p.category === category);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [products, category, search]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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
      <Header title="المنتجات" showBack />

      <View style={s.filters}>
        <View style={s.searchRow}>
          <Ionicons name="search" size={20} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن المنتجات…"
            placeholderTextColor={c.textMuted}
            style={s.searchInput}
            returnKeyType="search"
            accessibilityLabel="البحث عن منتج"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8} accessibilityLabel="مسح البحث">
              <Ionicons name="close-circle" size={19} color={c.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
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
                style={[s.chip, active && s.chipActive]}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={search || category !== "all" ? "search-outline" : "storefront-outline"}
            title={search || category !== "all" ? "ما في نتائج" : "لا توجد منتجات حالياً"}
            body={
              search || category !== "all"
                ? "جرّب بحث أو تصنيف تاني"
                : "ترقّب! منتجات وجوائز بالطريق"
            }
          />
        ) : (
          <View style={s.grid}>
            {filtered.map((p) => (
              <View key={p.id} style={[s.gridCell, { width: cellWidth }]}>
                <ProductCard
                  ticketPrice={ticketPrice}
                  product={p}
                  showFavorite
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

  filters: {
    backgroundColor: c.surface,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.screen,
    backgroundColor: c.background,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.md,
    height: Sizing.inputHeight,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: c.text,
    textAlign: "right",
    writingDirection: "rtl",
    padding: 0,
  },

  chipRow: { paddingHorizontal: Spacing.screen, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: Radius.button,
    backgroundColor: c.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
  chipTextActive: { color: c.surface },

  content: {
    padding: Spacing.screen,
    paddingBottom: Platform.OS === "web" ? 110 : 120,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  gridCell: { flexGrow: 0 },
});

