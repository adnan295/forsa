/**
 * تذكيرات دورية. لا يوجد جدولة أخرى في الخادم، فهذه الوحدة هي المصدر الوحيد
 * للإشعارات التي لا تنتج عن فعل مباشر من مستخدم أو إدارة.
 *
 * القاعدة الحاكمة: لا يصل المستخدم إشعار تذكير مرتين عن الشيء نفسه. كل نوع
 * يُفحص مقابل سجل الإشعارات قبل الإرسال، فإعادة تشغيل الخادم أو تكرار الدورة
 * لا يُنتج تكراراً.
 */
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { appSettings, draws, orders, tickets, userNotifications } from "@shared/schema";
import { storage } from "./storage";
import { sendPushNotifications } from "./push";

/** نسبة امتلاء الجولة التي عندها يبدأ تذكير الاقتراب */
const CLOSING_AT = 0.8;
/** مهلة رفع الإيصال قبل تذكير صاحب الطلب */
const RECEIPT_GRACE_HOURS = 6;
/** أقل فاصل بين تذكيرين من النوع نفسه للمستخدم نفسه */
const REPEAT_AFTER_HOURS = { draw_closing: Infinity, your_chances: 72, not_joined: 168, receipt_due: 24 };

type ReminderType = keyof typeof REPEAT_AFTER_HOURS | "draw_ready_admin";

/** ما تعرضه لوحة الإدارة. الترتيب هنا هو ترتيب العرض. */
export const REMINDERS: { type: ReminderType; label: string; description: string }[] = [
  { type: "draw_closing", label: "اقتراب السحب", description: "لكل المستخدمين حين تتجاوز الجولة ٨٠٪ — مرة واحدة لكل جولة" },
  { type: "your_chances", label: "فرصك في السحب", description: "للمشاركين بعدد فرصهم — كل ٣ أيام" },
  { type: "not_joined", label: "دعوة للمشاركة", description: "لمن لا يملك فرصة في الجولة الحالية — أسبوعياً" },
  { type: "draw_ready_admin", label: "جولة تنتظر السحب", description: "للإدارة حين تكتمل جولة — يومياً حتى يُجرى السحب" },
  { type: "receipt_due", label: "تذكير بالإيصال", description: "لطلب بلا إيصال بعد ٦ ساعات — يومياً" },
];

const settingKey = (type: ReminderType) => `reminder.${type}`;

export function isReminderType(value: string): value is ReminderType {
  return REMINDERS.some(r => r.type === value);
}

/** المفعّلة. غياب المفتاح يعني مفعّل، فلا يلزم زرع أولي. */
export async function getReminderStates(): Promise<Record<string, boolean>> {
  const rows = await db.select().from(appSettings)
    .where(inArray(appSettings.key, REMINDERS.map(r => settingKey(r.type))));
  const stored = new Map(rows.map(r => [r.key, r.value]));
  return Object.fromEntries(REMINDERS.map(r => [r.type, stored.get(settingKey(r.type)) !== "false"]));
}

export async function setReminderEnabled(type: ReminderType, enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";
  await db.insert(appSettings)
    .values({ key: settingKey(type), value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: sql`now()` } });
}

/** المستخدمون الذين وصلهم هذا النوع مؤخراً — يُستثنون من الإرسال */
async function recentlyNotified(type: ReminderType, drawId: string | null, hours: number): Promise<Set<string>> {
  const conditions = [eq(userNotifications.type, type)];
  if (drawId) conditions.push(eq(userNotifications.drawId, drawId));
  if (Number.isFinite(hours)) {
    conditions.push(sql`${userNotifications.createdAt} > now() - make_interval(hours => ${hours})`);
  }
  const rows = await db
    .select({ userId: userNotifications.userId })
    .from(userNotifications)
    .where(and(...conditions));
  return new Set(rows.map(r => r.userId));
}

async function send(userIds: string[], type: ReminderType, title: string, body: string, drawId?: string) {
  if (userIds.length === 0) return 0;
  await storage.createBulkUserNotifications(userIds, type, title, body, drawId);
  sendPushNotifications(userIds, title, body, drawId ? { drawId } : undefined);
  console.log(`[Reminders] ${type}: ${userIds.length} مستخدم`);
  return userIds.length;
}

/** أ — الجولة تقترب من الامتلاء */
async function drawClosing(): Promise<number> {
  const draw = await storage.getActiveDraw();
  if (!draw || draw.status !== "active") return 0;
  const remaining = draw.targetTickets - draw.soldTickets;
  if (remaining <= 0 || draw.soldTickets < draw.targetTickets * CLOSING_AT) return 0;

  const already = await recentlyNotified("draw_closing", draw.id, REPEAT_AFTER_HOURS.draw_closing);
  const everyone = await storage.getAllUsers();
  const ids = everyone.filter(u => u.role !== "admin" && !already.has(u.id)).map(u => u.id);
  return send(ids, "draw_closing", "السحب اقترب ⏳",
    `باقي ${remaining} فرصة وينتهي سحب ${draw.prizeName}`, draw.id);
}

