import { Platform } from "react-native";
import * as Print from "expo-print";
import { buildShippingLabelsHtml, type LabelOrder } from "@shared/shipping-label";

export { isReadyToShip, type LabelOrder } from "@shared/shipping-label";

/**
 * يفتح نافذة الطباعة مباشرة: على الموبايل عبر طابعات النظام (AirPrint / Android)،
 * وعلى الويب عبر إطار مخفي حتى لا تُطبع لوحة الإدارة نفسها.
 */
export async function printShippingLabels(orders: LabelOrder[]): Promise<void> {
  if (orders.length === 0) return;
  const html = buildShippingLabelsHtml(orders);

  if (Platform.OS !== "web") {
    await Print.printAsync({ html, width: 283, height: 425 });
    return;
  }

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    throw new Error("تعذّر فتح نافذة الطباعة");
  }
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise((resolve) => setTimeout(resolve, 250));
  win.focus();
  win.print();
  setTimeout(() => frame.remove(), 60_000);
}
