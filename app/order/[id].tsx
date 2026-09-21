import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { queryClient, getApiUrl, buildMediaUrl } from "@/lib/query-client";
import { translateError } from "@/lib/errors";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Header, Button, Card, StatusBadge, InfoNote } from "@/components/ui";
import type { Order, OrderItem, Ticket } from "@shared/schema";

const c = Colors.light;

type OrderDetail = Order & { items: OrderItem[]; tickets: Ticket[] };

/** مراحل الشحن بالترتيب */
const SHIPPING_STEPS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "pending", label: "تم الاستلام", icon: "receipt-outline" },
  { key: "processing", label: "جاري التجهيز", icon: "construct-outline" },
  { key: "shipped", label: "تم الشحن", icon: "airplane-outline" },
  { key: "delivered", label: "تم التسليم", icon: "checkmark-done-outline" },
];

const PAYMENT_STATE: Record<
  string,
  { label: string; kind: "success" | "warning" | "error" | "info" }
> = {
  confirmed: { label: "تم تأكيد الدفع", kind: "success" },
  pending_review: { label: "قيد المراجعة", kind: "warning" },
  pending_payment: { label: "بانتظار الدفع", kind: "warning" },
  rejected: { label: "دفع مرفوض", kind: "error" },
};

/** يضغط الصورة على الويب قبل الرفع لتقليل حجم الطلب */
function compressImageWeb(file: File, maxWidth: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new (window as any).Image() as HTMLImageElement;
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], "receipt.jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.82
      );
    };
    img.src = url;
  });
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["/api/orders", id],
    refetchInterval: 10000,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const url = new URL(`/api/orders/${id}/receipt`, getApiUrl());
      const formData = new FormData();

      if (Platform.OS === "web") {
        if (!selectedFile) throw new Error("لم يتم اختيار ملف");
        formData.append("receipt", selectedFile);
      } else {
        if (!selectedImage) throw new Error("لم يتم اختيار صورة");
        formData.append("receipt", {
          uri: selectedImage,
          name: "receipt.jpg",
          type: "image/jpeg",
        } as any);
      }

      const res = await fetch(url.toString(), {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.text()) || "فشل رفع الإيصال");
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedImage(null);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تعذّر الرفع", translateError(err?.message));
    },
  });

  async function pickImage() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const compressed = await compressImageWeb(file, 1200);
        setSelectedFile(compressed);
        const reader = new FileReader();
        reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
        reader.readAsDataURL(compressed);
      };
      input.click();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });
    if (!result.canceled && result.assets[0]) setSelectedImage(result.assets[0].uri);
  }

  if (isLoading) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="تفاصيل الطلب" showBack />
        <View style={s.loading}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </View>
    );
  }

  if (!order || (user && order.userId !== user.id)) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="تفاصيل الطلب" showBack />
        <View style={s.loading}>
          <Ionicons name="alert-circle-outline" size={44} color={c.textMuted} />
          <Text style={s.notFound}>الطلب غير موجود</Text>
        </View>
      </View>
    );
  }

  const payment = PAYMENT_STATE[order.paymentStatus] ?? {
    label: order.paymentStatus,
    kind: "info" as const,
  };
  const items = order.items ?? [];
  const tickets = order.tickets ?? [];
  const totalPieces = items.reduce((sum, i) => sum + i.quantity, 0);
  const shippingIndex = SHIPPING_STEPS.findIndex((st) => st.key === order.shippingStatus);
  const isCancelled = order.shippingStatus === "cancelled";
  const needsReceipt =
    order.paymentMethod === "bank_transfer" && order.paymentStatus === "pending_payment";
  const receiptUrl = buildMediaUrl(order.receiptUrl);

  const orderDate = new Date(order.createdAt).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="تفاصيل الطلب" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, Spacing.lg) + 24 }]}
      >
        {/* ───── رأس الطلب ───── */}
        <Card>
          <View style={s.headRow}>
            <StatusBadge kind={payment.kind} label={payment.label} />
            <View style={s.headIds}>
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(order.id);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("تم النسخ", "رقم الطلب انتسخ");
                }}
                accessibilityRole="button"
                accessibilityLabel="نسخ رقم الطلب"
                style={s.orderIdBtn}
              >
                <Ionicons name="copy-outline" size={14} color={c.textMuted} />
                <Text style={s.orderId}>#{order.id.slice(0, 8)}</Text>
              </Pressable>
              <Text style={s.orderDate}>{orderDate}</Text>
            </View>
          </View>

          {order.rejectionReason ? (
            <View style={s.rejectBox}>
              <Ionicons name="close-circle" size={17} color={StatusColors.error.fg} />
              <Text style={s.rejectText}>{order.rejectionReason}</Text>
            </View>
          ) : null}
        </Card>

        {/* ───── رفع الإيصال ───── */}
        {needsReceipt && (
          <Card title="رفع إيصال الدفع" icon="cloud-upload-outline">
            <Text style={s.cardBody}>
              حوّل المبلغ ثم ارفع صورة الإيصال حتى نأكّد طلبك ونمنحك فرصك.
            </Text>

            {selectedImage ? (
              <>
                <Pressable onPress={() => setPreviewOpen(true)} style={s.receiptPreview}>
                  <Image source={{ uri: selectedImage }} style={s.receiptImage} contentFit="cover" />
                </Pressable>
                <View style={s.receiptActions}>
                  <Button label="تغيير" variant="secondary" small onPress={pickImage} style={s.flex} />
                  <Button
                    label="رفع الإيصال"
                    small
                    loading={uploadMutation.isPending}
                    onPress={() => uploadMutation.mutate()}
                    style={s.flex}
                  />
                </View>
              </>
            ) : (
              <Pressable onPress={pickImage} style={s.uploadArea} accessibilityRole="button">
                <Ionicons name="camera-outline" size={32} color={c.primary} />
                <Text style={s.uploadTitle}>اختر صورة الإيصال</Text>
                <Text style={s.uploadHint}>صوّرها أو اخترها من المعرض</Text>
              </Pressable>
            )}
          </Card>
        )}

        {receiptUrl && (
          <Card title="الإيصال المرفوع" icon="document-attach-outline">
            <Pressable onPress={() => setPreviewOpen(true)} accessibilityRole="button">
              <Image source={{ uri: receiptUrl }} style={s.receiptImage} contentFit="cover" />
            </Pressable>
          </Card>
        )}

        {/* ───── حالة الشحن ───── */}
        <Card title="حالة الشحن" icon="cube-outline">
          {isCancelled ? (
            <View style={s.rejectBox}>
              <Ionicons name="ban-outline" size={17} color={StatusColors.error.fg} />
              <Text style={s.rejectText}>تم إلغاء هذا الطلب</Text>
            </View>
          ) : (
            SHIPPING_STEPS.map((step, i) => {
              const reached = shippingIndex >= i;
              const isLast = i === SHIPPING_STEPS.length - 1;
              return (
                <View key={step.key} style={s.stepRow}>
                  <View style={s.stepTextCol}>
                    <Text style={[s.stepLabel, reached && s.stepLabelActive]}>{step.label}</Text>
                  </View>

                  <View style={s.stepTrack}>
                    <View style={[s.stepDot, reached && s.stepDotActive]}>
                      <Ionicons
                        name={reached ? "checkmark" : step.icon}
                        size={14}
                        color={reached ? c.surface : c.textMuted}
                      />
                    </View>
                    {!isLast && <View style={[s.stepLine, shippingIndex > i && s.stepLineActive]} />}
                  </View>
                </View>
              );
            })
          )}

          {order.trackingNumber ? (
            <View style={s.trackingRow}>
              <Text style={s.trackingValue}>{order.trackingNumber}</Text>
              <Text style={s.trackingLabel}>رقم التتبّع</Text>
            </View>
          ) : null}
        </Card>

        {/* ───── فرص السحب ───── */}
        <Card title="فرص السحب" icon="ticket-outline">
          {order.paymentStatus !== "confirmed" ? (
            <View style={s.pendingRow}>
              <Ionicons name="time-outline" size={17} color={StatusColors.warning.fg} />
              <Text style={[s.pendingText, { color: StatusColors.warning.fg }]}>
                فرصك بتنمنح تلقائياً بمجرد ما ينتأكّد دفعك
              </Text>
            </View>
          ) : order.ticketsAwarded === 0 ? (
            <View style={s.pendingRow}>
              <Ionicons name="information-circle-outline" size={17} color={c.textMuted} />
              <Text style={s.pendingText}>قيمة هذا الطلب ما وصلت لسعر فرصة كاملة</Text>
            </View>
          ) : (
            <>
              <View style={s.chanceCount}>
                <Text style={s.chanceNum}>{order.ticketsAwarded}</Text>
                <Text style={s.chanceLabel}>
                  {order.ticketsAwarded === 1 ? "فرصة" : "فرصة"} من هذا الطلب
                </Text>
              </View>

              {tickets.length > 0 && (
                <View style={s.chips}>
                  {tickets.slice(0, 15).map((t) => (
                    <View key={t.id} style={[s.chip, t.isWinner && s.chipWinner]}>
                      <Ionicons
                        name={t.isWinner ? "trophy" : "ticket-outline"}
                        size={11}
                        color={t.isWinner ? c.surface : c.goldText}
                      />
                      <Text style={[s.chipText, t.isWinner && { color: c.surface }]}>
                        {t.ticketNumber}
                      </Text>
                    </View>
                  ))}
                  {tickets.length > 15 && (
                    <Text style={s.chipMore}>+{tickets.length - 15} أخرى</Text>
                  )}
                </View>
              )}
            </>
          )}
        </Card>

        {/* ───── ملخص الطلب ───── */}
        <Card title="ملخص الطلب" icon="receipt-outline">
          {items.map((item, i) => (
            <View key={item.id} style={[s.sumRow, i > 0 && s.sumRowDivided]}>
              <Text style={s.sumValue}>${parseFloat(item.lineTotal).toFixed(2)}</Text>
              <Text style={s.sumLabel} numberOfLines={2}>
                {item.productName} × {item.quantity}
              </Text>
            </View>
          ))}

          <View style={s.divider} />

          <View style={s.sumRow}>
            <Text style={s.sumValue}>${parseFloat(order.subtotal).toFixed(2)}</Text>
            <Text style={s.sumLabel}>المجموع الفرعي ({totalPieces} قطعة)</Text>
          </View>

          {parseFloat(order.discountAmount) > 0 && (
            <View style={s.sumRow}>
              <Text style={[s.sumValue, { color: StatusColors.success.fg }]}>
                -${parseFloat(order.discountAmount).toFixed(2)}
              </Text>
              <Text style={s.sumLabel}>
                الخصم {order.couponCode ? `(${order.couponCode})` : ""}
              </Text>
            </View>
          )}

          {parseFloat(order.deliveryFee) > 0 && (
            <View style={s.sumRow}>
              <Text style={s.sumValue}>${parseFloat(order.deliveryFee).toFixed(2)}</Text>
              <Text style={s.sumLabel}>التوصيل</Text>
            </View>
          )}

          {parseFloat(order.walletAmount) > 0 && (
            <View style={s.sumRow}>
              <Text style={[s.sumValue, { color: StatusColors.success.fg }]}>
                -${parseFloat(order.walletAmount).toFixed(2)}
              </Text>
              <Text style={s.sumLabel}>خصم المحفظة</Text>
            </View>
          )}

          <View style={s.divider} />

          <View style={s.sumRow}>
            <Text style={s.grandValue}>${parseFloat(order.totalAmount).toFixed(2)}</Text>
            <Text style={s.grandLabel}>الإجمالي المستحق</Text>
          </View>

          <View style={s.sumRow}>
            <Text style={s.sumValue}>{order.paymentMethod || "—"}</Text>
            <Text style={s.sumLabel}>طريقة الدفع</Text>
          </View>
        </Card>

        {/* ───── عنوان التوصيل ───── */}
        {order.shippingFullName ? (
          <Card title="عنوان التوصيل" icon="location-outline">
            <Text style={s.addressName}>{order.shippingFullName}</Text>
            <Text style={s.addressLine}>{order.shippingPhone}</Text>
            <Text style={s.addressLine}>
              {[order.shippingAddress, order.shippingCity, order.shippingCountry]
                .filter(Boolean)
                .join("، ")}
            </Text>
          </Card>
        ) : null}

        <InfoNote>رسوم التوصيل لا تدخل بحساب فرص السحب</InfoNote>

        <Button
          label="متابعة التسوق"
          variant="secondary"
          icon="storefront-outline"
          onPress={() => router.push("/(tabs)/products" as any)}
        />
      </ScrollView>

      {/* ───── معاينة الإيصال ───── */}
      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setPreviewOpen(false)}>
          <Image
            source={{ uri: selectedImage ?? receiptUrl ?? "" }}
            style={s.modalImage}
            contentFit="contain"
          />
          <View style={s.modalClose}>
            <Ionicons name="close" size={26} color={c.surface} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  notFound: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
  content: { padding: Spacing.screen, gap: Spacing.md },

  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headIds: { alignItems: "flex-end", gap: 2 },
  orderIdBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  orderId: { fontFamily: Fonts.bold, fontSize: FontSize.h3, color: c.navy, writingDirection: "ltr" },
  orderDate: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    writingDirection: "rtl",
  },

  cardBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  rejectBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: StatusColors.error.bg,
    borderRadius: Radius.button,
    padding: Spacing.md,
  },
  rejectText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: StatusColors.error.fg,
    textAlign: "right",
    writingDirection: "rtl",
  },

  uploadArea: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.xl,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    backgroundColor: c.background,
  },
  uploadTitle: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    writingDirection: "rtl",
  },
  uploadHint: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    writingDirection: "rtl",
  },
  receiptPreview: { borderRadius: Radius.card, overflow: "hidden" },
  receiptImage: { width: "100%", height: 200, borderRadius: Radius.card, backgroundColor: c.background },
  receiptActions: { flexDirection: "row", gap: Spacing.md },

  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  stepTrack: { alignItems: "center", width: 30 },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: c.primary },
  stepLine: { width: 2, height: 26, backgroundColor: c.borderSubtle },
  stepLineActive: { backgroundColor: c.primary },
  stepTextCol: { flex: 1, paddingTop: 5 },
  stepLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  stepLabelActive: { fontFamily: Fonts.medium, color: c.navy },

  trackingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.primarySoft,
    borderRadius: Radius.button,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  trackingLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.primary,
    writingDirection: "rtl",
  },
  trackingValue: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: c.navy, writingDirection: "ltr" },

  pendingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  pendingText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 21,
  },
  chanceCount: { flexDirection: "row", alignItems: "baseline", gap: Spacing.sm, justifyContent: "flex-end" },
  chanceNum: { fontFamily: Fonts.bold, fontSize: 30, color: c.primary },
  chanceLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.goldSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.button,
  },
  chipWinner: { backgroundColor: c.gold },
  chipText: { fontFamily: Fonts.medium, fontSize: 10, color: c.goldText, writingDirection: "ltr" },
  chipMore: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.label,
    color: c.textMuted,
    writingDirection: "rtl",
  },

  sumRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md },
  sumRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle,
    paddingTop: Spacing.md,
  },
  sumLabel: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  sumValue: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: c.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  grandLabel: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: FontSize.body,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  grandValue: { fontFamily: Fonts.bold, fontSize: FontSize.h3, color: c.primary },

  addressName: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  addressLine: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 34, 77, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: { width: "92%", height: "76%" },
  modalClose: { position: "absolute", top: 54, end: 20 },
});