/** ب — تذكير المشاركين بعدد فرصهم */
async function yourChances(): Promise<number> {
  const draw = await storage.getActiveDraw();
  if (!draw || draw.status !== "active") return 0;

  const counts = await db
    .select({ userId: tickets.userId, n: sql<number>`count(*)::int` })
    .from(tickets)
    .where(eq(tickets.drawId, draw.id))
    .groupBy(tickets.userId);
  if (counts.length === 0) return 0;

  const already = await recentlyNotified("your_chances", draw.id, REPEAT_AFTER_HOURS.your_chances);
  let sent = 0;
  for (const row of counts) {
    if (already.has(row.userId)) continue;
    sent += await send([row.userId], "your_chances", "فرصك في السحب 🎟️",
      `لديك ${row.n} ${row.n === 1 ? "فرصة" : "فرص"} في سحب ${draw.prizeName}`, draw.id);
  }
  return sent;
}

/** ج — مستخدمون لم يشاركوا في الجولة الحالية */
async function notJoined(): Promise<number> {
  const draw = await storage.getActiveDraw();
  if (!draw || draw.status !== "active") return 0;

  const participants = await db
    .selectDistinct({ userId: tickets.userId })
    .from(tickets)
    .where(eq(tickets.drawId, draw.id));
  const joined = new Set(participants.map(p => p.userId));

  const already = await recentlyNotified("not_joined", draw.id, REPEAT_AFTER_HOURS.not_joined);
  const everyone = await storage.getAllUsers();
  const ids = everyone
    .filter(u => u.role !== "admin" && !joined.has(u.id) && !already.has(u.id))
    .map(u => u.id);
  return send(ids, "not_joined", "ما زال بإمكانك المشاركة 🎁",
    `كل عملية شراء تمنحك فرصاً في سحب ${draw.prizeName}`, draw.id);
}

/** د — تنبيه الإدارة أن جولة اكتملت وتنتظر السحب */
async function drawReadyForAdmin(): Promise<number> {
  const ready = await db.select().from(draws).where(eq(draws.status, "ready_to_draw"));
  if (ready.length === 0) return 0;

  const admins = (await storage.getAllUsers()).filter(u => u.role === "admin");
  if (admins.length === 0) return 0;

  let sent = 0;
  for (const draw of ready) {
    // يتكرر يومياً حتى يُجرى السحب، لأن تجاهله يعطّل الجولة التالية
    const already = await recentlyNotified("draw_ready_admin", draw.id, 24);
    const ids = admins.filter(a => !already.has(a.id)).map(a => a.id);
    sent += await send(ids, "draw_ready_admin", "جولة مكتملة تنتظر السحب 🔔",
      `${draw.title} — ${draw.prizeName} اكتمل عدد تذاكرها ولم يُجرَ السحب بعد`, draw.id);
  }
  return sent;
}

/** هـ — طلبات لم يُرفع لها إيصال */
async function receiptDue(): Promise<number> {
  const stale = await db
    .select({ id: orders.id, userId: orders.userId })
    .from(orders)
    .where(and(
      eq(orders.paymentStatus, "pending_payment"),
      isNull(orders.receiptUrl),
      lt(orders.createdAt, sql`now() - make_interval(hours => ${RECEIPT_GRACE_HOURS})`),
    ));
  if (stale.length === 0) return 0;

  const already = await recentlyNotified("receipt_due", null, REPEAT_AFTER_HOURS.receipt_due);
  let sent = 0;
  for (const order of stale) {
    if (already.has(order.userId)) continue;
    already.add(order.userId); // طلبان معلّقان لنفس المستخدم يعنيان تذكيراً واحداً
    sent += await send([order.userId], "receipt_due", "طلبك بانتظار الإيصال 🧾",
      "ارفع إيصال التحويل لتأكيد طلبك واحتساب فرصك");
  }
  return sent;
}

/** دورة واحدة. أي فشل في تذكير لا يمنع البقية. */
export async function runReminders(): Promise<void> {
  const jobs: [string, () => Promise<number>][] = [
    ["draw_closing", drawClosing],
    ["your_chances", yourChances],
    ["not_joined", notJoined],
    ["draw_ready_admin", drawReadyForAdmin],
    ["receipt_due", receiptDue],
  ];
  const enabled = await getReminderStates();
  for (const [name, job] of jobs) {
    if (!enabled[name]) continue;
    try {
      await job();
    } catch (err: any) {
      console.error(`[Reminders] ${name} فشل:`, err?.message || err);
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

/** تُستدعى مرة عند الإقلاع. الفحص كل ساعة يكفي لكل هذه التذكيرات. */
export function startReminders(intervalMs = 60 * 60 * 1000): void {
  if (timer) return;
  timer = setInterval(() => { void runReminders(); }, intervalMs);
  (timer as { unref?: () => void }).unref?.();
  console.log("[Reminders] التذكيرات الدورية تعمل كل ساعة");
}
