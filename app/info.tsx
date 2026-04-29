import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

type PageType = "about" | "terms" | "privacy" | "contact";

const PAGE_CONFIG: Record<PageType, {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
}> = {
  about: {
    title: "عن التطبيق",
    icon: "information-circle",
    colors: ["#7C3AED", "#EC4899"],
  },
  terms: {
    title: "الشروط والأحكام",
    icon: "document-text",
    colors: ["#A855F7", "#EC4899"],
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
      <ContentCard title="ما هو فرصة؟">
        <Text style={styles.paragraph}>
          فرصة هو متجر إلكتروني يقدم منتجات مميزة بأسعار مناسبة، ومع كل عملية شراء تحصل على فرصة للحصول على هدايا قيمة. نقدم تجربة تسوّق آمنة وشفافة مع نظام هدايا عادل يضمن فرصاً متساوية لجميع المشترين.
        </Text>
      </ContentCard>
      <ContentCard title="كيف يعمل التطبيق؟">
        <BulletPoint text="تصفّح المنتجات المتاحة واختر ما يناسبك" />
        <BulletPoint text="اشترِ المنتج وأكمل عملية الدفع" />
        <BulletPoint text="تحصل تلقائياً على فرصة هدية مع كل منتج" />
        <BulletPoint text="انتظر حتى تُباع جميع المنتجات في الحملة" />
        <BulletPoint text="يتم اختيار الفائز بالهدية بشفافية تامة" />
        <BulletPoint text="يتم إبلاغ الفائز وشحن الهدية" />
      </ContentCard>
      <ContentCard title="مميزاتنا">
        <FeatureRow icon="shield-checkmark" text="اختيار عشوائي آمن ومشفّر" color="#10B981" />
        <FeatureRow icon="card" text="خيارات دفع متعددة" color="#3B82F6" />
        <FeatureRow icon="gift" text="هدايا حقيقية ومضمونة" color="#F59E0B" />
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
          باستخدامك لتطبيق فرصة، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يُرجى عدم استخدام التطبيق.
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
          جميع عمليات الشراء نهائية وغير قابلة للاسترجاع بعد تأكيد الدفع. يتم التحقق من جميع المدفوعات قبل تأكيد الطلب. مع كل عملية شراء تحصل على فرصة للحصول على هدية.
        </Text>
      </ContentCard>
      <ContentCard title="٥. الهدايا">
        <Text style={styles.paragraph}>
          يتم اختيار الفائز بالهدية بشكل عشوائي عند اكتمال بيع جميع المنتجات في الحملة. يتم شحن المنتجات والهدايا خلال 14 يوم عمل.
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
        <BulletPoint text="معالجة طلباتك وتوصيل الهدايا" />
        <BulletPoint text="التحقق من المدفوعات" />
        <BulletPoint text="شحن المنتجات والهدايا للفائزين" />
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

interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high";
  adminReply?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "مفتوحة", color: "#F59E0B", bg: "#FEF3C7" },
  in_progress: { label: "قيد المعالجة", color: "#3B82F6", bg: "#DBEAFE" },
  closed: { label: "مغلقة", color: "#10B981", bg: "#D1FAE5" },
};

const PRIORITY_OPTIONS: { value: "low" | "medium" | "high"; label: string; color: string }[] = [
  { value: "low", label: "منخفضة", color: "#10B981" },
  { value: "medium", label: "متوسطة", color: "#F59E0B" },
  { value: "high", label: "عالية", color: "#EF4444" },
];

