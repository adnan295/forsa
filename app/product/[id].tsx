import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Alert } from "@/lib/alert";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useCart } from "@/lib/cart-context";
import { buildMediaUrl } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Header, Button, ChanceNote } from "@/components/ui";
import type { CurrentDraw } from "@/components/DrawBanner";
import { parseProductSpecs, type Product, type Review } from "@shared/schema";

const c = Colors.light;
const { width: W } = Dimensions.get("window");
const GALLERY_H = 260;

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
  const { addItem, getQuantity } = useCart();

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
  const specs = useMemo(() => parseProductSpecs(product?.specsJson), [product]);

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={s.root}>
        <Header title="تفاصيل المنتج" showBack />
        <View style={s.loading}>
          <Ionicons name="alert-circle-outline" size={44} color={c.textMuted} />
          <Text style={s.notFound}>المنتج غير موجود</Text>
        </View>
      </View>
    );
  }

  const price = parseFloat(product.price);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const maxQty = product.stock === null ? 50 : Math.min(product.stock, 50);
  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;
  const chancesForOne = ticketPrice > 0 ? Math.floor(price / ticketPrice) : 0;
  const chancesForSelection = ticketPrice > 0 ? Math.floor((price * quantity) / ticketPrice) : 0;
  const inCart = getQuantity(product.id);

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  function handleAdd() {
    if (!product || outOfStock) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem(product, quantity);
    Alert.alert("تمت الإضافة", `${quantity} × ${product.name}`, [
      { text: "متابعة التسوق", style: "cancel" },
      { text: "عرض السلة", onPress: () => router.push("/cart" as any) },
    ]);
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="تفاصيل المنتج" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* ───── الصور ───── */}
        <View style={s.gallery}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setImageIndex(Math.round(e.nativeEvent.contentOffset.x / (W - Spacing.screen * 2)))
              }
            >
              {images.map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: buildMediaUrl(img)! }}
                  style={{ width: W - Spacing.screen * 2, height: GALLERY_H }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={s.galleryFallback}>
              <Ionicons name="cube-outline" size={56} color={c.textMuted} />
            </View>
          )}

          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === imageIndex && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ───── الاسم والسعر ───── */}
        <View style={s.titleBlock}>
          <Text style={s.name}>{product.name}</Text>
          <Text style={s.price}>${price.toFixed(0)}</Text>
        </View>

        {/* ───── المواصفات ───── */}
        {specs.length > 0 && (
          <View style={s.card}>
            {specs.map((spec, i) => (
              <View key={i} style={[s.specRow, i > 0 && s.specRowDivided]}>
                <Text style={s.specText}>{spec.text}</Text>
                <Ionicons
                  name={(spec.icon as any) ?? "ellipse"}
                  size={18}
                  color={c.primary}
                  style={s.specIcon}
                />
              </View>
            ))}
          </View>
        )}

        {product.description ? (
          <View style={s.card}>
            <Text style={s.sectionTitle}>الوصف</Text>
            <Text style={s.description}>{product.description}</Text>
          </View>
        ) : null}

        {/* ───── فرص السحب ───── */}
        {chancesForOne > 0 && (
          <ChanceNote>
            {chancesForOne === 1
              ? "فرصة سحب واحدة مع هذا المنتج"
              : `${chancesForOne} فرص سحب مع هذا المنتج`}
          </ChanceNote>
        )}

        <View style={s.confirmNote}>
          <Ionicons name="checkmark-circle" size={17} color={StatusColors.success.fg} />
          <Text style={s.confirmNoteText}>تُفعّل الفرص بعد تأكيد الدفع</Text>
        </View>

        {/* ───── الكمية ───── */}
        {!outOfStock && (
          <View style={s.qtyCard}>
            <View style={s.qtyControls}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setQuantity((q) => Math.max(1, q - 1));
                }}
                style={s.qtyBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="إنقاص الكمية"
              >
                <Ionicons name="remove" size={20} color={c.navy} />
              </Pressable>

              <View style={s.qtyValue}>
                <Text style={s.qtyText}>{quantity}</Text>
              </View>

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setQuantity((q) => Math.min(maxQty, q + 1));
                }}
                style={s.qtyBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="زيادة الكمية"
              >
                <Ionicons name="add" size={20} color={c.navy} />
              </Pressable>
            </View>

            <Text style={s.qtyLabel}>الكمية</Text>
          </View>
        )}

        {/* ───── التقييمات ───── */}
        {reviews && reviews.length > 0 && (
          <View style={s.card}>
            <View style={s.reviewHead}>
              <View style={s.ratingRow}>
                <Text style={s.ratingValue}>{avgRating.toFixed(1)}</Text>
                <Ionicons name="star" size={15} color={c.gold} />
              </View>
              <Text style={s.sectionTitle}>التقييمات ({reviews.length})</Text>
            </View>

            {reviews.slice(0, 5).map((r) => (
              <View key={r.id} style={s.review}>
                <View style={s.reviewTop}>
                  <View style={s.stars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= r.rating ? "star" : "star-outline"}
                        size={12}
                        color={c.gold}
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

        {inCart > 0 && (
          <View style={s.inCartNote}>
            <Ionicons name="cart" size={15} color={StatusColors.info.fg} />
            <Text style={s.inCartText}>عندك {inCart} من هذا المنتج في السلة</Text>
          </View>
        )}
      </ScrollView>

      {/* ───── شريط الإضافة ───── */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Button
          label={
            outOfStock
              ? "غير متوفر"
              : chancesForSelection > 0
              ? `أضف إلى السلة · ${chancesForSelection} فرصة`
              : "أضف إلى السلة"
          }
          icon="cart"
          onPress={handleAdd}
          disabled={outOfStock}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.background,
    gap: Spacing.md,
  },
  notFound: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
  content: { padding: Spacing.screen, paddingBottom: 130, gap: Spacing.md },

  gallery: {
    height: GALLERY_H,
    borderRadius: Radius.card,
    overflow: "hidden",
    backgroundColor: c.surface,
    position: "relative",
  },
  galleryFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  dots: {
    position: "absolute",
    bottom: Spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.65)" },
  dotActive: { backgroundColor: c.primary, width: 18 },

  titleBlock: { gap: Spacing.xs, paddingHorizontal: Spacing.xs },
  name: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h2,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 30,
  },
  price: { fontFamily: Fonts.bold, fontSize: FontSize.h2, color: c.primary, textAlign: "right" },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 23,
  },

  specRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: 2 },
  specRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle,
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
  },
  specIcon: { width: 22, textAlign: "center" },
  specText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.text,
    textAlign: "right",
    writingDirection: "rtl",
  },

  confirmNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: StatusColors.success.bg,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  confirmNoteText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: StatusColors.success.fg,
    textAlign: "right",
    writingDirection: "rtl",
  },

  qtyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.button,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    minWidth: 58,
    height: 38,
    borderRadius: Radius.button,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontFamily: Fonts.bold, fontSize: FontSize.body, color: c.navy },
  qtyLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: c.navy,
    writingDirection: "rtl",
  },

  reviewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingValue: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: c.navy },
  review: {
    backgroundColor: c.background,
    borderRadius: Radius.button,
    padding: Spacing.md,
    gap: 6,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stars: { flexDirection: "row", gap: 1 },
  reviewUser: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
    color: c.navy,
    writingDirection: "rtl",
  },
  reviewComment: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 21,
  },

  inCartNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: StatusColors.info.bg,
    borderRadius: Radius.button,
    padding: Spacing.md,
  },
  inCartText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: StatusColors.info.fg,
    textAlign: "right",
    writingDirection: "rtl",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: c.surface,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
});
