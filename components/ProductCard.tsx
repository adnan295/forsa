import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { buildMediaUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import type { Product } from "@shared/schema";

const c = Colors.light;

interface Props {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  inCartQuantity?: number;
  /** إظهار أيقونة المفضلة فوق الصورة */
  showFavorite?: boolean;
}

/**
 * بطاقة منتج: صورة على خلفية محايدة، اسم داكن، سعر أزرق،
 * وزر ثانوي بخلفية زرقاء فاتحة.
 */
export default function ProductCard({
  product,
  onPress,
  onAddToCart,
  inCartQuantity = 0,
  showFavorite = false,
}: Props) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(product.id);

  const price = parseFloat(product.price);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;
  const imageUri = buildMediaUrl(product.imageUrl);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}، ${price.toFixed(0)} دولار`}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.95 }]}
    >
      <View style={s.imageBox}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={s.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
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
              size={17}
              color={favorited ? StatusColors.error.fg : c.textMuted}
            />
          </Pressable>
        )}

        {(outOfStock || lowStock) && (
          <View
            style={[
              s.stockTag,
              { backgroundColor: outOfStock ? StatusColors.disabled.bg : StatusColors.warning.bg },
            ]}
          >
            <Text
              style={[
                s.stockTagText,
                { color: outOfStock ? StatusColors.disabled.fg : StatusColors.warning.fg },
              ]}
            >
              {outOfStock ? "نفد" : `باقي ${product.stock}`}
            </Text>
          </View>
        )}
      </View>

      <View style={s.body}>
        <Text style={s.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={s.price}>${price.toFixed(0)}</Text>

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
            style={[s.addBtn, outOfStock && s.addBtnOff]}
          >
            <Ionicons
              name={inCartQuantity > 0 ? "checkmark" : "cart-outline"}
              size={16}
              color={outOfStock ? StatusColors.disabled.fg : c.primary}
            />
            <Text style={[s.addBtnText, outOfStock && { color: StatusColors.disabled.fg }]}>
              {outOfStock
                ? "غير متوفر"
                : inCartQuantity > 0
                ? `بالسلة (${inCartQuantity})`
                : "أضف إلى السلة"}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  imageBox: {
    height: 132,
    backgroundColor: c.background,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  favBtn: {
    position: "absolute",
    top: Spacing.sm,
    start: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stockTag: {
    position: "absolute",
    top: Spacing.sm,
    end: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  stockTagText: { fontFamily: Fonts.medium, fontSize: 11, writingDirection: "rtl" },

  body: { padding: Spacing.md, gap: Spacing.sm },
  name: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 21,
    minHeight: 42,
  },
  price: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.body,
    color: c.primary,
    textAlign: "right",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: c.primarySoft,
    borderRadius: Radius.button,
    paddingVertical: 10,
  },
  addBtnOff: { backgroundColor: StatusColors.disabled.bg },
  addBtnText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
    color: c.primary,
    writingDirection: "rtl",
  },
});
