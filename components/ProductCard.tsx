import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { buildMediaUrl } from "@/lib/query-client";
import { useFavorites } from "@/lib/favorites-context";
import type { Product } from "@shared/schema";

interface Props {
  product: Product;
  /** سعر التذكرة بالجولة الحالية — لعرض كم تذكرة بيعطي المنتج */
  ticketPrice?: number;
  onPress: () => void;
  onAddToCart?: () => void;
  inCartQuantity?: number;
  index?: number;
}

export default function ProductCard({
  product,
  ticketPrice,
  onPress,
  onAddToCart,
  inCartQuantity = 0,
  index = 0,
}: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const entranceOpacity = useSharedValue(0);
  const entranceTranslateY = useSharedValue(24);
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(product.id);

  useEffect(() => {
    const delay = Math.min(index * 70, 350);
    entranceOpacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    entranceTranslateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: entranceTranslateY.value }],
    opacity: entranceOpacity.value,
  }));

  const price = parseFloat(product.price);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;
  const ticketsFromProduct =
    ticketPrice && ticketPrice > 0 ? Math.floor(price / ticketPrice) : 0;

  const imageUri = buildMediaUrl(product.imageUrl);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        <View style={styles.imageArea}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imagePlaceholder}
            >
              <View style={[styles.patternCircle, { width: 120, height: 120, top: -30, end: -20 }]} />
              <View style={[styles.patternCircle, { width: 80, height: 80, bottom: -20, start: -10 }]} />
              <View style={styles.placeholderIcon}>
                <Ionicons name="cube-outline" size={34} color="#FFFFFF" />
              </View>
            </LinearGradient>
          )}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={styles.imageOverlay}
            pointerEvents="none"
          />

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavorite(product.id);
            }}
            style={styles.favoriteButton}
            hitSlop={8}
          >
            <Ionicons
              name={favorited ? "heart" : "heart-outline"}
              size={19}
              color={favorited ? "#EF4444" : "#FFFFFF"}
            />
          </Pressable>

          {(outOfStock || lowStock) && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: outOfStock ? colors.danger : colors.warning },
              ]}
            >
              <Ionicons
                name={outOfStock ? "close-circle" : "alert-circle"}
                size={13}
                color="#FFFFFF"
              />
              <Text style={styles.statusText}>
                {outOfStock ? "نفدت الكمية" : `باقي ${product.stock}`}
              </Text>
            </View>
          )}

          <View style={styles.priceTag}>
            <Text style={styles.priceTagValue}>{price.toFixed(0)}</Text>
            <Text style={styles.priceCurrency}>$</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>

          {ticketsFromProduct > 0 && (
            <View style={styles.ticketRow}>
              <View style={[styles.ticketIconWrap, { backgroundColor: `${colors.accent}22` }]}>
                <Ionicons name="ticket" size={15} color={colors.accentDark} />
              </View>
              <Text style={[styles.ticketText, { color: colors.textSecondary }]}>
                بيعطيك <Text style={{ color: colors.accentDark, fontFamily: "Inter_700Bold" }}>
                  {ticketsFromProduct} تذكرة
                </Text> للسحب
              </Text>
            </View>
          )}

          {onAddToCart && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                if (outOfStock) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAddToCart();
              }}
              disabled={outOfStock}
              style={[styles.ctaButton, outOfStock && styles.ctaDisabled]}
            >
              <LinearGradient
                colors={
                  outOfStock
                    ? [colors.border, colors.border]
                    : [colors.accent, colors.accentDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Ionicons
                  name={inCartQuantity > 0 ? "checkmark-circle" : "cart"}
                  size={17}
                  color={outOfStock ? colors.textSecondary : "#1A1A1A"}
                />
                <Text
                  style={[
                    styles.ctaText,
                    { color: outOfStock ? colors.textSecondary : "#1A1A1A" },
                  ]}
                >
                  {outOfStock
                    ? "غير متوفر"
                    : inCartQuantity > 0
                    ? `بالسلة (${inCartQuantity})`
                    : "أضف للسلة"}
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  imageArea: {
    height: 190,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    end: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    start: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  priceTag: {
    position: "absolute",
    bottom: 12,
    start: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    backgroundColor: "#FFD000",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  priceTagValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#1A1A1A",
  },
  priceCurrency: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#1A1A1A",
    marginBottom: 2,
  },
  content: {
    padding: 16,
    paddingTop: 14,
    gap: 10,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticketIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ticketText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  ctaButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 2,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    writingDirection: "rtl",
  },
});
