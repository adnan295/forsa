import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Alert } from "@/lib/alert";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";
import { translateError } from "@/lib/errors";
import Colors, { Fonts, FontSize, Radius, Spacing, StatusColors } from "@/constants/colors";
import { Header, Button, Card, Field, StatusBadge, EmptyState } from "@/components/ui";
import type { SupportTicket } from "@shared/schema";

const c = Colors.light;

type PageType = "about" | "terms" | "privacy" | "contact";

/** قسم محتوى: فقرة، أو قائمة نقاط، أو صف ميزة بأيقونة */
type Section =
  | { kind: "text"; title: string; body: string }
  | { kind: "bullets"; title: string; items: string[] }
  | { kind: "features"; title: string; items: { icon: keyof typeof Ionicons.glyphMap; text: string }[] };

const PAGE_TITLE: Record<PageType, string> = {
  about: "عن التطبيق",
  terms: "الشروط والأحكام",
  privacy: "سياسة الخصوصية",
  contact: "تواصل معنا",
};

const CONTENT: Record<Exclude<PageType, "contact">, Section[]> = {
  about: [
    {
      kind: "text",
      title: "ما هو NAYVO؟",
      body: "NAYVO متجر إلكتروني بيقدّم منتجات مميزة بأسعار مناسبة، ومع كل عملية شراء بتحصل على فرص لدخول سحب على جوائز قيّمة. تجربة تسوّق آمنة وشفافة، ونظام سحب عادل بيضمن فرص متساوية لكل المشترين.",
    },
    {
      kind: "bullets",
      title: "كيف بيشتغل التطبيق؟",
      items: [
        "تصفّح المنتجات واختر اللي بيناسبك",
        "اشترِ وأكمل عملية الدفع",
        "بعد تأكيد الدفع بتنمنحك فرص السحب تلقائياً",
        "كل مبلغ محدّد من قيمة المنتجات = فرصة وحدة",
        "لما ينباع كامل عدد فرص الجولة بيصير السحب",
        "بنبلّغ الفائز وبنشحنله الجائزة",
      ],
    },
    {
      kind: "features",
      title: "مميزاتنا",
      items: [
        { icon: "shield-checkmark", text: "اختيار عشوائي آمن ومشفّر" },
        { icon: "card", text: "خيارات دفع متعددة" },
        { icon: "gift", text: "جوائز حقيقية ومضمونة" },
        { icon: "airplane", text: "شحن لجميع المناطق" },
        { icon: "headset", text: "دعم عبر تذاكر داخل التطبيق" },
      ],
    },
  ],

  terms: [
    {
      kind: "text",
      title: "١. القبول بالشروط",
      body: "باستخدامك لتطبيق NAYVO، أنت بتوافق على الالتزام بهذه الشروط والأحكام. إذا ما كنت موافق على أي جزء منها، يُرجى عدم استخدام التطبيق.",
    },
    {
      kind: "text",
      title: "٢. الأهلية",
      body: "لازم يكون عمرك 18 سنة أو أكثر لاستخدام التطبيق. بالتسجيل أنت بتأكّد إنك مستوفي هذا الشرط.",
    },
    {
      kind: "text",
      title: "٣. الحساب والأمان",
      body: "أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة السر. لازم تبلّغنا فوراً عن أي استخدام غير مصرّح به.",
    },
    {
      kind: "text",
      title: "٤. الشراء والدفع",
      body: "كل عمليات الشراء نهائية وغير قابلة للاسترجاع بعد تأكيد الدفع. بنتحقق من كل المدفوعات قبل تأكيد الطلب. فرص السحب بتنمنح بعد تأكيد الدفع فقط.",
    },
    {
      kind: "bullets",
      title: "٥. آلية السحب",
      items: [
        "كل جولة سحب إلها جائزة محدّدة وعدد فرص مستهدف",
        "قيمة المنتجات بعد الخصم هي أساس احتساب الفرص — رسوم التوصيل ما بتُحتسب",
        "لما ينباع كامل عدد فرص الجولة بتصير جاهزة للسحب",
        "الفائز بينختار عشوائياً من كل الفرص المؤكدة بالجولة",
        "إذا الطلب انرفض دفعه، فرصه بتنلغى",
        "بنشحن المنتجات والجوائز خلال 14 يوم عمل",
      ],
    },
    {
      kind: "text",
      title: "٦. التعديلات",
      body: "بنحتفظ بالحق في تعديل هذه الشروط بأي وقت، وبنبلّغك بأي تغييرات جوهرية.",
    },
  ],

  privacy: [
    {
      kind: "bullets",
      title: "المعلومات التي نجمعها",
      items: [
        "بيانات الحساب: اسم المستخدم والبريد الإلكتروني",
        "بيانات الطلبات: تاريخ الشراء والمبالغ والمنتجات",
        "بيانات الشحن: العنوان ورقم الهاتف والمدينة",
        "إيصالات الدفع: صور إيصالات التحويل البنكي",
      ],
    },
    {
      kind: "bullets",
      title: "كيف نستخدم بياناتك",
      items: [
        "معالجة طلباتك وتوصيلها",
        "التحقق من المدفوعات",
        "شحن المنتجات والجوائز للفائزين",
        "تحسين تجربة الاستخدام",
        "التواصل معك بخصوص طلباتك",
      ],
    },
    {
      kind: "text",
      title: "حماية البيانات",
      body: "بنستخدم تقنيات تشفير لحماية بياناتك الشخصية. ما بنشارك معلوماتك مع أطراف ثالثة إلا بموافقتك أو عند الحاجة القانونية.",
    },
    {
      kind: "bullets",
      title: "حقوقك",
      items: [
        "طلب نسخة من بياناتك الشخصية",
        "تصحيح أو تحديث بياناتك",
        "طلب حذف حسابك وبياناتك",
        "إلغاء الاشتراك في الإشعارات",
      ],
    },
  ],
};

