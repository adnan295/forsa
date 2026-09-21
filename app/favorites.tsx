import React from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart-context";
import { useFavorites } from "@/lib/favorites-context";
import Colors, { Spacing } from "@/constants/colors";
import { Header, EmptyState } from "@/components/ui";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@shared/schema";

const c = Colors.light;

export default function FavoritesScreen() {
  const { favorites } = useFavorites();
  const { addItem, getQuantity } = useCart();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const favoriteProducts = (products ?? []).filter((p) => favorites.includes(p.id));

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="المفضلة" showBack />

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : favoriteProducts.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="ما في مفضلات"
          body="اضغط على القلب بأي منتج ليظهر هنا"
          action={{ label: "تصفّح المتجر", onPress: () => router.push("/(tabs)/products" as any) }}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.grid}>
            {favoriteProducts.map((p) => (
              <View key={p.id} style={s.cell}>
                <ProductCard
                  product={p}
                  showFavorite
                  inCartQuantity={getQuantity(p.id)}
                  onAddToCart={() => addItem(p, 1)}
                  onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: Spacing.screen, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  cell: { width: "47.8%", flexGrow: 1 },
});
