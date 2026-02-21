import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

type PageType = "about" | "terms" | "privacy" | "contact";

const PAGE_CONFIG: Record<PageType, {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
}> = {
  about: {
    title: "عن التطبيق",
    icon: "information-circle",
    colors: ["#7C3AED", "#6D28D9"],
  },
  terms: {
    title: "الشروط والأحكام",
    icon: "document-text",
    colors: ["#8B5CF6", "#7C3AED"],
  },
  privacy: {
    title: "سياسة الخصوصية",
    icon: "shield-checkmark",
    colors: ["#06B6D4", "#0891B2"],
  },
  contact: {
    title: "تواصل معنا",
    icon: "chatbubble-ellipses",
    colors: ["#10B981", "#059669"],
  },
};

function AboutContent() {
  return (
    <>
      <ContentCard title="ما هو لاكي درو؟">
        <Text style={styles.paragraph}>
          لاكي درو هو متجر إلكتروني يقدم منتجات مميزة بأسعار مناسبة، ومع كل عملية شراء تحصل على تذكرة سحب تؤهلك للفوز بجوائز قيمة. نقدم تجربة تسوّق آمنة وشفافة مع نظام سحب عادل يضمن فرصاً متساوية لجميع المشترين.
        </Text>
      </ContentCard>
      <ContentCard title="كيف يعمل التطبيق؟">
        <BulletPoint text="تصفّح المنتجات المتاحة واختر ما يناسبك" />
        <BulletPoint text="اشترِ المنتج وأكمل عملية الدفع" />
        <BulletPoint text="تحصل تلقائياً على تذكرة سحب مع كل منتج" />
        <BulletPoint text="انتظر حتى تُباع جميع المنتجات في الحملة" />
        <BulletPoint text="يتم السحب تلقائياً وبشفافية تامة" />
        <BulletPoint text="يتم إبلاغ الفائز وشحن الجائزة" />
      </ContentCard>
      <ContentCard title="مميزاتنا">
        <FeatureRow icon="shield-checkmark" text="سحب عشوائي آمن ومشفّر" color="#10B981" />
        <FeatureRow icon="card" text="خيارات دفع متعددة" color="#3B82F6" />
        <FeatureRow icon="gift" text="جوائز حقيقية ومضمونة" color="#F59E0B" />
        <FeatureRow icon="airplane" text="شحن سريع لجميع المناطق" color="#8B5CF6" />
        <FeatureRow icon="headset" text="دعم فني على مدار الساعة" color="#EC4899" />
      </ContentCard>
      <View style={styles.versionBox}>
        <Text style={styles.versionLabel}>الإصدار</Text>
        <Text style={styles.versionValue}>1.0.0</Text>
      </View>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <ContentCard title="١. القبول بالشروط">
        <Text style={styles.paragraph}>
          باستخدامك لتطبيق لاكي درو، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يُرجى عدم استخدام التطبيق.
        </Text>
      </ContentCard>
      <ContentCard title="٢. الأهلية">
        <Text style={styles.paragraph}>
          يجب أن يكون عمرك 18 عاماً أو أكثر لاستخدام هذا التطبيق. بالتسجيل، أنت تؤكد أنك تستوفي هذا الشرط.
        </Text>
      </ContentCard>
      <ContentCard title="٣. الحساب والأمان">
        <Text style={styles.paragraph}>
          أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور. يجب إبلاغنا فوراً عن أي استخدام غير مصرح به.
        </Text>
      </ContentCard>
      <ContentCard title="٤. عمليات الشراء والدفع">
        <Text style={styles.paragraph}>
          جميع عمليات الشراء نهائية وغير قابلة للاسترجاع بعد تأكيد الدفع. يتم التحقق من جميع المدفوعات قبل تأكيد الطلب ومنح تذكرة السحب.
        </Text>
      </ContentCard>
      <ContentCard title="٥. السحب والجوائز">
        <Text style={styles.paragraph}>
          يتم السحب بشكل عشوائي باستخدام خوارزميات مشفّرة عند اكتمال بيع جميع المنتجات في الحملة. نتائج السحب نهائية وغير قابلة للاعتراض. يتم شحن المنتجات والجوائز خلال 14 يوم عمل.
        </Text>
      </ContentCard>
      <ContentCard title="٦. التعديلات">
        <Text style={styles.paragraph}>
          نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إبلاغك بأي تغييرات جوهرية.
        </Text>
      </ContentCard>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <ContentCard title="المعلومات التي نجمعها">
        <BulletPoint text="بيانات الحساب: اسم المستخدم، البريد الإلكتروني" />
        <BulletPoint text="بيانات الطلبات: تاريخ الشراء، المبالغ، المنتجات" />
        <BulletPoint text="بيانات الشحن: العنوان، رقم الهاتف، المدينة" />
        <BulletPoint text="إيصالات الدفع: صور إيصالات التحويل البنكي" />
      </ContentCard>
      <ContentCard title="كيف نستخدم بياناتك">
        <BulletPoint text="معالجة طلباتك ومنحك تذاكر السحب" />
        <BulletPoint text="التحقق من المدفوعات" />
        <BulletPoint text="شحن الجوائز للفائزين" />
        <BulletPoint text="تحسين تجربة المستخدم" />
        <BulletPoint text="التواصل معك بشأن طلباتك" />
      </ContentCard>
      <ContentCard title="حماية البيانات">
        <Text style={styles.paragraph}>
          نستخدم تقنيات تشفير متقدمة لحماية بياناتك الشخصية. لن نشارك معلوماتك مع أطراف ثالثة إلا بموافقتك أو عند الحاجة القانونية.
        </Text>
      </ContentCard>
      <ContentCard title="حقوقك">
        <BulletPoint text="طلب نسخة من بياناتك الشخصية" />
        <BulletPoint text="تصحيح أو تحديث بياناتك" />
        <BulletPoint text="طلب حذف حسابك وبياناتك" />
        <BulletPoint text="إلغاء الاشتراك في الإشعارات" />
      </ContentCard>
    </>
  );
}