const TICKET_STATUS: Record<string, { label: string; kind: "success" | "warning" | "info" }> = {
  open: { label: "مفتوحة", kind: "warning" },
  replied: { label: "تم الرد", kind: "success" },
  closed: { label: "مغلقة", kind: "info" },
};

const PRIORITIES = [
  { key: "low" as const, label: "عادية" },
  { key: "medium" as const, label: "متوسطة" },
  { key: "high" as const, label: "عاجلة" },
];

/* ─────────────────────── نموذج تذكرة الدعم ─────────────────────── */

function TicketForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/support-tickets", { subject: subject.trim(), message: message.trim(), priority }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      onDone();
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("تعذّر الإرسال", translateError(error.message));
    },
  });

  function submit() {
    const next: Record<string, string> = {};
    if (subject.trim().length < 3) next.subject = "الموضوع مطلوب";
    if (message.trim().length < 10) next.message = "الرسالة قصيرة — وضّح أكثر";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    createMutation.mutate();
  }

  return (
    <Card title="تذكرة جديدة" icon="create-outline">
      <Field
        label="الموضوع"
        value={subject}
        onChangeText={setSubject}
        placeholder="مثال: استفسار عن طلبي"
        error={errors.subject}
      />

      <Field
        label="الرسالة"
        value={message}
        onChangeText={setMessage}
        placeholder="اكتب تفاصيل استفسارك…"
        multiline
        error={errors.message}
      />

      <View style={s.field}>
        <Text style={s.fieldLabel}>الأولوية</Text>
        <View style={s.chipRow}>
          {PRIORITIES.map((p) => {
            const active = priority === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPriority(p.key);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[s.chip, active && s.chipActive]}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.formActions}>
        <Button label="إلغاء" variant="secondary" onPress={onCancel} style={s.flex} />
        <Button
          label="إرسال"
          onPress={submit}
          loading={createMutation.isPending}
          style={s.flex}
        />
      </View>
    </Card>
  );
}

/* ─────────────────────── صفحة التواصل ─────────────────────── */

