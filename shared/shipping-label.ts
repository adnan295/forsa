import { governorateOf } from "./syria";

/** ما يلزم من الطلب لطباعة ملصق الشحن */
export interface LabelOrder {
  id: string;
  createdAt: string | Date;
  shippingFullName?: string | null;
  shippingPhone?: string | null;
  shippingCity?: string | null;
  shippingAddress?: string | null;
  shippingCountry?: string | null;
  totalAmount: string;
  paymentStatus?: string | null;
  trackingNumber?: string | null;
  items?: { productName: string; quantity: number }[];
}

/** الطلبات الجاهزة للتغليف: دفعها مؤكد ولم تُشحن بعد */
export function isReadyToShip(order: { paymentStatus?: string | null; shippingStatus?: string | null }) {
  return order.paymentStatus === "confirmed" && ["pending", "processing"].includes(order.shippingStatus ?? "pending");
}

/** كل ما يأتي من المستخدم يُهرَّب قبل وضعه في HTML */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatDate(value: string | Date) {
  const d = new Date(value);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function labelHtml(order: LabelOrder): string {
  const city = order.shippingCity?.trim() || "—";
  const governorate = governorateOf(order.shippingCity);
  const place = governorate && governorate !== city ? `${city} — محافظة ${governorate}` : city;
  const items = order.items ?? [];
  const pieces = items.reduce((sum, i) => sum + i.quantity, 0);
  const paid = order.paymentStatus === "confirmed";

  return `
  <section class="label">
    <header>
      <div class="brand">NAYVO</div>
      <div class="order">
        <div class="order-no" dir="ltr">#${esc(order.id.slice(0, 8).toUpperCase())}</div>
        <div class="muted" dir="ltr">${esc(formatDate(order.createdAt))}</div>
      </div>
    </header>

    <div class="block to">
      <div class="caption">المستلم</div>
      <div class="name">${esc(order.shippingFullName || "—")}</div>
      <div class="phone" dir="ltr">${esc(order.shippingPhone || "—")}</div>
      <div class="place">${esc(place)} · ${esc(order.shippingCountry || "سوريا")}</div>
      <div class="address">${esc(order.shippingAddress || "—")}</div>
    </div>

    <div class="block">
      <div class="caption">المحتويات (${pieces} ${pieces === 1 ? "قطعة" : "قطع"})</div>
      <ul>
        ${items
          .slice(0, 6)
          .map((i) => `<li><span>${esc(i.productName)}</span><b dir="ltr">× ${esc(i.quantity)}</b></li>`)
          .join("")}
        ${items.length > 6 ? `<li class="muted">+ ${items.length - 6} منتجات أخرى</li>` : ""}
      </ul>
    </div>

    <footer>
      <div class="pay ${paid ? "paid" : "due"}">${paid ? "مدفوع مسبقاً ✓" : `غير مدفوع — ${esc(order.totalAmount)} $`}</div>
      ${order.trackingNumber ? `<div class="muted">رقم التتبع: <b dir="ltr">${esc(order.trackingNumber)}</b></div>` : ""}
      <div class="muted">المرسل: NAYVO</div>
    </footer>
  </section>`;
}

/** صفحة الطباعة: ملصق 100×150 مم لكل طلب، يصلح للطابعات الحرارية وورق A4 */
export function buildShippingLabelsHtml(orders: LabelOrder[]): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ملصقات الشحن</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Tajawal", "Geeza Pro", "Noto Sans Arabic", Tahoma, Arial, sans-serif; color: #000; }
  .label {
    width: 100mm; height: 150mm; padding: 5mm;
    display: flex; flex-direction: column; gap: 3mm;
    page-break-after: always; break-after: page; overflow: hidden;
  }
  .label:last-child { page-break-after: auto; break-after: auto; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 0.6mm solid #000; padding-bottom: 2mm; }
  .brand { font-size: 20pt; font-weight: 800; letter-spacing: 1pt; direction: ltr; }
  .order { text-align: left; }
  .order-no { font-size: 15pt; font-weight: 800; }
  .block { border: 0.4mm solid #000; border-radius: 2mm; padding: 2.5mm 3mm; }
  .to { flex: 1; display: flex; flex-direction: column; gap: 1.5mm; }
  .caption { font-size: 9pt; font-weight: 700; color: #444; }
  .name { font-size: 17pt; font-weight: 800; line-height: 1.2; }
  .phone { font-size: 16pt; font-weight: 800; text-align: right; letter-spacing: 0.5pt; }
  .place { font-size: 12.5pt; font-weight: 700; }
  .address { font-size: 11.5pt; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
  ul { list-style: none; margin: 1mm 0 0; padding: 0; font-size: 10pt; }
  li { display: flex; justify-content: space-between; gap: 2mm; padding: 0.6mm 0; border-bottom: 0.2mm dashed #999; }
  li:last-child { border-bottom: 0; }
  li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  footer { display: flex; flex-direction: column; gap: 1mm; font-size: 9.5pt; }
  .pay { font-size: 12pt; font-weight: 800; padding: 1.5mm 2mm; border-radius: 1.5mm; text-align: center; }
  .paid { border: 0.4mm solid #000; }
  .due { background: #000; color: #fff; }
  .muted { color: #444; font-size: 9pt; }
</style>
</head>
<body>
${orders.map(labelHtml).join("\n")}
</body>
</html>`;
}