function TicketStatusPill({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <View style={[ticketStyles.statusPill, { backgroundColor: config.bg }]}>
      <Text style={[ticketStyles.statusPillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function TicketDetailView({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const priorityConfig = PRIORITY_OPTIONS.find((p) => p.value === ticket.priority);
  return (
    <>
      <Pressable onPress={onBack} style={ticketStyles.backRow}>
        <Ionicons name="chevron-forward" size={20} color={Colors.light.accent} />
        <Text style={ticketStyles.backText}>العودة للتذاكر</Text>
      </Pressable>
      <ContentCard title={ticket.subject}>
        <View style={ticketStyles.detailMeta}>
          <TicketStatusPill status={ticket.status} />
          {priorityConfig && (
            <View style={[ticketStyles.statusPill, { backgroundColor: priorityConfig.color + "20" }]}>
              <Text style={[ticketStyles.statusPillText, { color: priorityConfig.color }]}>
                {priorityConfig.label}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.paragraph, { marginTop: 12 }]}>{ticket.message}</Text>
        <Text style={ticketStyles.dateText}>
          {new Date(ticket.createdAt).toLocaleDateString("ar-SA", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </ContentCard>
      {ticket.adminReply && (
        <ContentCard title="رد الإدارة">
          <View style={ticketStyles.adminReplyBox}>
            <Ionicons name="chatbubble" size={16} color={Colors.light.accent} />
            <Text style={[styles.paragraph, { flex: 1 }]}>{ticket.adminReply}</Text>
          </View>
        </ContentCard>
      )}
    </>
  );
}

function TicketForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/support-tickets", { subject, message, priority });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      onSuccess();
    },
    onError: (error: Error) => {
      Alert.alert("خطأ", error.message || "حدث خطأ أثناء إنشاء التذكرة");
    },
  });

  const isValid = subject.trim().length > 0 && message.trim().length > 0;

  return (
    <>
      <Pressable onPress={onCancel} style={ticketStyles.backRow}>
        <Ionicons name="chevron-forward" size={20} color={Colors.light.accent} />
        <Text style={ticketStyles.backText}>العودة للتذاكر</Text>
      </Pressable>
      <ContentCard title="تذكرة جديدة">
        <Text style={ticketStyles.fieldLabel}>الموضوع</Text>
        <TextInput
          style={ticketStyles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="أدخل موضوع التذكرة"
          placeholderTextColor={Colors.light.textSecondary}
          textAlign="right"
        />
        <Text style={ticketStyles.fieldLabel}>الرسالة</Text>
        <TextInput
          style={[ticketStyles.input, ticketStyles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="اكتب رسالتك بالتفصيل..."
          placeholderTextColor={Colors.light.textSecondary}
          textAlign="right"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={ticketStyles.fieldLabel}>الأولوية</Text>
        <View style={ticketStyles.priorityRow}>
          {PRIORITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setPriority(opt.value)}
              style={[
                ticketStyles.priorityOption,
                priority === opt.value && { backgroundColor: opt.color + "20", borderColor: opt.color },
              ]}
            >
              <Text
                style={[
                  ticketStyles.priorityOptionText,
                  priority === opt.value && { color: opt.color, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => createMutation.mutate()}
          disabled={!isValid || createMutation.isPending}
          style={[ticketStyles.submitBtn, (!isValid || createMutation.isPending) && { opacity: 0.5 }]}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={ticketStyles.submitBtnText}>إرسال التذكرة</Text>
            </>
          )}
        </Pressable>
      </ContentCard>
    </>
  );
}

function ContactContent() {
  const { user } = useAuth();
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const ticketsQuery = useQuery<SupportTicket[]>({
    queryKey: ["/api/support-tickets"],
    enabled: !!user,
  });

  const tickets = ticketsQuery.data || [];

  if (view === "form" && user) {
    return (
      <TicketForm
        onCancel={() => setView("list")}
        onSuccess={() => setView("list")}
      />
    );
  }

  if (view === "detail" && selectedTicket) {
    return (
      <TicketDetailView
        ticket={selectedTicket}
        onBack={() => {
          setSelectedTicket(null);
          setView("list");
        }}
      />
    );
  }

  return (
    <>
      <ContentCard title="تواصل معنا">
        <Text style={styles.paragraph}>
          فريق الدعم متاح لمساعدتك على مدار الساعة. أرسل تذكرة دعم وسنرد عليك في أقرب وقت.
        </Text>
      </ContentCard>

      {user && (
        <>
          <Pressable
            onPress={() => setView("form")}
            style={({ pressed }) => [
              ticketStyles.newTicketBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={[Colors.light.accent, Colors.light.accentDark]}
              style={ticketStyles.newTicketGradient}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={ticketStyles.newTicketText}>تذكرة دعم جديدة</Text>
            </LinearGradient>
          </Pressable>

          {ticketsQuery.isLoading ? (
            <View style={ticketStyles.loadingBox}>
              <ActivityIndicator color={Colors.light.accent} />
            </View>
          ) : tickets.length > 0 ? (
            <View style={styles.contactList}>
              {tickets.map((ticket) => (
                <Pressable
                  key={ticket.id}
                  onPress={() => {
                    setSelectedTicket(ticket);
                    setView("detail");
                  }}
                  style={({ pressed }) => [
                    styles.contactItem,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={[styles.contactIconWrap, { backgroundColor: Colors.light.accent + "15" }]}>
                    <Ionicons name="ticket" size={22} color={Colors.light.accent} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel} numberOfLines={1}>{ticket.subject}</Text>
                    <View style={ticketStyles.ticketMetaRow}>
                      <TicketStatusPill status={ticket.status} />
                      <Text style={ticketStyles.ticketDate}>
                        {new Date(ticket.createdAt).toLocaleDateString("ar-SA")}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-back" size={18} color={Colors.light.textSecondary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={ticketStyles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.light.textSecondary} />
              <Text style={ticketStyles.emptyText}>لا توجد تذاكر دعم حالياً</Text>
            </View>
          )}
        </>
      )}

      <View style={styles.contactList}>
        <Pressable
          onPress={() => Linking.openURL("mailto:info@forsa.app")}
          style={({ pressed }) => [
            styles.contactItem,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={[styles.contactIconWrap, { backgroundColor: "#3B82F6" + "15" }]}>
            <Ionicons name="mail" size={22} color="#3B82F6" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>البريد الإلكتروني</Text>
            <Text style={styles.contactValue}>info@forsa.app</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={Colors.light.textSecondary} />
        </Pressable>
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
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
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

const ticketStyles = StyleSheet.create({
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  backText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.accent,
    writingDirection: "rtl",
  },
  detailMeta: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 14,
  },
  adminReplyBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.light.accent + "08",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.accent + "20",
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.light.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.text,
    writingDirection: "rtl",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textArea: {
    minHeight: 120,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBg,
  },
  priorityOptionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 20,
  },
  submitBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  newTicketBtn: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden",
  },
  newTicketGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
  newTicketText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 10,
    marginBottom: 14,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  ticketMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  ticketDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
});