function ContactPage() {
  const { user } = useAuth();
  const [composing, setComposing] = useState(false);

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support-tickets"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <EmptyState
        icon="chatbubble-ellipses-outline"
        title="سجّل الدخول للتواصل معنا"
        body="بتقدر تفتح تذكرة دعم ونتابع معك"
        action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
      />
    );
  }

  if (composing) {
    return <TicketForm onDone={() => setComposing(false)} onCancel={() => setComposing(false)} />;
  }

  const list = tickets ?? [];

  return (
    <>
      <Button
        label="تذكرة دعم جديدة"
        icon="add-circle-outline"
        onPress={() => setComposing(true)}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={c.primary} style={{ marginTop: Spacing.xl }} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="ما في تذاكر بعد"
          body="افتح تذكرة وبنرجعلك بأسرع وقت"
        />
      ) : (
        list.map((ticket) => {
          const state = TICKET_STATUS[ticket.status] ?? { label: ticket.status, kind: "info" as const };
          return (
            <Card key={ticket.id}>
              <View style={s.ticketHead}>
                <StatusBadge kind={state.kind} label={state.label} />
                <Text style={s.ticketSubject} numberOfLines={1}>
                  {ticket.subject}
                </Text>
              </View>

              <Text style={s.ticketMessage}>{ticket.message}</Text>

              <Text style={s.ticketDate}>
                {new Date(ticket.createdAt).toLocaleDateString("ar-EG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              {ticket.adminReply ? (
                <View style={s.replyBox}>
                  <View style={s.replyHead}>
                    <Ionicons name="chatbubble-ellipses" size={15} color={StatusColors.success.fg} />
                    <Text style={s.replyLabel}>رد الإدارة</Text>
                  </View>
                  <Text style={s.replyText}>{ticket.adminReply}</Text>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </>
  );
}

/* ─────────────────────── الشاشة ─────────────────────── */

export default function InfoScreen() {
  const params = useLocalSearchParams<{ type: string }>();
  const pageType = (params.type || "about") as PageType;

  const sections = pageType === "contact" ? [] : CONTENT[pageType] ?? CONTENT.about;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={PAGE_TITLE[pageType] ?? PAGE_TITLE.about} showBack />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {pageType === "contact" ? (
            <ContactPage />
          ) : (
            <>
              {sections.map((section) => (
                <Card key={section.title} title={section.title}>
                  {section.kind === "text" && <Text style={s.paragraph}>{section.body}</Text>}

                  {section.kind === "bullets" &&
                    section.items.map((item, i) => (
                      <View key={i} style={s.bulletRow}>
                        <Text style={s.bulletText}>{item}</Text>
                        <View style={s.bulletDot} />
                      </View>
                    ))}

                  {section.kind === "features" &&
                    section.items.map((item, i) => (
                      <View key={i} style={s.featureRow}>
                        <Text style={s.featureText}>{item.text}</Text>
                        <View style={s.featureIcon}>
                          <Ionicons name={item.icon} size={18} color={c.primary} />
                        </View>
                      </View>
                    ))}
                </Card>
              ))}

              {pageType === "about" && (
                <Text style={s.version}>NAYVO · الإصدار 1.1.0</Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  content: { padding: Spacing.screen, paddingBottom: 40, gap: Spacing.md },

  paragraph: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },

  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.primary,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 23,
  },

  featureRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.button,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },

  version: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
  },

  field: { gap: 6 },
  fieldLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  chipRow: { flexDirection: "row", gap: Spacing.sm },
  chip: {
    flex: 1,
    height: 42,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    writingDirection: "rtl",
  },
  chipTextActive: { color: c.surface },
  formActions: { flexDirection: "row", gap: Spacing.md },

  ticketHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  ticketSubject: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  ticketMessage: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  ticketDate: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  replyBox: {
    backgroundColor: StatusColors.success.bg,
    borderRadius: Radius.button,
    padding: Spacing.md,
    gap: 6,
  },
  replyHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  replyLabel: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.label,
    color: StatusColors.success.fg,
    writingDirection: "rtl",
  },
  replyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: StatusColors.success.fg,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
});
