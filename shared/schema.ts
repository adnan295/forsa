import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { SYRIA, SYRIAN_PHONE_ERROR, isSyrianPhone, normalizeSyrianPhone } from "./syria";

export const roleEnum = pgEnum("user_role", ["user", "admin"]);

/**
 * دورة حياة جولة السحب:
 * scheduled     → مجدولة بالطابور، لسا ما بلّشت
 * active        → الجولة النشطة، التذاكر الجديدة بتروح إلها
 * ready_to_draw → وصلت للعدد المستهدف، بانتظار سحب الأدمن
 * completed     → تم السحب وفي فائز
 * cancelled     → ملغاة
 */
export const drawStatusEnum = pgEnum("draw_status", [
  "scheduled",
  "active",
  "ready_to_draw",
  "completed",
  "cancelled",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending_payment",
  "pending_review",
  "confirmed",
  "rejected",
]);

export const shippingStatusEnum = pgEnum("shipping_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("user"),
  fullName: text("full_name"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  emailVerified: boolean("email_verified").notNull().default(false),
  pushToken: text("push_token"),
  fcmToken: text("fcm_token"),
  apnToken: text("apn_token"),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** كتالوج المنتجات — مفكوك تماماً عن السحب */
export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  imagesJson: text("images_json"),
  /** JSON: [{ text: string; icon?: string }] — نقاط المواصفات بصفحة المنتج */
  specsJson: text("specs_json"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  /** null = مخزون غير محدود */
  stock: integer("stock"),
  soldCount: integer("sold_count").notNull().default(0),
  category: text("category").notNull().default("other"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** جولات السحب — الجائزة والعدد المستهدف */
export const draws = pgTable("draws", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  prizeName: text("prize_name").notNull(),
  prizeDescription: text("prize_description"),
  prizeImageUrl: text("prize_image_url"),
  /** بانر الرئيسية كما يصمّمه المدير (800×405) — العدّاد يُرسم فوقه تلقائياً */
  bannerImageUrl: text("banner_image_url"),
  /** قيمة المشتريات اللي بتعطي تذكرة وحدة */
  ticketPrice: decimal("ticket_price", { precision: 10, scale: 2 }).notNull().default("10"),
  targetTickets: integer("target_tickets").notNull(),
  soldTickets: integer("sold_tickets").notNull().default(0),
  status: drawStatusEnum("status").notNull().default("scheduled"),
  sortOrder: integer("sort_order").notNull().default(0),
  winnerId: varchar("winner_id"),
  winnerTicketId: varchar("winner_ticket_id"),
  winnerTicketNumber: text("winner_ticket_number"),
  startedAt: timestamp("started_at"),
  drawnAt: timestamp("drawn_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  /** رسوم التوصيل — لا تدخل في احتساب فرص السحب */
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  /** المبلغ المستحق فعلياً بعد الخصم والتوصيل */
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  /** المبلغ المعتمد لاحتساب التذاكر (بعد الخصم) */
  ticketEligibleAmount: decimal("ticket_eligible_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  checkoutKey: text("checkout_key").unique(),
  expectedTickets: integer("expected_tickets").notNull().default(0),
  ticketsAwarded: integer("tickets_awarded").notNull().default(0),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending_payment"),
  receiptUrl: text("receipt_url"),
  rejectionReason: text("rejection_reason"),
  shippingStatus: shippingStatusEnum("shipping_status").notNull().default("pending"),
  shippingAddress: text("shipping_address"),
  shippingFullName: text("shipping_full_name"),
  shippingPhone: text("shipping_phone"),
  shippingCity: text("shipping_city"),
  shippingCountry: text("shipping_country"),
  trackingNumber: text("tracking_number"),
  couponCode: text("coupon_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** سطور الطلب — طلب واحد فيه عدة منتجات */
export const orderItems = pgTable("order_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull(),
  /** نسخة من بيانات المنتج وقت الشراء حتى لو انحذف لاحقاً */
  productName: text("product_name").notNull(),
  productImageUrl: text("product_image_url"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

export const tickets = pgTable("tickets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ticketNumber: text("ticket_number").notNull().unique(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id),
  /** null = تذكرة بانتظار فتح جولة جديدة */
  drawId: varchar("draw_id"),
  isWinner: boolean("is_winner").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  icon: text("icon").notNull().default("card"),
  enabled: boolean("enabled").notNull().default(true),
  description: text("description"),
  bankName: text("bank_name"),
  accountName: text("account_name"),
  iban: text("iban"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull(),
  maxUses: integer("max_uses").notNull().default(100),
  usedCount: integer("used_count").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLog = pgTable("activity_log", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  userId: varchar("user_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  productId: varchar("product_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminNotifications = pgTable("admin_notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** إعدادات تشغيلية يغيّرها المدير من اللوحة دون إعادة نشر */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userNotifications = pgTable("user_notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  drawId: varchar("draw_id"),
  productId: varchar("product_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


export const campaignClientRequests = pgTable("campaign_client_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  productName: text("product_name").notNull(),
  productValue: decimal("product_value", { precision: 10, scale: 2 }),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------------------------- العلاقات --------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  tickets: many(tickets),
  reviews: many(reviews),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
  reviews: many(reviews),
}));

export const drawsRelations = relations(draws, ({ many, one }) => ({
  tickets: many(tickets),
  winner: one(users, {
    fields: [draws.winnerId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  tickets: many(tickets),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [tickets.orderId],
    references: [orders.id],
  }),
  draw: one(draws, {
    fields: [tickets.drawId],
    references: [draws.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

/* --------------------------------- المخططات --------------------------------- */

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const insertProductSchema = z.object({
  name: z.string().min(2, "اسم المنتج مطلوب"),
  description: z.string().optional().default(""),
  imageUrl: z.string().optional().nullable(),
  imagesJson: z.string().optional().nullable(),
  specsJson: z.string().optional().nullable(),
  price: z.union([z.string(), z.number()]).transform((v) => String(v)).refine(v => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) <= 1000000, "سعر المنتج غير صالح"),
  stock: z.union([z.number().int().min(0), z.null()]).optional(),
  category: z.string().optional().default("other"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().optional().default(0),
});

export const insertDrawSchema = z.object({
  title: z.string().min(2, "عنوان الجولة مطلوب"),
  prizeName: z.string().min(2, "اسم الجائزة مطلوب"),
  prizeDescription: z.string().optional().nullable(),
  prizeImageUrl: z.string().optional().nullable(),
  bannerImageUrl: z.string().optional().nullable(),
  ticketPrice: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "سعر التذكرة لازم يكون أكبر من صفر"),
  targetTickets: z.number().int().min(1, "عدد التذاكر المستهدف مطلوب"),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).pick({
  name: true,
  nameAr: true,
  icon: true,
  enabled: true,
  description: true,
  bankName: true,
  accountName: true,
  iban: true,
  imageUrl: true,
});

export const insertCouponSchema = z.object({
  code: z.string().trim().min(1).max(50).transform(v => v.toUpperCase()),
  discountPercent: z.number().int().min(1).max(100),
  maxUses: z.number().int().min(1).max(1000000).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  enabled: z.boolean().optional(),
});

/** رقم موبايل سوري يُحفظ بصيغة 09xxxxxxxx */
const syrianPhone = z
  .string()
  .transform(normalizeSyrianPhone)
  .refine(isSyrianPhone, SYRIAN_PHONE_ERROR);

/** التوصيل داخل سوريا فقط — الدولة تُثبَّت مهما أُرسل */
const syriaOnly = z.string().optional().nullable().transform(() => SYRIA);

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: syrianPhone,
  address: z.string().min(5, "العنوان مطلوب"),
  city: z.string().min(2, "المدينة مطلوبة"),
  country: syriaOnly,
});

export const insertReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const insertSupportTicketSchema = z.object({
  subject: z.string().min(3, "الموضوع مطلوب"),
  message: z.string().min(10, "الرسالة قصيرة جداً"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const insertCampaignClientRequestSchema = z.object({
  businessName: z.string().min(2, "اسم النشاط التجاري مطلوب"),
  contactName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().min(7, "رقم الهاتف غير صحيح"),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  productName: z.string().min(2, "اسم المنتج مطلوب"),
  productValue: z.string().optional(),
  description: z.string().optional(),
});

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1, "السلة فارغة"),
  paymentMethod: z.string().min(1),
  checkoutKey: z.string().min(16).max(100).optional(),
  shippingFullName: z.string().trim().min(1, "عنوان الشحن غير مكتمل").max(500),
  shippingPhone: syrianPhone,
  shippingCity: z.string().trim().min(1, "عنوان الشحن غير مكتمل").max(500),
  shippingAddress: z.string().trim().min(1, "عنوان الشحن غير مكتمل").max(500),
  shippingCountry: syriaOnly,
  couponCode: z.string().optional().nullable(),
});

/* ---------------------------------- الأنواع ---------------------------------- */

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Draw = typeof draws.$inferSelect;
export type InsertDraw = z.infer<typeof insertDrawSchema>;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type UserNotification = typeof userNotifications.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type CampaignClientRequest = typeof campaignClientRequests.$inferSelect;
export type InsertCampaignClientRequest = z.infer<typeof insertCampaignClientRequestSchema>;
export type CheckoutPayload = z.infer<typeof checkoutSchema>;

/** نقطة مواصفة على صفحة المنتج */
export interface ProductSpec {
  text: string;
  /** اسم أيقونة من Ionicons — بدونه بتنعرض نقطة افتراضية */
  icon?: string;
}

/** يقرأ specsJson بأمان — أي محتوى غير صالح بيرجع قائمة فاضية */
export function parseProductSpecs(specsJson: string | null | undefined): ProductSpec[] {
  if (!specsJson) return [];
  try {
    const parsed = JSON.parse(specsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown): ProductSpec | null => {
        if (typeof item === "string") return { text: item };
        if (item && typeof item === "object" && typeof (item as any).text === "string") {
          const icon = (item as any).icon;
          return { text: (item as any).text, icon: typeof icon === "string" ? icon : undefined };
        }
        return null;
      })
      .filter((x): x is ProductSpec => x !== null && x.text.trim().length > 0);
  } catch {
    return [];
  }
}

/** رسوم التوصيل الافتراضية — لا تُحتسب ضمن فرص السحب */
export const DEFAULT_DELIVERY_FEE = 2;

