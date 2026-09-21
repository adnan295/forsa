import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useCart } from "@/lib/cart-context";
import { useFavorites } from "@/lib/favorites-context";
import { buildMediaUrl } from "@/lib/query-client";
import DrawBanner, { type CurrentDraw } from "@/components/DrawBanner";
import type { Product, Review } from "@shared/schema";

const { width: W } = Dimensions.get("window");

function parseImages(product: Product | undefined): string[] {
  if (!product) return [];
  const list: string[] = [];
  if (product.imagesJson) {
    try {
      const parsed = JSON.parse(product.imagesJson);
      if (Array.isArray(parsed)) list.push(...parsed.filter((x) => typeof x === "string"));
    } catch {}
  }
  if (list.length === 0 && product.imageUrl) list.push(product.imageUrl);
  return list;
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addItem, getQuantity, totalItems } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });
  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    staleTime: 10000,
  });
  const { data: reviews } = useQuery<(Review & { username: string })[]>({
    queryKey: ["/api/reviews", id],
    enabled: !!id,
  });

  const images = useMemo(() => parseImages(product), [product]);
  const inCart = product ? getQuantity(product.id) : 0;

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#FFD000" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={s.loading}>
        <Ionicons name="alert-circle-outline" size={48} color="#999" />
        <Text style={s.notFound}>المنتج غير موجود</Text>
        <Pressable onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  const price = parseFloat(product.price);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const maxQty = product.stock === null ? 50 : Math.min(product.stock, 50);
  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;
  const ticketsForOne = ticketPrice > 0 ? Math.floor(price / ticketPrice) : 0;
  const ticketsForSelection = ticketPrice > 0 ? Math.floor((price * quantity) / ticketPrice) : 0;
  const favorited = isFavorite(product.id);

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  function handleAdd() {
    if (!product || outOfStock) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem(product, quantity);
    Alert.alert("تمت الإضافة", `تمت إضافة ${quantity} × ${product.name} للسلة`, [
      { text: "متابعة التسوق", style: "cancel" },
      { text: "عرض السلة", onPress: () => router.push("/cart" as any) },
    ]);
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* ───── الصور ───── */}
        <View style={s.gallery}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setImageIndex(Math.round(e.nativeEvent.contentOffset.x / W))
              }
            >
              {images.map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: buildMediaUrl(img)! }}
                  style={{ width: W, height: 340 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ))}
            </ScrollView>
          ) : (
            <LinearGradient colors={["#1A1A1A", "#333333"]} style={s.galleryPlaceholder}>
              <Ionicons name="cube-outline" size={64} color="#FFD000" />
            </LinearGradient>
          )}

          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === imageIndex && s.dotActive]} />
              ))}
            </View>
          )}

          <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="arrow-forward" size={22} color="#fff" />
            </Pressable>
            <View style={s.topBarRight}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleFavorite(product.id);
                }}
                style={s.iconBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={favorited ? "heart" : "heart-outline"}
                  size={22}
                  color={favorited ? "#EF4444" : "#fff"}
                />
              </Pressable>
              <Pressable onPress={() => router.push("/cart" as any)} style={s.iconBtn} hitSlop={8}>
                <Ionicons name="cart-outline" size={22} color="#fff" />
                {totalItems > 0 && (
                  <View style={s.cartDot}>
                    <Text style={s.cartDotText}>{totalItems}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* ───── التفاصيل ───── */}
        <View style={s.body}>
          <View style={s.titleRow}>
            <Text style={s.price}>${price.toFixed(2)}</Text>
            <Text style={s.title}>{product.name}</Text>
          </View>

          <View style={s.metaRow}>
            {reviews && reviews.length > 0 && (
              <View style={s.metaItem}>
                <Ionicons name="star" size={14} color="#FFD000" />
                <Text style={s.metaText}>
                  {avgRating.toFixed(1)} ({reviews.length})
                </Text>
              </View>
            )}
            <View style={s.metaItem}>
              <Ionicons
                name={outOfStock ? "close-circle" : "checkmark-circle"}
                size={14}
                color={outOfStock ? "#EF4444" : "#10B981"}
              />
              <Text style={s.metaText}>
                {outOfStock
                  ? "نفدت الكمية"
                  : product.stock === null
                  ? "متوفر"
                  : `متوفر (${product.stock})`}
              </Text>
            </View>
          </View>

          {/* كم تذكرة بيعطي */}
          {ticketsForOne > 0 && (
            <View style={s.ticketCard}>
              <View style={s.ticketIconWrap}>
                <Ionicons name="ticket" size={20} color="#1A1A1A" />
              </View>
              <View style={s.ticketTextWrap}>
                <Text style={s.ticketTitle}>
                  شراء هذا المنتج بيعطيك {ticketsForOne} {ticketsForOne === 1 ? "تذكرة" : "تذاكر"}
                </Text>
                <Text style={s.ticketSub}>
                  كل {ticketPrice.toFixed(0)}$ من مشترياتك = تذكرة سحب وحدة
                </Text>
              </View>
            </View>
          )}

          {product.description ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>الوصف</Text>
              <Text style={s.description}>{product.description}</Text>
            </View>
          ) : null}

          {/* الجولة الحالية */}
          {draw && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>جولة السحب الحالية</Text>
              <DrawBanner draw={draw} compact onPress={() => router.push("/draw" as any)} />
            </View>
          )}

          {/* التقييمات */}
          {reviews && reviews.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>التقييمات ({reviews.length})</Text>
              {reviews.slice(0, 5).map((r) => (
                <View key={r.id} style={s.review}>
                  <View style={s.reviewHead}>
                    <View style={s.stars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons
                          key={n}
                          name={n <= r.rating ? "star" : "star-outline"}
                          size={12}
                          color="#FFD000"
                        />
                      ))}
                    </View>
                    <Text style={s.reviewUser}>{r.username}</Text>
                  </View>
                  {r.comment ? <Text style={s.reviewComment}>{r.comment}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ───── شريط الشراء ───── */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {!outOfStock && (
          <View style={s.qtyRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setQuantity((q) => Math.max(1, q - 1));
              }}
              style={s.qtyBtn}
              hitSlop={6}
            >
              <Ionicons name="remove" size={18} color="#1A1A1A" />
            </Pressable>
            <Text style={s.qtyValue}>{quantity}</Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setQuantity((q) => Math.min(maxQty, q + 1));
              }}
              style={s.qtyBtn}
              hitSlop={6}
            >
              <Ionicons name="add" size={18} color="#1A1A1A" />
            </Pressable>
          </View>
        )}

        <Pressable onPress={handleAdd} disabled={outOfStock} style={s.addBtnWrap}>
          <LinearGradient
            colors={outOfStock ? ["#E5E5E5", "#E5E5E5"] : ["#FFD000", "#E6B800"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.addBtn}
          >
            <Ionicons name="cart" size={18} color={outOfStock ? "#999" : "#1A1A1A"} />
            <View>
              <Text style={[s.addBtnText, outOfStock && { color: "#999" }]}>
                {outOfStock ? "غير متوفر" : `أضف للسلة · ${(price * quantity).toFixed(2)}$`}
              </Text>
              {!outOfStock && ticketsForSelection > 0 && (
                <Text style={s.addBtnSub}>= {ticketsForSelection} تذكرة سحب</Text>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {inCart > 0 && (
        <View style={[s.inCartPill, { bottom: Math.max(insets.bottom, 12) + 78 }]}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={s.inCartText}>عندك {inCart} من هالمنتج بالسلة</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F8F8", gap: 12 },
  notFound: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#666", writingDirection: "rtl" },
  backLink: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#FFD000", borderRadius: 10 },
  backLinkText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#1A1A1A", writingDirection: "rtl" },

  gallery: { height: 340, backgroundColor: "#1A1A1A", position: "relative" },
  galleryPlaceholder: { width: "100%", height: 340, alignItems: "center", justifyContent: "center" },
  dots: {
    position: "absolute", bottom: 14, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: "#FFD000", width: 18 },
  topBar: {
    position: "absolute", top: 0, start: 0, end: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  topBarRight: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center",
  },
  cartDot: {
    position: "absolute", top: 2, end: 2, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  cartDotText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#fff" },

  body: {
    backgroundColor: "#fff", marginTop: -20,
    borderTopStartRadius: 24, borderTopEndRadius: 24,
    padding: 20, gap: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  title: {
    fontFamily: "Inter_700Bold", fontSize: 20, color: "#1A1A1A",
    flex: 1, textAlign: "right", writingDirection: "rtl", lineHeight: 29,
  },
  price: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#E6B800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#666", writingDirection: "rtl" },

  ticketCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFBE6", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#FFE566",
  },
  ticketIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFD000",
    alignItems: "center", justifyContent: "center",
  },
  ticketTextWrap: { flex: 1, gap: 2 },
  ticketTitle: {
    fontFamily: "Inter_700Bold", fontSize: 14, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl",
  },
  ticketSub: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: "#8A7500",
    textAlign: "right", writingDirection: "rtl",
  },

  section: { gap: 10 },
  sectionTitle: {
    fontFamily: "Inter_700Bold", fontSize: 16, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl",
  },
  description: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: "#666",
    textAlign: "right", writingDirection: "rtl", lineHeight: 23,
  },

  review: {
    backgroundColor: "#F8F8F8", borderRadius: 12, padding: 12, gap: 6,
  },
  reviewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stars: { flexDirection: "row", gap: 1 },
  reviewUser: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#1A1A1A", writingDirection: "rtl" },
  reviewComment: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: "#666",
    textAlign: "right", writingDirection: "rtl", lineHeight: 20,
  },

  bottomBar: {
    position: "absolute", bottom: 0, start: 0, end: 0,
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#F0F0F0",
  },
  qtyRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F5F5F5", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 8,
  },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  qtyValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#1A1A1A", minWidth: 20, textAlign: "center" },
  addBtnWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  addBtnText: {
    fontFamily: "Inter_700Bold", fontSize: 14, color: "#1A1A1A",
    textAlign: "center", writingDirection: "rtl",
  },
  addBtnSub: {
    fontFamily: "Inter_500Medium", fontSize: 11, color: "rgba(26,26,26,0.65)",
    textAlign: "center", writingDirection: "rtl",
  },

  inCartPill: {
    position: "absolute", alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1A1A1A", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  inCartText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#fff", writingDirection: "rtl" },
});
