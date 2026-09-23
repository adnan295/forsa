/** صيغة المعدود بالعربية: قسيمة، قسيمتان، ٣–١٠ قسائم، ١١+ قسيمة */
export function voucherWord(n: number) {
  if (n === 2) return "قسيمتان";
  if (n >= 3 && n <= 10) return "قسائم";
  return "قسيمة";
}

/** رمز قصير للقسيمة للعرض — آخر أربع خانات من رقمها الكامل */
export function shortTicketCode(ticketNumber: string) {
  return `#${ticketNumber.slice(-4).toUpperCase()}`;
}
