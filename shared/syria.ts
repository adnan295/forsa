/**
 * التوصيل حالياً داخل سوريا فقط: دولة ثابتة، مدن من القائمة، ورقم موبايل سوري.
 * مشترك بين التطبيق والخادم حتى تبقى القاعدة واحدة.
 */

export const SYRIA = "سوريا";

/** مثال يظهر داخل حقل الهاتف */
export const SYRIAN_PHONE_PLACEHOLDER = "09xxxxxxxx";

/** المدن مجمّعة حسب المحافظة — مركز المحافظة أولاً */
export const SYRIAN_CITIES: { governorate: string; cities: string[] }[] = [
  { governorate: "دمشق", cities: ["دمشق"] },
  {
    governorate: "ريف دمشق",
    cities: ["جرمانا", "صحنايا", "دوما", "حرستا", "التل", "قدسيا", "الكسوة", "قطنا", "داريا", "المعضمية", "الزبداني", "يبرود", "النبك", "القطيفة"],
  },
  { governorate: "حلب", cities: ["حلب", "منبج", "الباب", "عفرين", "إعزاز", "السفيرة", "جرابلس", "عين العرب"] },
  { governorate: "حمص", cities: ["حمص", "تلكلخ", "الرستن", "تلبيسة", "القصير", "تدمر", "المخرم"] },
  { governorate: "حماة", cities: ["حماة", "سلمية", "مصياف", "السقيلبية", "محردة", "صوران"] },
  { governorate: "اللاذقية", cities: ["اللاذقية", "جبلة", "القرداحة", "الحفة"] },
  { governorate: "طرطوس", cities: ["طرطوس", "بانياس", "صافيتا", "الدريكيش", "الشيخ بدر"] },
  { governorate: "إدلب", cities: ["إدلب", "معرة النعمان", "سراقب", "أريحا", "جسر الشغور", "حارم"] },
  { governorate: "دير الزور", cities: ["دير الزور", "الميادين", "البوكمال"] },
  { governorate: "الرقة", cities: ["الرقة", "الطبقة", "تل أبيض"] },
  { governorate: "الحسكة", cities: ["الحسكة", "القامشلي", "رأس العين", "المالكية", "عامودا"] },
  { governorate: "درعا", cities: ["درعا", "نوى", "إزرع", "الصنمين", "بصرى الشام", "طفس"] },
  { governorate: "السويداء", cities: ["السويداء", "شهبا", "صلخد"] },
  { governorate: "القنيطرة", cities: ["القنيطرة", "خان أرنبة"] },
];

/** أرقام عربية مشرقية وفارسية — لوحة المفاتيح العربية تكتب بها */
const EASTERN_DIGITS = ["٠١٢٣٤٥٦٧٨٩", "۰۱۲۳۴۵۶۷۸۹"];

/** يوحّد الرقم إلى الصيغة المحلية 09xxxxxxxx إن أمكن، وإلا يرجعه منظّفاً */
export function normalizeSyrianPhone(input: string): string {
  const latin = input.replace(/[٠-٩۰-۹]/g, (d) => String(EASTERN_DIGITS.map((set) => set.indexOf(d)).find((i) => i >= 0)));
  const compact = latin.replace(/[\s\-().]/g, "");
  const match = compact.match(/^(?:\+963|00963|963|0)?(9\d{8})$/);
  return match ? `0${match[1]}` : compact;
}

/** رقم موبايل سوري: 09 ثم ثماني خانات (يقبل +963 و00963) */
export function isSyrianPhone(input: string): boolean {
  return /^09\d{8}$/.test(normalizeSyrianPhone(input));
}

export const SYRIAN_PHONE_ERROR = "أدخل رقم موبايل سوري مثل 0933123456";
