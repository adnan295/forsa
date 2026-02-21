import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const FAQ_DATA = [
  {
    question: "ما هو لاكي درو؟",
    answer: "لاكي درو هو متجر إلكتروني يقدم منتجات حقيقية مع فرصة للفوز بجوائز قيمة. عند شراء أي منتج، تحصل على تذكرة سحب تلقائياً كمكافأة إضافية.",
  },
  {
    question: "كيف تتم عملية الشراء؟",
    answer: "اختر المنتج الذي تريده، حدد الكمية، ثم أتم عملية الدفع. يمكنك الدفع عن طريق التحويل البنكي. بعد تأكيد الدفع، ستحصل على تذكرة سحب لكل منتج.",
  },
  {
    question: "كيف يتم السحب على الجوائز؟",
    answer: "عندما تنفد كمية المنتج بالكامل، يتم إجراء سحب عشوائي وشفاف لاختيار الفائز من بين جميع حاملي التذاكر.",
  },
  {
    question: "هل المنتجات حقيقية؟",
    answer: "نعم، جميع المنتجات حقيقية وأصلية ويتم شحنها إلى عنوانك. تذكرة السحب هي مكافأة إضافية مع كل عملية شراء.",
  },
  {
    question: "كيف أرفع إيصال الدفع؟",
    answer: 'بعد إتمام الطلب بالتحويل البنكي، ادخل على صفحة الطلب واضغط على زر "رفع إيصال الدفع" واختر صورة الإيصال من جهازك.',
  },
  {
    question: "كم يستغرق تأكيد الدفع؟",
    answer: "عادةً يتم مراجعة الإيصال وتأكيد الدفع خلال ٢٤ ساعة من رفع الإيصال.",
  },
  {
    question: "كيف أتابع حالة طلبي؟",
    answer: 'يمكنك متابعة حالة طلبك من صفحة "طلباتي" حيث تظهر حالة الدفع والشحن ورقم التتبع.',
  },
  {
    question: "هل يمكنني إلغاء طلبي؟",
    answer: "يمكنك التواصل معنا لإلغاء الطلب قبل شحنه. بعد الشحن لا يمكن الإلغاء.",
  },
  {
    question: "هل بياناتي آمنة؟",
    answer: "نعم، نحن نستخدم أحدث تقنيات الأمان لحماية بياناتك الشخصية ومعلومات الدفع.",
  },
  {
    question: "كيف أتواصل مع الدعم؟",
    answer: 'يمكنك التواصل معنا عبر صفحة "تواصل معنا" في التطبيق أو عبر البريد الإلكتروني.',
  },
];

function FAQItem({
  item,
  index,
  expandedIndex,
  onToggle,
}: {
  item: { question: string; answer: string };
  index: number;
  expandedIndex: number | null;
  onToggle: (index: number) => void;
}) {
  const isExpanded = expandedIndex === index;

  return (
    <View style={styles.faqCard}>
      <Pressable
        onPress={() => onToggle(index)}
        style={({ pressed }) => [
          styles.questionRow,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.questionContent}>
          <View style={styles.questionNumberWrap}>
            <Text style={styles.questionNumber}>{index + 1}</Text>
          </View>
          <Text style={styles.questionText}>{item.question}</Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={Colors.light.accent}
        />
      </Pressable>
      {isExpanded && (
        <View style={styles.answerContainer}>
          <View style={styles.answerDivider} />
          <Text style={styles.answerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7C3AED", "#6D28D9"]}
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12 },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>الأسئلة الشائعة</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.headerIconArea}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="help-circle" size={32} color="#fff" />
          </View>
        </View>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: Platform.OS === "web" ? 84 : 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {FAQ_DATA.map((item, index) => (
          <FAQItem
            key={index}
            item={item}
            index={index}
            expandedIndex={expandedIndex}
            onToggle={handleToggle}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingBottom: 30,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    writingDirection: "rtl",
  },
  headerIconArea: {
    alignItems: "center",
    zIndex: 2,
  },
  headerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerDecor1: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerDecor2: {
    position: "absolute",
    bottom: -40,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  faqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  questionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  questionContent: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  questionNumberWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.light.accent + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  questionNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.light.accent,
  },
  questionText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  answerContainer: {
    marginTop: 14,
  },
  answerDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 14,
  },
  answerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },
});