function ContactContent() {
  const contactItems = [
    {
      icon: "mail" as const,
      label: "البريد الإلكتروني",
      value: "support@luckydraw.app",
      color: "#3B82F6",
      onPress: () => Linking.openURL("mailto:support@luckydraw.app"),
    },
    {
      icon: "logo-whatsapp" as const,
      label: "واتساب",
      value: "+966 50 000 0000",
      color: "#25D366",
      onPress: () => Linking.openURL("https://wa.me/966500000000"),
    },
    {
      icon: "logo-twitter" as const,
      label: "تويتر",
      value: "@luckydraw_app",
      color: "#1DA1F2",
      onPress: () => Linking.openURL("https://twitter.com/luckydraw_app"),
    },
    {
      icon: "logo-instagram" as const,
      label: "انستقرام",
      value: "@luckydraw.app",
      color: "#E4405F",
      onPress: () => Linking.openURL("https://instagram.com/luckydraw.app"),
    },
  ];

  return (
    <>
      <ContentCard title="تواصل معنا">
        <Text style={styles.paragraph}>
          فريق الدعم متاح لمساعدتك على مدار الساعة. لا تتردد في التواصل معنا لأي استفسار أو ملاحظة.
        </Text>
      </ContentCard>
      <View style={styles.contactList}>
        {contactItems.map((item) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.contactItem,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={[styles.contactIconWrap, { backgroundColor: item.color + "15" }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{item.label}</Text>
              <Text style={styles.contactValue}>{item.value}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={Colors.light.textSecondary} />
          </Pressable>
        ))}
      </View>
      <ContentCard title="ساعات العمل">
        <FeatureRow icon="time" text="السبت - الخميس: 9 صباحاً - 9 مساءً" color="#7C3AED" />
        <FeatureRow icon="time" text="الجمعة: 2 ظهراً - 9 مساءً" color="#EC4899" />
      </ContentCard>
    </>
  );
}

function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.contentCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function FeatureRow({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIconWrap, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export default function InfoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type: string }>();
  const pageType = (params.type || "about") as PageType;
  const config = PAGE_CONFIG[pageType] || PAGE_CONFIG.about;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={config.colors}
        style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>{config.title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.headerIconArea}>
          <View style={styles.headerIconCircle}>
            <Ionicons name={config.icon} size={32} color="#fff" />
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
        {pageType === "about" && <AboutContent />}
        {pageType === "terms" && <TermsContent />}
        {pageType === "privacy" && <PrivacyContent />}
        {pageType === "contact" && <ContactContent />}
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
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  contentCardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 14,
  },
  paragraph: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  versionBox: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  versionLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  versionValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.accent,
  },
  contactList: {
    gap: 10,
    marginBottom: 14,
  },
  contactItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  contactValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
});
