import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { queryClient, getApiUrl, buildMediaUrl } from "@/lib/query-client";
import type { Order, Campaign } from "@shared/schema";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";

const SHIPPING_STEPS = [
  { key: "pending", label: "الطلب مستلم" },
  { key: "processing", label: "قيد التجهيز" },
  { key: "shipped", label: "تم الشحن" },
  { key: "delivered", label: "تم التسليم" },
];

const SHIPPING_ORDER = ["pending", "processing", "shipped", "delivered"];

function getPaymentStatusConfig(status: string) {
  switch (status) {
    case "pending_payment":
      return {
        icon: "time" as const,
        color: Colors.light.warning,
        bg: "rgba(243, 156, 18, 0.08)",
        borderColor: "rgba(243, 156, 18, 0.2)",
        label: "في انتظار الدفع",
      };
    case "pending_review":
      return {
        icon: "hourglass" as const,
        color: "#3498DB",
        bg: "rgba(52, 152, 219, 0.08)",
        borderColor: "rgba(52, 152, 219, 0.2)",
        label: "قيد المراجعة",
      };
    case "confirmed":
      return {
        icon: "checkmark-circle" as const,
        color: Colors.light.success,
        bg: "rgba(46, 204, 113, 0.08)",
        borderColor: "rgba(46, 204, 113, 0.2)",
        label: "تم التأكيد",
      };
    case "rejected":
      return {
        icon: "close-circle" as const,
        color: Colors.light.danger,
        bg: "rgba(231, 76, 60, 0.08)",
        borderColor: "rgba(231, 76, 60, 0.2)",
        label: "مرفوض",
      };
    default:
      return {
        icon: "help-circle" as const,
        color: Colors.light.textSecondary,
        bg: "rgba(90, 107, 130, 0.08)",
        borderColor: "rgba(90, 107, 130, 0.2)",
        label: "غير معروف",
      };
  }
}

