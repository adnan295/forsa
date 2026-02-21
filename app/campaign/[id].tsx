import React, { useState, useEffect } from "react";
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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";
import type { Campaign, Ticket } from "@shared/schema";

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState<Ticket[]>([]);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const {
    data: campaign,
    isLoading,
  } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", id],
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/purchase", {
        campaignId: id,
        quantity,
        paymentMethod: "card",
      });
      return res.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPurchasedTickets(data.tickets);
      setShowPurchaseModal(false);
      setShowSuccessModal(true);
      setQuantity(1);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err.message || "فشلت عملية الشراء";
      Alert.alert("خطأ", msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    },
  });

  if (isLoading || !campaign) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  const progress = campaign.totalQuantity > 0
    ? campaign.soldQuantity / campaign.totalQuantity
    : 0;
  const remaining = campaign.totalQuantity - campaign.soldQuantity;
  const isActive = campaign.status === "active";
  const isCompleted = campaign.status === "completed";
  const isSoldOut = campaign.status === "sold_out" || campaign.status === "drawing";
  const totalPrice = (parseFloat(campaign.productPrice) * quantity).toFixed(2);
  const maxQty = Math.min(remaining, 10);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isActive ? 120 : 40 }}
      >
        <LinearGradient
          colors={["#0A1628", "#152238", "#1A2D4A"]}
          style={styles.heroSection}
        >
          <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </Pressable>

            <View style={styles.heroCenter}>
              <Animated.View style={[styles.prizeIcon, pulseStyle]}>
                <Ionicons name="gift" size={56} color={Colors.light.accent} />
              </Animated.View>
              <Text style={styles.heroTitle}>{campaign.title}</Text>
              <View style={styles.prizeBadge}>
                <Ionicons name="trophy" size={16} color="#FFD700" />
                <Text style={styles.prizeTitle}>{campaign.prizeName}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>تقدم الحملة</Text>
              <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
              </Text>
            </View>

            <View style={styles.progressBarWrap}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={[Colors.light.accent, Colors.light.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(progress * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatNum}>
                  {campaign.soldQuantity}
                </Text>
                <Text style={styles.progressStatLabel}>مباع</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatNum}>
                  {campaign.totalQuantity}
                </Text>
                <Text style={styles.progressStatLabel}>الإجمالي</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={[styles.progressStatNum, { color: Colors.light.accent }]}>
                  {remaining}
                </Text>
                <Text style={styles.progressStatLabel}>متبقي</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>عن المنتج</Text>
            <Text style={styles.detailText}>{campaign.description}</Text>
          </View>

          {campaign.prizeDescription && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>تفاصيل الجائزة</Text>
              <Text style={styles.detailText}>{campaign.prizeDescription}</Text>
            </View>
          )}

          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>سعر التذكرة</Text>
              <Text style={styles.priceValue}>
                ${parseFloat(campaign.productPrice).toFixed(2)}
              </Text>
            </View>
            <Ionicons name="pricetag" size={28} color={Colors.light.accent} />
          </View>

          {isCompleted && campaign.winnerTicketId && (
            <View style={styles.winnerCard}>
              <LinearGradient
                colors={["#FFD700", "#FFA500"]}
                style={styles.winnerGradient}
              >
                <Ionicons name="trophy" size={32} color="#fff" />
                <Text style={styles.winnerTitle}>تم إعلان الفائز!</Text>
                <Text style={styles.winnerTicket}>
                  التذكرة: {campaign.winnerTicketId}
                </Text>
              </LinearGradient>
            </View>
          )}

          {isSoldOut && (
            <View style={styles.soldOutBanner}>
              <Ionicons name="hourglass" size={24} color={Colors.light.warning} />
              <Text style={styles.soldOutText}>
                نفذت جميع العناصر! السحب سيبدأ قريباً.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {isActive && (
        <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16) }]}>
          <View style={styles.bottomContent}>
            <View>
              <Text style={styles.bottomPrice}>${totalPrice}</Text>
              <Text style={styles.bottomQty}>{quantity} تذكرة</Text>
            </View>
            <Pressable
              onPress={() => {
                if (!user) {
                  router.push("/auth");
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowPurchaseModal(true);
              }}
              style={({ pressed }) => [
                styles.buyButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <LinearGradient
                colors={[Colors.light.accent, Colors.light.accentDark]}
                style={styles.buyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="cart" size={20} color="#fff" />
                <Text style={styles.buyButtonText}>اشترِ الآن</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      <Modal visible={showPurchaseModal} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>تأكيد الشراء</Text>
              <Pressable onPress={() => setShowPurchaseModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </Pressable>
            </View>

            <View style={modalStyles.body}>
              <Text style={modalStyles.campaignName}>{campaign.title}</Text>

              <View style={modalStyles.qtyRow}>
                <Text style={modalStyles.qtyLabel}>الكمية</Text>
                <View style={modalStyles.qtyControls}>
                  <Pressable
                    onPress={() => {
                      if (quantity > 1) {
                        setQuantity(quantity - 1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={[modalStyles.qtyBtn, quantity <= 1 && { opacity: 0.3 }]}
                  >
                    <Ionicons name="remove" size={20} color={Colors.light.text} />
                  </Pressable>
                  <Text style={modalStyles.qtyValue}>{quantity}</Text>
                  <Pressable
                    onPress={() => {
                      if (quantity < maxQty) {
                        setQuantity(quantity + 1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={[modalStyles.qtyBtn, quantity >= maxQty && { opacity: 0.3 }]}
                  >
                    <Ionicons name="add" size={20} color={Colors.light.text} />
                  </Pressable>
                </View>
              </View>

              <View style={modalStyles.summaryRow}>
                <Text style={modalStyles.summaryLabel}>
                  ${parseFloat(campaign.productPrice).toFixed(2)} x {quantity}
                </Text>
                <Text style={modalStyles.summaryTotal}>${totalPrice}</Text>
              </View>

              <View style={modalStyles.paymentSection}>
                <Text style={modalStyles.paymentLabel}>طريقة الدفع</Text>
                <View style={modalStyles.paymentOption}>
                  <Ionicons name="card" size={20} color={Colors.light.accent} />
                  <Text style={modalStyles.paymentText}>بطاقة ائتمان / خصم</Text>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
                </View>
              </View>

              <Pressable
                onPress={() => purchaseMutation.mutate()}
                disabled={purchaseMutation.isPending}
                style={({ pressed }) => [
                  modalStyles.confirmBtn,
                  pressed && { opacity: 0.9 },
                  purchaseMutation.isPending && { opacity: 0.6 },
                ]}
              >
                {purchaseMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={modalStyles.confirmBtnText}>
                    ادفع ${totalPrice}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={successStyles.overlay}>
          <View style={successStyles.container}>
            <View style={successStyles.iconCircle}>
              <Ionicons name="checkmark-circle" size={56} color={Colors.light.success} />
            </View>
            <Text style={successStyles.title}>تمت عملية الشراء بنجاح!</Text>
            <Text style={successStyles.subtitle}>
              حصلت على {purchasedTickets.length} تذكرة
            </Text>

            <View style={successStyles.ticketList}>
              {purchasedTickets.map((t) => (
                <View key={t.id} style={successStyles.ticketItem}>
                  <Ionicons name="ticket" size={16} color={Colors.light.accent} />
                  <Text style={successStyles.ticketNumber}>{t.ticketNumber}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => {
                setShowSuccessModal(false);
                setPurchasedTickets([]);
              }}
              style={successStyles.doneBtn}
            >
              <Text style={successStyles.doneBtnText}>تم</Text>
            </Pressable>
          </View>
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
  heroSection: {
    paddingBottom: 32,
  },
  backButton: {
    padding: 16,
    alignSelf: "flex-end",
  },
  heroCenter: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  prizeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(212, 168, 83, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  prizeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  prizeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFD700",
  },
  content: {
    padding: 16,
    marginTop: -16,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  progressTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  progressPercent: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.accent,
  },
  progressBarWrap: {
    marginBottom: 16,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: Colors.light.progressBg,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  progressStat: {
    alignItems: "center",
  },
  progressStatNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
  },
  progressStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
    writingDirection: "rtl",
  },
  detailSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "right",
    writingDirection: "rtl",
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    textAlign: "right",
    writingDirection: "rtl",
  },
  priceCard: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  priceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  priceValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.text,
  },
  winnerCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  winnerGradient: {
    padding: 24,
    alignItems: "center",
  },
  winnerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#fff",
    marginTop: 10,
    writingDirection: "rtl",
  },
  winnerTicket: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    writingDirection: "rtl",
  },
  soldOutBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(243, 156, 18, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(243, 156, 18, 0.3)",
    marginBottom: 12,
  },
  soldOutText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.warning,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  bottomContent: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  bottomQty: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  buyButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  buyButtonGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buyButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  body: {
    padding: 20,
    paddingBottom: 40,
  },
  campaignName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: "right",
    writingDirection: "rtl",
  },
  qtyRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  qtyLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
    minWidth: 30,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginBottom: 16,
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  summaryTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 10,
    textAlign: "right",
    writingDirection: "rtl",
  },
  paymentOption: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.light.inputBg,
    padding: 14,
    borderRadius: 12,
  },
  paymentText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  confirmBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
});

const successStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  iconCircle: {
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 20,
  },
  ticketList: {
    width: "100%",
    gap: 8,
    marginBottom: 24,
  },
  ticketItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.inputBg,
    padding: 12,
    borderRadius: 10,
  },
  ticketNumber: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    letterSpacing: 0.5,
  },
  doneBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: 14,
    height: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
