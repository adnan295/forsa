import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
  FlatList,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useCart, CartItem } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { buildMediaUrl } from "@/lib/query-client";

function formatImageUrl(url: string) {
  return buildMediaUrl(url) ?? url;
}

function CartItemCard({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        <View style={styles.itemImageWrap}>
          {item.imageUrl ? (
            <Image
              source={{ uri: formatImageUrl(item.imageUrl) }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Ionicons name="cube-outline" size={28} color={Colors.light.accentLight} />
            </View>
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          {item.productName && (
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.accent, textAlign: "right", writingDirection: "rtl" as const, marginBottom: 2 }}>{item.productName}</Text>
          )}
          <View style={styles.itemPrizeRow}>
            <Ionicons name="trophy" size={12} color="#A78BFA" />
            <Text style={styles.itemPrize} numberOfLines={1}>{item.prizeName}</Text>
          </View>
          <Text style={styles.itemPrice}>{item.price.toFixed(2)} $</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            removeItem(item.campaignId, item.productId);
          }}
          style={styles.removeBtn}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.light.danger} />
        </Pressable>
      </View>
      <View style={styles.qtyRow}>
        <Text style={styles.itemSubtotal}>{(item.price * item.quantity).toFixed(2)} $</Text>
        <View style={styles.qtyControls}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateQuantity(item.campaignId, item.quantity - 1, item.productId);
            }}
            style={styles.qtyBtn}
          >
            <Ionicons name="remove" size={18} color={item.quantity <= 1 ? Colors.light.border : Colors.light.text} />
          </Pressable>
          <View style={styles.qtyValue}>
            <Text style={styles.qtyText}>{item.quantity}</Text>
          </View>
          <Pressable
            onPress={() => {
              if (item.quantity < item.maxQuantity) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateQuantity(item.campaignId, item.quantity + 1, item.productId);
              }
            }}
            style={[styles.qtyBtn, item.quantity >= item.maxQuantity && { opacity: 0.4 }]}
            disabled={item.quantity >= item.maxQuantity}
          >
            <Ionicons name="add" size={18} color={item.quantity >= item.maxQuantity ? Colors.light.border : Colors.light.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const checkoutScale = useSharedValue(1);
  const checkoutAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkoutScale.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7C3AED", "#A855F7", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>سلة المشتريات</Text>
        {items.length > 0 ? (
          <Pressable
            onPress={() => {
              Alert.alert("تفريغ السلة", "هل تريد حذف جميع المنتجات من السلة؟", [
                { text: "إلغاء", style: "cancel" },
                {
                  text: "حذف الكل",
                  style: "destructive",
                  onPress: () => {
                    clearCart();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  },
                },
              ]);
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </LinearGradient>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={56} color={Colors.light.accentLight} />
          </View>
          <Text style={styles.emptyTitle}>سلتك فارغة</Text>
          <Text style={styles.emptySubtitle}>تصفح الحملات وأضف المنتجات التي تعجبك</Text>
          <Pressable
            onPress={() => router.push("/(tabs)")}
            style={styles.browseBtn}
          >
            <LinearGradient
              colors={[Colors.light.accent, Colors.light.accentDark]}
              style={styles.browseBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="flame" size={20} color="#fff" />
              <Text style={styles.browseBtnText}>تصفح الحملات</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.productId ? `${item.campaignId}:${item.productId}` : item.campaignId}
            renderItem={({ item }) => <CartItemCard item={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!!items.length}
          />
          <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16) }]}>
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)", "#FFFFFF"]}
              style={styles.bottomGradient}
            />
            <View style={styles.bottomSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>{totalItems}</Text>
                <Text style={styles.summaryLabel}>عدد المنتجات</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>{totalPrice.toFixed(2)} $</Text>
                <Text style={styles.summaryLabel}>الإجمالي</Text>
              </View>
            </View>
            <Animated.View style={checkoutAnimStyle}>
              <Pressable
                onPressIn={() => { checkoutScale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
                onPressOut={() => { checkoutScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                onPress={() => {
                  if (!user) {
                    router.push("/auth");
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({ pathname: "/checkout", params: { fromCart: "true" } } as any);
                }}
                style={styles.checkoutBtn}
              >
                <LinearGradient
                  colors={[Colors.light.accent, Colors.light.accentDark]}
                  style={styles.checkoutBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="bag-check" size={22} color="#fff" />
                  <Text style={styles.checkoutBtnText}>إتمام الشراء</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(124,58,237,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
    writingDirection: "rtl",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 24,
    marginBottom: 28,
  },
  browseBtn: {
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
  },
  browseBtnGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  browseBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#fff",
    writingDirection: "rtl",
  },
  list: {
    padding: 16,
    paddingBottom: 200,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  itemRow: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  itemImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.light.progressBg,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  itemPrizeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  itemPrize: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#A78BFA",
    writingDirection: "rtl",
    flex: 1,
  },
  itemPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.accent,
    textAlign: "right",
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.light.progressBg,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    width: 40,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.accent + "20",
  },
  qtyText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.accent,
  },
  itemSubtotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.text,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bottomGradient: {
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    height: 30,
  },
  bottomSummary: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  summaryRow: {
    alignItems: "center",
    gap: 2,
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  summaryValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.light.border,
  },
  summaryTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.accent,
  },
  checkoutBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  checkoutBtnGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  checkoutBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
    writingDirection: "rtl",
  },
});
