/** ترجمة رسائل الخادم الإنجليزية لعربي مفهوم للمستخدم */
const ERROR_MAP: Record<string, string> = {
  "Invalid credentials": "البريد الإلكتروني أو كلمة السر غير صحيحة",
  "User not found": "المستخدم غير موجود",
  "Username or email already taken": "البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل",
  "Email already taken": "البريد الإلكتروني مستخدم بالفعل",
  "Invalid or expired code": "الرمز غير صحيح أو منتهي الصلاحية",
  "Email already verified": "البريد الإلكتروني مفعّل بالفعل",
  "Not authenticated": "يرجى تسجيل الدخول أولاً",
  "Admin access required": "هذه الصفحة للإدارة فقط",
  "Product not found": "المنتج غير موجود",
  "Order not found": "الطلب غير موجود",
  "Access denied": "ما عندك صلاحية لهذا الإجراء",
  "Too many attempts": "محاولات كتيرة — جرّب بعد شوي",
  "Too many requests": "طلبات كتيرة — خفّف شوي",
  "Cart items required": "السلة فارغة",
};

/**
 * بتحوّل رسالة الخطأ لنص عربي.
 * الخادم أحياناً بيرجّع JSON أو نص مسبوق بكود الحالة — بنتعامل مع الحالتين.
 */
export function translateError(msg: string | undefined | null): string {
  if (!msg) return "صار خطأ ما — جرّب مرة تانية";

  for (const [en, ar] of Object.entries(ERROR_MAP)) {
    if (msg.includes(en)) return ar;
  }

  try {
    const json = JSON.parse(msg);
    if (typeof json?.message === "string") return json.message;
  } catch {
    // مو JSON — منكمل
  }

  // صيغة "404: الطلب غير موجود"
  const colonIndex = msg.indexOf(": ");
  if (colonIndex > 0 && colonIndex < 6) return msg.slice(colonIndex + 2);

  return msg;
}

