import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Share,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useFavorites } from "@/lib/favorites-context";
import { buildMediaUrl } from "@/lib/query-client";
import type { Campaign, CampaignProduct } from "@shared/schema";

type CampaignWithProducts = Campaign & { products?: CampaignProduct[] };

function useCountdown(endsAt: string | Date | null | undefined) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
  useEffect(() => {
    if (!endsAt) return;
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      };
    };
    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return timeLeft;
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const pulseScale = useSharedValue(1);
  const buyBtnScale = useSharedValue(1);
  const cartBtnScale = useSharedValue(1);

  const buyBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buyBtnScale.value }],
  }));
  const cartBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartBtnScale.value }],
  }));

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
  } = useQuery<CampaignWithProducts>({
    queryKey: ["/api/campaigns", id],
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const countdown = useCountdown(campaign?.endsAt);
  const flashCountdown = useCountdown((campaign as any)?.flashSaleEndsAt);

  const { data: reviewsData } = useQuery<{ username: string; rating: number; comment: string | null; createdAt: string }[]>({
    queryKey: ["/api/reviews", id],
    enabled: !!id,
  });

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reviews", {
        campaignId: id,
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", id] });
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewComment("");
    },
  });

  if (isLoading || !campaign) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  const hasProducts = (campaign.products?.length ?? 0) > 0;
  const selectedProduct = hasProducts
    ? campaign.products!.find((p) => p.id === selectedProductId) || null
    : null;

  const progress = campaign.totalQuantity > 0
    ? campaign.soldQuantity / campaign.totalQuantity
    : 0;
  const remaining = selectedProduct
    ? selectedProduct.quantity - selectedProduct.soldQuantity
    : campaign.totalQuantity - campaign.soldQuantity;
  const isActive = campaign.status === "active";
  const isCompleted = campaign.status === "completed";
  const isSoldOut = campaign.status === "sold_out" || campaign.status === "drawing";
  const unitPrice = selectedProduct ? parseFloat(selectedProduct.price) : parseFloat(campaign.productPrice);
  const totalPrice = (unitPrice * quantity).toFixed(2);
  const maxQty = Math.min(remaining, 10);
  const needsVariant = hasProducts && !selectedProductId;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isActive ? 140 : 40 }}
      >
        <View style={styles.heroSection}>
          {campaign.imageUrl ? (
            <Image
              source={{ uri: buildMediaUrl(campaign.imageUrl)! }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : null}
          <LinearGradient
            colors={campaign.imageUrl ? ["transparent", "rgba(124,58,237,0.7)", "rgba(236,72,153,0.95)"] : ["#7C3AED", "#A855F7", "#EC4899"]}
            style={styles.heroOverlay}
          >
            <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}>
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", paddingHorizontal: 4 }}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                  <View style={styles.backBtnCircle}>
                    <Ionicons name="arrow-forward" size={22} color="#fff" />
                  </View>
                </Pressable>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (id) toggleFavorite(id);
                    }}
                    style={styles.backButton}
                  >
                    <View style={styles.backBtnCircle}>
                      <Ionicons
                        name={id && isFavorite(id) ? "heart" : "heart-outline"}
                        size={20}
                        color={id && isFavorite(id) ? "#EF4444" : "#fff"}
                      />
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      try {
                        await Share.share({
                          message: `🛒 ${campaign.title}\n🎁 جائزة: ${campaign.prizeName}\n💰 السعر: ${unitPrice.toFixed(2)} $\n\nاشترِ المنتج واحصل على فرصة للفوز! 🎉\n\nفرصة - تسوق واربح`,
                        });
                      } catch (e) {}
                    }}
                    style={styles.backButton}
                  >
                    <View style={styles.backBtnCircle}>
                      <Ionicons name="share-social" size={20} color="#fff" />
                    </View>
                  </Pressable>
                </View>
              </View>

              <View style={styles.heroCenter}>
                {!campaign.imageUrl && (
                  <Animated.View style={[styles.prizeIcon, pulseStyle]}>
                    <Ionicons name="gift" size={52} color="#fff" />
                  </Animated.View>
                )}
                <Text style={styles.heroTitle}>{campaign.title}</Text>
                <View style={styles.prizeBadge}>
                  <Ionicons name="trophy" size={16} color="#A78BFA" />
                  <Text style={styles.prizeTitle}>{campaign.prizeName}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          {!!(campaign as any).isFlashSale && !flashCountdown.expired && (
            <View style={{ backgroundColor: "#FEF2F2", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#FECACA", flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: "#EF4444", writingDirection: "rtl" as const }}>🔥 عرض محدود - ينتهي قريباً!</Text>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: "#DC2626", marginTop: 4 }}>
                  {String(flashCountdown.hours).padStart(2, "0")}:{String(flashCountdown.minutes).padStart(2, "0")}:{String(flashCountdown.seconds).padStart(2, "0")}
                </Text>
                {(campaign as any).originalPrice && (
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#EF4444", marginTop: 2, writingDirection: "rtl" as const }}>
                    السعر الأصلي: <Text style={{ textDecorationLine: "line-through" }}>${parseFloat((campaign as any).originalPrice).toFixed(2)}</Text> ← ${parseFloat(campaign.productPrice).toFixed(2)}
                  </Text>
                )}
              </View>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="flash" size={28} color="#EF4444" />
              </View>
            </View>
          )}

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleRow}>
                <Ionicons name="analytics" size={18} color={Colors.light.accent} />
                <Text style={styles.progressTitle}>تقدم الحملة</Text>
              </View>
              <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
              </Text>
            </View>

            <View style={styles.progressBarWrap}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={
                    isCompleted
                      ? [Colors.light.success, "#27AE60"]
                      : isSoldOut
                      ? [Colors.light.warning, "#E67E22"]
                      : [Colors.light.accent, Colors.light.accentPink]
                  }
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
                <View style={[styles.statDot, { backgroundColor: Colors.light.accent }]} />
                <Text style={styles.progressStatNum}>
                  {campaign.soldQuantity}
                </Text>
                <Text style={styles.progressStatLabel}>مباع</Text>
              </View>
              <View style={styles.progressStat}>
                <View style={[styles.statDot, { backgroundColor: Colors.light.textSecondary }]} />
                <Text style={styles.progressStatNum}>
                  {campaign.totalQuantity}
                </Text>
                <Text style={styles.progressStatLabel}>الإجمالي</Text>
              </View>
              <View style={styles.progressStat}>
                <View style={[styles.statDot, { backgroundColor: Colors.light.success }]} />
                <Text style={[styles.progressStatNum, { color: Colors.light.accent }]}>
                  {remaining}
                </Text>
                <Text style={styles.progressStatLabel}>متبقي</Text>
              </View>
            </View>
          </View>

          {campaign.endsAt && !isCompleted && !isSoldOut && !countdown.expired && (
            <View style={styles.countdownCard}>
              <View style={styles.countdownHeader}>
                <Ionicons name="timer-outline" size={18} color="#EF4444" />
                <Text style={styles.countdownTitle}>ينتهي خلال</Text>
              </View>
              <View style={styles.countdownBoxes}>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownBoxNum}>{countdown.days}</Text>
                  <Text style={styles.countdownBoxLabel}>يوم</Text>
                </View>
                <Text style={styles.countdownBoxSep}>:</Text>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownBoxNum}>{String(countdown.hours).padStart(2, "0")}</Text>
                  <Text style={styles.countdownBoxLabel}>ساعة</Text>
                </View>
                <Text style={styles.countdownBoxSep}>:</Text>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownBoxNum}>{String(countdown.minutes).padStart(2, "0")}</Text>
                  <Text style={styles.countdownBoxLabel}>دقيقة</Text>
                </View>
                <Text style={styles.countdownBoxSep}>:</Text>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownBoxNum}>{String(countdown.seconds).padStart(2, "0")}</Text>
                  <Text style={styles.countdownBoxLabel}>ثانية</Text>
                </View>
              </View>
            </View>
          )}

          {isActive && hasProducts && (
            <View style={styles.quantityCard}>
              <View style={styles.quantityHeader}>
                <Ionicons name="color-palette-outline" size={18} color={Colors.light.accent} />
                <Text style={styles.quantityTitle}>اختر الموديل</Text>
              </View>
              {campaign.products!.map((product) => {
                const pRemaining = product.quantity - product.soldQuantity;
                const pSoldOut = pRemaining <= 0;
                const isSelected = selectedProductId === product.id;
                return (
                  <Pressable
                    key={product.id}
                    onPress={() => {
                      if (!pSoldOut) {
                        setSelectedProductId(product.id);
                        setQuantity(1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    disabled={pSoldOut}
                    style={[
                      styles.variantOption,
                      isSelected && styles.variantOptionSelected,
                      pSoldOut && styles.variantOptionDisabled,
                    ]}
                  >
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, flex: 1 }}>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.light.accent} />
                      )}
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: buildMediaUrl(product.imageUrl)! }}
                          style={{ width: 52, height: 52, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: "rgba(124,58,237,0.08)", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="image-outline" size={22} color={Colors.light.accent} style={{ opacity: 0.4 }} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.variantName,
                          isSelected && { color: Colors.light.accent },
                          pSoldOut && { color: Colors.light.textSecondary },
                        ]}>
                          {product.nameAr || product.name}
                        </Text>
                        <Text style={styles.variantSub}>
                          {pSoldOut ? "نفذت الكمية" : `متبقي ${pRemaining} قطعة`}
                        </Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.variantPrice,
                      isSelected && { color: Colors.light.accent },
                      pSoldOut && { color: Colors.light.textSecondary },
                    ]}>
                      {parseFloat(product.price).toFixed(2)} $
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {isActive && (
            <View style={[styles.quantityCard, needsVariant && { opacity: 0.5 }]} pointerEvents={needsVariant ? "none" : "auto"}>
              <View style={styles.quantityHeader}>
                <Ionicons name="layers-outline" size={18} color={Colors.light.accent} />
                <Text style={styles.quantityTitle}>اختر الكمية</Text>
                {needsVariant && (
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.danger, marginEnd: "auto" }}>اختر الموديل أولاً</Text>
                )}
              </View>
              <View style={styles.quantityControls}>
                <Pressable
                  onPress={() => {
                    if (quantity > 1) {
                      setQuantity(quantity - 1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={22} color={quantity <= 1 ? Colors.light.border : Colors.light.text} />
                </Pressable>
                <View style={styles.qtyValueWrap}>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (quantity < maxQty) {
                      setQuantity(quantity + 1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={[styles.qtyBtn, quantity >= maxQty && styles.qtyBtnDisabled]}
                  disabled={quantity >= maxQty}
                >
                  <Ionicons name="add" size={22} color={quantity >= maxQty ? Colors.light.border : Colors.light.text} />
                </Pressable>
              </View>
              <View style={styles.quantityPriceRow}>
                <Text style={styles.quantityPriceLabel}>{quantity} × {unitPrice.toFixed(2)} $</Text>
                <Text style={styles.quantityPriceTotal}>{totalPrice} $</Text>
              </View>
            </View>
          )}

          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.light.accent} />
              <Text style={styles.detailTitle}>عن المنتج</Text>
            </View>
            <Text style={styles.detailText}>{campaign.description}</Text>
          </View>

          {campaign.prizeDescription && (
            <View style={styles.detailSection}>
              <View style={styles.detailHeader}>
                <Ionicons name="gift-outline" size={18} color="#A78BFA" />
                <Text style={styles.detailTitle}>تفاصيل الجائزة</Text>
              </View>
              <Text style={styles.detailText}>{campaign.prizeDescription}</Text>
            </View>
          )}

          <View style={styles.priceCard}>
            <View style={styles.priceCardLeft}>
              <Text style={styles.priceLabel}>سعر المنتج</Text>
              <View style={styles.priceValueRow}>
                <Text style={styles.priceCurrency}>$</Text>
                <Text style={styles.priceValue}>
                  {unitPrice.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.priceIconWrap}>
              <Ionicons name="pricetag" size={24} color={Colors.light.accent} />
            </View>
          </View>

          {isCompleted && campaign.winnerTicketId && (
            <View style={styles.winnerCard}>
              <LinearGradient
                colors={["#7C3AED", "#EC4899"]}
                style={styles.winnerGradient}
              >
                <Ionicons name="trophy" size={36} color="#fff" />
                <Text style={styles.winnerTitle}>تم إعلان الفائز!</Text>
                <Text style={styles.winnerTicket}>
                  تذكرة الفوز: {campaign.winnerTicketId}
                </Text>
              </LinearGradient>
            </View>
          )}

          {isSoldOut && (
            <View style={styles.soldOutBanner}>
              <View style={styles.soldOutIconWrap}>
                <Ionicons name="hourglass" size={22} color={Colors.light.warning} />
              </View>
              <Text style={styles.soldOutText}>
                نفذت جميع المنتجات! اختيار الفائز بالهدية سيبدأ قريباً.
              </Text>
            </View>
          )}

          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.detailTitle}>التقييمات والآراء</Text>
              {reviewsData && reviewsData.length > 0 && (
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, marginEnd: "auto" }}>
                  ({reviewsData.length})
                </Text>
              )}
            </View>

            {user && !showReviewForm && (
              <Pressable
                onPress={() => setShowReviewForm(true)}
                style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "rgba(124,58,237,0.06)", borderRadius: 12, marginBottom: 12 }}
              >
                <Ionicons name="create-outline" size={18} color={Colors.light.accent} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.accent, writingDirection: "rtl" }}>أضف تقييمك</Text>
              </Pressable>
            )}

            {showReviewForm && (
              <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.border }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", marginBottom: 10 }}>تقييمك</Text>
                <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 8, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable key={star} onPress={() => { setReviewRating(star); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <Ionicons name={star <= reviewRating ? "star" : "star-outline"} size={32} color="#F59E0B" />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, padding: 12, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.text, textAlign: "right", writingDirection: "rtl", minHeight: 60, textAlignVertical: "top" }}
                  placeholder="اكتب رأيك (اختياري)"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                />
                <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => { if (reviewRating > 0) reviewMutation.mutate(); }}
                    disabled={reviewRating === 0 || reviewMutation.isPending}
                    style={{ flex: 1, backgroundColor: Colors.light.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: reviewRating === 0 ? 0.5 : 1 }}
                  >
                    {reviewMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" }}>إرسال</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => { setShowReviewForm(false); setReviewRating(0); setReviewComment(""); }}
                    style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.light.border }}
                  >
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.textSecondary }}>إلغاء</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {reviewsData && reviewsData.length > 0 ? (
              reviewsData.slice(0, 5).map((review, idx) => (
                <View key={idx} style={{ paddingVertical: 12, borderBottomWidth: idx < Math.min(reviewsData.length, 5) - 1 ? 1 : 0, borderBottomColor: Colors.light.border }}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(124,58,237,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.light.accent }}>{review.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.text, flex: 1, textAlign: "right", writingDirection: "rtl" }}>{review.username}</Text>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name={s <= review.rating ? "star" : "star-outline"} size={14} color="#F59E0B" />
                      ))}
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "right", writingDirection: "rtl", marginEnd: 40 }}>{review.comment}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", writingDirection: "rtl", paddingVertical: 16 }}>لا توجد تقييمات بعد. كن أول من يقيّم!</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {isActive && (
        <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16) }]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)", "#FFFFFF"]}
            style={styles.bottomGradient}
          />
          <View style={styles.bottomContent}>
            <View style={styles.bottomLeft}>
              <Text style={styles.bottomPriceLabel}>الإجمالي</Text>
              <Text style={styles.bottomPrice}>{totalPrice} $</Text>
              <Text style={styles.bottomQty}>{quantity} منتج</Text>
            </View>
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <Animated.View style={buyBtnAnimStyle}>
                <Pressable
                  onPressIn={() => { buyBtnScale.value = withSpring(0.93, { damping: 15, stiffness: 300 }); }}
                  onPressOut={() => { buyBtnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                  onPress={() => {
                    if (!user) {
                      router.push("/auth");
                      return;
                    }
                    if (needsVariant) {
                      Alert.alert("تنبيه", "يرجى اختيار الموديل أولاً");
                      return;
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({ pathname: "/checkout", params: { campaignId: id, quantity: String(quantity), productId: selectedProductId || "" } });
                  }}
                  style={styles.buyButton}
                >
                  <LinearGradient
                    colors={[Colors.light.accent, Colors.light.accentDark]}
                    style={styles.buyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={styles.buyButtonText}>اشترِ الآن</Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
              <Animated.View style={cartBtnAnimStyle}>
                <Pressable
                  onPressIn={() => { cartBtnScale.value = withSpring(0.88, { damping: 15, stiffness: 300 }); }}
                  onPressOut={() => { cartBtnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                  onPress={() => {
                    if (!user) {
                      router.push("/auth");
                      return;
                    }
                    if (needsVariant) {
                      Alert.alert("تنبيه", "يرجى اختيار الموديل أولاً");
                      return;
                    }
                    if (campaign) {
                      addItem(campaign, quantity, selectedProduct || undefined);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setAddedToCart(true);
                      setTimeout(() => setAddedToCart(false), 2000);
                    }
                  }}
                  style={[
                    styles.addToCartButton,
                    addedToCart && { borderColor: Colors.light.success },
                  ]}
                >
                  <Ionicons name={addedToCart ? "checkmark-circle" : "cart-outline"} size={20} color={addedToCart ? Colors.light.success : Colors.light.accent} />
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      )}
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
    position: "relative",
    minHeight: 300,
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    flex: 1,
    paddingBottom: 36,
  },
  backButton: {
    padding: 16,
    alignSelf: "flex-end",
  },
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCenter: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  prizeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    writingDirection: "rtl",
  },
  prizeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.25)",
  },
  prizeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#A78BFA",
  },
  content: {
    padding: 16,
    marginTop: -20,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  progressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
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
    fontSize: 20,
    color: Colors.light.accent,
  },
  progressBarWrap: {
    marginBottom: 18,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: Colors.light.progressBg,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressStats: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
  },
  progressStat: {
    alignItems: "center",
    gap: 4,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressStatNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
  },
  progressStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },

  quantityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  quantityHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  quantityTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    writingDirection: "rtl",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 14,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.progressBg,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyValueWrap: {
    width: 64,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(124, 58, 237, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
  },
  qtyValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.light.text,
  },
  quantityPriceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  quantityPriceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  quantityPriceTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.accent,
  },

  detailSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  detailHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  detailTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 24,
    textAlign: "right",
    writingDirection: "rtl",
  },
  priceCard: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  priceCardLeft: {},
  priceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textAlign: "right",
    writingDirection: "rtl",
  },
  priceValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  priceCurrency: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.light.accent,
    marginBottom: 3,
    marginEnd: 2,
  },
  priceValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: Colors.light.text,
  },
  priceIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(124, 58, 237, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  winnerCard: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 12,
  },
  winnerGradient: {
    padding: 28,
    alignItems: "center",
  },
  winnerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#fff",
    marginTop: 12,
    writingDirection: "rtl",
  },
  winnerTicket: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
    writingDirection: "rtl",
  },
  soldOutBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(243, 156, 18, 0.08)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(243, 156, 18, 0.2)",
    marginBottom: 12,
  },
  soldOutIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(243, 156, 18, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.warning,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  bottomGradient: {
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    height: 30,
  },
  bottomContent: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomLeft: {
    alignItems: "flex-end",
  },
  bottomPriceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  bottomPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.light.text,
    writingDirection: "rtl",
  },
  bottomQty: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    writingDirection: "rtl",
  },
  addToCartButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.light.accent,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  buyButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  buyButtonGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  buyButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  countdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  countdownHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  countdownTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#EF4444",
    writingDirection: "rtl",
  },
  countdownBoxes: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  countdownBox: {
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.06)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 60,
  },
  countdownBoxNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#EF4444",
  },
  countdownBoxLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
    writingDirection: "rtl",
  },
  countdownBoxSep: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#EF4444",
  },
  variantOption: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  variantOptionSelected: {
    borderColor: Colors.light.accent,
    backgroundColor: "rgba(124,58,237,0.04)",
  },
  variantOptionDisabled: {
    opacity: 0.5,
  },
  variantName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl" as const,
  },
  variantSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl" as const,
    marginTop: 2,
  },
  variantPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.text,
  },
});
