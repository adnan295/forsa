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

export const roleEnum = pgEnum("user_role", ["user", "admin"]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "active",
  "sold_out",
  "drawing",
  "completed",
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
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  productPrice: decimal("product_price", { precision: 10, scale: 2 }).notNull(),
  totalQuantity: integer("total_quantity").notNull(),
  soldQuantity: integer("sold_quantity").notNull().default(0),
  prizeName: text("prize_name").notNull(),
  prizeDescription: text("prize_description"),
  prizeImageUrl: text("prize_image_url"),
  category: text("category").default("other"),
  status: campaignStatusEnum("status").notNull().default("active"),
  winnerId: varchar("winner_id"),
  winnerTicketId: varchar("winner_ticket_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  drawAt: timestamp("draw_at"),
  endsAt: timestamp("ends_at"),
});

export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  campaignId: varchar("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  productId: varchar("product_id"),
  quantity: integer("quantity").notNull().default(1),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
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
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ticketNumber: text("ticket_number").notNull().unique(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  campaignId: varchar("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id),
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
  campaignId: varchar("campaign_id").notNull(),
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
  campaignId: varchar("campaign_id"),
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

export const insertSupportTicketSchema = z.object({
  subject: z.string().min(3, "الموضوع مطلوب"),
  message: z.string().min(10, "الرسالة قصيرة جداً"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  tickets: many(tickets),
  reviews: many(reviews),
}));

export const campaignProducts = pgTable("campaign_products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  imageUrl: text("image_url"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  soldQuantity: integer("sold_quantity").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  orders: many(orders),
  tickets: many(tickets),
  reviews: many(reviews),
  products: many(campaignProducts),
  winner: one(users, {
    fields: [campaigns.winnerId],
    references: [users.id],
  }),
}));

export const campaignProductsRelations = relations(campaignProducts, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignProducts.campaignId],
    references: [campaigns.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [reviews.campaignId],
    references: [campaigns.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [orders.campaignId],
    references: [campaigns.id],
  }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [tickets.campaignId],
    references: [campaigns.id],
  }),
  order: one(orders, {
    fields: [tickets.orderId],
    references: [orders.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  title: true,
  description: true,
  imageUrl: true,
  productPrice: true,
  totalQuantity: true,
  prizeName: true,
  prizeDescription: true,
  prizeImageUrl: true,
  category: true,
  endsAt: true,
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
});

export const insertCouponSchema = createInsertSchema(coupons).pick({
  code: true,
  discountPercent: true,
  maxUses: true,
  expiresAt: true,
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب"),
  phone: z.string().min(8, "رقم الهاتف غير صحيح"),
  address: z.string().min(5, "العنوان مطلوب"),
  city: z.string().min(2, "المدينة مطلوبة"),
  country: z.string().min(2, "الدولة مطلوبة"),
});

export const insertReviewSchema = z.object({
  campaignId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Order = typeof orders.$inferSelect;
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
export type CampaignProduct = typeof campaignProducts.$inferSelect;
