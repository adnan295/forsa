import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Alert } from "@/lib/alert";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { buildMediaUrl } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Header, Button, ChanceNote, InfoNote, EmptyState, NavRow } from "@/components/ui";
import type { CurrentDraw } from "@/components/DrawBanner";
import { DEFAULT_DELIVERY_FEE } from "@shared/schema";

const c = Colors.light;

function CartRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const imageUri = buildMediaUrl(item.imageUrl);
  const atMax = item.maxQuantity !== null && item.quantity >= item.maxQuantity;

  return (
    <View style={s.row}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          removeItem(item.productId);
        }}
        style={s.trashBtn}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`حذف ${item.name}`}
      >
        <Ionicons name="trash-outline" size={19} color={StatusColors.error.fg} />
      </Pressable>

      <View style={s.stepper}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            updateQuantity(item.productId, item.quantity - 1);
          }}
          style={s.stepBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="إنقاص"
        >
          <Ionicons name="remove" size={16} color={c.navy} />
        </Pressable>

        <Text style={s.stepValue}>{item.quantity}</Text>

        <Pressable
          onPress={() => {
            if (atMax) return;
            Haptics.selectionAsync();
            updateQuantity(item.productId, item.quantity + 1);
          }}
          style={[s.stepBtn, atMax && { opacity: 0.4 }]}
          disabled={atMax}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="زيادة"
        >
          <Ionicons name="add" size={16} color={c.navy} />
        </Pressable>
      </View>

      <View style={s.rowInfo}>
        <Text style={s.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={s.rowPrice}>${(item.price * item.quantity).toFixed(0)}</Text>
      </View>

      <View style={s.thumb}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.thumbImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <Ionicons name="cube-outline" size={20} color={c.textMuted} />
        )}
      </View>
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    staleTime: 15000,
  });

  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;
  const deliveryFee = items.length > 0 ? DEFAULT_DELIVERY_FEE : 0;
  const grandTotal = totalPrice + deliveryFee;

  // الفرص تُحتسب على قيمة المنتجات فقط — التوصيل خارجها
  const chances = ticketPrice > 0 ? Math.floor(totalPrice / ticketPrice) : 0;
  const toNextChance = ticketPrice > 0 ? (chances + 1) * ticketPrice - totalPrice : 0;

  const isProfileComplete = !!(
    user?.fullName &&
    user?.phone &&
    user?.address &&
    user?.city &&
    user?.country
  );

  function handleConfirm() {
    if (!user) {
      // على الويب منرجّع المستخدم للدفع بعد الدخول بدل ما يضيع
      router.push({ pathname: "/auth", params: { returnTo: "/checkout" } } as any);
      return;
    }
    if (!isProfileComplete) {
      Alert.alert("أكمل بياناتك", "نحتاج اسمك ورقمك وعنوانك قبل إتمام الطلب", [
        { text: "لاحقاً", style: "cancel" },
        { text: "إكمال الآن", onPress: () => router.push("/edit-profile" as any) },
      ]);
      return;
    }
    router.push("/checkout" as any);
  }

  if (items.length === 0) {
    return (
      <View style={s.root}>
        <Header title="السلة والدفع" showBack />
        <EmptyState
          icon="cart-outline"
          title="سلتك فارغة"
          body="تصفّح المنتجات — كل مشترياتك بتعطيك فرص للسحب"
          action={{ label: "تصفّح المتجر", onPress: () => router.push("/(tabs)/products" as any) }}
        />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Header
        title="السلة والدفع"
        showBack
        right={
          <Pressable
            onPress={() =>
              Alert.alert("تفريغ السلة", "حذف جميع المنتجات من السلة؟", [
                { text: "إلغاء", style: "cancel" },
                {
                  text: "حذف الكل",
                  style: "destructive",
                  onPress: () => {
                    clearCart();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  },
                },
              ])
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="تفريغ السلة"
            style={s.headerBtn}
          >
            <Ionicons name="trash-outline" size={21} color={c.textMuted} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.card}>
          {items.map((item, i) => (
            <View key={item.productId} style={i > 0 ? s.rowDivided : undefined}>
              <CartRow item={item} />
            </View>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.totalRow}>
            <Text style={s.totalValue}>${totalPrice.toFixed(0)}</Text>
            <Text style={s.totalLabel}>مجموع المنتجات</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalValue}>${deliveryFee.toFixed(0)}</Text>
            <Text style={s.totalLabel}>التوصيل</Text>
          </View>
          <View style={s.divider} />
          <View style={s.totalRow}>
            <Text style={s.grandValue}>${grandTotal.toFixed(0)}</Text>
            <Text style={s.grandLabel}>المجموع الكلي</Text>
          </View>
        </View>

        {ticketPrice > 0 && (
          <ChanceNote>
            {chances > 0
              ? `ستحصل على ${chances === 1 ? "فرصة واحدة" : chances === 2 ? "فرصتين" : `${chances} فرص`}`
              : `ضيف ${toNextChance.toFixed(0)}$ كمان وبتحصل على أول فرصة`}
          </ChanceNote>
        )}

        <InfoNote>التوصيل لا يدخل بحساب الفرص</InfoNote>

        <NavRow
          icon="location-outline"
          title="عنوان التوصيل"
          subtitle={
            isProfileComplete
              ? `${user?.city} — ${user?.address}`
              : "لم يتم إدخال العنوان بعد"
          }
          onPress={() => router.push("/edit-profile" as any)}
        />

        <NavRow
          icon="card-outline"
          title="طريقة الدفع"
          subtitle="تُختار في الخطوة التالية"
          onPress={handleConfirm}
        />
      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Button label="تأكيد الطلب" onPress={handleConfirm} testID="confirm-order" />
        <View style={s.footerNote}>
          <Ionicons name="information-circle-outline" size={14} color={c.textMuted} />
          <Text style={s.footerNoteText}>تُفعّل الفرص بعد تأكيد الدفع والطلب</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  headerBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  content: { padding: Spacing.screen, paddingBottom: 150, gap: Spacing.md },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },

  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  rowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle,
    paddingTop: Spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.button,
    backgroundColor: c.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  rowInfo: { flex: 1, gap: 2 },
  rowName: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  rowPrice: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: c.primary, textAlign: "right" },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.background,
    borderRadius: Radius.button,
    padding: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    minWidth: 20,
    textAlign: "center",
    fontFamily: Fonts.bold,
    fontSize: FontSize.caption,
    color: c.navy,
  },
  trashBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },

  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
  totalValue: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: c.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  grandLabel: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.body,
    color: c.navy,
    writingDirection: "rtl",
  },
  grandValue: { fontFamily: Fonts.bold, fontSize: FontSize.h3, color: c.primary },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: c.surface,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  footerNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  footerNoteText: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    writingDirection: "rtl",
  },
});
