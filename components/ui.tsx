import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors, { Fonts, FontSize, Radius, Sizing, Spacing, StatusColors } from "@/constants/colors";

const c = Colors.light;

/* ────────────────────────── الشعار ────────────────────────── */

/** «فرصة» بالكحلي والتاج بالذهبي — وعلى الخلفيات الكحلية الكلمة بيضاء */
export function Logo({ onNavy = false, size = 22 }: { onNavy?: boolean; size?: number }) {
  return (
    <View style={s.logoWrap}>
      <Ionicons name="ribbon" size={size * 0.58} color={c.gold} style={s.logoCrown} />
      <Text style={[s.logoText, { fontSize: size, color: onNavy ? c.surface : c.navy }]}>
        فرصة
      </Text>
    </View>
  );
}

/* ────────────────────────── الهيدر ────────────────────────── */

interface HeaderProps {
  /** عنوان الشاشة — بدونه بيظهر الشعار لحاله بالنص */
  title?: string;
  showBack?: boolean;
  /** عنصر يظهر على يسار الشريط (جرس الإشعارات مثلاً) */
  right?: React.ReactNode;
}

/** شريط علوي أبيض: الشعار يمين، العنوان بالنص، وزر الرجوع يسار */
export function Header({ title, showBack = false, right }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.header, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={s.headerSide}>
        {showBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            style={s.headerIconBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <Ionicons name="chevron-back" size={24} color={c.navy} />
          </Pressable>
        ) : (
          right ?? <View style={s.headerIconBtn} />
        )}
      </View>

      {title ? <Text style={s.headerTitle}>{title}</Text> : <View />}

      <View style={[s.headerSide, s.headerSideEnd]}>
        {showBack && right ? right : null}
        <Logo />
      </View>
    </View>
  );
}

/* ────────────────────────── الأزرار ────────────────────────── */

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** primary: أزرق بنص أبيض · secondary: أزرق فاتح بنص أزرق · ghost: بدون خلفية */
  variant?: "primary" | "secondary" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  small = false,
  style,
  testID,
}: ButtonProps) {
  const isOff = disabled || loading;

  const bg = isOff
    ? StatusColors.disabled.bg
    : variant === "primary"
    ? c.primary
    : variant === "secondary"
    ? c.primarySoft
    : "transparent";

  const fg = isOff
    ? StatusColors.disabled.fg
    : variant === "primary"
    ? c.surface
    : c.primary;

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (isOff) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityState={{ disabled: isOff, busy: loading }}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor:
            pressed && !isOff && variant === "primary" ? c.primaryPressed : bg,
          height: small ? Sizing.buttonHeightSmall : Sizing.buttonHeight,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 18 : 20} color={fg} />}
          <Text style={[s.buttonText, { color: fg, fontSize: small ? FontSize.caption : FontSize.body }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/* ────────────────────────── الشارات ────────────────────────── */

type StatusKind = keyof typeof StatusColors;

/** شارة حالة — دائماً معها كلمة وأيقونة، ما بتعتمد على اللون وحده */
export function StatusBadge({
  kind,
  label,
  icon,
}: {
  kind: StatusKind;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { fg, bg } = StatusColors[kind];
  const fallbackIcon: keyof typeof Ionicons.glyphMap =
    kind === "success"
      ? "checkmark-circle"
      : kind === "warning"
      ? "time"
      : kind === "error"
      ? "close-circle"
      : "information-circle";

  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Ionicons name={icon ?? fallbackIcon} size={13} color={fg} />
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/* ─────────────────── شريط التنبيهات الذهبي ─────────────────── */

/** رسالة فرص السحب: خلفية ذهبية فاتحة ونص بني داكن */
export function ChanceNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.chanceNote}>
      <Ionicons name="gift" size={18} color={c.gold} />
      <Text style={s.chanceNoteText}>{children}</Text>
    </View>
  );
}

/** ملاحظة معلوماتية زرقاء فاتحة */
export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.infoNote}>
      <Ionicons name="information-circle" size={17} color={StatusColors.info.fg} />
      <Text style={s.infoNoteText}>{children}</Text>
    </View>
  );
}

/* ──────────────────────── عدّاد السحب ──────────────────────── */

interface ProgressProps {
  sold: number;
  target: number;
  /** على الخلفيات الكحلية بينقلب لون النص والمسار */
  onNavy?: boolean;
}

/** تعبئة زرقاء فوق مسار فاتح، مع العدد مكتوباً بوضوح */
export function DrawProgress({ sold, target, onNavy = false }: ProgressProps) {
  const safeTarget = Math.max(target, 1);
  const capped = Math.min(sold, safeTarget);
  const percent = (capped / safeTarget) * 100;
  const remaining = Math.max(0, safeTarget - sold);

  return (
    <View
      style={[s.progressBox, onNavy && { backgroundColor: "rgba(255,255,255,0.10)" }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: safeTarget, now: capped }}
    >
      <View style={s.progressHead}>
        <Text style={[s.progressCount, onNavy && { color: c.surface }]}>
          {capped.toLocaleString("en-US")} من {safeTarget.toLocaleString("en-US")} فرصة
        </Text>
        <Text style={[s.progressPercent, onNavy && { color: c.surface }]}>
          {percent.toFixed(1)}%
        </Text>
      </View>

      <View style={[s.progressTrack, onNavy && { backgroundColor: "rgba(255,255,255,0.18)" }]}>
        <View style={[s.progressFill, { width: `${Math.max(percent, 1.5)}%` }]} />
      </View>

      <Text style={[s.progressRemaining, onNavy && { color: "rgba(255,255,255,0.75)" }]}>
        {remaining > 0 ? `متبقي ${remaining.toLocaleString("en-US")} فرصة` : "اكتمل العدد — السحب قريباً"}
      </Text>
    </View>
  );
}

