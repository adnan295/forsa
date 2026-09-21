/**
 * نظام تصميم «فرصة» — المرجع الثابت للألوان والمقاسات.
 *
 * القاعدة البصرية: الأزرق للأفعال، الذهبي للسحب والجوائز،
 * والأخضر للتأكيد فقط. خلفيات بيضاء والمنتج هو البطل.
 */

const palette = {
  /** الأزرار والروابط والعنصر المحدد */
  primary: "#1267E8",
  /** ضغط الزر الأساسي */
  primaryPressed: "#0E52C4",
  /** خلفية الاختيار والأزرار الثانوية */
  primarySoft: "#E8F0FD",

  /** الشعار والعناوين الرئيسية وبطاقات الجائزة */
  navy: "#0B2142",
  /** نهاية تدرّج البطاقات الكحلية */
  navySoft: "#164A9E",

  /** الجائزة وأيقونة الهدية */
  gold: "#F5B731",
  /** خلفية رسائل فرص السحب */
  goldSoft: "#FFF4D6",
  /** النص فوق الخلفية الذهبية */
  goldText: "#754500",

  /** خلفية التطبيق */
  background: "#F7F9FC",
  /** البطاقات وحقول الإدخال وشريط التنقل */
  surface: "#FFFFFF",

  /** النص الأساسي */
  text: "#182230",
  /** النص الثانوي والوصف */
  textSecondary: "#475467",
  /** النص المساعد والعناصر غير المحددة */
  textMuted: "#667085",

  /** الحدود والفواصل */
  border: "#D0D5DD",
  /** فواصل أخف داخل البطاقات */
  borderSubtle: "#EAECF0",
} as const;

/** ألوان الحالات — كل حالة معها دائماً كلمة أو أيقونة، ما بتعتمد على اللون وحده */
export const StatusColors = {
  success: { fg: "#067647", bg: "#ECFDF3" },
  warning: { fg: "#B54708", bg: "#FFFAEB" },
  error: { fg: "#B42318", bg: "#FEF3F2" },
  info: { fg: "#175CD3", bg: "#EFF8FF" },
  disabled: { fg: "#667085", bg: "#EAECF0" },
} as const;

/** المسافات — مضاعفات 4 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  /** الهوامش الجانبية للشاشات */
  screen: 16,
} as const;

export const Radius = {
  button: 12,
  card: 16,
  input: 12,
  pill: 999,
  /** البطاقات الكبيرة مثل بطاقة الجائزة */
  hero: 20,
} as const;

export const Sizing = {
  buttonHeight: 52,
  buttonHeightSmall: 44,
  inputHeight: 52,
  icon: 24,
  iconSmall: 20,
  iconTiny: 16,
} as const;

/** Tajawal: عادي للنصوص، متوسط للأزرار، عريض للعناوين والأسعار */
export const Fonts = {
  regular: "Tajawal_400Regular",
  medium: "Tajawal_500Medium",
  bold: "Tajawal_700Bold",
} as const;

export const FontSize = {
  /** عنوان رئيسي */
  h1: 26,
  /** عنوان قسم */
  h2: 20,
  /** عنوان فرعي */
  h3: 17,
  /** نص وأزرار */
  body: 16,
  /** تفاصيل مساعدة */
  caption: 14,
  /** شارات وتسميات صغيرة */
  label: 12,
} as const;

/**
 * البنية محفوظة بشكل light/dark للتوافق مع theme-context.
 * الواجهة الفاتحة هي الهوية الأساسية لـ«فرصة» — الوضع الليلي غير مفعّل حالياً.
 */
const Colors = {
  light: {
    ...palette,

    // أسماء متوافقة مع الكود القائم
    accent: palette.primary,
    accentDark: palette.primaryPressed,
    accentLight: palette.primarySoft,
    tint: palette.primary,
    card: palette.surface,
    inputBg: palette.surface,
    progressBg: palette.borderSubtle,
    progressFill: palette.primary,
    tabIconDefault: palette.textMuted,
    tabIconSelected: palette.primary,

    success: StatusColors.success.fg,
    successBg: StatusColors.success.bg,
    warning: StatusColors.warning.fg,
    warningBg: StatusColors.warning.bg,
    danger: StatusColors.error.fg,
    dangerBg: StatusColors.error.bg,
    info: StatusColors.info.fg,
    infoBg: StatusColors.info.bg,

    overlay: "rgba(11, 33, 66, 0.55)",
  },
  dark: {
    ...palette,
    background: "#071429",
    surface: "#0F2447",
    text: "#F2F5FA",
    textSecondary: "#B8C4DB",
    textMuted: "#8A9AB8",
    border: "#22406E",
    borderSubtle: "#16305C",

    accent: "#4D92F5",
    accentDark: palette.primary,
    accentLight: "#16305C",
    tint: "#4D92F5",
    card: "#0F2447",
    inputBg: "#0F2447",
    progressBg: "#16305C",
    progressFill: "#4D92F5",
    tabIconDefault: "#8A9AB8",
    tabIconSelected: "#4D92F5",

    success: "#75E0A7",
    successBg: "#053321",
    warning: "#FEC84B",
    warningBg: "#4E1D09",
    danger: "#FDA29B",
    dangerBg: "#55160C",
    info: "#84CAFF",
    infoBg: "#102A56",

    overlay: "rgba(0, 0, 0, 0.7)",
  },
};

export default Colors;
