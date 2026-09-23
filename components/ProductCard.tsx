import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Colors, { Fonts, Radius, StatusColors } from "@/constants/colors";
import { buildMediaUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import { useDesignScale } from "@/lib/design-scale";
import { voucherWord } from "@/lib/vouchers";
import { parseProductSpecs, type Product } from "@shared/schema";

const c = Colors.light;

interface Props {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  inCartQuantity?: number;
  /** إظهار أيقونة المفضلة فوق الصورة */
  showFavorite?: boolean;
  /** سعر القسيمة في الجولة الحالية — يُظهر عدد القسائم التي يمنحها المنتج */
  ticketPrice?: number;
  /** وسم «الأكثر مبيعاً» */
  bestSeller?: boolean;
}

/**
 * بطاقة منتج: صورة كبيرة، اسم وسطر مواصفات، سعر بجانبه عدد القسائم،
 * وزر إضافة أساسي بعرض البطاقة.
 */
export default function ProductCard({
  product,
  onPress,
  onAddToCart,
  inCartQuantity = 0,
  showFavorite = false,
  ticketPrice,
  bestSeller = false,
}: Props) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const dp = useDesignScale();
  const favorited = isFavorite(product.id);

  const price = parseFloat(product.price);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;
  const imageUri = buildMediaUrl(product.imageUrl);

  const specs = parseProductSpecs(product.specsJson).slice(0, 2).map((sp) => sp.text).join(" | ");
  // القسائم تُحسب على مجموع الطلب، فهذا ما يضيفه المنتج وحده تقريباً
  const vouchers = ticketPrice && ticketPrice > 0 ? Math.floor(price / ticketPrice) : 0;

  const tag = outOfStock
    ? { text: "نفد", bg: StatusColors.disabled.bg, fg: StatusColors.disabled.fg }
    : bestSeller
    ? { text: "الأكثر مبيعاً", bg: StatusColors.error.fg, fg: c.surface }
    : lowStock
    ? { text: `باقي ${product.stock}`, bg: StatusColors.warning.bg, fg: StatusColors.warning.fg }
    : null;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}، ${price.toFixed(0)} دولار`}
      style={({ pressed }) => [s.card, { paddingHorizontal: dp(12.5), paddingTop: dp(9), paddingBottom: dp(12.5) }, pressed && { opacity: 0.96 }]}
    >
      <View style={s.imageBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.image} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={s.imageFallback}>
            <Ionicons name="cube-outline" size={30} color={c.textMuted} />
          </View>
        )}

        {showFavorite && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavorite(product.id);
            }}
            style={s.favBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={favorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            <Ionicons
              name={favorited ? "heart" : "heart-outline"}
              size={15}
              color={favorited ? StatusColors.error.fg : c.navy}
            />
          </Pressable>
        )}

        {tag && (
          <View style={[s.tag, { backgroundColor: tag.bg }]}>
            <Text style={[s.tagText, { color: tag.fg }]}>{tag.text}</Text>
          </View>
        )}
      </View>

      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>{product.name}</Text>
        {!!specs && <Text style={s.specs} numberOfLines={1}>{specs}</Text>}

        <View style={s.priceRow}>
          {vouchers > 0 ? (
            <View style={[s.voucher, { height: dp(42), minWidth: dp(145) }]}>
              <Text style={s.voucherCount}>+{vouchers}</Text>
              <Text style={s.voucherWord}>{voucherWord(vouchers)}</Text>
              <Ionicons name="ticket" size={12} color={c.goldText} />
            </View>
          ) : (
            <View />
          )}
          <Text style={s.price}>${price.toFixed(0)}</Text>
        </View>

        {onAddToCart && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (outOfStock) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAddToCart();
            }}
            disabled={outOfStock}
            accessibilityRole="button"
            accessibilityState={{ disabled: outOfStock }}
            style={({ pressed }) => [
              s.addBtn,
              { height: dp(55), marginHorizontal: dp(20) - dp(12.5) },
              pressed && !outOfStock && { backgroundColor: c.primaryPressed },
              outOfStock && s.addBtnOff,
            ]}
          >
            <Ionicons
              name={inCartQuantity > 0 ? "checkmark" : "cart-outline"}
              size={15}
              color={outOfStock ? StatusColors.disabled.fg : c.surface}
            />
            <Text style={[s.addBtnText, outOfStock && { color: StatusColors.disabled.fg }]}>
              {outOfStock ? "غير متوفر" : inCartQuantity > 0 ? `بالسلة (${inCartQuantity})` : "أضف إلى السلة"}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// المقاسات النسبية من تصميم الكرت 390 × 365: صورة 365 × 190، شارة 145 × 42، زر 350 × 55
const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    shadowColor: c.navy,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  imageBox: {
    aspectRatio: 365 / 190,
    borderRadius: 10,
    backgroundColor: c.background,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  favBtn: {
    position: "absolute",
    top: 6,
    start: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: c.navy,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tag: {
    position: "absolute",
    top: 6,
    end: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: { fontFamily: Fonts.bold, fontSize: 10, writingDirection: "rtl" },

  body: { paddingTop: 3, gap: 1 },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    lineHeight: 14,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  specs: {
    fontFamily: Fonts.regular,
    fontSize: 9,
    lineHeight: 11,
    color: c.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  price: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 20, color: c.primary, writingDirection: "ltr" },
  voucher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: c.goldSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
  },
  voucherCount: { fontFamily: Fonts.bold, fontSize: 10.5, color: c.goldText, writingDirection: "ltr" },
  voucherWord: { fontFamily: Fonts.bold, fontSize: 10.5, color: c.goldText, writingDirection: "rtl" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: c.primary,
    borderRadius: 8,
    marginTop: 3,
  },
  addBtnOff: { backgroundColor: StatusColors.disabled.bg },
  addBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: c.surface,
    writingDirection: "rtl",
  },
});
