var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  DEFAULT_DELIVERY_FEE: () => DEFAULT_DELIVERY_FEE,
  activityLog: () => activityLog,
  adminNotifications: () => adminNotifications,
  campaignClientRequests: () => campaignClientRequests,
  checkoutSchema: () => checkoutSchema,
  coupons: () => coupons,
  drawStatusEnum: () => drawStatusEnum,
  draws: () => draws,
  drawsRelations: () => drawsRelations,
  emailVerificationTokens: () => emailVerificationTokens,
  insertCampaignClientRequestSchema: () => insertCampaignClientRequestSchema,
  insertCouponSchema: () => insertCouponSchema,
  insertDrawSchema: () => insertDrawSchema,
  insertPaymentMethodSchema: () => insertPaymentMethodSchema,
  insertProductSchema: () => insertProductSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertSupportTicketSchema: () => insertSupportTicketSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  orderItems: () => orderItems,
  orderItemsRelations: () => orderItemsRelations,
  orderStatusEnum: () => orderStatusEnum,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  parseProductSpecs: () => parseProductSpecs,
  passwordResetTokens: () => passwordResetTokens,
  paymentMethods: () => paymentMethods,
  paymentStatusEnum: () => paymentStatusEnum,
  products: () => products,
  productsRelations: () => productsRelations,
  reviews: () => reviews,
  reviewsRelations: () => reviewsRelations,
  roleEnum: () => roleEnum,
  shippingStatusEnum: () => shippingStatusEnum,
  supportTickets: () => supportTickets,
  tickets: () => tickets,
  ticketsRelations: () => ticketsRelations,
  updateProfileSchema: () => updateProfileSchema,
  userNotifications: () => userNotifications,
  users: () => users,
  usersRelations: () => usersRelations,
  walletTransactions: () => walletTransactions
});
import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
function parseProductSpecs(specsJson) {
  if (!specsJson) return [];
  try {
    const parsed = JSON.parse(specsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (typeof item === "string") return { text: item };
      if (item && typeof item === "object" && typeof item.text === "string") {
        const icon = item.icon;
        return { text: item.text, icon: typeof icon === "string" ? icon : void 0 };
      }
      return null;
    }).filter((x) => x !== null && x.text.trim().length > 0);
  } catch {
    return [];
  }
}
var roleEnum, drawStatusEnum, orderStatusEnum, paymentStatusEnum, shippingStatusEnum, users, products, draws, orders, orderItems, tickets, paymentMethods, coupons, activityLog, reviews, adminNotifications, userNotifications, emailVerificationTokens, passwordResetTokens, supportTickets, walletTransactions, campaignClientRequests, usersRelations, productsRelations, drawsRelations, ordersRelations, orderItemsRelations, ticketsRelations, reviewsRelations, insertUserSchema, loginSchema, insertProductSchema, insertDrawSchema, insertPaymentMethodSchema, insertCouponSchema, updateProfileSchema, insertReviewSchema, insertSupportTicketSchema, insertCampaignClientRequestSchema, checkoutSchema, DEFAULT_DELIVERY_FEE;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    roleEnum = pgEnum("user_role", ["user", "admin"]);
    drawStatusEnum = pgEnum("draw_status", [
      "scheduled",
      "active",
      "ready_to_draw",
      "completed",
      "cancelled"
    ]);
    orderStatusEnum = pgEnum("order_status", [
      "pending",
      "paid",
      "failed",
      "refunded"
    ]);
    paymentStatusEnum = pgEnum("payment_status", [
      "pending_payment",
      "pending_review",
      "confirmed",
      "rejected"
    ]);
    shippingStatusEnum = pgEnum("shipping_status", [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    ]);
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
      pushToken: text("push_token"),
      fcmToken: text("fcm_token"),
      apnToken: text("apn_token"),
      walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0"),
      isSuspended: boolean("is_suspended").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    products = pgTable("products", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    draws = pgTable("draws", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      prizeName: text("prize_name").notNull(),
      prizeDescription: text("prize_description"),
      prizeImageUrl: text("prize_image_url"),
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    orders = pgTable("orders", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
      discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
      /** رسوم التوصيل — لا تدخل في احتساب فرص السحب */
      deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
      walletAmount: decimal("wallet_amount", { precision: 10, scale: 2 }).notNull().default("0"),
      /** المبلغ المستحق فعلياً بعد الخصم والمحفظة */
      totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
      /** المبلغ المعتمد لاحتساب التذاكر (بعد الخصم، قبل المحفظة) */
      ticketEligibleAmount: decimal("ticket_eligible_amount", { precision: 10, scale: 2 }).notNull().default("0"),
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    orderItems = pgTable("order_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
      productId: varchar("product_id").notNull(),
      /** نسخة من بيانات المنتج وقت الشراء حتى لو انحذف لاحقاً */
      productName: text("product_name").notNull(),
      productImageUrl: text("product_image_url"),
      unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
      quantity: integer("quantity").notNull(),
      lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull()
    });
    tickets = pgTable("tickets", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ticketNumber: text("ticket_number").notNull().unique(),
      userId: varchar("user_id").notNull().references(() => users.id),
      orderId: varchar("order_id").notNull().references(() => orders.id),
      /** null = تذكرة بانتظار فتح جولة جديدة */
      drawId: varchar("draw_id"),
      isWinner: boolean("is_winner").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    paymentMethods = pgTable("payment_methods", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      nameAr: text("name_ar").notNull(),
      icon: text("icon").notNull().default("card"),
      enabled: boolean("enabled").notNull().default(true),
      description: text("description"),
      bankName: text("bank_name"),
      accountName: text("account_name"),
      iban: text("iban"),
      imageUrl: text("image_url"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    coupons = pgTable("coupons", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      code: text("code").notNull().unique(),
      discountPercent: integer("discount_percent").notNull(),
      maxUses: integer("max_uses").notNull().default(100),
      usedCount: integer("used_count").notNull().default(0),
      enabled: boolean("enabled").notNull().default(true),
      expiresAt: timestamp("expires_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    activityLog = pgTable("activity_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      type: text("type").notNull(),
      title: text("title").notNull(),
      description: text("description"),
      userId: varchar("user_id"),
      metadata: text("metadata"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    reviews = pgTable("reviews", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      productId: varchar("product_id").notNull(),
      rating: integer("rating").notNull(),
      comment: text("comment"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    adminNotifications = pgTable("admin_notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      type: text("type").notNull(),
      title: text("title").notNull(),
      message: text("message").notNull(),
      isRead: boolean("is_read").notNull().default(false),
      metadata: text("metadata"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    userNotifications = pgTable("user_notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      type: text("type").notNull(),
      title: text("title").notNull(),
      body: text("body").notNull(),
      isRead: boolean("is_read").notNull().default(false),
      drawId: varchar("draw_id"),
      productId: varchar("product_id"),
      metadata: text("metadata"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    emailVerificationTokens = pgTable("email_verification_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      code: text("code").notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      used: boolean("used").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    passwordResetTokens = pgTable("password_reset_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      code: text("code").notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      used: boolean("used").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    supportTickets = pgTable("support_tickets", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      subject: text("subject").notNull(),
      message: text("message").notNull(),
      status: text("status").notNull().default("open"),
      priority: text("priority").notNull().default("medium"),
      adminReply: text("admin_reply"),
      repliedAt: timestamp("replied_at"),
      closedAt: timestamp("closed_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    walletTransactions = pgTable("wallet_transactions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      type: text("type").notNull(),
      description: text("description").notNull(),
      referenceId: varchar("reference_id"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    campaignClientRequests = pgTable("campaign_client_requests", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessName: text("business_name").notNull(),
      contactName: text("contact_name").notNull(),
      phone: text("phone").notNull(),
      email: text("email"),
      productName: text("product_name").notNull(),
      productValue: decimal("product_value", { precision: 10, scale: 2 }),
      description: text("description"),
      status: text("status").notNull().default("pending"),
      adminNotes: text("admin_notes"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    usersRelations = relations(users, ({ many }) => ({
      orders: many(orders),
      tickets: many(tickets),
      reviews: many(reviews)
    }));
    productsRelations = relations(products, ({ many }) => ({
      orderItems: many(orderItems),
      reviews: many(reviews)
    }));
    drawsRelations = relations(draws, ({ many, one }) => ({
      tickets: many(tickets),
      winner: one(users, {
        fields: [draws.winnerId],
        references: [users.id]
      })
    }));
    ordersRelations = relations(orders, ({ one, many }) => ({
      user: one(users, {
        fields: [orders.userId],
        references: [users.id]
      }),
      items: many(orderItems),
      tickets: many(tickets)
    }));
    orderItemsRelations = relations(orderItems, ({ one }) => ({
      order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id]
      }),
      product: one(products, {
        fields: [orderItems.productId],
        references: [products.id]
      })
    }));
    ticketsRelations = relations(tickets, ({ one }) => ({
      user: one(users, {
        fields: [tickets.userId],
        references: [users.id]
      }),
      order: one(orders, {
        fields: [tickets.orderId],
        references: [orders.id]
      }),
      draw: one(draws, {
        fields: [tickets.drawId],
        references: [draws.id]
      })
    }));
    reviewsRelations = relations(reviews, ({ one }) => ({
      user: one(users, {
        fields: [reviews.userId],
        references: [users.id]
      }),
      product: one(products, {
        fields: [reviews.productId],
        references: [products.id]
      })
    }));
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      email: true,
      password: true
    });
    loginSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    });
    insertProductSchema = z.object({
      name: z.string().min(2, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C \u0645\u0637\u0644\u0648\u0628"),
      description: z.string().optional().default(""),
      imageUrl: z.string().optional().nullable(),
      imagesJson: z.string().optional().nullable(),
      specsJson: z.string().optional().nullable(),
      price: z.union([z.string(), z.number()]).transform((v) => String(v)),
      stock: z.union([z.number(), z.null()]).optional(),
      category: z.string().optional().default("other"),
      isActive: z.boolean().optional().default(true),
      sortOrder: z.number().optional().default(0)
    });
    insertDrawSchema = z.object({
      title: z.string().min(2, "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062C\u0648\u0644\u0629 \u0645\u0637\u0644\u0648\u0628"),
      prizeName: z.string().min(2, "\u0627\u0633\u0645 \u0627\u0644\u062C\u0627\u0626\u0632\u0629 \u0645\u0637\u0644\u0648\u0628"),
      prizeDescription: z.string().optional().nullable(),
      prizeImageUrl: z.string().optional().nullable(),
      ticketPrice: z.union([z.string(), z.number()]).transform((v) => String(v)).refine((v) => parseFloat(v) > 0, "\u0633\u0639\u0631 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0644\u0627\u0632\u0645 \u064A\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631"),
      targetTickets: z.number().int().min(1, "\u0639\u062F\u062F \u0627\u0644\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641 \u0645\u0637\u0644\u0648\u0628")
    });
    insertPaymentMethodSchema = createInsertSchema(paymentMethods).pick({
      name: true,
      nameAr: true,
      icon: true,
      enabled: true,
      description: true,
      bankName: true,
      accountName: true,
      iban: true,
      imageUrl: true
    });
    insertCouponSchema = createInsertSchema(coupons).pick({
      code: true,
      discountPercent: true,
      maxUses: true,
      expiresAt: true,
      enabled: true
    });
    updateProfileSchema = z.object({
      fullName: z.string().min(2, "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628"),
      phone: z.string().min(8, "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
      address: z.string().min(5, "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628"),
      city: z.string().min(2, "\u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0645\u0637\u0644\u0648\u0628\u0629"),
      country: z.string().min(2, "\u0627\u0644\u062F\u0648\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0629")
    });
    insertReviewSchema = z.object({
      productId: z.string().min(1),
      rating: z.number().min(1).max(5),
      comment: z.string().optional()
    });
    insertSupportTicketSchema = z.object({
      subject: z.string().min(3, "\u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0645\u0637\u0644\u0648\u0628"),
      message: z.string().min(10, "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0642\u0635\u064A\u0631\u0629 \u062C\u062F\u0627\u064B"),
      priority: z.enum(["low", "medium", "high"]).default("medium")
    });
    insertCampaignClientRequestSchema = z.object({
      businessName: z.string().min(2, "\u0627\u0633\u0645 \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0645\u0637\u0644\u0648\u0628"),
      contactName: z.string().min(2, "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628"),
      phone: z.string().min(7, "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
      email: z.string().email("\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D").optional().or(z.literal("")),
      productName: z.string().min(2, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C \u0645\u0637\u0644\u0648\u0628"),
      productValue: z.string().optional(),
      description: z.string().optional()
    });
    checkoutSchema = z.object({
      items: z.array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().min(1).max(50)
        })
      ).min(1, "\u0627\u0644\u0633\u0644\u0629 \u0641\u0627\u0631\u063A\u0629"),
      paymentMethod: z.string().min(1),
      shippingFullName: z.string().optional(),
      shippingPhone: z.string().optional(),
      shippingCity: z.string().optional(),
      shippingAddress: z.string().optional(),
      shippingCountry: z.string().optional(),
      couponCode: z.string().optional().nullable(),
      useWallet: z.boolean().optional().default(false)
    });
    DEFAULT_DELIVERY_FEE = 2;
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var Pool, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DEFAULT_TICKET_PRICE: () => DEFAULT_TICKET_PRICE,
  DatabaseStorage: () => DatabaseStorage,
  storage: () => storage
});
import { eq, asc, desc, and, sql as sql2, count, sum, gte, inArray, isNull } from "drizzle-orm";
import { randomBytes, randomInt } from "crypto";
function generateTicketNumber() {
  const prefix = "FT";
  const timestamp2 = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${timestamp2}-${random}`;
}
var DEFAULT_TICKET_PRICE, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    DEFAULT_TICKET_PRICE = 10;
    DatabaseStorage = class {
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user || void 0;
      }
      async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      }
      /* ============================ المنتجات (الكتالوج) ============================ */
      async getProducts(includeInactive = false) {
        const query = db.select().from(products);
        const rows = includeInactive ? await query.orderBy(asc(products.sortOrder), desc(products.createdAt)) : await query.where(eq(products.isActive, true)).orderBy(asc(products.sortOrder), desc(products.createdAt));
        return rows;
      }
      async getProduct(id) {
        const [product] = await db.select().from(products).where(eq(products.id, id));
        return product || void 0;
      }
      async createProduct(data) {
        const [product] = await db.insert(products).values({
          name: data.name,
          description: data.description ?? "",
          imageUrl: data.imageUrl ?? null,
          imagesJson: data.imagesJson ?? null,
          specsJson: data.specsJson ?? null,
          price: data.price,
          stock: data.stock ?? null,
          category: data.category ?? "other",
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0
        }).returning();
        return product;
      }
      async updateProduct(id, data) {
        const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
        return updated || void 0;
      }
      async deleteProduct(id) {
        const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
        return !!deleted;
      }
      /* ============================== جولات السحب ============================== */
      async getDraws() {
        return db.select().from(draws).orderBy(asc(draws.sortOrder), desc(draws.createdAt));
      }
      async getDraw(id) {
        const [draw] = await db.select().from(draws).where(eq(draws.id, id));
        return draw || void 0;
      }
      /** الجولة اللي التذاكر الجديدة بتروح إلها */
      async getActiveDraw() {
        const [draw] = await db.select().from(draws).where(eq(draws.status, "active")).orderBy(asc(draws.sortOrder), asc(draws.createdAt)).limit(1);
        return draw || void 0;
      }
      async getCompletedDraws() {
        return db.select().from(draws).where(eq(draws.status, "completed")).orderBy(desc(draws.drawnAt));
      }
      /**
       * أول جولة نشطة أو مجدولة — بتُستخدم لعرض "الجولة الحالية" للمستخدم
       * حتى لو الجولة النشطة وصلت للعدد وصارت ready_to_draw.
       */
      async getCurrentDraw() {
        const [draw] = await db.select().from(draws).where(inArray(draws.status, ["active", "ready_to_draw"])).orderBy(asc(draws.sortOrder), asc(draws.createdAt)).limit(1);
        if (draw) return draw;
        const [scheduled] = await db.select().from(draws).where(eq(draws.status, "scheduled")).orderBy(asc(draws.sortOrder), asc(draws.createdAt)).limit(1);
        return scheduled || void 0;
      }
      /**
       * بتنشئ جولة جديدة. إذا ما في ولا جولة نشطة بتصير هي النشطة فوراً
       * وبتستلم أي تذاكر معلّقة (drawId = null) من طلبات سابقة.
       */
      async createDraw(data) {
        const existingActive = await this.getActiveDraw();
        const [maxRow] = await db.select({ maxOrder: sql2`coalesce(max(${draws.sortOrder}), 0)` }).from(draws);
        const [draw] = await db.insert(draws).values({
          title: data.title,
          prizeName: data.prizeName,
          prizeDescription: data.prizeDescription ?? null,
          prizeImageUrl: data.prizeImageUrl ?? null,
          ticketPrice: data.ticketPrice,
          targetTickets: data.targetTickets,
          sortOrder: (maxRow?.maxOrder ?? 0) + 1,
          status: existingActive ? "scheduled" : "active",
          startedAt: existingActive ? null : /* @__PURE__ */ new Date()
        }).returning();
        if (!existingActive) {
          await this.assignPendingTicketsToDraw(draw.id);
          return await this.getDraw(draw.id) ?? draw;
        }
        return draw;
      }
      async updateDraw(id, data) {
        const [updated] = await db.update(draws).set(data).where(eq(draws.id, id)).returning();
        return updated || void 0;
      }
      async deleteDraw(id) {
        const draw = await this.getDraw(id);
        if (!draw) return false;
        if (draw.status === "completed") {
          throw new Error("\u0645\u0627 \u0628\u064A\u0646\u0641\u0639 \u062A\u062D\u0630\u0641 \u062C\u0648\u0644\u0629 \u062A\u0645 \u0627\u0644\u0633\u062D\u0628 \u0639\u0644\u064A\u0647\u0627");
        }
        await db.update(tickets).set({ drawId: null }).where(eq(tickets.drawId, id));
        const [deleted] = await db.delete(draws).where(eq(draws.id, id)).returning();
        return !!deleted;
      }
      /**
       * بتفعّل الجولة المجدولة التالية وبتسلّمها التذاكر المعلّقة.
       * بترجّع الجولة النشطة الجديدة أو undefined إذا ما في جولات مجدولة.
       */
      async activateNextScheduledDraw() {
        const [next] = await db.select().from(draws).where(eq(draws.status, "scheduled")).orderBy(asc(draws.sortOrder), asc(draws.createdAt)).limit(1);
        if (!next) return void 0;
        await db.update(draws).set({ status: "active", startedAt: /* @__PURE__ */ new Date() }).where(eq(draws.id, next.id));
        await this.assignPendingTicketsToDraw(next.id);
        return await this.getDraw(next.id) ?? void 0;
      }
      /**
       * بتسلّم التذاكر المعلّقة (drawId = null) لجولة، بحدود سعتها.
       * إذا امتلأت الجولة بتصير ready_to_draw.
       */
      async assignPendingTicketsToDraw(drawId) {
        const draw = await this.getDraw(drawId);
        if (!draw) return 0;
        const capacity = draw.targetTickets - draw.soldTickets;
        if (capacity <= 0) {
          if (draw.status === "active") {
            await this.updateDraw(drawId, { status: "ready_to_draw" });
          }
          return 0;
        }
        const pending = await db.select({ id: tickets.id }).from(tickets).where(isNull(tickets.drawId)).orderBy(asc(tickets.createdAt)).limit(capacity);
        if (pending.length === 0) return 0;
        await db.update(tickets).set({ drawId }).where(inArray(tickets.id, pending.map((t) => t.id)));
        const newSold = draw.soldTickets + pending.length;
        await this.updateDraw(drawId, {
          soldTickets: newSold,
          ...newSold >= draw.targetTickets ? { status: "ready_to_draw" } : {}
        });
        return pending.length;
      }
      async getTicketsByDraw(drawId) {
        return db.select().from(tickets).where(eq(tickets.drawId, drawId)).orderBy(desc(tickets.createdAt));
      }
      /** عدد المشاركين الفريدين بجولة */
      async getDrawParticipantCount(drawId) {
        const [row] = await db.select({ total: sql2`count(distinct ${tickets.userId})` }).from(tickets).where(eq(tickets.drawId, drawId));
        return Number(row?.total ?? 0);
      }
      /** تذاكر مستخدم معيّن بجولة معيّنة */
      async getUserTicketCountForDraw(userId, drawId) {
        const [row] = await db.select({ total: count() }).from(tickets).where(and(eq(tickets.userId, userId), eq(tickets.drawId, drawId)));
        return Number(row?.total ?? 0);
      }
      /** السحب: اختيار تذكرة عشوائية من تذاكر الجولة */
      async drawWinner(drawId) {
        const draw = await this.getDraw(drawId);
        if (!draw) throw new Error("\u0627\u0644\u062C\u0648\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
        if (draw.status === "completed") throw new Error("\u062A\u0645 \u0627\u0644\u0633\u062D\u0628 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u062C\u0648\u0644\u0629 \u0645\u0633\u0628\u0642\u0627\u064B");
        const drawTickets = await this.getTicketsByDraw(drawId);
        if (drawTickets.length === 0) {
          throw new Error("\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0630\u0627\u0643\u0631 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u062C\u0648\u0644\u0629 \u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0633\u062D\u0628");
        }
        const winningTicket = drawTickets[randomInt(0, drawTickets.length)];
        await db.update(tickets).set({ isWinner: true }).where(eq(tickets.id, winningTicket.id));
        const winner = await this.getUser(winningTicket.userId);
        if (!winner) throw new Error("\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0641\u0627\u0626\u0632");
        const [updatedDraw] = await db.update(draws).set({
          status: "completed",
          winnerId: winner.id,
          winnerTicketId: winningTicket.id,
          winnerTicketNumber: winningTicket.ticketNumber,
          drawnAt: /* @__PURE__ */ new Date()
        }).where(eq(draws.id, drawId)).returning();
        const stillActive = await this.getActiveDraw();
        if (!stillActive) {
          await this.activateNextScheduledDraw();
        }
        return { winner, ticket: { ...winningTicket, isWinner: true }, draw: updatedDraw };
      }
      /* ================================ الشراء ================================ */
      /**
       * عملية الشراء كاملة داخل transaction واحد:
       * التحقق من المخزون، حساب السعر من السيرفر (مو من العميل)، الكوبون،
       * المحفظة، إنشاء الطلب وسطوره، وخصم المخزون.
       *
       * التذاكر ما بتنمنح هون — بتنمنح لما الأدمن يأكّد الدفع
       * (شوف awardTicketsForOrder).
       */
      async checkout(userId, payload) {
        return db.transaction(async (tx) => {
          const wanted = /* @__PURE__ */ new Map();
          for (const item of payload.items) {
            wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
          }
          const productIds = [...wanted.keys()];
          const rows = await tx.select().from(products).where(inArray(products.id, productIds)).for("update");
          const byId = new Map(rows.map((p) => [p.id, p]));
          let subtotal = 0;
          const lines = [];
          for (const [productId, quantity] of wanted) {
            const product = byId.get(productId);
            if (!product) throw new Error("\u0623\u062D\u062F \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0644\u0645 \u064A\u0639\u062F \u0645\u062A\u0648\u0641\u0631\u0627\u064B");
            if (!product.isActive) throw new Error(`\u0627\u0644\u0645\u0646\u062A\u062C "${product.name}" \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u062D\u0627\u0644\u064A\u0627\u064B`);
            if (product.stock !== null && product.stock < quantity) {
              throw new Error(`\u0645\u062A\u0628\u0642\u064A ${product.stock} \u0642\u0637\u0639\u0629 \u0641\u0642\u0637 \u0645\u0646 "${product.name}"`);
            }
            const unitPrice = parseFloat(product.price);
            const lineTotal = unitPrice * quantity;
            subtotal += lineTotal;
            lines.push({
              productId: product.id,
              productName: product.name,
              productImageUrl: product.imageUrl,
              unitPrice: unitPrice.toFixed(2),
              quantity,
              lineTotal: lineTotal.toFixed(2)
            });
          }
          let discountAmount = 0;
          let appliedCouponCode = null;
          if (payload.couponCode) {
            const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, payload.couponCode.trim().toUpperCase())).for("update");
            if (!coupon) throw new Error("\u0643\u0648\u062F \u0627\u0644\u062E\u0635\u0645 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D");
            if (!coupon.enabled) throw new Error("\u0643\u0648\u062F \u0627\u0644\u062E\u0635\u0645 \u063A\u064A\u0631 \u0645\u0641\u0639\u0651\u0644");
            if (coupon.usedCount >= coupon.maxUses) throw new Error("\u062A\u0645 \u0627\u0633\u062A\u0646\u0641\u0627\u062F \u0643\u0648\u062F \u0627\u0644\u062E\u0635\u0645");
            if (coupon.expiresAt && new Date(coupon.expiresAt) < /* @__PURE__ */ new Date()) {
              throw new Error("\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0643\u0648\u062F \u0627\u0644\u062E\u0635\u0645");
            }
            discountAmount = subtotal * coupon.discountPercent / 100;
            appliedCouponCode = coupon.code;
            await tx.update(coupons).set({ usedCount: coupon.usedCount + 1 }).where(eq(coupons.id, coupon.id));
          }
          const afterDiscount = Math.max(0, subtotal - discountAmount);
          const deliveryFee = DEFAULT_DELIVERY_FEE;
          const payable = afterDiscount + deliveryFee;
          let walletAmount = 0;
          if (payload.useWallet) {
            const [user] = await tx.select({ walletBalance: users.walletBalance }).from(users).where(eq(users.id, userId)).for("update");
            const balance = parseFloat(user?.walletBalance ?? "0");
            walletAmount = Math.min(balance, payable);
            if (walletAmount > 0) {
              await tx.update(users).set({ walletBalance: sql2`${users.walletBalance} - ${walletAmount.toFixed(2)}` }).where(eq(users.id, userId));
            }
          }
          const totalDue = Math.max(0, payable - walletAmount);
          const isBankTransfer = payload.paymentMethod === "bank_transfer";
          const [order] = await tx.insert(orders).values({
            userId,
            subtotal: subtotal.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            walletAmount: walletAmount.toFixed(2),
            totalAmount: totalDue.toFixed(2),
            // التذاكر بتنحسب على قيمة البضاعة بعد الخصم، قبل خصم المحفظة
            ticketEligibleAmount: afterDiscount.toFixed(2),
            status: "pending",
            paymentMethod: payload.paymentMethod,
            paymentStatus: isBankTransfer ? "pending_payment" : "pending_review",
            shippingFullName: payload.shippingFullName,
            shippingPhone: payload.shippingPhone,
            shippingCity: payload.shippingCity,
            shippingAddress: payload.shippingAddress,
            shippingCountry: payload.shippingCountry,
            couponCode: appliedCouponCode
          }).returning();
          const insertedItems = await tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: order.id }))).returning();
          for (const [productId, quantity] of wanted) {
            const product = byId.get(productId);
            await tx.update(products).set({
              soldCount: product.soldCount + quantity,
              ...product.stock !== null ? { stock: product.stock - quantity } : {}
            }).where(eq(products.id, productId));
          }
          if (walletAmount > 0) {
            await tx.insert(walletTransactions).values({
              userId,
              amount: (-walletAmount).toFixed(2),
              type: "debit",
              description: `\u062E\u0635\u0645 \u0645\u062D\u0641\u0638\u0629 \u2014 \u0637\u0644\u0628 ${order.id.slice(0, 8)}`,
              referenceId: order.id
            });
          }
          return { ...order, items: insertedItems };
        });
      }
      /**
       * بتمنح تذاكر لطلب بعد تأكيد الدفع. idempotent — نداءها مرتين ما بيضاعف.
       * عدد التذاكر = floor(قيمة البضاعة بعد الخصم ÷ سعر التذكرة).
       * إذا امتلأت الجولة النشطة، الزيادة بتروح للجولة التالية،
       * وإذا ما في جولة تالية بتضلّ معلّقة لحدّ ما الأدمن يفتح جولة جديدة.
       */
      async awardTicketsForOrder(orderId) {
        const order = await this.getOrder(orderId);
        if (!order) throw new Error("\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
        if (order.ticketsAwarded > 0) return { created: 0, drawIds: [] };
        if (order.paymentStatus !== "confirmed") return { created: 0, drawIds: [] };
        const eligible = parseFloat(order.ticketEligibleAmount);
        let activeDraw = await this.getActiveDraw();
        const ticketPrice = activeDraw ? parseFloat(activeDraw.ticketPrice) : DEFAULT_TICKET_PRICE;
        const totalTickets = ticketPrice > 0 ? Math.floor(eligible / ticketPrice) : 0;
        if (totalTickets <= 0) {
          await this.updateOrder(orderId, { ticketsAwarded: 0 });
          return { created: 0, drawIds: [] };
        }
        const drawIds = [];
        let remaining = totalTickets;
        let guard = 0;
        while (remaining > 0 && guard++ < 100) {
          if (!activeDraw) {
            await this.createTickets(order.userId, order.id, null, remaining);
            remaining = 0;
            break;
          }
          const capacity = activeDraw.targetTickets - activeDraw.soldTickets;
          if (capacity <= 0) {
            await this.updateDraw(activeDraw.id, { status: "ready_to_draw" });
            activeDraw = await this.activateNextScheduledDraw();
            continue;
          }
          const take = Math.min(capacity, remaining);
          await this.createTickets(order.userId, order.id, activeDraw.id, take);
          const newSold = activeDraw.soldTickets + take;
          await this.updateDraw(activeDraw.id, {
            soldTickets: newSold,
            ...newSold >= activeDraw.targetTickets ? { status: "ready_to_draw" } : {}
          });
          if (!drawIds.includes(activeDraw.id)) drawIds.push(activeDraw.id);
          remaining -= take;
          if (newSold >= activeDraw.targetTickets) {
            activeDraw = await this.activateNextScheduledDraw();
          }
        }
        await this.updateOrder(orderId, { ticketsAwarded: totalTickets });
        return { created: totalTickets, drawIds };
      }
      async createTickets(userId, orderId, drawId, quantity) {
        if (quantity <= 0) return [];
        const values = Array.from({ length: quantity }, () => ({
          ticketNumber: generateTicketNumber(),
          userId,
          orderId,
          drawId
        }));
        return db.insert(tickets).values(values).returning();
      }
      /* ================================ الطلبات ================================ */
      async getOrdersByUser(userId) {
        return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
      }
      async getOrderItems(orderId) {
        return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      }
      async getOrderWithItems(orderId) {
        const order = await this.getOrder(orderId);
        if (!order) return void 0;
        const items = await this.getOrderItems(orderId);
        return { ...order, items };
      }
      async updateOrder(id, data) {
        const [updated] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
        return updated || void 0;
      }
      async getTicketsByUser(userId) {
        return db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
      }
      async getTicket(id) {
        const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
        return ticket || void 0;
      }
      async getAllUsers() {
        return db.select().from(users).orderBy(desc(users.createdAt));
      }
      async getUserStats(userId) {
        const [orderResult] = await db.select({ orderCount: count(), totalSpent: sum(orders.totalAmount) }).from(orders).where(eq(orders.userId, userId));
        const [ticketResult] = await db.select({ ticketCount: count() }).from(tickets).where(eq(tickets.userId, userId));
        return {
          orderCount: orderResult?.orderCount || 0,
          ticketCount: ticketResult?.ticketCount || 0,
          totalSpent: orderResult?.totalSpent || "0.00"
        };
      }
      async getAllOrders() {
        const rows = await db.select({
          order: orders,
          username: users.username
        }).from(orders).leftJoin(users, eq(orders.userId, users.id)).orderBy(desc(orders.createdAt));
        if (rows.length === 0) return [];
        const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.order.id)));
        const itemsByOrder = /* @__PURE__ */ new Map();
        for (const item of items) {
          const list = itemsByOrder.get(item.orderId) ?? [];
          list.push(item);
          itemsByOrder.set(item.orderId, list);
        }
        return rows.map(({ order, username }) => {
          const orderItemList = itemsByOrder.get(order.id) ?? [];
          const itemCount = orderItemList.reduce((s, i) => s + i.quantity, 0);
          const names = orderItemList.map((i) => `${i.productName} \xD7${i.quantity}`);
          return {
            ...order,
            username: username || "Unknown",
            itemCount,
            summary: names.length > 0 ? names.join("\u060C ") : "\u2014"
          };
        });
      }
      async getOrder(id) {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        return order || void 0;
      }
      async updateOrderShipping(orderId, data) {
        const updateData = {};
        if (data.shippingStatus) updateData.shippingStatus = data.shippingStatus;
        if (data.trackingNumber !== void 0) updateData.trackingNumber = data.trackingNumber;
        if (data.shippingAddress !== void 0) updateData.shippingAddress = data.shippingAddress;
        const [updated] = await db.update(orders).set(updateData).where(eq(orders.id, orderId)).returning();
        return updated || void 0;
      }
      async updateOrderPayment(orderId, data) {
        const updateData = { paymentStatus: data.paymentStatus };
        if (data.receiptUrl !== void 0) updateData.receiptUrl = data.receiptUrl;
        if (data.rejectionReason !== void 0) updateData.rejectionReason = data.rejectionReason;
        const [updated] = await db.update(orders).set(updateData).where(eq(orders.id, orderId)).returning();
        return updated || void 0;
      }
      async getPaymentMethods() {
        return db.select().from(paymentMethods).orderBy(desc(paymentMethods.createdAt));
      }
      async getEnabledPaymentMethods() {
        return db.select().from(paymentMethods).where(eq(paymentMethods.enabled, true)).orderBy(desc(paymentMethods.createdAt));
      }
      async createPaymentMethod(data) {
        const [created] = await db.insert(paymentMethods).values(data).returning();
        return created;
      }
      async updatePaymentMethod(id, data) {
        const [updated] = await db.update(paymentMethods).set(data).where(eq(paymentMethods.id, id)).returning();
        return updated || void 0;
      }
      async deletePaymentMethod(id) {
        const [deleted] = await db.delete(paymentMethods).where(eq(paymentMethods.id, id)).returning();
        return !!deleted;
      }
      async getCoupons() {
        return db.select().from(coupons).orderBy(desc(coupons.createdAt));
      }
      async createCoupon(data) {
        const [created] = await db.insert(coupons).values(data).returning();
        return created;
      }
      async updateCoupon(id, data) {
        const [updated] = await db.update(coupons).set(data).where(eq(coupons.id, id)).returning();
        return updated || void 0;
      }
      async deleteCoupon(id) {
        const [deleted] = await db.delete(coupons).where(eq(coupons.id, id)).returning();
        return !!deleted;
      }
      async validateCoupon(code) {
        const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
        if (!coupon) throw new Error("Invalid coupon code");
        if (!coupon.enabled) throw new Error("This coupon is no longer active");
        if (coupon.expiresAt && new Date(coupon.expiresAt) < /* @__PURE__ */ new Date()) {
          throw new Error("This coupon has expired");
        }
        if (coupon.usedCount >= coupon.maxUses) {
          throw new Error("This coupon has reached its maximum usage limit");
        }
        return coupon;
      }
      async getActivityLog(limit = 50) {
        return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
      }
      async logActivity(type, title, description, userId, metadata) {
        const [entry] = await db.insert(activityLog).values({ type, title, description, userId, metadata }).returning();
        return entry;
      }
      async getAdminDashboardStats() {
        const [revenueResult] = await db.select({ total: sum(orders.totalAmount) }).from(orders).where(eq(orders.paymentStatus, "confirmed"));
        const [ordersResult] = await db.select({ total: count() }).from(orders);
        const [usersResult] = await db.select({ total: count() }).from(users);
        const [activeProductsResult] = await db.select({ total: count() }).from(products).where(eq(products.isActive, true));
        const [pendingResult] = await db.select({ total: count() }).from(orders).where(eq(orders.paymentStatus, "pending_review"));
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const [ordersTodayResult] = await db.select({ total: count() }).from(orders).where(gte(orders.createdAt, today));
        const weekAgo = /* @__PURE__ */ new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const [newUsersResult] = await db.select({ total: count() }).from(users).where(gte(users.createdAt, weekAgo));
        const topProducts = await db.select({ name: products.name, soldCount: products.soldCount }).from(products).orderBy(desc(products.soldCount)).limit(5);
        const activeDraw = await this.getCurrentDraw() ?? null;
        const totalOrdersCount = ordersResult?.total || 0;
        const totalUsersCount = usersResult?.total || 0;
        const totalRevenueNum = parseFloat(revenueResult?.total || "0");
        const conversionRate = totalUsersCount > 0 ? (totalOrdersCount / totalUsersCount * 100).toFixed(1) : "0.0";
        const averageOrderValue = totalOrdersCount > 0 ? (totalRevenueNum / totalOrdersCount).toFixed(2) : "0.00";
        return {
          totalRevenue: revenueResult?.total || "0.00",
          totalOrders: totalOrdersCount,
          totalUsers: totalUsersCount,
          activeProducts: activeProductsResult?.total || 0,
          ordersToday: ordersTodayResult?.total || 0,
          newUsersThisWeek: newUsersResult?.total || 0,
          conversionRate,
          averageOrderValue,
          pendingReviewOrders: pendingResult?.total || 0,
          ticketsInActiveDraw: activeDraw?.soldTickets ?? 0,
          activeDraw,
          topProducts
        };
      }
      async updateUserProfile(userId, data) {
        const [user] = await db.update(users).set({
          fullName: data.fullName,
          phone: data.phone,
          address: data.address,
          city: data.city,
          country: data.country
        }).where(eq(users.id, userId)).returning();
        return user || void 0;
      }
      async getReviewsByProduct(productId) {
        return db.select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          username: users.username
        }).from(reviews).innerJoin(users, eq(reviews.userId, users.id)).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt));
      }
      async createReview(userId, data) {
        const [review] = await db.insert(reviews).values({
          userId,
          productId: data.productId,
          rating: data.rating,
          comment: data.comment || null
        }).returning();
        return review;
      }
      async getUserReviewForProduct(userId, productId) {
        const [review] = await db.select().from(reviews).where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)));
        return review || void 0;
      }
      async getAdminNotifications(limit = 50) {
        return db.select().from(adminNotifications).orderBy(desc(adminNotifications.createdAt)).limit(limit);
      }
      async createAdminNotification(type, title, message, metadata) {
        const [notification] = await db.insert(adminNotifications).values({
          type,
          title,
          message,
          metadata: metadata || null
        }).returning();
        return notification;
      }
      async markNotificationRead(id) {
        const [result] = await db.update(adminNotifications).set({ isRead: true }).where(eq(adminNotifications.id, id)).returning();
        return !!result;
      }
      async markAllNotificationsRead() {
        await db.update(adminNotifications).set({ isRead: true }).where(eq(adminNotifications.isRead, false));
        return true;
      }
      async getUnreadNotificationCount() {
        const [result] = await db.select({ count: count() }).from(adminNotifications).where(eq(adminNotifications.isRead, false));
        return result?.count || 0;
      }
      async generateReferralCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code;
        let exists = true;
        do {
          code = "";
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const [existing] = await db.select().from(users).where(eq(users.referralCode, code)).limit(1);
          exists = !!existing;
        } while (exists);
        return code;
      }
      async getUserByReferralCode(code) {
        const [user] = await db.select().from(users).where(eq(users.referralCode, code.toUpperCase()));
        return user || void 0;
      }
      async setUserReferralCode(userId, code) {
        await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
      }
      async setUserReferredBy(userId, referrerId) {
        await db.update(users).set({ referredBy: referrerId }).where(eq(users.id, userId));
      }
      async getReferralCount(userId) {
        const [result] = await db.select({ count: count() }).from(users).where(eq(users.referredBy, userId));
        return result?.count || 0;
      }
      async getReferredUsers(userId) {
        const result = await db.select({
          username: users.username,
          createdAt: users.createdAt
        }).from(users).where(eq(users.referredBy, userId)).orderBy(desc(users.createdAt));
        return result;
      }
      async ensureAllUsersHaveReferralCodes() {
        const usersWithoutCodes = await db.select({ id: users.id }).from(users).where(sql2`${users.referralCode} IS NULL`);
        let updated = 0;
        for (const u of usersWithoutCodes) {
          const code = await this.generateReferralCode();
          await this.setUserReferralCode(u.id, code);
          updated++;
        }
        return updated;
      }
      async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user || void 0;
      }
      async createPasswordResetToken(userId, code, expiresAt) {
        const [token] = await db.insert(passwordResetTokens).values({
          userId,
          code,
          expiresAt
        }).returning();
        return token;
      }
      async verifyPasswordResetToken(userId, code) {
        const [token] = await db.select().from(passwordResetTokens).where(
          and(
            eq(passwordResetTokens.userId, userId),
            eq(passwordResetTokens.code, code),
            eq(passwordResetTokens.used, false),
            gte(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date())
          )
        ).orderBy(desc(passwordResetTokens.createdAt)).limit(1);
        return token || null;
      }
      async markResetTokenUsed(tokenId) {
        await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, tokenId));
      }
      async updateUserPassword(userId, hashedPassword) {
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
      }
      async updateUserEmail(userId, email) {
        await db.update(users).set({ email }).where(eq(users.id, userId));
      }
      async createUserNotification(userId, type, title, body, drawId, metadata) {
        const [notification] = await db.insert(userNotifications).values({
          userId,
          type,
          title,
          body,
          drawId: drawId || null,
          metadata: metadata || null
        }).returning();
        return notification;
      }
      async createBulkUserNotifications(userIds, type, title, body, drawId, metadata) {
        if (userIds.length === 0) return;
        const values = userIds.map((userId) => ({
          userId,
          type,
          title,
          body,
          drawId: drawId || null,
          metadata: metadata || null
        }));
        await db.insert(userNotifications).values(values);
      }
      async getUserNotifications(userId, limit = 50) {
        return db.select().from(userNotifications).where(eq(userNotifications.userId, userId)).orderBy(desc(userNotifications.createdAt)).limit(limit);
      }
      async markUserNotificationRead(id, userId) {
        const [result] = await db.update(userNotifications).set({ isRead: true }).where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId))).returning();
        return !!result;
      }
      async markAllUserNotificationsRead(userId) {
        await db.update(userNotifications).set({ isRead: true }).where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
        return true;
      }
      async getUnreadUserNotificationCount(userId) {
        const [result] = await db.select({ count: count() }).from(userNotifications).where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
        return result?.count || 0;
      }
      async updateUserPushToken(userId, pushToken) {
        if (pushToken) {
          await db.update(users).set({ pushToken: null }).where(eq(users.pushToken, pushToken));
        }
        await db.update(users).set({ pushToken }).where(eq(users.id, userId));
      }
      async getUserPushTokensByIds(userIds) {
        if (userIds.length === 0) return [];
        const result = await db.select({ pushToken: users.pushToken }).from(users).where(inArray(users.id, userIds));
        return result.map((r) => r.pushToken).filter((t) => !!t);
      }
      async getUserApnTokensByIds(userIds) {
        if (userIds.length === 0) return [];
        const result = await db.select({ apnToken: users.apnToken }).from(users).where(inArray(users.id, userIds));
        return result.map((r) => r.apnToken).filter((t) => !!t && t.length > 20);
      }
      async updateUserDeviceTokens(userId, tokens) {
        const update = {};
        if (tokens.fcmToken !== void 0) update.fcmToken = tokens.fcmToken;
        if (tokens.apnToken !== void 0) update.apnToken = tokens.apnToken;
        if (Object.keys(update).length === 0) return;
        await db.update(users).set(update).where(eq(users.id, userId));
      }
      async getAllUsersWithFcmTokens() {
        const result = await db.select({ id: users.id, fcmToken: users.fcmToken, apnToken: users.apnToken }).from(users).where(eq(users.isSuspended, false));
        return result;
      }
      async getWalletBalance(userId) {
        const [u] = await db.select({ walletBalance: users.walletBalance }).from(users).where(eq(users.id, userId));
        return parseFloat(u?.walletBalance || "0");
      }
      async addWalletCredit(userId, amount, type, description, referenceId) {
        await db.update(users).set({ walletBalance: sql2`wallet_balance + ${amount}` }).where(eq(users.id, userId));
        await db.insert(walletTransactions).values({ userId, amount: String(amount), type, description, referenceId });
      }
      async deductWalletBalance(userId, amount, description, referenceId) {
        const balance = await this.getWalletBalance(userId);
        if (balance < amount) return false;
        await db.update(users).set({ walletBalance: sql2`wallet_balance - ${amount}` }).where(eq(users.id, userId));
        await db.insert(walletTransactions).values({ userId, amount: String(-amount), type: "debit", description, referenceId });
        return true;
      }
      async getWalletTransactions(userId) {
        return db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt)).limit(50);
      }
      async createEmailVerificationToken(userId, code, expiresAt) {
        const [token] = await db.insert(emailVerificationTokens).values({
          userId,
          code,
          expiresAt
        }).returning();
        return token;
      }
      async verifyEmailToken(userId, code) {
        const [token] = await db.select().from(emailVerificationTokens).where(
          and(
            eq(emailVerificationTokens.userId, userId),
            eq(emailVerificationTokens.code, code),
            eq(emailVerificationTokens.used, false),
            gte(emailVerificationTokens.expiresAt, /* @__PURE__ */ new Date())
          )
        ).orderBy(desc(emailVerificationTokens.createdAt)).limit(1);
        return token || null;
      }
      async markEmailTokenUsed(tokenId) {
        await db.update(emailVerificationTokens).set({ used: true }).where(eq(emailVerificationTokens.id, tokenId));
      }
      async setEmailVerified(userId) {
        await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
      }
      async getRecentPurchases(limit = 5) {
        const rows = await db.select({
          productName: orderItems.productName,
          createdAt: orders.createdAt
        }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(eq(orders.paymentStatus, "confirmed")).orderBy(desc(orders.createdAt)).limit(limit);
        return rows.map((o) => ({
          productName: o.productName,
          minutesAgo: Math.max(1, Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 6e4))
        }));
      }
      async deleteUser(userId) {
        await db.delete(supportTickets).where(eq(supportTickets.userId, userId));
        await db.delete(userNotifications).where(eq(userNotifications.userId, userId));
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
        await db.delete(reviews).where(eq(reviews.userId, userId));
        await db.delete(tickets).where(eq(tickets.userId, userId));
        const userOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, userId));
        if (userOrders.length > 0) {
          await db.delete(orderItems).where(inArray(orderItems.orderId, userOrders.map((o) => o.id)));
        }
        await db.delete(orders).where(eq(orders.userId, userId));
        const result = await db.delete(users).where(eq(users.id, userId));
        return (result?.rowCount ?? 0) > 0;
      }
      async createSupportTicket(userId, data) {
        const [ticket] = await db.insert(supportTickets).values({
          userId,
          subject: data.subject,
          message: data.message,
          priority: data.priority
        }).returning();
        return ticket;
      }
      async getUserSupportTickets(userId) {
        return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
      }
      async getSupportTicketById(ticketId) {
        const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
        return ticket;
      }
      async getAllSupportTickets() {
        const result = await db.select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          subject: supportTickets.subject,
          message: supportTickets.message,
          status: supportTickets.status,
          priority: supportTickets.priority,
          adminReply: supportTickets.adminReply,
          repliedAt: supportTickets.repliedAt,
          closedAt: supportTickets.closedAt,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
          username: users.username,
          email: users.email
        }).from(supportTickets).innerJoin(users, eq(supportTickets.userId, users.id)).orderBy(desc(supportTickets.createdAt));
        return result;
      }
      async updateSupportTicket(ticketId, data) {
        const updateData = { updatedAt: /* @__PURE__ */ new Date() };
        if (data.status) updateData.status = data.status;
        if (data.adminReply !== void 0) {
          updateData.adminReply = data.adminReply;
          updateData.repliedAt = /* @__PURE__ */ new Date();
        }
        if (data.status === "closed") updateData.closedAt = /* @__PURE__ */ new Date();
        const [ticket] = await db.update(supportTickets).set(updateData).where(eq(supportTickets.id, ticketId)).returning();
        return ticket;
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/index.ts
import express from "express";

// server/routes.ts
init_db();
init_storage();
init_schema();
import { z as z2 } from "zod";
import { createServer } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";

// server/firebase.ts
import admin from "firebase-admin";
var initialized = false;
function initFirebase() {
  if (initialized || admin.apps.length > 0) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[Firebase] Missing credentials \u2014 FCM disabled. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
    return;
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
  initialized = true;
  console.log("[Firebase] Admin SDK initialized for project:", projectId);
}
initFirebase();
async function sendFcmNotification(tokens, title, body, data) {
  const result = { success: 0, failure: 0, errors: [] };
  if (!initialized && admin.apps.length === 0) {
    result.errors.push("Firebase not initialized");
    result.failure = tokens.length;
    return result;
  }
  const validTokens = tokens.filter((t) => typeof t === "string" && t.length > 10);
  if (validTokens.length === 0) return result;
  const CHUNK = 500;
  for (let i = 0; i < validTokens.length; i += CHUNK) {
    const chunk = validTokens.slice(i, i + CHUNK);
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: data || {},
        android: {
          priority: "high",
          notification: {
            channelId: "default",
            sound: "default",
            icon: "notification_icon",
            color: "#FFD000"
          }
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } },
          headers: { "apns-priority": "10" }
        }
      });
      result.success += response.successCount;
      result.failure += response.failureCount;
      response.responses.forEach((r, idx) => {
        if (!r.success && r.error) {
          result.errors.push(`Token[${i + idx}]: ${r.error.message}`);
        }
      });
    } catch (err) {
      result.failure += chunk.length;
      result.errors.push(err.message || "Unknown error");
    }
  }
  return result;
}
async function sendFcmToUser(userId, fcmToken, title, body, data) {
  const tokens = [fcmToken].filter((t) => !!t && t.length > 10);
  return sendFcmNotification(tokens, title, body, data);
}

// server/apns.ts
import http2 from "http2";
import jwt from "jsonwebtoken";
var APN_HOST = "api.push.apple.com";
var BUNDLE_ID = process.env.APN_BUNDLE_ID || "app.replit.forsa";
var REQUEST_TIMEOUT_MS = 1e4;
var CONNECT_TIMEOUT_MS = 8e3;
var cachedToken = null;
var tokenGeneratedAt = 0;
function parseKey(raw) {
  let key = raw.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
  const beginMatch = key.match(/-----BEGIN [A-Z ]+-----/);
  const endMatch = key.match(/-----END [A-Z ]+-----/);
  if (!beginMatch || !endMatch) return key;
  const beginIdx = key.indexOf(beginMatch[0]) + beginMatch[0].length;
  const endIdx = key.indexOf(endMatch[0]);
  const body = key.slice(beginIdx, endIdx).replace(/[\s\n\r]+/g, "");
  const wrapped = body.match(/.{1,64}/g)?.join("\n") || body;
  return `${beginMatch[0]}
${wrapped}
${endMatch[0]}
`;
}
function getJWT() {
  const now = Date.now();
  if (cachedToken && now - tokenGeneratedAt < 45 * 60 * 1e3) {
    return cachedToken;
  }
  const rawKey = process.env.APN_KEY;
  const keyId = process.env.APN_KEY_ID?.trim();
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!rawKey || !keyId || !teamId) {
    throw new Error("[APNs] Missing credentials: APN_KEY, APN_KEY_ID, APPLE_TEAM_ID must be set");
  }
  const key = parseKey(rawKey);
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    throw new Error("[APNs] APN_KEY does not look like a valid PEM key \u2014 make sure the full .p8 file content is stored including the BEGIN/END lines");
  }
  cachedToken = jwt.sign({}, key, {
    algorithm: "ES256",
    keyid: keyId,
    issuer: teamId,
    expiresIn: "1h"
  });
  tokenGeneratedAt = now;
  console.log(`[APNs] JWT generated for team=${teamId} keyId=${keyId}`);
  return cachedToken;
}
function isApnsConfigured() {
  return !!(process.env.APN_KEY && process.env.APN_KEY_ID && process.env.APPLE_TEAM_ID);
}
async function sendApnsNotifications(deviceTokens, title, body, data) {
  const result = { success: 0, failure: 0, invalidTokens: [] };
  const validTokens = [...new Set(deviceTokens.filter((t) => typeof t === "string" && t.length > 20))];
  if (validTokens.length === 0) return result;
  let token;
  try {
    token = getJWT();
  } catch (err) {
    console.error("[APNs]", err.message);
    result.failure = validTokens.length;
    return result;
  }
  const expirationTimestamp = Math.floor(Date.now() / 1e3) + 86400;
  const payload = JSON.stringify({
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1
    },
    ...data || {}
  });
  return new Promise((resolve2) => {
    let client = null;
    let pending = validTokens.length;
    let resolved = false;
    const overallTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error(`[APNs] Overall timeout reached \u2014 ${pending} requests incomplete`);
        result.failure += pending;
        try {
          client?.destroy();
        } catch {
        }
        resolve2(result);
      }
    }, CONNECT_TIMEOUT_MS + REQUEST_TIMEOUT_MS * validTokens.length + 2e3);
    function finish() {
      if (pending > 0) pending--;
      if (pending === 0 && !resolved) {
        resolved = true;
        clearTimeout(overallTimer);
        try {
          client?.close();
        } catch {
        }
        resolve2(result);
      }
    }
    function abortAll(reason) {
      if (!resolved) {
        resolved = true;
        clearTimeout(overallTimer);
        console.error(`[APNs] Aborting all ${pending} pending requests: ${reason}`);
        result.failure += pending;
        pending = 0;
        try {
          client?.destroy();
        } catch {
        }
        resolve2(result);
      }
    }
    const connectTimer = setTimeout(() => {
      abortAll("Connection timed out");
    }, CONNECT_TIMEOUT_MS);
    try {
      client = http2.connect(`https://${APN_HOST}`, {}, () => {
        clearTimeout(connectTimer);
      });
      client.on("error", (err) => {
        clearTimeout(connectTimer);
        abortAll(`Connection error: ${err.message}`);
      });
      client.on("connect", () => {
        clearTimeout(connectTimer);
      });
      for (const deviceToken of validTokens) {
        if (resolved) break;
        try {
          const req = client.request({
            ":method": "POST",
            ":path": `/3/device/${deviceToken}`,
            "authorization": `bearer ${token}`,
            "apns-topic": BUNDLE_ID,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "apns-expiration": String(expirationTimestamp),
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(payload))
          });
          let statusCode = 0;
          let responseBody = "";
          const reqTimer = setTimeout(() => {
            console.error(`[APNs] Request timeout for token ${deviceToken.slice(0, 8)}...`);
            result.failure++;
            req.destroy();
            finish();
          }, REQUEST_TIMEOUT_MS);
          req.on("response", (headers) => {
            statusCode = headers[":status"];
          });
          req.on("data", (chunk) => {
            responseBody += chunk;
          });
          req.on("end", () => {
            clearTimeout(reqTimer);
            if (statusCode === 200) {
              result.success++;
            } else {
              let parsedReason = "unknown";
              try {
                const parsed = JSON.parse(responseBody);
                parsedReason = parsed.reason || "unknown";
              } catch {
              }
              console.error(`[APNs] status=${statusCode} reason=${parsedReason} token=${deviceToken.slice(0, 8)}...`);
              if (parsedReason === "BadDeviceToken" || parsedReason === "Unregistered" || parsedReason === "DeviceTokenNotForTopic") {
                result.invalidTokens.push(deviceToken);
              }
              result.failure++;
            }
            finish();
          });
          req.on("error", (err) => {
            clearTimeout(reqTimer);
            console.error(`[APNs] Request error for token ${deviceToken.slice(0, 8)}...: ${err.message}`);
            result.failure++;
            finish();
          });
          req.end(payload);
        } catch (reqErr) {
          console.error("[APNs] Failed to create request:", reqErr.message);
          result.failure++;
          finish();
        }
      }
    } catch (connErr) {
      clearTimeout(connectTimer);
      abortAll(`Failed to connect: ${connErr.message}`);
    }
  });
}

// server/routes.ts
import { sum as sum2, count as count2, and as and2, gte as gte2, sql as sql3, eq as eq2, desc as desc2, inArray as inArray2 } from "drizzle-orm";

// server/email.ts
import { Resend } from "resend";
var APP_NAME = "NAYVO";
var FROM_EMAIL = process.env.FROM_EMAIL || "noreply@nayvo.store";
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(apiKey);
}
function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f0ff; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 24px rgba(124,58,237,0.08); }
    .header { background: linear-gradient(135deg, #7C3AED, #EC4899); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .body h2 { color: #1a1a2e; font-size: 20px; margin: 0 0 16px; }
    .body p { color: #4a4a6a; font-size: 15px; line-height: 1.7; margin: 0 0 12px; }
    .info-box { background: #f8f5ff; border-radius: 12px; padding: 20px; margin: 20px 0; border-right: 4px solid #7C3AED; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(124,58,237,0.08); }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b6b8a; font-size: 13px; }
    .info-value { color: #1a1a2e; font-size: 14px; font-weight: 600; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7C3AED, #EC4899); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; margin: 16px 0; }
    .footer { background: #f8f5ff; padding: 24px; text-align: center; }
    .footer p { color: #8b8ba8; font-size: 12px; margin: 4px 0; }
    .badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-error { background: #fce4ec; color: #c62828; }
    .badge-info { background: #e8eaf6; color: #283593; }
    .winner-box { background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0; }
    .winner-box h3 { color: #ffffff; font-size: 22px; margin: 0 0 8px; }
    .winner-box p { color: rgba(255,255,255,0.9); margin: 4px 0; font-size: 15px; }
    .code-box { background: #f0f0f5; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0; font-size: 28px; font-weight: 700; color: #7C3AED; letter-spacing: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>\u0645\u0646\u0635\u0629 \u0627\u0644\u062A\u0633\u0648\u0642 \u0648\u0627\u0644\u0647\u062F\u0627\u064A\u0627</p>
    </div>
    ${content}
    <div class="footer">
      <p>${APP_NAME}</p>
      <p>\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629 &copy; ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}
function isResendConfigured() {
  return !!process.env.RESEND_API_KEY;
}
async function sendEmail(to, subject, html) {
  if (!isResendConfigured()) {
    console.log("[Email] RESEND_API_KEY not configured, skipping email to", to);
    return false;
  }
  try {
    const client = getResendClient();
    await client.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html
    });
    console.log("[Email] Sent to", to);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send to", to, ":", err?.message || err);
    return false;
  }
}
async function sendOrderConfirmation(to, data) {
  const itemsHtml = data.items.map(
    (i) => `<div class="info-row"><span class="info-label">${i.name} \xD7${i.quantity}</span><span class="info-value">${i.lineTotal} $</span></div>`
  ).join("");
  const html = baseTemplate(`
    <div class="body">
      <h2>\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628\u0643!</h2>
      <p>\u0634\u0643\u0631\u0627\u064B \u0644\u0643! \u0637\u0644\u0628\u0643 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0633\u064A\u062A\u0645 \u062A\u0623\u0643\u064A\u062F\u0647 \u0642\u0631\u064A\u0628\u0627\u064B.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628</span><span class="info-value">#${data.orderId.slice(0, 8)}</span></div>
        ${itemsHtml}
        <div class="info-row"><span class="info-label">\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0633\u062A\u062D\u0642</span><span class="info-value">${data.totalAmount} $</span></div>
        <div class="info-row"><span class="info-label">\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639</span><span class="info-value">${data.paymentMethod}</span></div>
      </div>
      <p><strong>\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u0633\u062D\u0628:</strong> \u0631\u062D \u062A\u062D\u0635\u0644 \u0639\u0644\u0649 <span class="badge badge-info">${data.expectedTickets} \u062A\u0630\u0643\u0631\u0629</span> \u0628\u0645\u062C\u0631\u062F \u062A\u0623\u0643\u064A\u062F \u062F\u0641\u0639\u062A\u0643.</p>
      <p>\u0628\u0627\u0644\u062A\u0648\u0641\u064A\u0642!</p>
    </div>
  `);
  await sendEmail(to, `\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0637\u0644\u0628 #${data.orderId.slice(0, 8)} - ${APP_NAME}`, html);
}
async function sendPaymentStatusUpdate(to, data) {
  const ticketLine = data.awardedTickets && data.awardedTickets > 0 ? ` \u0648\u062D\u0635\u0644\u062A \u0639\u0644\u0649 ${data.awardedTickets} \u062A\u0630\u0643\u0631\u0629 \u0644\u0644\u0633\u062D\u0628!` : "";
  const statusMap = {
    confirmed: { label: "\u062A\u0645 \u0627\u0644\u062A\u0623\u0643\u064A\u062F", badge: "badge-success", message: `\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u062F\u0641\u0639\u062A\u0643 \u0628\u0646\u062C\u0627\u062D!${ticketLine} \u0633\u064A\u062A\u0645 \u0634\u062D\u0646 \u0637\u0644\u0628\u0643 \u0642\u0631\u064A\u0628\u0627\u064B.` },
    rejected: { label: "\u0645\u0631\u0641\u0648\u0636", badge: "badge-error", message: `\u062A\u0645 \u0631\u0641\u0636 \u0625\u064A\u0635\u0627\u0644 \u0627\u0644\u062F\u0641\u0639. ${data.rejectionReason ? `\u0627\u0644\u0633\u0628\u0628: ${data.rejectionReason}` : "\u064A\u0631\u062C\u0649 \u0631\u0641\u0639 \u0625\u064A\u0635\u0627\u0644 \u0635\u062D\u064A\u062D."}` },
    pending_review: { label: "\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629", badge: "badge-warning", message: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0625\u064A\u0635\u0627\u0644 \u0627\u0644\u062F\u0641\u0639 \u0648\u062C\u0627\u0631\u064A \u0645\u0631\u0627\u062C\u0639\u062A\u0647." }
  };
  const statusInfo = statusMap[data.status] || { label: data.status, badge: "badge-info", message: "" };
  const html = baseTemplate(`
    <div class="body">
      <h2>\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062F\u0641\u0639</h2>
      <p>\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062F\u0641\u0639 \u0644\u0637\u0644\u0628\u0643:</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628</span><span class="info-value">#${data.orderId.slice(0, 8)}</span></div>
        <div class="info-row"><span class="info-label">\u0627\u0644\u062D\u0627\u0644\u0629</span><span class="info-value"><span class="${statusInfo.badge} badge">${statusInfo.label}</span></span></div>
      </div>
      <p>${statusInfo.message}</p>
    </div>
  `);
  await sendEmail(to, `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062F\u0641\u0639 - \u0637\u0644\u0628 #${data.orderId.slice(0, 8)} - ${APP_NAME}`, html);
}
async function sendWinnerNotification(to, data) {
  const html = baseTemplate(`
    <div class="body">
      <div class="winner-box">
        <h3>\u0645\u0628\u0631\u0648\u0643! \u0623\u0646\u062A \u0627\u0644\u0641\u0627\u0626\u0632!</h3>
        <p>\u0644\u0642\u062F \u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631\u0643 \u0643\u0641\u0627\u0626\u0632 \u0628\u0627\u0644\u0647\u062F\u064A\u0629</p>
      </div>
      <div class="info-box">
        <div class="info-row"><span class="info-label">\u0627\u0644\u062C\u0648\u0644\u0629</span><span class="info-value">${data.drawTitle}</span></div>
        <div class="info-row"><span class="info-label">\u0627\u0644\u062C\u0627\u0626\u0632\u0629</span><span class="info-value">${data.prizeName}</span></div>
        <div class="info-row"><span class="info-label">\u062A\u0630\u0643\u0631\u0629 \u0627\u0644\u0641\u0648\u0632</span><span class="info-value">${data.ticketNumber}</span></div>
      </div>
      <p>\u0633\u064A\u062A\u0645 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0642\u0631\u064A\u0628\u0627\u064B \u0644\u062A\u0631\u062A\u064A\u0628 \u062A\u0633\u0644\u064A\u0645 \u0627\u0644\u062C\u0627\u0626\u0632\u0629. \u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0641\u064A \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062E\u0635\u064A.</p>
      <p>\u0623\u0644\u0641 \u0645\u0628\u0631\u0648\u0643!</p>
    </div>
  `);
  await sendEmail(to, `\u0645\u0628\u0631\u0648\u0643! \u0623\u0646\u062A \u0627\u0644\u0641\u0627\u0626\u0632 - ${data.drawTitle} - ${APP_NAME}`, html);
}
async function sendEmailVerificationCode(to, data) {
  if (!isResendConfigured()) {
    console.log(`[Email] Resend not configured. Verification code for ${to} is: ${data.code}`);
    return false;
  }
  const html = baseTemplate(`
    <div class="body">
      <h2>\u062A\u062D\u0642\u0642 \u0645\u0646 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A</h2>
      <p>\u0645\u0631\u062D\u0628\u0627\u064B ${data.username}\u060C</p>
      <p>\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0633\u062C\u064A\u0644\u0643 \u0641\u064A NAYVO! \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u062A\u0641\u0639\u064A\u0644 \u062D\u0633\u0627\u0628\u0643:</p>
      <div class="code-box">${data.code}</div>
      <p>\u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 <strong>15 \u062F\u0642\u064A\u0642\u0629</strong> \u0641\u0642\u0637.</p>
      <p>\u0625\u0630\u0627 \u0644\u0645 \u062A\u0642\u0645 \u0628\u0627\u0644\u062A\u0633\u062C\u064A\u0644\u060C \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F.</p>
    </div>
  `);
  const sent = await sendEmail(to, `\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 - ${APP_NAME}`, html);
  return sent;
}
async function sendPasswordResetCode(to, data) {
  if (!isResendConfigured()) {
    console.log(`[Email] Resend not configured. Password reset code for ${to} is: ${data.code}`);
    return false;
  }
  const html = baseTemplate(`
    <div class="body">
      <h2>\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631</h2>
      <p>\u0645\u0631\u062D\u0628\u0627\u064B ${data.username}\u060C</p>
      <p>\u0644\u0642\u062F \u0637\u0644\u0628\u062A \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u062A\u0627\u0644\u064A:</p>
      <div class="code-box">${data.code}</div>
      <p>\u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 <strong>15 \u062F\u0642\u064A\u0642\u0629</strong> \u0641\u0642\u0637.</p>
      <p>\u0625\u0630\u0627 \u0644\u0645 \u062A\u0637\u0644\u0628 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u060C \u064A\u0631\u062C\u0649 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F.</p>
    </div>
  `);
  return await sendEmail(to, `\u0631\u0645\u0632 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 - ${APP_NAME}`, html);
}
async function sendShippingUpdate(to, data) {
  const statusMap = {
    processing: { label: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062C\u0647\u064A\u0632", emoji: "\u{1F4E6}" },
    shipped: { label: "\u062A\u0645 \u0627\u0644\u0634\u062D\u0646", emoji: "\u{1F69A}" },
    delivered: { label: "\u062A\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644", emoji: "\u2705" }
  };
  const statusInfo = statusMap[data.status] || { label: data.status, emoji: "\u{1F4CB}" };
  const html = baseTemplate(`
    <div class="body">
      <h2>${statusInfo.emoji} \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0634\u062D\u0646</h2>
      <div class="info-box">
        <div class="info-row"><span class="info-label">\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628</span><span class="info-value">#${data.orderId.slice(0, 8)}</span></div>
        <div class="info-row"><span class="info-label">\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A</span><span class="info-value">${data.itemsSummary}</span></div>
        <div class="info-row"><span class="info-label">\u062D\u0627\u0644\u0629 \u0627\u0644\u0634\u062D\u0646</span><span class="info-value">${statusInfo.label}</span></div>
        ${data.trackingNumber ? `<div class="info-row"><span class="info-label">\u0631\u0642\u0645 \u0627\u0644\u062A\u062A\u0628\u0639</span><span class="info-value">${data.trackingNumber}</span></div>` : ""}
      </div>
    </div>
  `);
  await sendEmail(to, `${statusInfo.emoji} \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0634\u062D\u0646 - \u0637\u0644\u0628 #${data.orderId.slice(0, 8)} - ${APP_NAME}`, html);
}

// server/routes.ts
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import path from "path";
async function sendPushNotifications(userIds, title, body, data) {
  try {
    const [expoTokens, apnTokens] = await Promise.all([
      storage.getUserPushTokensByIds(userIds),
      isApnsConfigured() ? storage.getUserApnTokensByIds(userIds) : Promise.resolve([])
    ]);
    const uniqueExpoTokens = [...new Set(expoTokens)].filter((t) => typeof t === "string" && t.length > 10);
    const uniqueApnTokens = [...new Set(apnTokens)].filter((t) => typeof t === "string" && t.length > 20);
    const promises = [];
    if (uniqueExpoTokens.length > 0) {
      const messages = uniqueExpoTokens.map((token) => ({
        to: token,
        sound: "default",
        title,
        body,
        data: data || {},
        priority: "high",
        channelId: "default",
        _contentAvailable: true
      }));
      const chunks = [];
      for (let i = 0; i < messages.length; i += 100) {
        chunks.push(messages.slice(i, i + 100));
      }
      for (const chunk of chunks) {
        promises.push(
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(chunk)
          }).then((res) => res.json()).then((json) => {
            if (json.data) {
              json.data.forEach((item, idx) => {
                if (item.status === "error") {
                  console.error(`[Push/Expo] Error for token[${idx}]:`, item.message, item.details);
                }
              });
            }
          }).catch((err) => console.error("[Push/Expo] Chunk failed:", err))
        );
      }
    }
    if (uniqueApnTokens.length > 0) {
      promises.push(
        sendApnsNotifications(uniqueApnTokens, title, body, data).then(async (apnsResult) => {
          console.log(`[Push/APNs] Sent: ${apnsResult.success} success, ${apnsResult.failure} failure`);
          if (apnsResult.invalidTokens.length > 0) {
            console.warn(`[Push/APNs] Clearing ${apnsResult.invalidTokens.length} invalid APN token(s)`);
            await db.update(users).set({ apnToken: null }).where(inArray2(users.apnToken, apnsResult.invalidTokens)).catch((err) => console.error("[Push/APNs] Failed to clear invalid tokens:", err));
          }
        })
      );
    }
    await Promise.all(promises);
  } catch (e) {
    console.error("[Push] sendPushNotifications error:", e);
  }
}
var uploadReceipt = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files and PDFs are allowed"));
    }
  }
});
var imageMemoryStorage = multer.memoryStorage();
var uploadPaymentMethodImage = multer({
  storage: imageMemoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});
var uploadCampaignImage = multer({
  storage: imageMemoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 20,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
});
var apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1e3,
  max: 60,
  message: { message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false
});
var PgSession = connectPgSimple(session);
async function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (user.isSuspended) {
    return res.status(403).json({ message: "\u062D\u0633\u0627\u0628\u0643 \u0645\u0648\u0642\u0648\u0641. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645." });
  }
  next();
}
async function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
async function registerRoutes(app2) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  app2.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: true
      }),
      secret: sessionSecret || "development-only-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      }
    })
  );
  app2.use("/api/", apiLimiter);
  app2.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }
      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
      const referralCode = await storage.generateReferralCode();
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
        referralCode
      });
      const { referralCode: appliedCode } = req.body;
      if (appliedCode) {
        const referrer = await storage.getUserByReferralCode(appliedCode);
        if (referrer && referrer.id !== user.id) {
          await storage.setUserReferredBy(user.id, referrer.id);
          await storage.addWalletCredit(referrer.id, 10, "referral_reward", `\u0645\u0643\u0627\u0641\u0623\u0629 \u0625\u062D\u0627\u0644\u0629: \u0627\u0646\u0636\u0645 ${user.username} \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0631\u0645\u0632\u0643`, user.id);
          await storage.createUserNotification(referrer.id, "referral_reward", "\u0645\u0643\u0627\u0641\u0623\u0629 \u0625\u062D\u0627\u0644\u0629 \u{1F389}", `\u0627\u0646\u0636\u0645 ${user.username} \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0631\u0645\u0632 \u0625\u062D\u0627\u0644\u062A\u0643! \u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 10 \u0631\u064A\u0627\u0644 \u0625\u0644\u0649 \u0645\u062D\u0641\u0638\u062A\u0643`);
          sendPushNotifications([referrer.id], "\u0645\u0643\u0627\u0641\u0623\u0629 \u0625\u062D\u0627\u0644\u0629 \u{1F389}", `\u0627\u0646\u0636\u0645 ${user.username} \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0631\u0645\u0632\u0643! +10 \u0631\u064A\u0627\u0644 \u0641\u064A \u0645\u062D\u0641\u0638\u062A\u0643`);
          await storage.addWalletCredit(user.id, 5, "welcome_bonus", "\u0645\u0643\u0627\u0641\u0623\u0629 \u062A\u0631\u062D\u064A\u0628\u064A\u0629 \u0644\u0644\u0645\u0646\u0636\u0645\u064A\u0646 \u0639\u0628\u0631 \u0631\u0645\u0632 \u0625\u062D\u0627\u0644\u0629", referrer.id);
        }
      }
      await storage.logActivity("user_register", "New user registered", `User ${user.username} registered`, user.id);
      const otpCode = crypto.randomInt(1e5, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
      await storage.createEmailVerificationToken(user.id, otpCode, expiresAt);
      const emailSent = await sendEmailVerificationCode(user.email, { code: otpCode, username: user.username });
      const response = {
        requiresVerification: true,
        email: user.email,
        message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
      };
      if (!emailSent) {
        response.verificationCode = otpCode;
        response.emailFallback = true;
        response.message = "\u062A\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0638\u0627\u0647\u0631 \u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0634\u0629";
      }
      res.json(response);
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
      }
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/verify-email", authLimiter, async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0648\u0627\u0644\u0631\u0645\u0632 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const token = await storage.verifyEmailToken(user.id, code);
      if (!token) {
        return res.status(400).json({ message: "\u0627\u0644\u0631\u0645\u0632 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629" });
      }
      await storage.markEmailTokenUsed(token.id);
      await storage.setEmailVerified(user.id);
      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        emailVerified: true,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/resend-verification", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u062C\u0644\u0627\u064B" });
      }
      if (user.emailVerified) {
        return res.status(400).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0641\u0639\u0651\u0644 \u0628\u0627\u0644\u0641\u0639\u0644" });
      }
      const otpCode = crypto.randomInt(1e5, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
      await storage.createEmailVerificationToken(user.id, otpCode, expiresAt);
      const emailSent = await sendEmailVerificationCode(user.email, { code: otpCode, username: user.username });
      const response = { message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u062A\u062D\u0642\u0642 \u062C\u062F\u064A\u062F" };
      if (!emailSent) {
        response.verificationCode = otpCode;
        response.emailFallback = true;
        response.message = "\u062A\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0638\u0627\u0647\u0631 \u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0634\u0629";
      }
      res.json(response);
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }
      const input = parsed.data.username;
      let user = await storage.getUserByUsername(input);
      if (!user && input.includes("@")) {
        user = await storage.getUserByEmail(input);
      }
      if (!user) {
        return res.status(401).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const valid = await bcrypt.compare(parsed.data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    if (req.session?.userId) {
      await storage.updateUserPushToken(req.session.userId, null).catch(() => {
      });
    }
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
  app2.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u062C\u0644\u0627\u064B\u060C \u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646" });
      }
      const code = crypto.randomInt(1e5, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
      await storage.createPasswordResetToken(user.id, code, expiresAt);
      const emailSent = await sendPasswordResetCode(user.email, { code, username: user.username });
      if (!emailSent) {
        res.json({ message: "\u062A\u0639\u0630\u0651\u0631 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0645\u0639\u0631\u0648\u0636", code, emailFailed: true });
      } else {
        res.json({ message: "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u062C\u0644\u0627\u064B\u060C \u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 6 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const token = await storage.verifyPasswordResetToken(user.id, code);
      if (!token) {
        return res.status(400).json({ message: "\u0627\u0644\u0631\u0645\u0632 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.markResetTokenUsed(token.id);
      res.json({ message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      city: user.city,
      country: user.country,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    });
  });
  app2.put("/api/auth/push-token", requireAuth, async (req, res) => {
    try {
      const { pushToken } = req.body;
      if (!pushToken || typeof pushToken !== "string") {
        return res.status(400).json({ message: "pushToken is required" });
      }
      await storage.updateUserPushToken(req.session.userId, pushToken);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.put("/api/auth/device-tokens", requireAuth, async (req, res) => {
    try {
      const { fcmToken, apnToken } = req.body;
      await storage.updateUserDeviceTokens(req.session.userId, {
        ...fcmToken !== void 0 && { fcmToken: fcmToken || null },
        ...apnToken !== void 0 && { apnToken: apnToken || null }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userOrders = await storage.getOrdersByUser(userId);
      const userTickets = await storage.getTicketsByUser(userId);
      const totalSpent = userOrders.reduce((sum3, o) => sum3 + parseFloat(o.totalAmount), 0);
      const confirmedOrders = userOrders.filter((o) => o.paymentStatus === "confirmed").length;
      const winningTickets = userTickets.filter((t) => t.isWinner).length;
      res.json({
        totalOrders: userOrders.length,
        confirmedOrders,
        totalTickets: userTickets.length,
        winningTickets,
        totalSpent: totalSpent.toFixed(2)
      });
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/products", async (_req, res) => {
    try {
      res.json(await storage.getProducts());
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) return res.status(404).json({ message: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json(product);
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/draws/current", async (req, res) => {
    try {
      const draw = await storage.getCurrentDraw();
      if (!draw) return res.json(null);
      const participants = await storage.getDrawParticipantCount(draw.id);
      const myTickets = req.session?.userId ? await storage.getUserTicketCountForDraw(req.session.userId, draw.id) : 0;
      res.json({ ...draw, participants, myTickets });
    } catch (error) {
      console.error("Get current draw error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/draws/completed", async (_req, res) => {
    try {
      const completed = await storage.getCompletedDraws();
      const withWinners = await Promise.all(
        completed.map(async (d) => {
          const winner = d.winnerId ? await storage.getUser(d.winnerId) : void 0;
          return { ...d, winnerUsername: winner?.username ?? null };
        })
      );
      res.json(withWinners);
    } catch (error) {
      console.error("Get completed draws error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/draws/:id", async (req, res) => {
    try {
      const draw = await storage.getDraw(req.params.id);
      if (!draw) return res.status(404).json({ message: "\u0627\u0644\u062C\u0648\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      const participants = await storage.getDrawParticipantCount(draw.id);
      const winner = draw.winnerId ? await storage.getUser(draw.winnerId) : void 0;
      res.json({ ...draw, participants, winnerUsername: winner?.username ?? null });
    } catch (error) {
      console.error("Get draw error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/products", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getProducts(true));
    } catch (error) {
      console.error("Admin get products error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const parsed = insertProductSchema.safeParse({
        ...req.body,
        stock: req.body.stock === "" || req.body.stock === void 0 || req.body.stock === null ? null : Number(req.body.stock),
        sortOrder: req.body.sortOrder === void 0 ? 0 : Number(req.body.sortOrder)
      });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const product = await storage.createProduct(parsed.data);
      await storage.logActivity(
        "product_created",
        "\u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F",
        `\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0646\u062A\u062C ${product.name}`,
        req.session.userId,
        JSON.stringify({ productId: product.id })
      );
      res.json(product);
    } catch (error) {
      console.error("Create product error:", error);
      res.status(400).json({ message: error.message || "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0646\u062A\u062C" });
    }
  });
  app2.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const data = {};
      const b = req.body;
      if (b.name !== void 0) data.name = b.name;
      if (b.description !== void 0) data.description = b.description;
      if (b.imageUrl !== void 0) data.imageUrl = b.imageUrl;
      if (b.imagesJson !== void 0) data.imagesJson = b.imagesJson;
      if (b.specsJson !== void 0) data.specsJson = b.specsJson;
      if (b.price !== void 0) data.price = String(b.price);
      if (b.stock !== void 0) data.stock = b.stock === null || b.stock === "" ? null : Number(b.stock);
      if (b.category !== void 0) data.category = b.category;
      if (b.isActive !== void 0) data.isActive = !!b.isActive;
      if (b.sortOrder !== void 0) data.sortOrder = Number(b.sortOrder);
      const updated = await storage.updateProduct(req.params.id, data);
      if (!updated) return res.status(404).json({ message: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json(updated);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(400).json({ message: error.message || "\u0641\u0634\u0644 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0646\u062A\u062C" });
    }
  });
  app2.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const ok = await storage.deleteProduct(req.params.id);
      if (!ok) return res.status(404).json({ message: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(400).json({ message: "\u0645\u0627 \u0628\u064A\u0646\u0641\u0639 \u062A\u062D\u0630\u0641 \u0645\u0646\u062A\u062C \u0645\u0631\u062A\u0628\u0637 \u0628\u0637\u0644\u0628\u0627\u062A \u2014 \u0639\u0637\u0651\u0644\u0647 \u0628\u062F\u0644 \u0645\u0627 \u062A\u062D\u0630\u0641\u0647" });
    }
  });
  app2.get("/api/admin/draws", requireAdmin, async (_req, res) => {
    try {
      const all = await storage.getDraws();
      const enriched = await Promise.all(
        all.map(async (d) => {
          const participants = await storage.getDrawParticipantCount(d.id);
          const winner = d.winnerId ? await storage.getUser(d.winnerId) : void 0;
          return { ...d, participants, winnerUsername: winner?.username ?? null };
        })
      );
      res.json(enriched);
    } catch (error) {
      console.error("Admin get draws error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/draws", requireAdmin, async (req, res) => {
    try {
      const parsed = insertDrawSchema.safeParse({
        ...req.body,
        targetTickets: Number(req.body.targetTickets)
      });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const draw = await storage.createDraw(parsed.data);
      await storage.logActivity(
        "draw_created",
        "\u062C\u0648\u0644\u0629 \u0633\u062D\u0628 \u062C\u062F\u064A\u062F\u0629",
        `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062C\u0648\u0644\u0629 ${draw.title} \u2014 \u0627\u0644\u062C\u0627\u0626\u0632\u0629 ${draw.prizeName}`,
        req.session.userId,
        JSON.stringify({ drawId: draw.id })
      );
      if (draw.status === "active") {
        try {
          const allUsers = await storage.getAllUsers();
          const ids = allUsers.filter((u) => u.role !== "admin").map((u) => u.id);
          if (ids.length > 0) {
            const title = "\u062C\u0648\u0644\u0629 \u0633\u062D\u0628 \u062C\u062F\u064A\u062F\u0629! \u{1F381}";
            const body = `\u0627\u0644\u062C\u0627\u0626\u0632\u0629: ${draw.prizeName} \u2014 \u0643\u0644 ${parseFloat(draw.ticketPrice)}$ \u0645\u0646 \u0645\u0634\u062A\u0631\u064A\u0627\u062A\u0643 = \u062A\u0630\u0643\u0631\u0629`;
            await storage.createBulkUserNotifications(ids, "new_draw", title, body, draw.id);
            sendPushNotifications(ids, title, body, { drawId: draw.id });
          }
        } catch (e) {
          console.error("New draw notification error:", e);
        }
      }
      res.json(draw);
    } catch (error) {
      console.error("Create draw error:", error);
      res.status(400).json({ message: error.message || "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062C\u0648\u0644\u0629" });
    }
  });
  app2.put("/api/admin/draws/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getDraw(req.params.id);
      if (!existing) return res.status(404).json({ message: "\u0627\u0644\u062C\u0648\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (existing.status === "completed") {
        return res.status(400).json({ message: "\u0645\u0627 \u0628\u064A\u0646\u0641\u0639 \u062A\u0639\u062F\u0651\u0644 \u062C\u0648\u0644\u0629 \u062A\u0645 \u0627\u0644\u0633\u062D\u0628 \u0639\u0644\u064A\u0647\u0627" });
      }
      const data = {};
      const b = req.body;
      if (b.title !== void 0) data.title = b.title;
      if (b.prizeName !== void 0) data.prizeName = b.prizeName;
      if (b.prizeDescription !== void 0) data.prizeDescription = b.prizeDescription;
      if (b.prizeImageUrl !== void 0) data.prizeImageUrl = b.prizeImageUrl;
      if (b.ticketPrice !== void 0) data.ticketPrice = String(b.ticketPrice);
      if (b.targetTickets !== void 0) {
        const target = Number(b.targetTickets);
        if (target < existing.soldTickets) {
          return res.status(400).json({
            message: `\u0627\u0644\u0639\u062F\u062F \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641 \u0645\u0627 \u0628\u064A\u0646\u0641\u0639 \u064A\u0643\u0648\u0646 \u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u0645\u0628\u0627\u0639\u0629 (${existing.soldTickets})`
          });
        }
        data.targetTickets = target;
      }
      const updated = await storage.updateDraw(req.params.id, data);
      res.json(updated);
    } catch (error) {
      console.error("Update draw error:", error);
      res.status(400).json({ message: error.message || "\u0641\u0634\u0644 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062C\u0648\u0644\u0629" });
    }
  });
  app2.delete("/api/admin/draws/:id", requireAdmin, async (req, res) => {
    try {
      const ok = await storage.deleteDraw(req.params.id);
      if (!ok) return res.status(404).json({ message: "\u0627\u0644\u062C\u0648\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete draw error:", error);
      res.status(400).json({ message: error.message || "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062C\u0648\u0644\u0629" });
    }
  });
  app2.post("/api/admin/draws/:id/activate", requireAdmin, async (req, res) => {
    try {
      const draw = await storage.getDraw(req.params.id);
      if (!draw) return res.status(404).json({ message: "\u0627\u0644\u062C\u0648\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (draw.status !== "scheduled") {
        return res.status(400).json({ message: "\u0627\u0644\u062C\u0648\u0644\u0629 \u0644\u0627\u0632\u0645 \u062A\u0643\u0648\u0646 \u0645\u062C\u062F\u0648\u0644\u0629 \u062D\u062A\u0649 \u062A\u062A\u0641\u0639\u0651\u0644" });
      }
      const current = await storage.getActiveDraw();
      if (current) {
        return res.status(400).json({ message: `\u0641\u064A \u062C\u0648\u0644\u0629 \u0646\u0634\u0637\u0629 \u062D\u0627\u0644\u064A\u0627\u064B (${current.title}) \u2014 \u0644\u0627\u0632\u0645 \u062A\u062E\u0644\u0635 \u0623\u0648\u0644\u0627\u064B` });
      }
      await storage.updateDraw(draw.id, { status: "active", startedAt: /* @__PURE__ */ new Date() });
      await storage.assignPendingTicketsToDraw(draw.id);
      res.json(await storage.getDraw(draw.id));
    } catch (error) {
      console.error("Activate draw error:", error);
      res.status(400).json({ message: error.message || "\u0641\u0634\u0644 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062C\u0648\u0644\u0629" });
    }
  });
  app2.get("/api/payment-methods", async (_req, res) => {
    try {
      const methods = await storage.getEnabledPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/validate-coupon", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Coupon code is required" });
      }
      const coupon = await storage.validateCoupon(code);
      res.json({
        valid: true,
        code: coupon.code,
        discountPercent: coupon.discountPercent
      });
    } catch (error) {
      res.status(400).json({ valid: false, message: error.message || "Invalid coupon" });
    }
  });
  app2.post("/api/checkout", requireAuth, async (req, res) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const order = await storage.checkout(req.session.userId, parsed.data);
      const buyer = await storage.getUser(req.session.userId);
      await storage.logActivity(
        "purchase",
        "\u0637\u0644\u0628 \u062C\u062F\u064A\u062F",
        `\u0637\u0644\u0628 ${order.id} \u0628\u0642\u064A\u0645\u0629 ${order.totalAmount}$`,
        req.session.userId,
        JSON.stringify({ orderId: order.id, itemCount: order.items.length })
      );
      await storage.createAdminNotification(
        "new_order",
        "\u0637\u0644\u0628 \u062C\u062F\u064A\u062F",
        `\u0637\u0644\u0628 \u062C\u062F\u064A\u062F \u0628\u0642\u064A\u0645\u0629 ${order.totalAmount}$ \u2014 \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062F\u0641\u0639`,
        JSON.stringify({ orderId: order.id, userId: req.session.userId })
      );
      const activeDraw = await storage.getActiveDraw();
      const ticketPrice = activeDraw ? parseFloat(activeDraw.ticketPrice) : DEFAULT_TICKET_PRICE;
      const expectedTickets = Math.floor(parseFloat(order.ticketEligibleAmount) / ticketPrice);
      if (buyer) {
        sendOrderConfirmation(buyer.email, {
          orderId: order.id,
          totalAmount: order.totalAmount,
          items: order.items.map((i) => ({ name: i.productName, quantity: i.quantity, lineTotal: i.lineTotal })),
          paymentMethod: parsed.data.paymentMethod,
          expectedTickets
        });
      }
      res.json({
        order,
        expectedTickets,
        message: `\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628\u0643. \u0631\u062D \u062A\u0627\u062E\u062F ${expectedTickets} \u062A\u0630\u0643\u0631\u0629 \u0628\u0639\u062F \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062F\u0641\u0639.`
      });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(400).json({ message: error.message || "\u0641\u0634\u0644 \u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0637\u0644\u0628" });
    }
  });
  app2.get("/api/user/wallet", requireAuth, async (req, res) => {
    try {
      const balance = await storage.getWalletBalance(req.session.userId);
      const transactions = await storage.getWalletTransactions(req.session.userId);
      res.json({ balance, transactions });
    } catch (error) {
      console.error("Wallet error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      const userTickets = await storage.getTicketsByUser(req.session.userId);
      res.json(userTickets);
    } catch (error) {
      console.error("Get tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const userOrders = await storage.getOrdersByUser(req.session.userId);
      const withItems = await Promise.all(
        userOrders.map(async (o) => ({ ...o, items: await storage.getOrderItems(o.id) }))
      );
      res.json(withItems);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrderWithItems(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const orderTickets = (await storage.getTicketsByUser(order.userId)).filter(
        (t) => t.orderId === order.id
      );
      res.json({ ...order, tickets: orderTickets });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/orders/:id/receipt", requireAuth, uploadReceipt.single("receipt"), async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Receipt file is required" });
      }
      const receiptUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const updated = await storage.updateOrderPayment(order.id, {
        paymentStatus: "pending_review",
        receiptUrl
      });
      await storage.logActivity(
        "receipt_upload",
        "Receipt uploaded",
        `User uploaded receipt for order ${order.id}`,
        req.session.userId,
        JSON.stringify({ orderId: order.id, receiptUrl })
      );
      await storage.createAdminNotification(
        "receipt_uploaded",
        "\u0625\u064A\u0635\u0627\u0644 \u062C\u062F\u064A\u062F",
        `\u062A\u0645 \u0631\u0641\u0639 \u0625\u064A\u0635\u0627\u0644 \u0644\u0644\u0637\u0644\u0628 ${order.id}`,
        JSON.stringify({ orderId: order.id, userId: req.session.userId })
      );
      res.json(updated);
    } catch (error) {
      console.error("Upload receipt error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  app2.post("/api/admin/draws/:id/draw-winner", requireAdmin, async (req, res) => {
    try {
      const result = await storage.drawWinner(req.params.id);
      const { winner, ticket, draw } = result;
      await storage.logActivity(
        "draw",
        "\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632",
        `\u0627\u0644\u0641\u0627\u0626\u0632 ${winner.username} \u0628\u062C\u0648\u0644\u0629 ${draw.title} \u0628\u0627\u0644\u062A\u0630\u0643\u0631\u0629 ${ticket.ticketNumber}`,
        req.session.userId,
        JSON.stringify({ drawId: draw.id, winnerId: winner.id, ticketNumber: ticket.ticketNumber })
      );
      sendWinnerNotification(winner.email, {
        drawTitle: draw.title,
        prizeName: draw.prizeName,
        ticketNumber: ticket.ticketNumber
      });
      try {
        const winTitle = "\u0645\u0628\u0631\u0648\u0643 \u0623\u0646\u062A \u0627\u0644\u0641\u0627\u0626\u0632! \u{1F3C6}\u{1F389}";
        const winBody = `\u0641\u0632\u062A \u0628\u0640${draw.prizeName} \u0641\u064A \u062C\u0648\u0644\u0629 ${draw.title} \u0628\u0627\u0644\u062A\u0630\u0643\u0631\u0629 ${ticket.ticketNumber}!`;
        await storage.createUserNotification(winner.id, "you_won", winTitle, winBody, draw.id);
        sendPushNotifications([winner.id], winTitle, winBody, { drawId: draw.id });
        sendFcmToUser(winner.id, winner.fcmToken ?? null, winTitle, winBody, { drawId: draw.id }).then((r) => console.log(`[FCM] Winner \u2014 success: ${r.success}, failure: ${r.failure}`)).catch((e) => console.error("[FCM] Winner notification error:", e));
        const drawTickets = await storage.getTicketsByDraw(draw.id);
        const participantIds = [...new Set(drawTickets.map((t) => t.userId))].filter(
          (id) => id !== winner.id
        );
        if (participantIds.length > 0) {
          const t = "\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u{1F381}";
          const b = `\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0628\u0640${draw.prizeName} \u0641\u064A \u062C\u0648\u0644\u0629 ${draw.title}! \u062D\u0638\u0627\u064B \u0623\u0648\u0641\u0631 \u0627\u0644\u0645\u0631\u0629 \u0627\u0644\u062C\u0627\u064A\u0629`;
          await storage.createBulkUserNotifications(participantIds, "draw_completed", t, b, draw.id);
          sendPushNotifications(participantIds, t, b, { drawId: draw.id });
        }
        const allUsers = await storage.getAllUsers();
        const others = allUsers.filter((u) => u.role !== "admin" && u.id !== winner.id && !participantIds.includes(u.id)).map((u) => u.id);
        if (others.length > 0) {
          const t = "\u0641\u0627\u0626\u0632 \u062C\u062F\u064A\u062F! \u{1F38A}";
          const b = `\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0628\u0640${draw.prizeName} \u0641\u064A \u062C\u0648\u0644\u0629 ${draw.title}!`;
          await storage.createBulkUserNotifications(others, "winner_announced", t, b, draw.id);
          sendPushNotifications(others, t, b, { drawId: draw.id });
        }
      } catch (e) {
        console.error("Draw notification error:", e);
      }
      const nextDraw = await storage.getActiveDraw();
      res.json({
        winner: { id: winner.id, username: winner.username },
        ticket,
        draw,
        nextDraw: nextDraw ?? null,
        message: `\u0627\u0644\u0641\u0627\u0626\u0632 ${winner.username} \u0628\u0627\u0644\u062A\u0630\u0643\u0631\u0629 ${ticket.ticketNumber}`
      });
    } catch (error) {
      console.error("Draw error:", error);
      res.status(400).json({ message: error.message || "\u0641\u0634\u0644 \u0627\u0644\u0633\u062D\u0628" });
    }
  });
  app2.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const allProducts = await storage.getProducts(true);
      const allDraws = await storage.getDraws();
      res.json({
        totalProducts: allProducts.length,
        activeProducts: allProducts.filter((p) => p.isActive).length,
        totalDraws: allDraws.length,
        completedDraws: allDraws.filter((d) => d.status === "completed").length,
        activeDraw: allDraws.find((d) => d.status === "active") ?? null
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/orders", requireAdmin, async (_req, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      res.json(allOrders);
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/orders/:id/shipping", requireAdmin, async (req, res) => {
    try {
      const { shippingStatus, trackingNumber, shippingAddress } = req.body;
      const updated = await storage.updateOrderShipping(req.params.id, {
        shippingStatus,
        trackingNumber,
        shippingAddress
      });
      if (!updated) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (shippingStatus && ["processing", "shipped", "delivered"].includes(shippingStatus)) {
        const shippingOrder = await storage.getOrder(req.params.id);
        if (shippingOrder) {
          const shippingUser = await storage.getUser(shippingOrder.userId);
          const shippingItems = await storage.getOrderItems(shippingOrder.id);
          const shippingSummary = shippingItems.map((i) => i.productName).join("\u060C ") || "\u0637\u0644\u0628\u0643";
          if (shippingUser) {
            sendShippingUpdate(shippingUser.email, {
              orderId: shippingOrder.id,
              itemsSummary: shippingSummary,
              status: shippingStatus,
              trackingNumber
            });
            const statusText = shippingStatus === "processing" ? "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062C\u0647\u064A\u0632" : shippingStatus === "shipped" ? "\u062A\u0645 \u0627\u0644\u0634\u062D\u0646" : "\u062A\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644";
            await storage.createUserNotification(
              shippingOrder.userId,
              "shipping_update",
              `\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0634\u062D\u0646: ${statusText} \u{1F4E6}`,
              `\u0637\u0644\u0628\u0643 (${shippingSummary}) \u2014 ${statusText}`
            );
            sendPushNotifications([shippingOrder.userId], `\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0634\u062D\u0646: ${statusText} \u{1F4E6}`, `\u0637\u0644\u0628\u0643 (${shippingSummary}) \u2014 ${statusText}`, { orderId: shippingOrder.id });
          }
        }
      }
      res.json(updated);
    } catch (error) {
      console.error("Update shipping error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/orders/:id/payment", requireAdmin, async (req, res) => {
    try {
      const { paymentStatus, rejectionReason } = req.body;
      if (!paymentStatus || !["confirmed", "rejected"].includes(paymentStatus)) {
        return res.status(400).json({ message: "\u062D\u0627\u0644\u0629 \u0627\u0644\u062F\u0641\u0639 \u0644\u0627\u0632\u0645 \u062A\u0643\u0648\u0646 confirmed \u0623\u0648 rejected" });
      }
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      let awardedTickets = 0;
      if (paymentStatus === "confirmed") {
        await storage.updateOrder(order.id, { status: "paid" });
        await storage.updateOrderPayment(order.id, { paymentStatus: "confirmed" });
        const award = await storage.awardTicketsForOrder(order.id);
        awardedTickets = award.created;
        await storage.logActivity(
          "payment_confirmed",
          "\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062F\u0641\u0639",
          `\u062A\u0623\u0643\u064A\u062F \u062F\u0641\u0639 \u0627\u0644\u0637\u0644\u0628 ${order.id} \u2014 ${awardedTickets} \u062A\u0630\u0643\u0631\u0629`,
          req.session.userId,
          JSON.stringify({ orderId: order.id, awardedTickets })
        );
        try {
          if (awardedTickets > 0) {
            const t = "\u062A\u0630\u0627\u0643\u0631\u0643 \u062C\u0627\u0647\u0632\u0629! \u{1F39F}\uFE0F";
            const b = `\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u062F\u0641\u0639\u0643 \u0648\u062D\u0635\u0644\u062A \u0639\u0644\u0649 ${awardedTickets} \u062A\u0630\u0643\u0631\u0629 \u0644\u0644\u0633\u062D\u0628. \u0628\u0627\u0644\u062A\u0648\u0641\u064A\u0642!`;
            await storage.createUserNotification(order.userId, "tickets_awarded", t, b, award.drawIds[0]);
            sendPushNotifications([order.userId], t, b, { orderId: order.id });
          }
          for (const drawId of award.drawIds) {
            const d = await storage.getDraw(drawId);
            if (d && d.status === "ready_to_draw") {
              await storage.createAdminNotification(
                "draw_ready",
                "\u062C\u0648\u0644\u0629 \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u0633\u062D\u0628 \u{1F3AF}",
                `\u062C\u0648\u0644\u0629 "${d.title}" \u0648\u0635\u0644\u062A ${d.soldTickets}/${d.targetTickets} \u062A\u0630\u0643\u0631\u0629 \u2014 \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u0633\u062D\u0628`,
                JSON.stringify({ drawId: d.id })
              );
              const drawTickets = await storage.getTicketsByDraw(d.id);
              const participantIds = [...new Set(drawTickets.map((x) => x.userId))];
              if (participantIds.length > 0) {
                const t = "\u0627\u0643\u062A\u0645\u0644 \u0627\u0644\u0639\u062F\u062F! \u{1F525}";
                const b = `\u062C\u0648\u0644\u0629 ${d.title} \u0648\u0635\u0644\u062A \u0644\u0644\u0639\u062F\u062F \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u2014 \u0627\u0644\u0633\u062D\u0628 \u0639\u0644\u0649 ${d.prizeName} \u0642\u0631\u064A\u0628\u0627\u064B`;
                await storage.createBulkUserNotifications(participantIds, "draw_full", t, b, d.id);
                sendPushNotifications(participantIds, t, b, { drawId: d.id });
              }
            }
          }
        } catch (e) {
          console.error("Ticket award notification error:", e);
        }
      } else {
        await storage.updateOrderPayment(order.id, {
          paymentStatus: "rejected",
          rejectionReason: rejectionReason || ""
        });
        const walletUsed = parseFloat(order.walletAmount);
        if (walletUsed > 0) {
          await storage.addWalletCredit(
            order.userId,
            walletUsed,
            "refund",
            `\u0625\u0631\u062C\u0627\u0639 \u0631\u0635\u064A\u062F \u2014 \u0637\u0644\u0628 \u0645\u0631\u0641\u0648\u0636 ${order.id.slice(0, 8)}`,
            order.id
          );
        }
        await storage.logActivity(
          "payment_rejected",
          "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u062F\u0641\u0639",
          `\u0631\u0641\u0636 \u062F\u0641\u0639 \u0627\u0644\u0637\u0644\u0628 ${order.id}: ${rejectionReason || "\u0628\u062F\u0648\u0646 \u0633\u0628\u0628"}`,
          req.session.userId,
          JSON.stringify({ orderId: order.id, rejectionReason })
        );
      }
      const updated = await storage.getOrder(order.id);
      const orderUser = await storage.getUser(order.userId);
      if (orderUser) {
        sendPaymentStatusUpdate(orderUser.email, {
          orderId: order.id,
          status: paymentStatus,
          rejectionReason,
          awardedTickets
        });
      }
      res.json({ ...updated, awardedTickets });
    } catch (error) {
      console.error("Update payment error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          const stats = await storage.getUserStats(user.id);
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
            emailVerified: user.emailVerified,
            walletBalance: user.walletBalance,
            referralCode: user.referralCode,
            referredBy: user.referredBy,
            isSuspended: user.isSuspended,
            createdAt: user.createdAt,
            fcmToken: user.fcmToken ?? null,
            apnToken: user.apnToken ?? null,
            ...stats
          };
        })
      );
      res.json(usersWithStats);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/verify-user/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.emailVerified) {
        return res.status(400).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0641\u0639\u0651\u0644 \u0628\u0627\u0644\u0641\u0639\u0644" });
      }
      await storage.setEmailVerified(userId);
      res.json({ message: "\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D" });
    } catch (error) {
      console.error("Admin verify user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/top-spenders", requireAdmin, async (_req, res) => {
    try {
      const result = await db.select({
        userId: orders.userId,
        totalSpent: sum2(orders.totalAmount),
        orderCount: count2()
      }).from(orders).where(sql3`${orders.paymentStatus} = 'confirmed'`).groupBy(orders.userId).orderBy(desc2(sum2(orders.totalAmount))).limit(10);
      const withNames = await Promise.all(result.map(async (row) => {
        const user = await storage.getUser(row.userId);
        return {
          userId: row.userId,
          username: user?.username || "\u2014",
          email: user?.email || "\u2014",
          totalSpent: row.totalSpent || "0",
          orderCount: row.orderCount
        };
      }));
      res.json(withNames);
    } catch (error) {
      console.error("Top spenders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/payment-method-stats", requireAdmin, async (_req, res) => {
    try {
      const result = await db.select({ method: orders.paymentMethod, cnt: count2() }).from(orders).groupBy(orders.paymentMethod);
      const labelMap = {
        bank_transfer: "\u062A\u062D\u0648\u064A\u0644 \u0628\u0646\u0643\u064A",
        online: "\u062F\u0641\u0639 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
        wallet: "\u0645\u062D\u0641\u0638\u0629",
        card: "\u0628\u0637\u0627\u0642\u0629",
        cash: "\u0646\u0642\u062F\u0627\u064B",
        cash_on_delivery: "\u0627\u0644\u062F\u0641\u0639 \u0639\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645",
        stripe: "\u0628\u0637\u0627\u0642\u0629 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629",
        paypal: "\u0628\u0627\u064A \u0628\u0627\u0644"
      };
      const data = result.map((r) => ({
        method: r.method || "other",
        label: labelMap[r.method || ""] || r.method || "\u0623\u062E\u0631\u0649",
        count: r.cnt
      }));
      res.json(data);
    } catch (error) {
      console.error("Payment method stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const createUserSchema = z2.object({
        username: z2.string().min(2).max(50),
        email: z2.string().email(),
        password: z2.string().min(6),
        role: z2.enum(["user", "admin"]).optional().default("user")
      });
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629", errors: parsed.error.flatten() });
      }
      const { username, email, password, role } = parsed.data;
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
      const hashed = await bcrypt.hash(password, 10);
      const referralCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      const [newUser] = await db.insert(users).values({
        username,
        email,
        password: hashed,
        role,
        referralCode
      }).returning();
      res.status(201).json({ id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
    }
  });
  app2.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const updateUserSchema = z2.object({
        email: z2.string().email().optional(),
        role: z2.enum(["user", "admin"]).optional(),
        walletBalance: z2.union([z2.string(), z2.number()]).transform((v) => parseFloat(String(v))).pipe(z2.number().min(0).max(1e6)).optional(),
        isSuspended: z2.boolean().optional()
      });
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629", errors: parsed.error.flatten() });
      }
      const { email, role, walletBalance, isSuspended } = parsed.data;
      const adminId = req.session.userId;
      if (role === "user" && req.params.id === adminId) {
        return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0633\u062D\u0628 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0623\u062F\u0645\u0646 \u0645\u0646 \u0646\u0641\u0633\u0643" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const userUpdates = {};
      if (email !== void 0) userUpdates.email = email;
      if (role !== void 0) userUpdates.role = role;
      if (walletBalance !== void 0) userUpdates.walletBalance = walletBalance.toFixed(2);
      if (isSuspended !== void 0) userUpdates.isSuspended = isSuspended;
      if (Object.keys(userUpdates).length > 0) {
        await db.update(users).set(userUpdates).where(eq2(users.id, req.params.id));
      }
      const updated = await storage.getUser(req.params.id);
      if (updated) {
        const { password: _pw, ...safeUser } = updated;
        return res.json(safeUser);
      }
      res.json(updated);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === "admin") return res.status(400).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0623\u062F\u0645\u0646" });
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) return res.status(500).json({ message: "\u0641\u0634\u0644 \u0627\u0644\u062D\u0630\u0641" });
      res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/users/:id/wallet-transactions", requireAdmin, async (req, res) => {
    try {
      const txs = await storage.getWalletTransactions(req.params.id);
      res.json(txs);
    } catch (error) {
      console.error("Get user wallet transactions error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/users/:id/orders", requireAdmin, async (req, res) => {
    try {
      const userOrders = await storage.getOrdersByUser(req.params.id);
      const withItems = await Promise.all(userOrders.map(async (o) => {
        const items = await storage.getOrderItems(o.id);
        return { ...o, items, summary: items.map((i) => `${i.productName} \xD7${i.quantity}`).join("\u060C ") || "\u2014" };
      }));
      res.json(withItems);
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/winners", requireAdmin, async (_req, res) => {
    try {
      const completed = await storage.getCompletedDraws();
      const winners = await Promise.all(
        completed.map(async (d) => {
          const winner = d.winnerId ? await storage.getUser(d.winnerId) : void 0;
          return {
            drawId: d.id,
            drawTitle: d.title,
            prizeName: d.prizeName,
            ticketNumber: d.winnerTicketNumber,
            drawnAt: d.drawnAt,
            totalTickets: d.soldTickets,
            username: winner?.username ?? null,
            email: winner?.email ?? null,
            phone: winner?.phone ?? null,
            fullName: winner?.fullName ?? null,
            city: winner?.city ?? null,
            address: winner?.address ?? null
          };
        })
      );
      res.json(winners);
    } catch (error) {
      console.error("Get winners error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const { reviews: reviewsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const allReviews = await db.select().from(reviewsTable).orderBy(desc2(reviewsTable.createdAt));
      const enriched = await Promise.all(allReviews.map(async (r) => {
        const u = await storage.getUser(r.userId);
        const prod = await storage.getProduct(r.productId);
        return {
          ...r,
          username: u?.username || "\u2014",
          productName: prod?.name || "\u2014"
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Get admin reviews error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      const { reviews: reviewsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await db.delete(reviewsTable).where(eq2(reviewsTable.id, req.params.id));
      res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0642\u064A\u064A\u0645" });
    } catch (error) {
      console.error("Delete review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/pending-orders-count", requireAdmin, async (_req, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      const pendingCount = allOrders.filter((o) => o.paymentStatus === "pending_review").length;
      res.json({ count: pendingCount });
    } catch (error) {
      console.error("Pending orders count error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/payment-methods", requireAdmin, async (_req, res) => {
    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/payment-methods", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPaymentMethodSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }
      const method = await storage.createPaymentMethod(parsed.data);
      res.json(method);
    } catch (error) {
      console.error("Create payment method error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updatePaymentMethod(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update payment method error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deletePaymentMethod(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json({ message: "Payment method deleted" });
    } catch (error) {
      console.error("Delete payment method error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/coupons", requireAdmin, async (_req, res) => {
    try {
      const allCoupons = await storage.getCoupons();
      res.json(allCoupons);
    } catch (error) {
      console.error("Get coupons error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const parsed = insertCouponSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }
      const coupon = await storage.createCoupon(parsed.data);
      res.json(coupon);
    } catch (error) {
      console.error("Create coupon error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateCoupon(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update coupon error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteCoupon(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json({ message: "Coupon deleted" });
    } catch (error) {
      console.error("Delete coupon error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/activity-log", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const log2 = await storage.getActivityLog(limit);
      res.json(log2);
    } catch (error) {
      console.error("Get activity log error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: parsed.error.flatten() });
      }
      const updated = await storage.updateUserProfile(req.session.userId, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      res.json({
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        fullName: updated.fullName,
        phone: updated.phone,
        address: updated.address,
        city: updated.city,
        country: updated.country,
        emailVerified: updated.emailVerified
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
  });
  app2.get("/api/user/profile-status", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const isComplete = !!(user.fullName && user.phone && user.address && user.city && user.country);
      res.json({
        isComplete,
        profile: {
          fullName: user.fullName,
          phone: user.phone,
          address: user.address,
          city: user.city,
          country: user.country
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/reviews/:productId", async (req, res) => {
    try {
      res.json(await storage.getReviewsByProduct(req.params.productId));
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/reviews", requireAuth, async (req, res) => {
    try {
      const parsed = insertReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const existing = await storage.getUserReviewForProduct(req.session.userId, parsed.data.productId);
      if (existing) {
        return res.status(400).json({ message: "\u0642\u064A\u0651\u0645\u062A \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062A\u062C \u0645\u0646 \u0642\u0628\u0644" });
      }
      res.json(await storage.createReview(req.session.userId, parsed.data));
    } catch (error) {
      console.error("Create review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const notifications = await storage.getAdminNotifications(limit);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/notifications/unread-count", requireAdmin, async (_req, res) => {
    try {
      const count3 = await storage.getUnreadNotificationCount();
      res.json({ count: count3 });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/notifications/:id/read", requireAdmin, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/notifications/read-all", requireAdmin, async (_req, res) => {
    try {
      await storage.markAllNotificationsRead();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/broadcast-notification", requireAdmin, async (req, res) => {
    try {
      const { title, message } = req.body;
      if (!title || !message) {
        return res.status(400).json({ message: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      }
      const allUsers = await storage.getAllUsers();
      const userIds = allUsers.filter((u) => u.role !== "admin").map((u) => u.id);
      if (userIds.length === 0) {
        return res.status(400).json({ message: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0625\u0644\u064A\u0647\u0645" });
      }
      await storage.createBulkUserNotifications(userIds, "broadcast", title, message);
      sendPushNotifications(userIds, title, message);
      await storage.logActivity("broadcast_notification", "\u0625\u0634\u0639\u0627\u0631 \u062C\u0645\u0627\u0639\u064A", `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631 "${title}" \u0625\u0644\u0649 ${userIds.length} \u0645\u0633\u062A\u062E\u062F\u0645`, req.session.userId);
      res.json({ success: true, sentTo: userIds.length });
    } catch (error) {
      console.error("Broadcast notification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/send-notification", requireAdmin, async (req, res) => {
    try {
      const { title, message, userId } = req.body;
      if (!title || !message) return res.status(400).json({ message: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      if (!userId) return res.status(400).json({ message: "\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0633\u062A\u062E\u062F\u0645" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      await storage.createUserNotification(userId, "direct", title, message);
      sendPushNotifications([userId], title, message);
      await storage.logActivity("admin_action", "\u0625\u0634\u0639\u0627\u0631 \u0645\u0628\u0627\u0634\u0631", `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631 \u0645\u0628\u0627\u0634\u0631 \u0625\u0644\u0649 ${user.username}: "${title}"`, req.session.userId);
      res.json({ success: true, sentTo: user.username });
    } catch (error) {
      console.error("Send notification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/send-fcm", requireAdmin, async (req, res) => {
    try {
      const { title, body, targetUserId } = req.body;
      if (!title || !body) return res.status(400).json({ message: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      if (targetUserId) {
        const user = await storage.getUser(targetUserId);
        if (!user) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        const tokens2 = [user.fcmToken].filter((t) => !!t && t.length > 10);
        if (tokens2.length === 0) return res.status(400).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0644\u0627 \u064A\u0645\u0644\u0643 \u062A\u0648\u0643\u0646 FCM \u0645\u0633\u062C\u0651\u0644" });
        const result2 = await sendFcmNotification(tokens2, title, body);
        return res.json({ success: true, result: result2, target: user.username });
      }
      const allUserTokens = await storage.getAllUsersWithFcmTokens();
      const tokens = allUserTokens.map((u) => u.fcmToken).filter((t) => !!t && t.length > 10);
      if (tokens.length === 0) return res.status(400).json({ message: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0628\u062A\u0648\u0643\u0646\u0627\u062A FCM \u0645\u0633\u062C\u0651\u0644\u0629" });
      const result = await sendFcmNotification([...new Set(tokens)], title, body);
      await storage.logActivity("broadcast_notification", "\u0625\u0634\u0639\u0627\u0631 FCM \u062C\u0645\u0627\u0639\u064A", `${title} \u2014 ${result.success} \u0646\u0627\u062C\u062D / ${result.failure} \u0641\u0634\u0644`, req.session.userId);
      res.json({ success: true, result, target: "all" });
    } catch (error) {
      console.error("FCM send error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  app2.post("/api/admin/send-fcm/:userId", requireAdmin, async (req, res) => {
    try {
      const { title, body } = req.body;
      if (!title || !body) return res.status(400).json({ message: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const tokens = [user.fcmToken].filter((t) => !!t && t.length > 10);
      if (tokens.length === 0) return res.status(400).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0644\u0627 \u064A\u0645\u0644\u0643 \u062A\u0648\u0643\u0646 FCM \u0645\u0633\u062C\u0651\u0644" });
      const result = await sendFcmNotification(tokens, title, body);
      res.json({ success: true, result, username: user.username });
    } catch (error) {
      console.error("FCM send to user error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  app2.post("/api/admin/payment-methods/upload-image", requireAdmin, uploadPaymentMethodImage.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }
      const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      if (req.body.methodId) {
        await storage.updatePaymentMethod(req.body.methodId, { imageUrl });
      }
      res.json({ imageUrl });
    } catch (error) {
      console.error("Upload payment method image error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  app2.post("/api/admin/products/upload-image", requireAdmin, uploadCampaignImage.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "\u0644\u0645 \u064A\u062A\u0645 \u0631\u0641\u0639 \u0623\u064A \u0635\u0648\u0631\u0629" });
      }
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      res.json({ imageUrl: base64 });
    } catch (error) {
      console.error("Upload product image error:", error);
      res.status(500).json({ message: "\u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629" });
    }
  });
  app2.post("/api/admin/seed-payment-methods", requireAdmin, async (_req, res) => {
    try {
      const existing = await storage.getPaymentMethods();
      if (existing.length > 0) {
        return res.json({ message: "Payment methods already exist", count: existing.length });
      }
      const methods = [
        { name: "Bank Transfer", nameAr: "\u062A\u062D\u0648\u064A\u0644 \u0628\u0646\u0643\u064A", icon: "business", enabled: true, description: "\u062A\u062D\u0648\u064A\u0644 \u0645\u0628\u0627\u0634\u0631 \u0625\u0644\u0649 \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0628\u0646\u0643\u064A" },
        { name: "Cash on Delivery", nameAr: "\u0627\u0644\u062F\u0641\u0639 \u0639\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645", icon: "cash", enabled: true, description: "\u0627\u062F\u0641\u0639 \u0646\u0642\u062F\u0627\u064B \u0639\u0646\u062F \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0645\u0646\u062A\u062C" }
      ];
      for (const m of methods) {
        await storage.createPaymentMethod(m);
      }
      res.json({ message: "Default payment methods created", count: methods.length });
    } catch (error) {
      console.error("Seed payment methods error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/orders/export/csv", requireAdmin, async (_req, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      const escapeCsv = (val) => {
        const str = (val ?? "").toString().replace(/\r?\n/g, " ");
        const sanitized = /^[=+\-@]/.test(str) ? "'" + str : str;
        return '"' + sanitized.replace(/"/g, '""') + '"';
      };
      const csvHeader = "Order ID,Username,Items,Item Count,Total,Tickets,Payment Method,Payment Status,Shipping Status,Tracking Number,Date\n";
      const csvRows = allOrders.map(
        (o) => [o.id, o.username, o.summary, o.itemCount, o.totalAmount, o.ticketsAwarded, o.paymentMethod, o.paymentStatus, o.shippingStatus, o.trackingNumber, o.createdAt].map((v) => escapeCsv(v)).join(",")
      ).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
      res.send("\uFEFF" + csvHeader + csvRows);
    } catch (error) {
      console.error("Export CSV error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/users/export/csv", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          const stats = await storage.getUserStats(user.id);
          return {
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified ? "Yes" : "No",
            orderCount: stats.orderCount,
            ticketCount: stats.ticketCount,
            totalSpent: stats.totalSpent,
            createdAt: user.createdAt
          };
        })
      );
      const escapeCsv = (val) => {
        const str = (val ?? "").toString().replace(/\r?\n/g, " ");
        const sanitized = /^[=+\-@]/.test(str) ? "'" + str : str;
        return '"' + sanitized.replace(/"/g, '""') + '"';
      };
      const csvHeader = "Username,Email,Email Verified,Order Count,Ticket Count,Total Spent,Created At\n";
      const csvRows = usersWithStats.map(
        (u) => [u.username, u.email, u.emailVerified, u.orderCount, u.ticketCount, u.totalSpent, u.createdAt].map((v) => escapeCsv(v)).join(",")
      ).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=users.csv");
      res.send("\uFEFF" + csvHeader + csvRows);
    } catch (error) {
      console.error("Export users CSV error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.session.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const count3 = await storage.getUnreadUserNotificationCount(req.session.userId);
      res.json({ count: count3 });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const success = await storage.markUserNotificationRead(req.params.id, req.session.userId);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllUserNotificationsRead(req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/recent-purchases", async (_req, res) => {
    try {
      const purchases = await storage.getRecentPurchases(8);
      res.json(purchases);
    } catch (error) {
      console.error("Get recent purchases error:", error);
      res.json([]);
    }
  });
  app2.get("/api/winners", async (_req, res) => {
    try {
      const completed = await storage.getCompletedDraws();
      const winners = await Promise.all(
        completed.map(async (d) => {
          const winner = d.winnerId ? await storage.getUser(d.winnerId) : void 0;
          return {
            drawId: d.id,
            drawTitle: d.title,
            prizeName: d.prizeName,
            prizeImageUrl: d.prizeImageUrl,
            ticketNumber: d.winnerTicketNumber,
            drawnAt: d.drawnAt,
            totalTickets: d.soldTickets,
            winnerUsername: winner?.username ?? null
          };
        })
      );
      res.json(winners);
    } catch (error) {
      console.error("Get public winners error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/sales-chart", requireAdmin, async (req, res) => {
    try {
      const period = req.query.period || "weekly";
      if (period === "daily") {
        const hours = [];
        for (let i = 23; i >= 0; i--) {
          const hourEnd = /* @__PURE__ */ new Date();
          hourEnd.setMinutes(59, 59, 999);
          hourEnd.setHours(hourEnd.getHours() - i);
          const hourStart = new Date(hourEnd);
          hourStart.setMinutes(0, 0, 0);
          const hourStart2 = new Date(hourEnd);
          hourStart2.setHours(hourEnd.getHours(), 0, 0, 0);
          const hourEnd2 = new Date(hourEnd);
          hourEnd2.setHours(hourEnd.getHours(), 59, 59, 999);
          const [result] = await db.select({ total: sum2(orders.totalAmount), count: count2() }).from(orders).where(and2(gte2(orders.createdAt, hourStart2), sql3`${orders.createdAt} <= ${hourEnd2}`));
          hours.push({
            label: `${hourStart2.getHours()}:00`,
            total: result?.total || "0",
            count: result?.count || 0
          });
        }
        return res.json(hours);
      }
      const numDays = period === "monthly" ? 30 : 7;
      const days = [];
      for (let i = numDays - 1; i >= 0; i--) {
        const dayStart = /* @__PURE__ */ new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const [result] = await db.select({ total: sum2(orders.totalAmount), count: count2() }).from(orders).where(and2(gte2(orders.createdAt, dayStart), sql3`${orders.createdAt} <= ${dayEnd}`));
        days.push({
          date: dayStart.toISOString().split("T")[0],
          label: dayStart.toISOString().split("T")[0],
          total: result?.total || "0",
          count: result?.count || 0
        });
      }
      res.json(days);
    } catch (error) {
      console.error("Sales chart error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/referral", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.referralCode) {
        const code = await storage.generateReferralCode();
        await storage.setUserReferralCode(user.id, code);
        user.referralCode = code;
      }
      const referralCount = await storage.getReferralCount(user.id);
      const referredUsers = await storage.getReferredUsers(user.id);
      res.json({
        referralCode: user.referralCode,
        referralCount,
        referredUsers: referredUsers.map((u) => ({
          username: u.username,
          joinedAt: u.createdAt
        }))
      });
    } catch (error) {
      console.error("Get referral error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/referral/apply", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Referral code is required" });
      }
      const referrer = await storage.getUserByReferralCode(code.toUpperCase());
      if (!referrer) {
        return res.status(404).json({ valid: false, message: "\u0631\u0645\u0632 \u0627\u0644\u0625\u062D\u0627\u0644\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" });
      }
      res.json({ valid: true, referrerUsername: referrer.username });
    } catch (error) {
      console.error("Apply referral error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/generate-referral-codes", requireAdmin, async (_req, res) => {
    try {
      const updated = await storage.ensureAllUsersHaveReferralCodes();
      res.json({ message: `Generated referral codes for ${updated} users`, updated });
    } catch (error) {
      console.error("Generate referral codes error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/auth/delete-account", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role === "admin") {
        return res.status(403).json({ message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062F\u064A\u0631" });
      }
      await storage.deleteUser(userId);
      req.session.destroy(() => {
      });
      res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/privacy-policy", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 - NAYVO</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f4f0ff; color: #1a1a2e; direction: rtl; line-height: 1.8; }
    .header { background: linear-gradient(135deg, #7C3AED, #EC4899); padding: 40px 20px; text-align: center; }
    .header h1 { color: #fff; font-size: 28px; margin-bottom: 8px; }
    .header p { color: rgba(255,255,255,0.7); font-size: 14px; }
    .container { max-width: 700px; margin: -20px auto 40px; padding: 0 16px; }
    .card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(124,58,237,0.06); }
    .card h2 { font-size: 18px; color: #7C3AED; margin-bottom: 12px; }
    .card p, .card li { font-size: 15px; color: #4a4a6a; }
    .card ul { padding-right: 20px; }
    .card li { margin-bottom: 8px; }
    .footer { text-align: center; padding: 24px; color: #8b8ba8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629</h1>
    <p>NAYVO</p>
  </div>
  <div class="container">
    <div class="card">
      <h2>\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062A\u064A \u0646\u062C\u0645\u0639\u0647\u0627</h2>
      <ul>
        <li>\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628: \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u060C \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A</li>
        <li>\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A: \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0634\u0631\u0627\u0621\u060C \u0627\u0644\u0645\u0628\u0627\u0644\u063A\u060C \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A</li>
        <li>\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u062D\u0646: \u0627\u0644\u0639\u0646\u0648\u0627\u0646\u060C \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641\u060C \u0627\u0644\u0645\u062F\u064A\u0646\u0629</li>
        <li>\u0625\u064A\u0635\u0627\u0644\u0627\u062A \u0627\u0644\u062F\u0641\u0639: \u0635\u0648\u0631 \u0625\u064A\u0635\u0627\u0644\u0627\u062A \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0628\u0646\u0643\u064A</li>
      </ul>
    </div>
    <div class="card">
      <h2>\u0643\u064A\u0641 \u0646\u0633\u062A\u062E\u062F\u0645 \u0628\u064A\u0627\u0646\u0627\u062A\u0643</h2>
      <ul>
        <li>\u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628\u0627\u062A\u0643 \u0648\u062A\u0648\u0635\u064A\u0644 \u0627\u0644\u0647\u062F\u0627\u064A\u0627</li>
        <li>\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A</li>
        <li>\u0634\u062D\u0646 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0627\u0644\u0647\u062F\u0627\u064A\u0627</li>
        <li>\u062A\u062D\u0633\u064A\u0646 \u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645</li>
        <li>\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0628\u0634\u0623\u0646 \u0637\u0644\u0628\u0627\u062A\u0643</li>
      </ul>
    </div>
    <div class="card">
      <h2>\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A</h2>
      <p>\u0646\u0633\u062A\u062E\u062F\u0645 \u062A\u0642\u0646\u064A\u0627\u062A \u062A\u0634\u0641\u064A\u0631 \u0645\u062A\u0642\u062F\u0645\u0629 \u0644\u062D\u0645\u0627\u064A\u0629 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0627\u0644\u0634\u062E\u0635\u064A\u0629. \u0644\u0646 \u0646\u0634\u0627\u0631\u0643 \u0645\u0639\u0644\u0648\u0645\u0627\u062A\u0643 \u0645\u0639 \u0623\u0637\u0631\u0627\u0641 \u062B\u0627\u0644\u062B\u0629 \u0625\u0644\u0627 \u0628\u0645\u0648\u0627\u0641\u0642\u062A\u0643 \u0623\u0648 \u0639\u0646\u062F \u0627\u0644\u062D\u0627\u062C\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629.</p>
    </div>
    <div class="card">
      <h2>\u062D\u0642\u0648\u0642\u0643</h2>
      <ul>
        <li>\u0637\u0644\u0628 \u0646\u0633\u062E\u0629 \u0645\u0646 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0627\u0644\u0634\u062E\u0635\u064A\u0629</li>
        <li>\u062A\u0635\u062D\u064A\u062D \u0623\u0648 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A\u0643</li>
        <li>\u0637\u0644\u0628 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u0643 \u0648\u0628\u064A\u0627\u0646\u0627\u062A\u0643</li>
        <li>\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0641\u064A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A</li>
      </ul>
    </div>
    <div class="card">
      <h2>\u0627\u0644\u062A\u0648\u0627\u0635\u0644</h2>
      <p>\u0644\u0623\u064A \u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u062D\u0648\u0644 \u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629\u060C \u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0635\u0641\u062D\u0629 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0641\u064A \u0627\u0644\u062A\u0637\u0628\u064A\u0642.</p>
    </div>
  </div>
  <div class="footer">
    <p>NAYVO &copy; ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
    <p>\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B: ${(/* @__PURE__ */ new Date()).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
</body>
</html>`);
  });
  app2.get("/terms", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062D\u0643\u0627\u0645 - NAYVO</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f4f0ff; color: #1a1a2e; direction: rtl; line-height: 1.8; }
    .header { background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 40px 20px; text-align: center; }
    .header h1 { color: #fff; font-size: 28px; margin-bottom: 8px; }
    .header p { color: rgba(255,255,255,0.7); font-size: 14px; }
    .container { max-width: 700px; margin: -20px auto 40px; padding: 0 16px; }
    .card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(124,58,237,0.06); }
    .card h2 { font-size: 18px; color: #7C3AED; margin-bottom: 12px; }
    .card p { font-size: 15px; color: #4a4a6a; }
    .footer { text-align: center; padding: 24px; color: #8b8ba8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062D\u0643\u0627\u0645</h1>
    <p>NAYVO</p>
  </div>
  <div class="container">
    <div class="card">
      <h2>\u0661. \u0627\u0644\u0642\u0628\u0648\u0644 \u0628\u0627\u0644\u0634\u0631\u0648\u0637</h2>
      <p>\u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0643 \u0644\u062A\u0637\u0628\u064A\u0642 NAYVO\u060C \u0641\u0625\u0646\u0643 \u062A\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062D\u0643\u0627\u0645. \u0625\u0630\u0627 \u0643\u0646\u062A \u0644\u0627 \u062A\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0623\u064A \u062C\u0632\u0621 \u0645\u0646\u0647\u0627\u060C \u064A\u064F\u0631\u062C\u0649 \u0639\u062F\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u062A\u0637\u0628\u064A\u0642.</p>
    </div>
    <div class="card">
      <h2>\u0662. \u0627\u0644\u0623\u0647\u0644\u064A\u0629</h2>
      <p>\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0639\u0645\u0631\u0643 18 \u0639\u0627\u0645\u0627\u064B \u0623\u0648 \u0623\u0643\u062B\u0631 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u062A\u0637\u0628\u064A\u0642. \u0628\u0627\u0644\u062A\u0633\u062C\u064A\u0644\u060C \u0623\u0646\u062A \u062A\u0624\u0643\u062F \u0623\u0646\u0643 \u062A\u0633\u062A\u0648\u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0634\u0631\u0637.</p>
    </div>
    <div class="card">
      <h2>\u0663. \u0627\u0644\u062D\u0633\u0627\u0628 \u0648\u0627\u0644\u0623\u0645\u0627\u0646</h2>
      <p>\u0623\u0646\u062A \u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0627\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0633\u0631\u064A\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u062D\u0633\u0627\u0628\u0643 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u064A\u062C\u0628 \u0625\u0628\u0644\u0627\u063A\u0646\u0627 \u0641\u0648\u0631\u0627\u064B \u0639\u0646 \u0623\u064A \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0647.</p>
    </div>
    <div class="card">
      <h2>\u0664. \u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u062F\u0641\u0639</h2>
      <p>\u062C\u0645\u064A\u0639 \u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621 \u0646\u0647\u0627\u0626\u064A\u0629 \u0648\u063A\u064A\u0631 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0628\u0639\u062F \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062F\u0641\u0639. \u064A\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0642\u0628\u0644 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0637\u0644\u0628. \u0645\u0639 \u0643\u0644 \u0639\u0645\u0644\u064A\u0629 \u0634\u0631\u0627\u0621 \u062A\u062D\u0635\u0644 \u0639\u0644\u0649 \u0647\u062F\u064A\u0629 \u0645\u062C\u0627\u0646\u064A\u0629.</p>
    </div>
    <div class="card">
      <h2>\u0665. \u0627\u0644\u0647\u062F\u0627\u064A\u0627</h2>
      <p>\u064A\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0647\u062F\u0627\u064A\u0627 \u0628\u0634\u0643\u0644 \u0639\u0634\u0648\u0627\u0626\u064A \u0639\u0646\u062F \u0627\u0643\u062A\u0645\u0627\u0644 \u0628\u064A\u0639 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0641\u064A \u0627\u0644\u062D\u0645\u0644\u0629. \u064A\u062A\u0645 \u0634\u062D\u0646 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0627\u0644\u0647\u062F\u0627\u064A\u0627 \u062E\u0644\u0627\u0644 14 \u064A\u0648\u0645 \u0639\u0645\u0644.</p>
    </div>
    <div class="card">
      <h2>\u0666. \u0627\u0644\u062A\u0639\u062F\u064A\u0644\u0627\u062A</h2>
      <p>\u0646\u062D\u062A\u0641\u0638 \u0628\u0627\u0644\u062D\u0642 \u0641\u064A \u062A\u0639\u062F\u064A\u0644 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637 \u0641\u064A \u0623\u064A \u0648\u0642\u062A. \u0633\u064A\u062A\u0645 \u0625\u0628\u0644\u0627\u063A\u0643 \u0628\u0623\u064A \u062A\u063A\u064A\u064A\u0631\u0627\u062A \u062C\u0648\u0647\u0631\u064A\u0629.</p>
    </div>
  </div>
  <div class="footer">
    <p>NAYVO &copy; ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
    <p>\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B: ${(/* @__PURE__ */ new Date()).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
</body>
</html>`);
  });
  app2.get("/support", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A - NAYVO</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f4f0ff; color: #1a1a2e; direction: rtl; line-height: 1.8; }
    .header { background: linear-gradient(135deg, #7C3AED, #EC4899); padding: 40px 20px; text-align: center; }
    .header h1 { color: #fff; font-size: 28px; margin-bottom: 8px; }
    .header p { color: rgba(255,255,255,0.7); font-size: 14px; }
    .container { max-width: 700px; margin: -20px auto 40px; padding: 0 16px; }
    .card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(124,58,237,0.06); }
    .card h2 { font-size: 18px; color: #7C3AED; margin-bottom: 12px; }
    .card p, .card li { font-size: 15px; color: #4a4a6a; }
    .card ul { padding-right: 20px; }
    .card li { margin-bottom: 8px; }
    .email-link { color: #7C3AED; text-decoration: none; font-weight: 600; }
    .email-link:hover { text-decoration: underline; }
    .footer { text-align: center; padding: 24px; color: #8b8ba8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>\u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A</h1>
    <p>NAYVO</p>
  </div>
  <div class="container">
    <div class="card">
      <h2>\u0643\u064A\u0641 \u064A\u0645\u0643\u0646\u0646\u0627 \u0645\u0633\u0627\u0639\u062F\u062A\u0643\u061F</h2>
      <p>\u0641\u0631\u064A\u0642 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A \u0641\u064A NAYVO \u062C\u0627\u0647\u0632 \u0644\u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0641\u064A \u0623\u064A \u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0623\u0648 \u0645\u0634\u0643\u0644\u0629 \u062A\u0648\u0627\u062C\u0647\u0643.</p>
    </div>
    <div class="card">
      <h2>\u0627\u0644\u062F\u0639\u0645 \u0645\u0646 \u062F\u0627\u062E\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642</h2>
      <p>\u0623\u0633\u0647\u0644 \u0648\u0623\u0633\u0631\u0639 \u0637\u0631\u064A\u0642\u0629 \u0644\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0647\u064A \u0645\u0646 \u062E\u0644\u0627\u0644 \u0646\u0638\u0627\u0645 \u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u062F\u0639\u0645 \u062F\u0627\u062E\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642:</p>
      <ul>
        <li>\u0627\u0641\u062A\u062D \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0648\u0627\u0646\u062A\u0642\u0644 \u0625\u0644\u0649 <strong>\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A</strong></li>
        <li>\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 <strong>\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627</strong></li>
        <li>\u0623\u0631\u0633\u0644 \u062A\u0630\u0643\u0631\u0629 \u062F\u0639\u0645 \u0648\u0633\u0646\u0631\u062F \u0639\u0644\u064A\u0643 \u0641\u064A \u0623\u0642\u0631\u0628 \u0648\u0642\u062A</li>
      </ul>
    </div>
    <div class="card">
      <h2>\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A</h2>
      <p>\u064A\u0645\u0643\u0646\u0643 \u0623\u064A\u0636\u0627\u064B \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A:</p>
      <p><a href="mailto:support@nayvo.store" class="email-link">support@nayvo.store</a></p>
    </div>
    <div class="card">
      <h2>\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629</h2>
      <ul>
        <li><strong>\u0643\u064A\u0641 \u0623\u0634\u062A\u0631\u064A \u0645\u0646\u062A\u062C\u061F</strong> \u2014 \u062A\u0635\u0641\u062D \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A\u060C \u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u0646\u062A\u062C\u060C \u0648\u0623\u0643\u0645\u0644 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0634\u0631\u0627\u0621 \u0628\u0627\u0644\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0643.</li>
        <li><strong>\u0643\u064A\u0641 \u064A\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632\u061F</strong> \u2014 \u0639\u0646\u062F \u0628\u064A\u0639 \u062C\u0645\u064A\u0639 \u0627\u0644\u0642\u0637\u0639\u060C \u064A\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0641\u0627\u0626\u0632 \u0639\u0634\u0648\u0627\u0626\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0646.</li>
        <li><strong>\u0647\u0644 \u0623\u062D\u0635\u0644 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u062A\u062C \u062D\u062A\u0649 \u0644\u0648 \u0644\u0645 \u0623\u0641\u0632\u061F</strong> \u2014 \u0646\u0639\u0645! \u0627\u0644\u0645\u0646\u062A\u062C \u0645\u0636\u0645\u0648\u0646 \u0644\u0643\u060C \u0648\u0627\u0644\u0647\u062F\u064A\u0629 \u0641\u0631\u0635\u0629 \u0625\u0636\u0627\u0641\u064A\u0629.</li>
        <li><strong>\u0643\u064A\u0641 \u0623\u062A\u0627\u0628\u0639 \u0637\u0644\u0628\u064A\u061F</strong> \u2014 \u0645\u0646 \u062A\u0628\u0648\u064A\u0628 "\u0637\u0644\u0628\u0627\u062A\u064A" \u064A\u0645\u0643\u0646\u0643 \u0645\u062A\u0627\u0628\u0639\u0629 \u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 \u0648\u0627\u0644\u0634\u062D\u0646.</li>
        <li><strong>\u0643\u064A\u0641 \u0623\u0631\u0641\u0639 \u0625\u064A\u0635\u0627\u0644 \u0627\u0644\u062F\u0641\u0639\u061F</strong> \u2014 \u0627\u062F\u062E\u0644 \u0639\u0644\u0649 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0637\u0644\u0628 \u0648\u0627\u0636\u063A\u0637 "\u0631\u0641\u0639 \u0627\u0644\u0625\u064A\u0635\u0627\u0644" \u0648\u0627\u062E\u062A\u0631 \u0635\u0648\u0631\u0629 \u0627\u0644\u0625\u064A\u0635\u0627\u0644 \u0645\u0646 \u062C\u0647\u0627\u0632\u0643.</li>
      </ul>
    </div>
    <div class="card">
      <h2>\u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629</h2>
      <p>\u0646\u0633\u0639\u0649 \u0644\u0644\u0631\u062F \u0639\u0644\u0649 \u062C\u0645\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631\u0627\u062A \u062E\u0644\u0627\u0644 <strong>24 \u0633\u0627\u0639\u0629</strong> \u0645\u0646 \u0627\u0633\u062A\u0644\u0627\u0645\u0647\u0627.</p>
    </div>
  </div>
  <div class="footer">
    <p>NAYVO &copy; ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
  </div>
</body>
</html>`);
  });
  app2.post("/api/support-tickets", requireAuth, async (req, res) => {
    try {
      const parsed = insertSupportTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: parsed.error.flatten() });
      }
      const ticket = await storage.createSupportTicket(req.session.userId, parsed.data);
      res.json(ticket);
    } catch (error) {
      console.error("Create support ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/support-tickets", requireAuth, async (req, res) => {
    try {
      const tickets2 = await storage.getUserSupportTickets(req.session.userId);
      res.json(tickets2);
    } catch (error) {
      console.error("Get support tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/support-tickets/:id", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "\u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (ticket.userId !== req.session.userId) {
        return res.status(403).json({ message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Get support ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/support-tickets", requireAdmin, async (_req, res) => {
    try {
      const tickets2 = await storage.getAllSupportTickets();
      res.json(tickets2);
    } catch (error) {
      console.error("Get all support tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/support-tickets/:id", requireAdmin, async (req, res) => {
    try {
      const { status, adminReply } = req.body;
      if (status && !["open", "in_progress", "closed"].includes(status)) {
        return res.status(400).json({ message: "\u062D\u0627\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      }
      const ticket = await storage.updateSupportTicket(req.params.id, { status, adminReply });
      if (!ticket) return res.status(404).json({ message: "\u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      if (adminReply) {
        await storage.createUserNotification(
          ticket.userId,
          "support_reply",
          "\u0631\u062F \u0639\u0644\u0649 \u062A\u0630\u0643\u0631\u0629 \u0627\u0644\u062F\u0639\u0645 \u{1F4E9}",
          `\u062A\u0645 \u0627\u0644\u0631\u062F \u0639\u0644\u0649 \u062A\u0630\u0643\u0631\u062A\u0643: ${ticket.subject}`
        );
        sendPushNotifications([ticket.userId], "\u0631\u062F \u0639\u0644\u0649 \u062A\u0630\u0643\u0631\u0629 \u0627\u0644\u062F\u0639\u0645 \u{1F4E9}", `\u062A\u0645 \u0627\u0644\u0631\u062F \u0639\u0644\u0649 \u062A\u0630\u0643\u0631\u062A\u0643: ${ticket.subject}`);
      }
      res.json(ticket);
    } catch (error) {
      console.error("Update support ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/account-settings", requireAdmin, async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      const adminId = req.session.userId;
      const admin2 = await storage.getUser(adminId);
      if (!admin2) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (email && email !== admin2.email) {
        const existing = await storage.getUserByEmail(email);
        if (existing && existing.id !== adminId) {
          return res.status(409).json({ message: "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
        }
        await storage.updateUserEmail(adminId, email);
      }
      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ message: "\u064A\u062C\u0628 \u0625\u062F\u062E\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629" });
        const valid = await bcrypt.compare(currentPassword, admin2.password);
        if (!valid) return res.status(401).json({ message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
        const hashed = await bcrypt.hash(newPassword, 10);
        await storage.updateUserPassword(adminId, hashed);
      }
      return res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0628\u0646\u062C\u0627\u062D" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623" });
    }
  });
  app2.post("/api/admin/create-admin", requireAdmin, async (req, res) => {
    try {
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        return res.status(400).json({ message: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
      const hashed = await bcrypt.hash(password, 10);
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newAdmin = await storage.createUser({
        email,
        username,
        password: hashed,
        role: "admin",
        emailVerified: true,
        referralCode
      });
      return res.status(201).json({ message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0627\u0644\u0623\u062F\u0645\u0646 \u0628\u0646\u062C\u0627\u062D", user: { id: newAdmin.id, email: newAdmin.email, username: newAdmin.username } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623" });
    }
  });
  app2.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const resetSchema = z2.object({
        newPassword: z2.string().min(6, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 6 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644")
      });
      const parsed = resetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { newPassword } = parsed.data;
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.params.id, hashed);
      return res.json({ message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u0628\u0646\u062C\u0627\u062D" });
    } catch (err) {
      console.error("Reset password error:", err);
      return res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631" });
    }
  });
  app2.post("/api/campaign-requests", async (req, res) => {
    try {
      const parsed = insertCampaignClientRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const [request] = await db.insert(campaignClientRequests).values({
        businessName: parsed.data.businessName,
        contactName: parsed.data.contactName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        productName: parsed.data.productName,
        productValue: parsed.data.productValue || null,
        description: parsed.data.description || null
      }).returning();
      res.json({ message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628\u0643 \u0628\u0646\u062C\u0627\u062D! \u0633\u0646\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0642\u0631\u064A\u0628\u0627\u064B.", id: request.id });
    } catch (error) {
      console.error("Campaign request error:", error);
      res.status(500).json({ message: "\u062D\u062F\u062B \u062E\u0637\u0623\u060C \u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B" });
    }
  });
  app2.get("/api/campaign-requests", requireAdmin, async (req, res) => {
    try {
      const requests = await db.select().from(campaignClientRequests).orderBy(desc2(campaignClientRequests.createdAt));
      res.json(requests);
    } catch (error) {
      console.error("Get campaign requests error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.patch("/api/campaign-requests/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      await db.update(campaignClientRequests).set({ status, adminNotes: adminNotes || null }).where(eq2(campaignClientRequests.id, req.params.id));
      res.json({ message: "\u062A\u0645 \u0627\u0644\u062A\u062D\u062F\u064A\u062B" });
    } catch (error) {
      console.error("Update campaign request error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path2 from "path";
var app = express();
app.set("trust proxy", 1);
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.APP_ORIGINS) {
      process.env.APP_ORIGINS.split(",").forEach((origin2) => {
        const normalized = origin2.trim().replace(/\/$/, "");
        if (normalized) origins.add(normalized);
      });
    }
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    const normalizedOrigin = origin?.replace(/\/$/, "");
    if (origin && (origins.has(normalizedOrigin || origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false, limit: "50mb" }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const deleteAccountTemplatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "delete-account.html"
  );
  const deleteAccountTemplate = fs.readFileSync(deleteAccountTemplatePath, "utf-8");
  const appName = getAppName();
  app2.get("/delete-account", (_req, res) => {
    const html = deleteAccountTemplate.replace(/APP_NAME_PLACEHOLDER/g, appName);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });
  app2.get("/admin/login", (_req, res) => {
    res.redirect(302, "/auth?returnTo=/admin");
  });
  app2.get("/shop", (_req, res) => {
    res.redirect(302, "/products");
  });
  app2.get("/about", (req, res) => {
    serveLandingPage({ req, res, landingPageTemplate, appName });
  });
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    next();
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express.static(path2.resolve(process.cwd(), "web-build"), { index: false }));
  app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
  const spaIndexPath = path2.resolve(process.cwd(), "web-build", "index.html");
  if (fs.existsSync(spaIndexPath)) {
    app2.use((req, res, next) => {
      if (!["GET", "HEAD"].includes(req.method) || req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/assets") || ["/privacy-policy", "/terms", "/support"].includes(req.path)) {
        return next();
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(spaIndexPath);
    });
  }
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  app.get("/api/health", async (_req, res) => {
    try {
      const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      await pool2.query("select 1");
      res.status(200).json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  try {
    const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const bcryptSeed = await import("bcryptjs");
    const existingMethods = await storage2.getPaymentMethods();
    if (existingMethods.length === 0) {
      await storage2.createPaymentMethod({ name: "Bank Transfer", nameAr: "\u062A\u062D\u0648\u064A\u0644 \u0628\u0646\u0643\u064A", icon: "business", enabled: true, description: "\u062A\u062D\u0648\u064A\u0644 \u0645\u0628\u0627\u0634\u0631 \u0625\u0644\u0649 \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0628\u0646\u0643\u064A" });
      await storage2.createPaymentMethod({ name: "Cash on Delivery", nameAr: "\u0627\u0644\u062F\u0641\u0639 \u0639\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645", icon: "cash", enabled: true, description: "\u0627\u062F\u0641\u0639 \u0646\u0642\u062F\u0627\u064B \u0639\u0646\u062F \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0645\u0646\u062A\u062C" });
      console.log("[Seed] Default payment methods created");
    }
    const existingAdmin = await storage2.getUserByUsername("admin");
    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        throw new Error("ADMIN_PASSWORD must be set before creating the admin user");
      }
      const hashedPassword = await bcryptSeed.hash(adminPassword, 10);
      await storage2.createUser({
        username: "admin",
        email: "admin@nayvo.store",
        password: hashedPassword
      });
      const adminUser = await storage2.getUserByUsername("admin");
      if (adminUser) {
        await storage2.updateUserProfile(adminUser.id, { fullName: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645", phone: "", address: "", city: "", country: "" });
        const { db: seedDb } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq3 } = await import("drizzle-orm");
        await seedDb.update(users2).set({ role: "admin", emailVerified: true }).where(eq3(users2.id, adminUser.id));
        console.log("[Seed] Admin user created (set ADMIN_PASSWORD env var for custom password)");
      }
    }
  } catch (err) {
    console.log("[Seed] Skipped seeding:", err?.message);
  }
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
