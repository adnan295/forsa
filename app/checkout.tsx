import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Image,
} from "react-native";
import { Alert } from "@/lib/alert";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { apiRequest, queryClient, buildMediaUrl, getApiUrl } from "@/lib/query-client";
import type { PaymentMethod } from "@shared/schema";
import type { CurrentDraw } from "@/components/DrawBanner";
import { registerForPushNotifications } from "@/lib/push-notifications";

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  card: "card-outline",
  cash: "cash-outline",
  wallet: "wallet-outline",
};

function getPaymentIcon(icon: string): keyof typeof Ionicons.glyphMap {
  return iconMap[icon] || "ellipse-outline";
}

function requiresReceiptUpload(method: PaymentMethod): boolean {
  if (method.imageUrl) return true;
  if (method.iban) return true;
  const name = (method.name + " " + (method.nameAr || "")).toLowerCase();
  return name.includes("bank") || name.includes("تحويل") || name.includes("حوالة") || name.includes("sham") || name.includes("شام") || name.includes("cash");
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();

  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [useWallet, setUseWallet] = useState(false);

  const [shippingFullName, setShippingFullName] = useState(user?.fullName || "");
  const [shippingPhone, setShippingPhone] = useState(user?.phone || "");
  const [shippingCity, setShippingCity] = useState(user?.city || "");
  const [shippingAddress, setShippingAddress] = useState(user?.address || "");
  const [shippingCountry, setShippingCountry] = useState(user?.country || "السعودية");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<any>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [uploadRetryPending, setUploadRetryPending] = useState(false);

  const isProfileComplete = !!(user?.fullName && user?.phone && user?.address && user?.city && user?.country);

  const compressImageWeb = (file: File, maxWidth: number): Promise<File> => {
    return new Promise((resolve) => {
      const img = new (window as any).Image() as HTMLImageElement;
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], "receipt.jpg", { type: "image/jpeg" }) : file);
        }, "image/jpeg", 0.82);
      };
      img.src = url;
    });
  };

  const pickReceiptImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const compressed = await compressImageWeb(file, 1200);
          setReceiptFile(compressed);
          const reader = new FileReader();
          reader.onload = (ev) => setReceiptImage(ev.target?.result as string);
          reader.readAsDataURL(compressed);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82 });
      if (!result.canceled && result.assets[0]) setReceiptImage(result.assets[0].uri);
    }
  };

  const handleRetryUpload = async (orderId: string) => {
    if (!receiptImage) return;
    setUploadRetryPending(true);
    try {
      await uploadReceiptToOrder(orderId, receiptImage, receiptFile);
      setPendingOrderId(null);
      router.replace(`/order/${orderId}` as any);
    } catch (e: any) {
      const msg = e.message || "فشل رفع الوصل";
      Alert.alert("خطأ في رفع الوصل", msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    } finally {
      setUploadRetryPending(false);
    }
  };

  const uploadReceiptToOrder = async (orderId: string, imgUri: string, file: any): Promise<boolean> => {
    const baseUrl = getApiUrl();
    const url = new URL(`/api/orders/${orderId}/receipt`, baseUrl);
    const formData = new FormData();
    if (Platform.OS === "web") {
      if (file) formData.append("receipt", file);
    } else {
      formData.append("receipt", { uri: imgUri, name: "receipt.jpg", type: "image/jpeg" } as any);
    }
    const res = await fetch(url.toString(), { method: "POST", body: formData, credentials: "include" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "فشل رفع الوصل");
    }
    return true;
  };

  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    staleTime: 15000,
  });

  const { data: paymentMethods, isLoading: methodsLoading } = useQuery<
    PaymentMethod[]
  >({
    queryKey: ["/api/payment-methods"],
  });

  const { data: walletData } = useQuery<{ balance: number; transactions: any[] }>({
    queryKey: ["/api/user/wallet"],
    enabled: !!user,
  });

  const selectedMethod =
    paymentMethods?.find((m) => m.id === selectedMethodId) || null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const discountAmount = appliedCoupon
    ? (subtotal * appliedCoupon.discountPercent) / 100
    : 0;
  const walletBalance = walletData?.balance ? parseFloat(String(walletData.balance)) : 0;
  const afterCoupon = subtotal - discountAmount;
  const walletDeduction = useWallet ? Math.min(walletBalance, afterCoupon) : 0;
  const total = afterCoupon - walletDeduction;

  // التذاكر بتنحسب على قيمة البضاعة بعد الخصم، قبل خصم المحفظة
  const ticketPrice = draw ? parseFloat(draw.ticketPrice) : 0;
  const expectedTickets = ticketPrice > 0 ? Math.floor(afterCoupon / ticketPrice) : 0;

  const couponMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/validate-coupon", {
        code: couponCode.trim(),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAppliedCoupon({
        code: couponCode.trim(),
        discountPercent: data.discountPercent,
      });
      setCouponError("");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setAppliedCoupon(null);
      const msg = err.message || "كود غير صالح";
      setCouponError(msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkout", {
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: selectedMethod?.name,
        shippingFullName,
        shippingPhone,
        shippingCity,
        shippingAddress,
        shippingCountry,
        couponCode: appliedCoupon?.code || undefined,
        useWallet,
      });
      return res.json();
    },
    onSuccess: async (data: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/wallet"] });

      if (Platform.OS !== "web") {
        registerForPushNotifications().catch(() => {});
      }

      const orderId = data.order?.id;
      clearCart();

      if (receiptImage && orderId) {
        try {
          await uploadReceiptToOrder(orderId, receiptImage, receiptFile);
        } catch {
          setPendingOrderId(orderId);
          return;
        }
      }

      const ticketCount = data.expectedTickets ?? 0;
      Alert.alert(
        "تم استلام طلبك",
        ticketCount > 0
          ? `رح تحصل على ${ticketCount} ${ticketCount === 1 ? "تذكرة" : "تذكرة"} للسحب بمجرد تأكيد دفعتك.`
          : "طلبك قيد المراجعة وسيتم تأكيده قريباً.",
        [{ text: "تتبّع الطلب", onPress: () => router.replace(`/order/${orderId}` as any) }]
      );
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err.message || "فشلت عملية الشراء";
      Alert.alert("خطأ", msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    },
  });

  function handlePlaceOrder() {
    if (!selectedMethod) {
      Alert.alert("تنبيه", "يرجى اختيار طريقة الدفع");
      return;
    }
    if (
      !shippingFullName.trim() ||
      !shippingPhone.trim() ||
      !shippingCity.trim() ||
      !shippingAddress.trim() ||
      !shippingCountry.trim()
    ) {
      Alert.alert("تنبيه", "يرجى تعبئة جميع حقول الشحن");
      return;
    }
    if (selectedMethod && requiresReceiptUpload(selectedMethod) && !receiptImage) {
      Alert.alert("تنبيه", "يرجى رفع وصل الدفع قبل تأكيد الطلب");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    purchaseMutation.mutate();
  }

  if (methodsLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="cart-outline" size={48} color={Colors.light.textSecondary} />
        <Text style={styles.errorText}>السلة فارغة</Text>
      </View>
    );
  }

  if (!isProfileComplete) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#0B2142", "#164A9E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.header,
            { paddingTop: Platform.OS === "web" ? 67 : insets.top },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>إتمام الشراء</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Ionicons name="person-circle-outline" size={44} color={Colors.light.danger} />
          </View>
          <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 20, color: Colors.light.text, textAlign: "center", writingDirection: "rtl", marginBottom: 8 }}>
            أكمل ملفك الشخصي أولاً
          </Text>
          <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 15, color: Colors.light.textSecondary, textAlign: "center", writingDirection: "rtl", lineHeight: 24, marginBottom: 24 }}>
            يجب إكمال بياناتك الشخصية (الاسم، الهاتف، العنوان) قبل إتمام عملية الشراء
          </Text>
          <Pressable
            onPress={() => router.push("/edit-profile" as any)}
            style={{ borderRadius: 16, overflow: "hidden", width: "100%" }}
          >
            <LinearGradient
              colors={[Colors.light.accent, Colors.light.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: "center", borderRadius: 16 }}
            >
              <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#FFFFFF", writingDirection: "rtl" }}>
                إكمال الملف الشخصي
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0B2142", "#164A9E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>إتمام الشراء</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={20} color={Colors.light.accent} />
              <Text style={styles.sectionTitle}>ملخص الطلب</Text>
            </View>
            <View style={styles.divider} />
            {cartItems.map((item) => (
              <View key={item.productId} style={styles.cartItemRow}>
                <Text style={styles.cartItemPrice}>{(item.price * item.quantity).toFixed(2)} $</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <Text style={styles.summaryLabel}>{item.quantity} × {item.price.toFixed(2)} $</Text>
                </View>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.subtotalValue}>
                {subtotal.toFixed(2)} $
              </Text>
              <Text style={styles.subtotalLabel}>المجموع الفرعي ({totalItemCount} قطعة)</Text>
            </View>
          </View>

          {draw && (
            <View style={styles.ticketCard}>
              <View style={styles.ticketIconWrap}>
                <Ionicons name="ticket" size={20} color="#0B2142" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketCardTitle}>
                  {expectedTickets > 0
                    ? `${expectedTickets} ${expectedTickets === 1 ? "تذكرة" : "تذكرة"} لجولة "${draw.prizeName}"`
                    : `لسا ما وصلت لأول تذكرة`}
                </Text>
                <Text style={styles.ticketCardSub}>
                  كل {ticketPrice.toFixed(0)}$ = تذكرة · بتنمنح بعد تأكيد الدفع
                </Text>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color={Colors.light.accent} />
              <Text style={styles.sectionTitle}>طريقة الدفع</Text>
            </View>
            <View style={styles.divider} />
            {paymentMethods?.filter((m) => m.enabled).map((method) => {
              const isSelected = selectedMethodId === method.id;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => {
                    if (selectedMethodId !== method.id) {
                      setReceiptImage(null);
                      setReceiptFile(null);
                    }
                    setSelectedMethodId(method.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.paymentCard,
                    isSelected && styles.paymentCardSelected,
                  ]}
                >
                  <View style={styles.paymentCardInner}>
                    <View style={styles.paymentLeft}>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={Colors.light.accent}
                        />
                      )}
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text
                        style={[
                          styles.paymentName,
                          isSelected && { color: Colors.light.accent },
                        ]}
                      >
                        {method.nameAr}
                      </Text>
                      {method.description && (
                        <Text style={styles.paymentDesc}>
                          {method.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.paymentIconWrap}>
                      <Ionicons
                        name={getPaymentIcon(method.icon)}
                        size={26}
                        color={
                          isSelected
                            ? Colors.light.accent
                            : Colors.light.textSecondary
                        }
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {selectedMethod && requiresReceiptUpload(selectedMethod) && (
              <View style={styles.bankDetails}>
                <View style={styles.bankHeader}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={Colors.light.accent}
                  />
                  <Text style={styles.bankHeaderText}>تفاصيل الدفع</Text>
                </View>
                {selectedMethod.imageUrl && (
                  <View style={styles.payImageContainer}>
                    <Image
                      source={{ uri: buildMediaUrl(selectedMethod.imageUrl)! }}
                      style={styles.payImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.payImageCaption}>
                      امسح الكود أو استخدم البيانات أدناه للدفع
                    </Text>
                  </View>
                )}
                {(selectedMethod.bankName || selectedMethod.accountName || selectedMethod.iban) ? (
                  <>
                    {selectedMethod.bankName && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankValue}>
                          {selectedMethod.bankName}
                        </Text>
                        <Text style={styles.bankLabel}>البنك / الخدمة</Text>
                      </View>
                    )}
                    {selectedMethod.accountName && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankValue}>
                          {selectedMethod.accountName}
                        </Text>
                        <Text style={styles.bankLabel}>اسم صاحب الحساب</Text>
                      </View>
                    )}
                    {selectedMethod.iban && (
                      <View style={styles.bankRow}>
                        <Text style={[styles.bankValue, { fontSize: 13 }]}>
                          {selectedMethod.iban}
                        </Text>
                        <Text style={styles.bankLabel}>رقم الحساب / IBAN</Text>
                      </View>
                    )}
                  </>
                ) : !selectedMethod.imageUrl ? (
                  <View style={{ paddingVertical: 12, alignItems: "center" }}>
                    <Ionicons name="alert-circle" size={28} color={Colors.light.warning} />
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.warning, textAlign: "center", writingDirection: "rtl", marginTop: 8 }}>
                      بيانات الحساب غير متوفرة حالياً
                    </Text>
                    <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "center", writingDirection: "rtl", marginTop: 4 }}>
                      يرجى التواصل مع الإدارة للحصول على بيانات الدفع
                    </Text>
                  </View>
                ) : null}
                {selectedMethod.description ? (
                  <View style={styles.bankNote}>
                    <Ionicons name="document-text-outline" size={16} color={Colors.light.accent} />
                    <Text style={[styles.bankNoteText, { color: Colors.light.text }]}>
                      {selectedMethod.description}
                    </Text>
                  </View>
                ) : null}
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Ionicons name="cloud-upload-outline" size={18} color={Colors.light.accent} />
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.text, writingDirection: "rtl" }}>
                      رفع وصل الدفع <Text style={{ color: Colors.light.danger }}>*</Text>
                    </Text>
                  </View>
                  {!receiptImage ? (
                    <Pressable onPress={pickReceiptImage} style={styles.uploadArea}>
                      <Ionicons name="camera-outline" size={36} color={Colors.light.accent} />
                      <Text style={styles.uploadTitle}>اختر صورة الوصل</Text>
                      <Text style={styles.uploadSubtitle}>التقط صورة أو اختر من المعرض</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: receiptImage }} style={styles.previewImage} resizeMode="cover" />
                      <View style={styles.previewActions}>
                        <Pressable onPress={pickReceiptImage} style={styles.previewChangeBtn}>
                          <Ionicons name="refresh" size={16} color={Colors.light.textSecondary} />
                          <Text style={styles.previewChangeText}>تغيير</Text>
                        </Pressable>
                        <Pressable onPress={() => { setReceiptImage(null); setReceiptFile(null); }} style={styles.previewChangeBtn}>
                          <Ionicons name="trash" size={16} color={Colors.light.danger} />
                        </Pressable>
                      </View>
                    </View>
                  )}
                  {!receiptImage && (
                    <View style={[styles.bankNote, { marginTop: 8 }]}>
                      <Ionicons name="alert-circle-outline" size={15} color={Colors.light.warning} />
                      <Text style={styles.bankNoteText}>يجب رفع وصل الدفع لإتمام الطلب</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag-outline" size={20} color={Colors.light.accent} />
              <Text style={styles.sectionTitle}>كود الخصم</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.couponRow}>
              <Pressable
                onPress={() => {
                  if (couponCode.trim()) couponMutation.mutate();
                }}
                disabled={couponMutation.isPending || !couponCode.trim()}
                style={[
                  styles.couponBtn,
                  (!couponCode.trim() || couponMutation.isPending) && {
                    opacity: 0.5,
                  },
                ]}
              >
                {couponMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.couponBtnText}>تطبيق</Text>
                )}
              </Pressable>
              <TextInput
                textContentType="none"
                style={styles.couponInput}
                placeholder="أدخل كود الخصم"
                placeholderTextColor={Colors.light.textSecondary}
                value={couponCode}
                onChangeText={(text) => {
                  setCouponCode(text);
                  if (couponError) setCouponError("");
                }}
                autoCapitalize="characters"
              />
            </View>
            {appliedCoupon && (
              <View style={styles.couponSuccess}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={Colors.light.success}
                />
                <Text style={styles.couponSuccessText}>
                  تم تطبيق خصم {appliedCoupon.discountPercent}% (-{discountAmount.toFixed(2)} $)
                </Text>
              </View>
            )}
            {couponError ? (
              <View style={styles.couponErrorWrap}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.light.danger}
                />
                <Text style={styles.couponErrorText}>{couponError}</Text>
              </View>
            ) : null}
          </View>

          {walletBalance > 0 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="wallet-outline" size={20} color="#067647" />
                <Text style={styles.sectionTitle}>المحفظة</Text>
              </View>
              <View style={styles.divider} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(16,185,129,0.1)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="wallet" size={20} color="#067647" />
                  </View>
                  <View>
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl" as const }}>
                      استخدام رصيد المحفظة
                    </Text>
                    <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 13, color: "#067647", textAlign: "right", writingDirection: "rtl" as const }}>
                      الرصيد: {walletBalance.toFixed(2)} $
                    </Text>
                    {useWallet && walletDeduction > 0 && (
                      <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#067647", textAlign: "right", writingDirection: "rtl" as const }}>
                        خصم: -{walletDeduction.toFixed(2)} $
                      </Text>
                    )}
                  </View>
                </View>
                <Switch
                  value={useWallet}
                  onValueChange={(v) => {
                    setUseWallet(v);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ true: "#067647" }}
                />
              </View>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color={Colors.light.accent} />
              <Text style={styles.sectionTitle}>عنوان الشحن</Text>
            </View>
            <View style={styles.divider} />

            <Text style={styles.inputLabel}>الاسم الكامل</Text>
            <TextInput
                textContentType="none"
              style={styles.input}
              placeholder="الاسم الكامل"
              placeholderTextColor={Colors.light.textSecondary}
              value={shippingFullName}
              onChangeText={setShippingFullName}
            />

            <Text style={styles.inputLabel}>رقم الهاتف</Text>
            <TextInput
                textContentType="none"
              style={styles.input}
              placeholder="رقم الهاتف"
              placeholderTextColor={Colors.light.textSecondary}
              value={shippingPhone}
              onChangeText={setShippingPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>المدينة</Text>
            <TextInput
                textContentType="none"
              style={styles.input}
              placeholder="المدينة"
              placeholderTextColor={Colors.light.textSecondary}
              value={shippingCity}
              onChangeText={setShippingCity}
            />

            <Text style={styles.inputLabel}>العنوان التفصيلي</Text>
            <TextInput
                textContentType="none"
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              placeholder="العنوان التفصيلي"
              placeholderTextColor={Colors.light.textSecondary}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>الدولة</Text>
            <TextInput
                textContentType="none"
              style={styles.input}
              placeholder="الدولة"
              placeholderTextColor={Colors.light.textSecondary}
              value={shippingCountry}
              onChangeText={setShippingCountry}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calculator-outline" size={20} color={Colors.light.accent} />
              <Text style={styles.sectionTitle}>ملخص السعر</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalRowValue}>
                {subtotal.toFixed(2)} $
              </Text>
              <Text style={styles.totalRowLabel}>المجموع الفرعي</Text>
            </View>
            {appliedCoupon && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalRowValue, { color: Colors.light.success }]}>
                  -{discountAmount.toFixed(2)} $
                </Text>
                <Text style={styles.totalRowLabel}>خصم الكوبون</Text>
              </View>
            )}
            {useWallet && walletDeduction > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalRowValue, { color: "#067647" }]}>
                  -{walletDeduction.toFixed(2)} $
                </Text>
                <Text style={styles.totalRowLabel}>خصم المحفظة 💳</Text>
              </View>
            )}
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.grandTotal}>{total.toFixed(2)} $</Text>
              <Text style={styles.grandTotalLabel}>الإجمالي المستحق</Text>
            </View>
            {draw && expectedTickets > 0 && (
              <View style={[styles.totalRow, { marginTop: 6 }]}>
                <Text style={[styles.totalRowValue, { color: Colors.light.accentDark }]}>
                  {expectedTickets} تذكرة
                </Text>
                <Text style={styles.totalRowLabel}>تذاكر السحب 🎟️</Text>
              </View>
            )}
          </View>

          {pendingOrderId && (
            <View style={styles.retryUploadCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Ionicons name="warning-outline" size={20} color={Colors.light.warning} />
                <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 14, color: Colors.light.warning, writingDirection: "rtl", flex: 1 }}>
                  تم إنشاء طلبك لكن فشل رفع الوصل
                </Text>
              </View>
              <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginBottom: 12 }}>
                يرجى تغيير الصورة إن لزم ثم اضغط «إعادة رفع الوصل»
              </Text>
              <Pressable
                onPress={() => handleRetryUpload(pendingOrderId)}
                disabled={uploadRetryPending || !receiptImage}
                style={[styles.retryUploadBtn, (uploadRetryPending || !receiptImage) && { opacity: 0.5 }]}
              >
                {uploadRetryPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="#fff" />
                    <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#fff", writingDirection: "rtl" }}>إعادة رفع الوصل</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          <Animated.View style={[submitAnimStyle, pendingOrderId ? { opacity: 0.4 } : {}]}>
            <Pressable
              onPressIn={() => { submitScale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
              onPressOut={() => { submitScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
              onPress={handlePlaceOrder}
              disabled={purchaseMutation.isPending || !!(selectedMethod && requiresReceiptUpload(selectedMethod) && !receiptImage) || !!pendingOrderId}
              style={[
                styles.placeOrderBtn,
                (purchaseMutation.isPending || !!(selectedMethod && requiresReceiptUpload(selectedMethod) && !receiptImage) || !!pendingOrderId) && { opacity: 0.5 },
              ]}
            >
              <LinearGradient
                colors={[Colors.light.accent, Colors.light.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.placeOrderGradient}
              >
                {purchaseMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.placeOrderText}>تأكيد الطلب</Text>
                    <Text style={styles.placeOrderPrice}>
                      {total.toFixed(2)} $
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF4D6",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F5B731",
  },
  ticketIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1267E8",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketCardTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 14,
    color: "#0B2142",
    textAlign: "right",
    writingDirection: "rtl",
  },
  ticketCardSub: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: "#754500",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 12,
    textAlign: "right",
    writingDirection: "rtl",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: "#0B2142",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    writingDirection: "rtl",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#0B2142",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 14,
  },
  cartItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border + "40",
    marginBottom: 4,
  },
  cartItemPrice: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    color: Colors.light.accent,
    marginEnd: 12,
  },
  itemTitle: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  summaryValue: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: Colors.light.text,
  },
  subtotalLabel: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: Colors.light.text,
    writingDirection: "rtl",
  },
  subtotalValue: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
    color: Colors.light.accent,
  },
  paymentCard: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  paymentCardSelected: {
    borderColor: Colors.light.accent,
    backgroundColor: "rgba(124, 58, 237, 0.06)",
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  paymentIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  paymentDesc: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  paymentLeft: {
    width: 24,
    alignItems: "center",
  },
  bankDetails: {
    backgroundColor: "rgba(124, 58, 237, 0.06)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.2)",
    marginTop: 4,
  },
  bankHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  bankHeaderText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: Colors.light.accent,
    textAlign: "right",
    writingDirection: "rtl",
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(124, 58, 237, 0.12)",
  },
  bankLabel: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  bankValue: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: Colors.light.text,
    writingDirection: "rtl",
    textAlign: "right",
    flex: 1,
    marginEnd: 12,
  },
  bankNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(243, 156, 18, 0.08)",
    padding: 10,
    borderRadius: 8,
  },
  bankNoteText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: Colors.light.warning,
    textAlign: "right",
    writingDirection: "rtl",
    flex: 1,
  },
  payImageContainer: {
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  payImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  payImageCaption: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 6,
  },
  couponRow: {
    flexDirection: "row",
    gap: 10,
  },
  couponInput: {
    flex: 1,
    backgroundColor: Colors.light.inputBg,
    borderRadius: 12,
    padding: 14,
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  couponBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  couponBtnText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  couponSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "rgba(46, 204, 113, 0.08)",
    padding: 10,
    borderRadius: 8,
  },
  couponSuccessText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: Colors.light.success,
    textAlign: "right",
    writingDirection: "rtl",
  },
  couponErrorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "rgba(231, 76, 60, 0.08)",
    padding: 10,
    borderRadius: 8,
  },
  couponErrorText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: Colors.light.danger,
    textAlign: "right",
    writingDirection: "rtl",
  },
  inputLabel: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.light.inputBg,
    borderRadius: 14,
    padding: 14,
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  totalRowLabel: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  totalRowValue: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 15,
    color: Colors.light.text,
  },
  totalDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
    color: Colors.light.text,
    writingDirection: "rtl",
  },
  grandTotal: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 26,
    color: Colors.light.accent,
  },
  retryUploadCard: {
    backgroundColor: "rgba(243,156,18,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(243,156,18,0.3)",
    borderRadius: 18,
    padding: 16,
  },
  retryUploadBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.light.accent + "55",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.04)",
    gap: 8,
  },
  uploadTitle: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: Colors.light.accent,
    textAlign: "center",
    writingDirection: "rtl",
  },
  uploadSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },
  previewContainer: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.light.inputBg,
  },
  previewImage: {
    width: "100%",
    height: 160,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 8,
    padding: 10,
    backgroundColor: Colors.light.inputBg,
  },
  previewChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  previewChangeText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  placeOrderBtn: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 6,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  placeOrderGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
  },
  placeOrderText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  placeOrderPrice: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 17,
    color: "rgba(255,255,255,0.85)",
  },
});