/* ────────────────────────── صف قابل للفتح ────────────────────────── */

export function NavRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.navRow, pressed && { backgroundColor: c.primarySoft }]}
    >
      <Ionicons name="chevron-back" size={18} color={c.textMuted} />
      <View style={s.navRowText}>
        <Text style={s.navRowTitle}>{title}</Text>
        {subtitle ? <Text style={s.navRowSub}>{subtitle}</Text> : null}
      </View>
      <View style={s.navRowIcon}>
        <Ionicons name={icon} size={20} color={c.primary} />
      </View>
    </Pressable>
  );
}

/* ────────────────────────── الحالة الفارغة ────────────────────────── */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={34} color={c.primary} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {body ? <Text style={s.emptyBody}>{body}</Text> : null}
      {action && (
        <Button label={action.label} onPress={action.onPress} style={{ marginTop: Spacing.sm, minWidth: 200 }} />
      )}
    </View>
  );
}

/* ────────────────────────── بطاقة إحصاء ────────────────────────── */

/** مربّع رقم + تسمية + أيقونة ملوّنة — يستخدم بالحساب ولوحة الإدارة */
export function StatTile({
  icon,
  value,
  label,
  tone = "primary",
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  tone?: "primary" | "gold" | "success" | "warning" | "navy";
  style?: StyleProp<ViewStyle>;
}) {
  const tones = {
    primary: { fg: c.primary, bg: c.primarySoft },
    gold: { fg: c.goldText, bg: c.goldSoft },
    success: { fg: StatusColors.success.fg, bg: StatusColors.success.bg },
    warning: { fg: StatusColors.warning.fg, bg: StatusColors.warning.bg },
    navy: { fg: c.navy, bg: c.primarySoft },
  } as const;
  const { fg, bg } = tones[tone];

  return (
    <View style={[s.statTile, style]}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <View style={s.statText}>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

/* ────────────────────────── سؤال قابل للطيّ ────────────────────────── */

export function Accordion({
  question,
  answer,
  expanded,
  onToggle,
}: {
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={[s.accordion, expanded && s.accordionOpen]}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={s.accordionHead}
      >
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={expanded ? c.primary : c.textMuted}
        />
        <Text style={[s.accordionQ, expanded && { color: c.primary }]}>{question}</Text>
      </Pressable>

      {expanded && <Text style={s.accordionA}>{answer}</Text>}
    </View>
  );
}

/* ────────────────────────── الأنماط ────────────────────────── */

const s = StyleSheet.create({
  logoWrap: { alignItems: "center" },
  logoCrown: { marginBottom: -3 },
  logoText: { fontFamily: Fonts.bold, writingDirection: "rtl", lineHeight: undefined },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.md,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  headerSide: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, minWidth: 88 },
  headerSideEnd: { justifyContent: "flex-end" },
  headerIconBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    writingDirection: "rtl",
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.lg,
  },
  buttonText: { fontFamily: Fonts.medium, writingDirection: "rtl" },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  badgeText: { fontFamily: Fonts.medium, fontSize: FontSize.label, writingDirection: "rtl" },

  chanceNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: c.goldSoft,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chanceNoteText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.goldText,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: StatusColors.info.bg,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  infoNoteText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: StatusColors.info.fg,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 21,
  },

  progressBox: {
    backgroundColor: c.surface,
    borderRadius: Radius.button,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  progressHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressCount: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.text,
    writingDirection: "rtl",
  },
  progressPercent: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: c.primary },
  progressTrack: {
    height: 8,
    backgroundColor: c.borderSubtle,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: c.primary, borderRadius: Radius.pill },
  progressRemaining: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  navRowText: { flex: 1, gap: 2 },
  navRowTitle: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  navRowSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 19,
  },
  navRowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.button,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  statTile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  statText: { flex: 1, alignItems: "flex-end", gap: 1 },
  statValue: { fontFamily: Fonts.bold, fontSize: FontSize.h2, color: c.navy },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    writingDirection: "rtl",
  },

  accordion: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  accordionOpen: { backgroundColor: c.primarySoft, borderColor: c.primarySoft },
  accordionHead: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  accordionQ: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: c.navy,
    textAlign: "right",
    writingDirection: "rtl",
  },
  accordionA: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 23,
    marginTop: Spacing.md,
  },

  empty: { alignItems: "center", gap: Spacing.md, paddingVertical: 56, paddingHorizontal: Spacing.xxl },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    textAlign: "center",
    writingDirection: "rtl",
  },
  emptyBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
  },
});
