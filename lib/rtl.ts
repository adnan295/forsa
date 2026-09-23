import { I18nManager, Platform } from "react-native";

/**
 * الواجهة عربية من اليمين لليسار على كل المنصات.
 * الموبايل يُجبر على RTL في _layout، والويب يُضبط عبر dir="rtl" على الصفحة،
 * ومكتبة react-native-web لا تعرّف I18nManager.isRTL فنعتمد هذا الثابت بدلاً منه.
 */
export const IS_RTL = Platform.OS === "web" || I18nManager.isRTL;

/** يضبط اتجاه صفحة الويب واللغة — لا يفعل شيئاً على الموبايل */
export function applyWebRtl() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.documentElement.setAttribute("dir", "rtl");
  document.documentElement.setAttribute("lang", "ar");
}

/**
 * react-native-web يحوّل start/end إلى يمين/يسار حسب اتجاه أقرب View يحمل dir أو lang،
 * فتوضع هذه الخصائص على جذر التطبيق في الويب. (غير معرّفة في أنواع React Native.)
 */
export const WEB_RTL_PROPS = (Platform.OS === "web" ? { dir: "rtl", lang: "ar" } : {}) as object;