function formatImageUrl(url: string) {
  return buildMediaUrl(url) ?? url;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: order,
    isLoading,
  } = useQuery<Order>({
    queryKey: ["/api/orders", id],
    refetchInterval: 10000,
  });

  const { data: campaign } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", order?.campaignId],
    enabled: !!order?.campaignId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/orders/${id}/receipt`, baseUrl);

      if (Platform.OS === "web") {
        if (!selectedFile) throw new Error("لم يتم اختيار ملف");
        const formData = new FormData();
        formData.append("receipt", selectedFile);
        const res = await fetch(url.toString(), {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "فشل رفع الإيصال");
        }
        return res.json();
      } else {
        if (!selectedImage) throw new Error("لم يتم اختيار صورة");
        const formData = new FormData();
        formData.append("receipt", {
          uri: selectedImage,
          name: "receipt.jpg",
          type: "image/jpeg",
        } as any);
        const res = await fetch(url.toString(), {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "فشل رفع الإيصال");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedImage(null);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("خطأ", err.message || "فشل رفع الإيصال");
    },
  });

  const compressImageWeb = (file: File, maxWidth: number): Promise<File> => {
    return new Promise((resolve) => {
      const img = new (window as any).Image() as HTMLImageElement;
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxWidth) {
          h = Math.round(h * maxWidth / w);
          w = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], "receipt.jpg", { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        }, "image/jpeg", 0.82);
      };
      img.src = url;
    });
  };

  const pickImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const compressed = await compressImageWeb(file, 1200);
          setSelectedFile(compressed);
          const reader = new FileReader();
          reader.onload = (ev) => {
            setSelectedImage(ev.target?.result as string);
          };
          reader.readAsDataURL(compressed);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    }
  };

  const copyTrackingNumber = async (num: string) => {
    await Clipboard.setStringAsync(num);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("تم النسخ", "تم نسخ رقم التتبع");
  };

  if (isLoading || !order) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  const paymentConfig = getPaymentStatusConfig(order.paymentStatus);
  const showReceiptUpload =
    order.paymentStatus === "rejected" ||
    (order.paymentStatus === "pending_payment" && !order.receiptUrl);
  const isCancelled = order.shippingStatus === "cancelled";
  const shippingIndex = SHIPPING_ORDER.indexOf(order.shippingStatus);
  const orderDate = new Date(order.createdAt).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const unitPrice = order.quantity > 0
    ? (parseFloat(order.totalAmount) + parseFloat(order.discountAmount || "0")) / order.quantity
    : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7C3AED", "#A855F7", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top },
        ]}
      >
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/tickets')} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
          <Text style={styles.headerOrderId}>#{order.id.slice(0, 8)}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Platform.OS === "web" ? 50 : Math.max(insets.bottom, 16) + 16,
        }}
      >
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: paymentConfig.bg,
              borderColor: paymentConfig.borderColor,
            },
          ]}
        >
          <View
            style={[
              styles.statusIconCircle,
              { backgroundColor: paymentConfig.color + "18" },
            ]}
          >
            <Ionicons
              name={paymentConfig.icon}
              size={36}
              color={paymentConfig.color}
            />
          </View>
          <Text style={[styles.statusLabel, { color: paymentConfig.color }]}>
            {paymentConfig.label}
          </Text>
          {order.paymentStatus === "rejected" && order.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Ionicons
                name="information-circle"
                size={18}
                color={Colors.light.danger}
              />
              <Text style={styles.rejectionText}>{order.rejectionReason}</Text>
            </View>
          )}
        </View>

        {showReceiptUpload && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>رفع إيصال الدفع</Text>
            {order.paymentStatus === "rejected" && (
              <Text style={styles.reuploadHint}>يمكنك رفع إيصال جديد</Text>
            )}

            {!selectedImage ? (
              <Pressable onPress={pickImage} style={styles.uploadArea}>
                <Ionicons
                  name="camera"
                  size={40}
                  color={Colors.light.accent}
                />
                <Text style={styles.uploadTitle}>رفع إيصال الدفع</Text>
                <Text style={styles.uploadSubtitle}>
                  التقط صورة أو اختر من المعرض
                </Text>
              </Pressable>
            ) : (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.previewActions}>
                  <Pressable
                    onPress={pickImage}
                    style={styles.previewChangeBtn}
                  >
                    <Ionicons
                      name="refresh"
                      size={18}
                      color={Colors.light.textSecondary}
                    />
                    <Text style={styles.previewChangeText}>تغيير</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setSelectedImage(null);
                      setSelectedFile(null);
                    }}
                    style={styles.previewChangeBtn}
                  >
                    <Ionicons
                      name="trash"
                      size={18}
                      color={Colors.light.danger}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            {selectedImage && (
              <Pressable
                onPress={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending}
                style={({ pressed }) => [
                  styles.uploadButton,
                  pressed && { opacity: 0.9 },
                  uploadMutation.isPending && { opacity: 0.6 },
                ]}
              >
                {uploadMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#fff" />
                    <Text style={styles.uploadButtonText}>رفع الإيصال</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {order.receiptUrl && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>الإيصال المرفوع</Text>
            <Pressable onPress={() => setReceiptModalVisible(true)}>
              <Image
                source={{ uri: formatImageUrl(order.receiptUrl) }}
                style={styles.receiptImage}
                resizeMode="cover"
              />
              <View style={styles.receiptOverlay}>
                <Ionicons name="expand" size={22} color="#fff" />
              </View>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ملخص الطلب</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>
              {campaign?.title || order.campaignId.slice(0, 8)}
            </Text>
            <Text style={styles.summaryLabel}>الحملة</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{order.quantity}</Text>
            <Text style={styles.summaryLabel}>الكمية</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>${unitPrice.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>سعر الوحدة</Text>
          </View>

          {order.discountAmount && parseFloat(order.discountAmount) > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryValue, { color: Colors.light.success }]}>
                  -${parseFloat(order.discountAmount).toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>
                  الخصم {order.couponCode ? `(${order.couponCode})` : ""}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>
              ${parseFloat(order.totalAmount).toFixed(2)}
            </Text>
            <Text style={[styles.summaryLabel, { fontFamily: "Inter_600SemiBold" }]}>
              الإجمالي
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>
              {order.paymentMethod || "-"}
            </Text>
            <Text style={styles.summaryLabel}>طريقة الدفع</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{orderDate}</Text>
            <Text style={styles.summaryLabel}>تاريخ الطلب</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>حالة الشحن</Text>

          {isCancelled ? (
            <View style={styles.cancelledBox}>
              <Ionicons
                name="close-circle"
                size={24}
                color={Colors.light.danger}
              />
              <Text style={styles.cancelledText}>تم إلغاء الطلب</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {SHIPPING_STEPS.map((step, index) => {
                const isCompleted = index <= shippingIndex;
                const isCurrent = index === shippingIndex;
                const isLast = index === SHIPPING_STEPS.length - 1;
                const dotColor = isCompleted
                  ? isCurrent
                    ? Colors.light.accent
                    : Colors.light.success
                  : Colors.light.border;

                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineDotCol}>
                      <View
                        style={[
                          styles.timelineDot,
                          { backgroundColor: dotColor },
                          isCurrent && styles.timelineDotCurrent,
                        ]}
                      >
                        {isCompleted && (
                          <Ionicons
                            name={isCurrent ? "ellipse" : "checkmark"}
                            size={isCurrent ? 10 : 14}
                            color="#fff"
                          />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            {
                              backgroundColor: index < shippingIndex
                                ? Colors.light.success
                                : Colors.light.border,
                            },
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isCompleted && {
                          color: isCurrent
                            ? Colors.light.accent
                            : Colors.light.text,
                          fontFamily: isCurrent
                            ? "Inter_600SemiBold"
                            : "Inter_500Medium",
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {order.trackingNumber && (
            <Pressable
              onPress={() => copyTrackingNumber(order.trackingNumber!)}
              style={styles.trackingRow}
            >
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>رقم التتبع</Text>
                <Text style={styles.trackingNumber}>
                  {order.trackingNumber}
                </Text>
              </View>
              <Ionicons
                name="copy"
                size={20}
                color={Colors.light.accent}
              />
            </Pressable>
          )}
        </View>

        {(order.shippingFullName || order.shippingAddress) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>عنوان الشحن</Text>

            {order.shippingFullName && (
              <View style={styles.addressRow}>
                <Ionicons
                  name="person"
                  size={18}
                  color={Colors.light.textSecondary}
                />
                <Text style={styles.addressText}>
                  {order.shippingFullName}
                </Text>
              </View>
            )}

            {order.shippingPhone && (
              <View style={styles.addressRow}>
                <Ionicons
                  name="call"
                  size={18}
                  color={Colors.light.textSecondary}
                />
                <Text style={styles.addressText}>{order.shippingPhone}</Text>
              </View>
            )}

            {order.shippingCity && (
              <View style={styles.addressRow}>
                <Ionicons
                  name="location"
                  size={18}
                  color={Colors.light.textSecondary}
                />
                <Text style={styles.addressText}>{order.shippingCity}</Text>
              </View>
            )}

            {order.shippingAddress && (
              <View style={styles.addressRow}>
                <Ionicons
                  name="home"
                  size={18}
                  color={Colors.light.textSecondary}
                />
                <Text style={styles.addressText}>
                  {order.shippingAddress}
                </Text>
              </View>
            )}

            {order.shippingCountry && (
              <View style={styles.addressRow}>
                <Ionicons
                  name="flag"
                  size={18}
                  color={Colors.light.textSecondary}
                />
                <Text style={styles.addressText}>
                  {order.shippingCountry}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <Pressable
            style={modalStyles.closeBtn}
            onPress={() => setReceiptModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {order.receiptUrl && (
            <Image
              source={{ uri: formatImageUrl(order.receiptUrl) }}
              style={modalStyles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    writingDirection: "rtl",
  },
  headerOrderId: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  statusCard: {
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statusIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
    writingDirection: "rtl",
  },
  rejectionBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: "rgba(231, 76, 60, 0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.danger,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: "right",
    writingDirection: "rtl",
  },
  reuploadHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.warning,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 12,
    marginTop: -8,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.light.accent,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.inputBg,
  },
  uploadTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    marginTop: 12,
    textAlign: "center",
    writingDirection: "rtl",
  },
  uploadSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 6,
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
    height: 200,
    borderRadius: 14,
  },
  previewActions: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
  },
  previewChangeBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewChangeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  uploadButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 14,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  uploadButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  receiptImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  receiptOverlay: {
    position: "absolute",
    bottom: 10,
    start: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    padding: 6,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  summaryValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "left",
    writingDirection: "rtl",
    maxWidth: "60%",
  },
  summaryTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.accent,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  cancelledBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(231, 76, 60, 0.06)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.15)",
  },
  cancelledText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.danger,
    textAlign: "right",
    writingDirection: "rtl",
  },
  timeline: {
    paddingEnd: 4,
  },
  timelineStep: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    minHeight: 52,
  },
  timelineDotCol: {
    alignItems: "center",
    width: 28,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotCurrent: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "rgba(124, 58, 237, 0.3)",
  },
  timelineLine: {
    width: 3,
    flex: 1,
    minHeight: 24,
    borderRadius: 2,
  },
  timelineLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginEnd: 12,
    paddingTop: 2,
    textAlign: "right",
    writingDirection: "rtl",
  },
  trackingRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.inputBg,
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 2,
  },
  trackingNumber: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  addressRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  addressText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    end: 20,
    zIndex: 10,
    padding: 8,
  },
  fullImage: {
    width: "90%",
    height: "75%",
  },
});
