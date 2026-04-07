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
  activityLog: () => activityLog,
  adminNotifications: () => adminNotifications,
  campaignProducts: () => campaignProducts,
  campaignProductsRelations: () => campaignProductsRelations,
  campaignStatusEnum: () => campaignStatusEnum,
  campaigns: () => campaigns,
  campaignsRelations: () => campaignsRelations,
  coupons: () => coupons,
  emailVerificationTokens: () => emailVerificationTokens,
  insertCampaignSchema: () => insertCampaignSchema,
  insertCouponSchema: () => insertCouponSchema,
  insertPaymentMethodSchema: () => insertPaymentMethodSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertSupportTicketSchema: () => insertSupportTicketSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  orderStatusEnum: () => orderStatusEnum,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  passwordResetTokens: () => passwordResetTokens,
  paymentMethods: () => paymentMethods,
  paymentStatusEnum: () => paymentStatusEnum,
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
var roleEnum, campaignStatusEnum, orderStatusEnum, paymentStatusEnum, shippingStatusEnum, users, campaigns, orders, tickets, paymentMethods, coupons, activityLog, reviews, adminNotifications, userNotifications, emailVerificationTokens, passwordResetTokens, supportTickets, walletTransactions, insertSupportTicketSchema, usersRelations, campaignProducts, campaignsRelations, campaignProductsRelations, reviewsRelations, ordersRelations, ticketsRelations, insertUserSchema, loginSchema, insertCampaignSchema, insertPaymentMethodSchema, insertCouponSchema, updateProfileSchema, insertReviewSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    roleEnum = pgEnum("user_role", ["user", "admin"]);
    campaignStatusEnum = pgEnum("campaign_status", [
      "active",
      "paused",
      "sold_out",
      "drawing",
      "completed"
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
      walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0"),
      isSuspended: boolean("is_suspended").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    campaigns = pgTable("campaigns", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
      isFlashSale: boolean("is_flash_sale").notNull().default(false),
      flashSaleEndsAt: timestamp("flash_sale_ends_at"),
      originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      drawAt: timestamp("draw_at"),
      endsAt: timestamp("ends_at")
    });
    orders = pgTable("orders", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    tickets = pgTable("tickets", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ticketNumber: text("ticket_number").notNull().unique(),
      userId: varchar("user_id").notNull().references(() => users.id),
      campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
      orderId: varchar("order_id").notNull().references(() => orders.id),
      productId: varchar("product_id"),
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
      campaignId: varchar("campaign_id").notNull(),
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
      campaignId: varchar("campaign_id"),
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
    insertSupportTicketSchema = z.object({
      subject: z.string().min(3, "\u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0645\u0637\u0644\u0648\u0628"),
      message: z.string().min(10, "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0642\u0635\u064A\u0631\u0629 \u062C\u062F\u0627\u064B"),
      priority: z.enum(["low", "medium", "high"]).default("medium")
    });
    usersRelations = relations(users, ({ many }) => ({
      orders: many(orders),
      tickets: many(tickets),
      reviews: many(reviews)
    }));
    campaignProducts = pgTable("campaign_products", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      nameAr: text("name_ar"),
      imageUrl: text("image_url"),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      quantity: integer("quantity").notNull(),
      soldQuantity: integer("sold_quantity").notNull().default(0),
      sortOrder: integer("sort_order").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    campaignsRelations = relations(campaigns, ({ many, one }) => ({
      orders: many(orders),
      tickets: many(tickets),
      reviews: many(reviews),
      products: many(campaignProducts),
      winner: one(users, {
        fields: [campaigns.winnerId],
        references: [users.id]
      })
    }));
    campaignProductsRelations = relations(campaignProducts, ({ one }) => ({
      campaign: one(campaigns, {
        fields: [campaignProducts.campaignId],
        references: [campaigns.id]
      })
    }));
    reviewsRelations = relations(reviews, ({ one }) => ({
      user: one(users, {
        fields: [reviews.userId],
        references: [users.id]
      }),
      campaign: one(campaigns, {
        fields: [reviews.campaignId],
        references: [campaigns.id]
      })
    }));
    ordersRelations = relations(orders, ({ one, many }) => ({
      user: one(users, {
        fields: [orders.userId],
        references: [users.id]
      }),
      campaign: one(campaigns, {
        fields: [orders.campaignId],
        references: [campaigns.id]
      }),
      tickets: many(tickets)
    }));
    ticketsRelations = relations(tickets, ({ one }) => ({
      user: one(users, {
        fields: [tickets.userId],
        references: [users.id]
      }),
      campaign: one(campaigns, {
        fields: [tickets.campaignId],
        references: [campaigns.id]
      }),
      order: one(orders, {
        fields: [tickets.orderId],
        references: [orders.id]
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
    insertCampaignSchema = createInsertSchema(campaigns).pick({
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
      isFlashSale: true,
      flashSaleEndsAt: true,
      originalPrice: true
    });
    insertPaymentMethodSchema = createInsertSchema(paymentMethods).pick({
      name: true,
      nameAr: true,
      icon: true,
      enabled: true,
      description: true,
      bankName: true,
      accountName: true,
      iban: true
    });
    insertCouponSchema = createInsertSchema(coupons).pick({
      code: true,
      discountPercent: true,
      maxUses: true,
      expiresAt: true
    });
    updateProfileSchema = z.object({
      fullName: z.string().min(2, "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628"),
      phone: z.string().min(8, "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
      address: z.string().min(5, "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628"),
      city: z.string().min(2, "\u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0645\u0637\u0644\u0648\u0628\u0629"),
      country: z.string().min(2, "\u0627\u0644\u062F\u0648\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0629")
    });
    insertReviewSchema = z.object({
      campaignId: z.string().min(1),
      rating: z.number().min(1).max(5),
      comment: z.string().optional()
    });
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
  DatabaseStorage: () => DatabaseStorage,
  storage: () => storage
});
import { eq, desc, and, sql as sql2, count, sum, gte, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";
function generateTicketNumber() {
  const prefix = "LD";
  const timestamp2 = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${timestamp2}-${random}`;
}
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
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
      async getCampaigns() {
        return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
      }
      async getCampaign(id) {
        const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
        return campaign || void 0;
      }
      async createCampaign(campaign) {
        const [created] = await db.insert(campaigns).values(campaign).returning();
        return created;
      }
      async updateCampaign(id, data) {
        const [updated] = await db.update(campaigns).set(data).where(eq(campaigns.id, id)).returning();
        return updated || void 0;
      }
      async deleteCampaign(id) {
        const existingOrders = await db.select().from(orders).where(eq(orders.campaignId, id)).limit(1);
        if (existingOrders.length > 0) {
          throw new Error("Cannot delete campaign with existing orders");
        }
        const [deleted] = await db.delete(campaigns).where(eq(campaigns.id, id)).returning();
        return !!deleted;
      }
      async getCampaignProducts(campaignId) {
        return db.select().from(campaignProducts).where(eq(campaignProducts.campaignId, campaignId)).orderBy(campaignProducts.sortOrder);
      }
      async getCampaignProduct(id) {
        const [product] = await db.select().from(campaignProducts).where(eq(campaignProducts.id, id));
        return product || void 0;
      }
      async createCampaignProduct(data) {
        const [product] = await db.insert(campaignProducts).values({
          campaignId: data.campaignId,
          name: data.name,
          nameAr: data.nameAr,
          imageUrl: data.imageUrl,
          price: data.price,
          quantity: data.quantity,
          sortOrder: data.sortOrder || 0
        }).returning();
        return product;
      }
      async updateCampaignProduct(id, data) {
        const [updated] = await db.update(campaignProducts).set(data).where(eq(campaignProducts.id, id)).returning();
        return updated || void 0;
      }
      async deleteCampaignProduct(id) {
        const [deleted] = await db.delete(campaignProducts).where(eq(campaignProducts.id, id)).returning();
        return !!deleted;
      }
      async syncCampaignAggregates(campaignId) {
        const products = await this.getCampaignProducts(campaignId);
        if (products.length === 0) {
          await this.updateCampaign(campaignId, {
            totalQuantity: 0,
            soldQuantity: 0,
            productPrice: "0.00"
          });
          return;
        }
        const totalQty = products.reduce((s, p) => s + p.quantity, 0);
        const soldQty = products.reduce((s, p) => s + p.soldQuantity, 0);
        const minPrice = Math.min(...products.map((p) => parseFloat(p.price)));
        const allSoldOut = products.every((p) => p.soldQuantity >= p.quantity);
        const updateData = {
          totalQuantity: totalQty,
          soldQuantity: soldQty,
          productPrice: minPrice.toFixed(2)
        };
        if (allSoldOut && soldQty >= totalQty) {
          updateData.status = "sold_out";
        }
        await this.updateCampaign(campaignId, updateData);
      }
      async createOrder(data) {
        const [order] = await db.insert(orders).values({
          userId: data.userId,
          campaignId: data.campaignId,
          productId: data.productId,
          quantity: data.quantity,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod || "stripe",
          status: data.status || "pending",
          paymentStatus: data.paymentStatus || "pending_payment",
          shippingAddress: data.shippingAddress,
          shippingFullName: data.shippingFullName,
          shippingPhone: data.shippingPhone,
          shippingCity: data.shippingCity,
          shippingCountry: data.shippingCountry,
          couponCode: data.couponCode,
          discountAmount: data.discountAmount
        }).returning();
        return order;
      }
      async getOrdersByUser(userId) {
        return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
      }
      async updateOrder(id, data) {
        const [updated] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
        return updated || void 0;
      }
      async createTicket(data) {
        const ticketNumber = generateTicketNumber();
        const [ticket] = await db.insert(tickets).values({
          ticketNumber,
          userId: data.userId,
          campaignId: data.campaignId,
          orderId: data.orderId,
          productId: data.productId || null
        }).returning();
        return ticket;
      }
      async getTicketsByUser(userId) {
        return db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
      }
      async getTicketsByCampaign(campaignId) {
        return db.select().from(tickets).where(eq(tickets.campaignId, campaignId)).orderBy(desc(tickets.createdAt));
      }
      async getTicket(id) {
        const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
        return ticket || void 0;
      }
      async markTicketWinner(id) {
        const [ticket] = await db.update(tickets).set({ isWinner: true }).where(eq(tickets.id, id)).returning();
        return ticket || void 0;
      }
      async purchaseProduct(userId, campaignId, quantity, paymentMethod, shippingData, couponCode, productId) {
        const campaign = await this.getCampaign(campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "active") throw new Error("Campaign is not active");
        const products = await this.getCampaignProducts(campaignId);
        let unitPrice;
        let selectedProduct;
        if (products.length > 0) {
          if (!productId) throw new Error("Product variant must be selected");
          selectedProduct = products.find((p) => p.id === productId);
          if (!selectedProduct) throw new Error("Product variant not found");
          const productRemaining = selectedProduct.quantity - selectedProduct.soldQuantity;
          if (quantity > productRemaining)
            throw new Error(`\u0641\u0642\u0637 ${productRemaining} \u0642\u0637\u0639\u0629 \u0645\u062A\u0628\u0642\u064A\u0629 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u062F\u064A\u0644`);
          unitPrice = parseFloat(selectedProduct.price);
        } else {
          const remaining = campaign.totalQuantity - campaign.soldQuantity;
          if (quantity > remaining)
            throw new Error(`Only ${remaining} items remaining`);
          unitPrice = parseFloat(campaign.productPrice);
        }
        let totalAmount = unitPrice * quantity;
        let discountAmount;
        let appliedCouponCode;
        if (couponCode) {
          const coupon = await this.validateCoupon(couponCode);
          const discount = totalAmount * coupon.discountPercent / 100;
          discountAmount = discount.toFixed(2);
          totalAmount = totalAmount - discount;
          appliedCouponCode = coupon.code;
          await this.updateCoupon(coupon.id, { usedCount: coupon.usedCount + 1 });
        }
        const isBankTransfer = paymentMethod === "bank_transfer";
        const orderStatus = isBankTransfer ? "pending" : "paid";
        const orderPaymentStatus = isBankTransfer ? "pending_payment" : "confirmed";
        const order = await this.createOrder({
          userId,
          campaignId,
          productId: productId || void 0,
          quantity,
          totalAmount: totalAmount.toFixed(2),
          paymentMethod,
          status: orderStatus,
          paymentStatus: orderPaymentStatus,
          shippingAddress: shippingData?.address,
          shippingFullName: shippingData?.fullName,
          shippingPhone: shippingData?.phone,
          shippingCity: shippingData?.city,
          shippingCountry: shippingData?.country,
          couponCode: appliedCouponCode,
          discountAmount
        });
        const createdTickets = [];
        for (let i = 0; i < quantity; i++) {
          const ticket = await this.createTicket({
            userId,
            campaignId,
            orderId: order.id,
            productId: productId || void 0
          });
          createdTickets.push(ticket);
        }
        if (selectedProduct && productId) {
          await this.updateCampaignProduct(productId, {
            soldQuantity: selectedProduct.soldQuantity + quantity
          });
          await this.syncCampaignAggregates(campaignId);
        } else {
          const newSoldQty = campaign.soldQuantity + quantity;
          const updateData = { soldQuantity: newSoldQty };
          if (newSoldQty >= campaign.totalQuantity) {
            updateData.status = "sold_out";
          }
          await this.updateCampaign(campaignId, updateData);
        }
        return { order, tickets: createdTickets };
      }
      async drawWinner(campaignId) {
        const campaign = await this.getCampaign(campaignId);
        if (!campaign) throw new Error("Campaign not found");
        const campaignTickets = await this.getTicketsByCampaign(campaignId);
        if (campaignTickets.length === 0) {
          throw new Error("\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0630\u0627\u0643\u0631 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u062D\u0645\u0644\u0629 \u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0633\u062D\u0628");
        }
        await this.updateCampaign(campaignId, { status: "drawing" });
        const randomIndex = Math.floor(
          parseInt(randomBytes(4).toString("hex"), 16) / 4294967295 * campaignTickets.length
        );
        const winningTicket = campaignTickets[randomIndex];
        await this.markTicketWinner(winningTicket.id);
        const winner = await this.getUser(winningTicket.userId);
        if (!winner) throw new Error("Winner user not found");
        await this.updateCampaign(campaignId, {
          status: "completed",
          winnerId: winner.id,
          winnerTicketId: winningTicket.ticketNumber,
          drawAt: /* @__PURE__ */ new Date()
        });
        return { winner, ticket: winningTicket };
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
        const result = await db.select({
          id: orders.id,
          userId: orders.userId,
          campaignId: orders.campaignId,
          quantity: orders.quantity,
          totalAmount: orders.totalAmount,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          receiptUrl: orders.receiptUrl,
          rejectionReason: orders.rejectionReason,
          shippingStatus: orders.shippingStatus,
          shippingAddress: orders.shippingAddress,
          shippingFullName: orders.shippingFullName,
          shippingPhone: orders.shippingPhone,
          shippingCity: orders.shippingCity,
          shippingCountry: orders.shippingCountry,
          trackingNumber: orders.trackingNumber,
          couponCode: orders.couponCode,
          discountAmount: orders.discountAmount,
          createdAt: orders.createdAt,
          username: users.username,
          campaignTitle: campaigns.title
        }).from(orders).leftJoin(users, eq(orders.userId, users.id)).leftJoin(campaigns, eq(orders.campaignId, campaigns.id)).orderBy(desc(orders.createdAt));
        return result.map((row) => ({
          ...row,
          username: row.username || "Unknown",
          campaignTitle: row.campaignTitle || "Unknown"
        }));
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
        const [revenueResult] = await db.select({ total: sum(orders.totalAmount) }).from(orders).where(eq(orders.status, "paid"));
        const [ordersResult] = await db.select({ total: count() }).from(orders);
        const [usersResult] = await db.select({ total: count() }).from(users);
        const [activeCampaignsResult] = await db.select({ total: count() }).from(campaigns).where(eq(campaigns.status, "active"));
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const [ordersTodayResult] = await db.select({ total: count() }).from(orders).where(gte(orders.createdAt, today));
        const weekAgo = /* @__PURE__ */ new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const [newUsersResult] = await db.select({ total: count() }).from(users).where(gte(users.createdAt, weekAgo));
        const topCampaigns = await db.select({ title: campaigns.title, soldQuantity: campaigns.soldQuantity }).from(campaigns).orderBy(desc(campaigns.soldQuantity)).limit(5);
        const totalOrdersCount = ordersResult?.total || 0;
        const totalUsersCount = usersResult?.total || 0;
        const totalRevenueNum = parseFloat(revenueResult?.total || "0");
        const conversionRate = totalUsersCount > 0 ? (totalOrdersCount / totalUsersCount * 100).toFixed(1) : "0.0";
        const averageOrderValue = totalOrdersCount > 0 ? (totalRevenueNum / totalOrdersCount).toFixed(2) : "0.00";
        return {
          totalRevenue: revenueResult?.total || "0.00",
          totalOrders: totalOrdersCount,
          totalUsers: totalUsersCount,
          activeCampaigns: activeCampaignsResult?.total || 0,
          ordersToday: ordersTodayResult?.total || 0,
          newUsersThisWeek: newUsersResult?.total || 0,
          conversionRate,
          averageOrderValue,
          topCampaigns
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
      async getReviewsByCampaign(campaignId) {
        const result = await db.select({
          id: reviews.id,
          userId: reviews.userId,
          campaignId: reviews.campaignId,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          username: users.username
        }).from(reviews).innerJoin(users, eq(reviews.userId, users.id)).where(eq(reviews.campaignId, campaignId)).orderBy(desc(reviews.createdAt));
        return result;
      }
      async createReview(userId, data) {
        const [review] = await db.insert(reviews).values({
          userId,
          campaignId: data.campaignId,
          rating: data.rating,
          comment: data.comment || null
        }).returning();
        return review;
      }
      async getUserReviewForCampaign(userId, campaignId) {
        const [review] = await db.select().from(reviews).where(and(eq(reviews.userId, userId), eq(reviews.campaignId, campaignId)));
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
      async createUserNotification(userId, type, title, body, campaignId, metadata) {
        const [notification] = await db.insert(userNotifications).values({
          userId,
          type,
          title,
          body,
          campaignId: campaignId || null,
          metadata: metadata || null
        }).returning();
        return notification;
      }
      async createBulkUserNotifications(userIds, type, title, body, campaignId, metadata) {
        if (userIds.length === 0) return;
        const values = userIds.map((userId) => ({
          userId,
          type,
          title,
          body,
          campaignId: campaignId || null,
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
        const recentOrders = await db.select({
          campaignTitle: campaigns.title,
          createdAt: orders.createdAt
        }).from(orders).innerJoin(campaigns, eq(orders.campaignId, campaigns.id)).where(eq(orders.paymentStatus, "confirmed")).orderBy(desc(orders.createdAt)).limit(limit);
        return recentOrders.map((o) => {
          const minutesAgo = Math.max(1, Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 6e4));
          return { campaignTitle: o.campaignTitle, minutesAgo };
        });
      }
      async deleteUser(userId) {
        await db.delete(supportTickets).where(eq(supportTickets.userId, userId));
        await db.delete(userNotifications).where(eq(userNotifications.userId, userId));
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
        await db.delete(reviews).where(eq(reviews.userId, userId));
        await db.delete(tickets).where(eq(tickets.userId, userId));
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
import { sum as sum2, count as count2, and as and2, gte as gte2, sql as sql3, eq as eq2, desc as desc2 } from "drizzle-orm";

// server/email.ts
import { Resend } from "resend";
var APP_NAME = "\u0641\u0631\u0635\u0629 - Forsa";
var FROM_EMAIL = "noreply@forsa.today";
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
  const ticketsHtml = data.ticketNumbers.map((t) => `<span class="badge badge-info" style="margin: 2px;">${t}</span>`).join(" ");
  const html = baseTemplate(`
    <div class="body">
      <h2>\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0637\u0644\u0628\u0643 \u0628\u0646\u062C\u0627\u062D!</h2>
      <p>\u0634\u0643\u0631\u0627\u064B \u0644\u0643! \u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628\u0643 \u0648\u0633\u064A\u062A\u0645 \u0645\u0639\u0627\u0644\u062C\u062A\u0647 \u0641\u064A \u0623\u0642\u0631\u0628 \u0648\u0642\u062A.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628</span><span class="info-value">#${data.orderId.slice(0, 8)}</span></div>
        <div class="info-row"><span class="info-label">\u0627\u0644\u0645\u0646\u062A\u062C</span><span class="info-value">${data.campaignTitle}</span></div>
        <div class="info-row"><span class="info-label">\u0627\u0644\u0643\u0645\u064A\u0629</span><span class="info-value">${data.quantity}</span></div>
        <div class="info-row"><span class="info-label">\u0627\u0644\u0645\u0628\u0644\u063A</span><span class="info-value">${data.totalAmount} $</span></div>
        <div class="info-row"><span class="info-label">\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639</span><span class="info-value">${data.paymentMethod}</span></div>
      </div>
      <p><strong>\u062A\u0630\u0627\u0643\u0631\u0643:</strong></p>
      <div style="margin: 12px 0;">${ticketsHtml}</div>
      <p>\u0628\u0627\u0644\u062A\u0648\u0641\u064A\u0642!</p>
    </div>
  `);
  await sendEmail(to, `\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0637\u0644\u0628 #${data.orderId.slice(0, 8)} - ${APP_NAME}`, html);
}
async function sendPaymentStatusUpdate(to, data) {
  const statusMap = {
    confirmed: { label: "\u062A\u0645 \u0627\u0644\u062A\u0623\u0643\u064A\u062F", badge: "badge-success", message: "\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u062F\u0641\u0639\u062A\u0643 \u0628\u0646\u062C\u0627\u062D! \u0633\u064A\u062A\u0645 \u0634\u062D\u0646 \u0637\u0644\u0628\u0643 \u0642\u0631\u064A\u0628\u0627\u064B." },
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
        <div class="info-row"><span class="info-label">\u0627\u0644\u0645\u0646\u062A\u062C</span><span class="info-value">${data.campaignTitle}</span></div>
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
        <div class="info-row"><span class="info-label">\u0627\u0644\u062D\u0645\u0644\u0629</span><span class="info-value">${data.campaignTitle}</span></div>
        <div class="info-row"><span class="info-label">\u0627\u0644\u062C\u0627\u0626\u0632\u0629</span><span class="info-value">${data.prizeName}</span></div>
        <div class="info-row"><span class="info-label">\u062A\u0630\u0643\u0631\u0629 \u0627\u0644\u0641\u0648\u0632</span><span class="info-value">${data.ticketNumber}</span></div>
      </div>
      <p>\u0633\u064A\u062A\u0645 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0642\u0631\u064A\u0628\u0627\u064B \u0644\u062A\u0631\u062A\u064A\u0628 \u062A\u0633\u0644\u064A\u0645 \u0627\u0644\u062C\u0627\u0626\u0632\u0629. \u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0641\u064A \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062E\u0635\u064A.</p>
      <p>\u0623\u0644\u0641 \u0645\u0628\u0631\u0648\u0643!</p>
    </div>
  `);
  await sendEmail(to, `\u0645\u0628\u0631\u0648\u0643! \u0623\u0646\u062A \u0627\u0644\u0641\u0627\u0626\u0632 - ${data.campaignTitle} - ${APP_NAME}`, html);
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
      <p>\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0633\u062C\u064A\u0644\u0643 \u0641\u064A \u0641\u0631\u0635\u0629! \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u062A\u0641\u0639\u064A\u0644 \u062D\u0633\u0627\u0628\u0643:</p>
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
        <div class="info-row"><span class="info-label">\u0627\u0644\u0645\u0646\u062A\u062C</span><span class="info-value">${data.campaignTitle}</span></div>
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
import { mkdirSync } from "fs";
mkdirSync("uploads/receipts", { recursive: true });
mkdirSync("uploads/campaigns", { recursive: true });
async function sendPushNotifications(userIds, title, body, data) {
  try {
    const rawTokens = await storage.getUserPushTokensByIds(userIds);
    const tokens = [...new Set(rawTokens)];
    if (tokens.length === 0) return;
    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: data || {}
    }));
    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(chunk)
      }).catch(() => {
      });
    }
  } catch (e) {
    console.error("Push notification error:", e);
  }
}
var receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/receipts/");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
var uploadReceipt = multer({
  storage: receiptStorage,
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
var campaignStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/campaigns/");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
var uploadCampaignImage = multer({
  storage: campaignStorage,
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
  app2.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || "forsa-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        httpOnly: true,
        secure: false,
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
  app2.get("/api/campaigns", async (_req, res) => {
    try {
      const allCampaigns = await storage.getCampaigns();
      const campaignsWithProducts = await Promise.all(
        allCampaigns.map(async (c) => {
          const products = await storage.getCampaignProducts(c.id);
          return { ...c, products };
        })
      );
      res.json(campaignsWithProducts);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const products = await storage.getCampaignProducts(campaign.id);
      res.json({ ...campaign, products });
    } catch (error) {
      console.error("Get campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/campaigns", requireAdmin, async (req, res) => {
    try {
      const { products: productsData, ...campaignData } = req.body;
      const parsed = insertCampaignSchema.safeParse(campaignData);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }
      const campaign = await storage.createCampaign(parsed.data);
      if (productsData && Array.isArray(productsData) && productsData.length > 0) {
        for (let i = 0; i < productsData.length; i++) {
          const p = productsData[i];
          const qty = parseInt(p.quantity);
          const prc = parseFloat(p.price);
          if (!p.name || isNaN(qty) || qty <= 0 || isNaN(prc) || prc <= 0) {
            return res.status(400).json({ message: `Invalid variant data at index ${i}` });
          }
          await storage.createCampaignProduct({
            campaignId: campaign.id,
            name: p.name,
            nameAr: p.nameAr || p.name,
            imageUrl: p.imageUrl,
            price: prc.toFixed(2),
            quantity: qty,
            sortOrder: i
          });
        }
        await storage.syncCampaignAggregates(campaign.id);
      }
      try {
        const allUsers = await storage.getAllUsers();
        const userIds = allUsers.filter((u) => u.role !== "admin").map((u) => u.id);
        if (userIds.length > 0) {
          await storage.createBulkUserNotifications(
            userIds,
            "new_campaign",
            "\u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F \u{1F389}",
            `\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F: ${campaign.title}`,
            campaign.id
          );
          sendPushNotifications(userIds, "\u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F \u{1F389}", `\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F: ${campaign.title}`, { campaignId: campaign.id });
        }
      } catch (e) {
        console.error("Notification error:", e);
      }
      const products = await storage.getCampaignProducts(campaign.id);
      const updatedCampaign = await storage.getCampaign(campaign.id);
      res.json({ ...updatedCampaign, products });
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const products = await storage.getCampaignProducts(campaign.id);
      res.json({ ...campaign, products });
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/admin/campaigns/:id/products", requireAdmin, async (req, res) => {
    try {
      const campaignId = req.params.id;
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      const { name, nameAr, imageUrl, price, quantity, sortOrder } = req.body;
      if (!name || !price || !quantity) {
        return res.status(400).json({ message: "Name, price and quantity are required" });
      }
      const product = await storage.createCampaignProduct({
        campaignId,
        name,
        nameAr,
        imageUrl,
        price: String(price),
        quantity: parseInt(quantity),
        sortOrder: sortOrder || 0
      });
      await storage.syncCampaignAggregates(campaignId);
      res.json(product);
    } catch (error) {
      console.error("Add product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.put("/api/admin/campaign-products/:id", requireAdmin, async (req, res) => {
    try {
      const { price, quantity, ...rest } = req.body;
      const updateData = { ...rest };
      if (price !== void 0) {
        const prc = parseFloat(price);
        if (isNaN(prc) || prc <= 0) return res.status(400).json({ message: "Invalid price" });
        updateData.price = prc.toFixed(2);
      }
      if (quantity !== void 0) {
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) return res.status(400).json({ message: "Invalid quantity" });
        updateData.quantity = qty;
      }
      const product = await storage.updateCampaignProduct(req.params.id, updateData);
      if (!product) return res.status(404).json({ message: "Product not found" });
      await storage.syncCampaignAggregates(product.campaignId);
      res.json(product);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/admin/campaign-products/:id", requireAdmin, async (req, res) => {
    try {
      const product = await storage.getCampaignProduct(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      const deleted = await storage.deleteCampaignProduct(req.params.id);
      if (deleted) {
        await storage.syncCampaignAggregates(product.campaignId);
      }
      res.json({ success: deleted });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Server error" });
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
  app2.post("/api/purchase", requireAuth, async (req, res) => {
    try {
      const {
        campaignId,
        quantity = 1,
        paymentMethod = "card",
        productId,
        shippingFullName,
        shippingPhone,
        shippingCity,
        shippingAddress,
        shippingCountry,
        couponCode,
        useWallet = false,
        walletAmount = 0
      } = req.body;
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID required" });
      }
      const shippingData = shippingFullName ? {
        fullName: shippingFullName,
        phone: shippingPhone || "",
        city: shippingCity || "",
        address: shippingAddress || "",
        country: shippingCountry
      } : void 0;
      const result = await storage.purchaseProduct(
        req.session.userId,
        campaignId,
        quantity,
        paymentMethod,
        shippingData,
        couponCode,
        productId
      );
      if (useWallet && walletAmount > 0) {
        await storage.deductWalletBalance(
          req.session.userId,
          walletAmount,
          `\u062E\u0635\u0645 \u0645\u062D\u0641\u0638\u0629 - \u0637\u0644\u0628 ${result.order.id}`,
          result.order.id
        );
      }
      await storage.logActivity(
        "purchase",
        "New purchase",
        `User purchased ${result.tickets.length} ticket(s) for order ${result.order.id}`,
        req.session.userId,
        JSON.stringify({ orderId: result.order.id, campaignId, quantity, paymentMethod })
      );
      await storage.createAdminNotification(
        "new_order",
        "\u0637\u0644\u0628 \u062C\u062F\u064A\u062F",
        `\u0637\u0644\u0628 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0642\u064A\u0645\u0629 ${result.order.totalAmount}`,
        JSON.stringify({ orderId: result.order.id, userId: req.session.userId })
      );
      const buyer = await storage.getUser(req.session.userId);
      const campaign = await storage.getCampaign(campaignId);
      if (buyer && campaign) {
        sendOrderConfirmation(buyer.email, {
          orderId: result.order.id,
          campaignTitle: campaign.title,
          quantity: result.tickets.length,
          totalAmount: result.order.totalAmount,
          ticketNumbers: result.tickets.map((t) => t.ticketNumber),
          paymentMethod
        });
        try {
          const remaining = campaign.totalQuantity - campaign.soldQuantity;
          const threshold = Math.ceil(campaign.totalQuantity * 0.1);
          if (remaining <= threshold && remaining > 0) {
            const campaignTickets = await storage.getTicketsByCampaign(campaignId);
            const participantIds = [...new Set(campaignTickets.map((t) => t.userId))];
            if (participantIds.length > 0) {
              await storage.createBulkUserNotifications(
                participantIds,
                "low_stock",
                "\u0627\u0644\u0643\u0645\u064A\u0629 \u0642\u0627\u0631\u0628\u062A \u0639\u0644\u0649 \u0627\u0644\u0646\u0641\u0627\u062F \u26A1",
                `\u0628\u0642\u064A ${remaining} \u0642\u0637\u0639\u0629 \u0641\u0642\u0637 \u0645\u0646 ${campaign.title}! \u0633\u0627\u0631\u0639 \u0628\u0627\u0644\u0634\u0631\u0627\u0621`,
                campaignId
              );
              sendPushNotifications(participantIds, "\u0627\u0644\u0643\u0645\u064A\u0629 \u0642\u0627\u0631\u0628\u062A \u0639\u0644\u0649 \u0627\u0644\u0646\u0641\u0627\u062F \u26A1", `\u0628\u0642\u064A ${remaining} \u0642\u0637\u0639\u0629 \u0641\u0642\u0637 \u0645\u0646 ${campaign.title}! \u0633\u0627\u0631\u0639 \u0628\u0627\u0644\u0634\u0631\u0627\u0621`, { campaignId });
            }
          }
          if (remaining <= 0) {
            const campaignTickets = await storage.getTicketsByCampaign(campaignId);
            const participantIds = [...new Set(campaignTickets.map((t) => t.userId))];
            if (participantIds.length > 0) {
              await storage.createBulkUserNotifications(
                participantIds,
                "sold_out",
                "\u0646\u0641\u062F\u062A \u0627\u0644\u0643\u0645\u064A\u0629! \u{1F525}",
                `\u062A\u0645 \u0628\u064A\u0639 \u0643\u0627\u0645\u0644 \u0643\u0645\u064A\u0629 ${campaign.title}! \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0642\u0631\u064A\u0628\u0627\u064B`,
                campaignId
              );
              sendPushNotifications(participantIds, "\u0646\u0641\u062F\u062A \u0627\u0644\u0643\u0645\u064A\u0629! \u{1F525}", `\u062A\u0645 \u0628\u064A\u0639 \u0643\u0627\u0645\u0644 \u0643\u0645\u064A\u0629 ${campaign.title}! \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0642\u0631\u064A\u0628\u0627\u064B`, { campaignId });
            }
          }
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
      res.json({
        order: result.order,
        tickets: result.tickets,
        message: `Purchase successful! You received ${result.tickets.length} ticket(s).`
      });
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(400).json({ message: error.message || "Purchase failed" });
    }
  });
  app2.post("/api/cart-purchase", requireAuth, async (req, res) => {
    try {
      const {
        items,
        paymentMethod = "card",
        shippingFullName,
        shippingPhone,
        shippingCity,
        shippingAddress,
        shippingCountry,
        couponCode,
        useWallet = false,
        walletAmount = 0
      } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Cart items required" });
      }
      const shippingData = shippingFullName ? {
        fullName: shippingFullName,
        phone: shippingPhone || "",
        city: shippingCity || "",
        address: shippingAddress || "",
        country: shippingCountry
      } : void 0;
      const allOrders = [];
      const allTickets = [];
      for (const item of items) {
        const { campaignId, quantity, productId } = item;
        if (!campaignId || !quantity) continue;
        const result = await storage.purchaseProduct(
          req.session.userId,
          campaignId,
          quantity,
          paymentMethod,
          shippingData,
          couponCode,
          productId
        );
        allOrders.push(result.order);
        allTickets.push(...result.tickets);
        await storage.logActivity(
          "purchase",
          "New purchase",
          `User purchased ${result.tickets.length} ticket(s) for order ${result.order.id}`,
          req.session.userId,
          JSON.stringify({ orderId: result.order.id, campaignId, quantity, paymentMethod })
        );
        await storage.createAdminNotification(
          "new_order",
          "\u0637\u0644\u0628 \u062C\u062F\u064A\u062F",
          `\u0637\u0644\u0628 \u062C\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0642\u064A\u0645\u0629 ${result.order.totalAmount}`,
          JSON.stringify({ orderId: result.order.id, userId: req.session.userId })
        );
        const buyer = await storage.getUser(req.session.userId);
        const campaign = await storage.getCampaign(campaignId);
        if (buyer && campaign) {
          sendOrderConfirmation(buyer.email, {
            orderId: result.order.id,
            campaignTitle: campaign.title,
            quantity: result.tickets.length,
            totalAmount: result.order.totalAmount,
            ticketNumbers: result.tickets.map((t) => t.ticketNumber),
            paymentMethod
          });
          try {
            const remaining = campaign.totalQuantity - campaign.soldQuantity;
            const threshold = Math.ceil(campaign.totalQuantity * 0.1);
            if (remaining <= threshold && remaining > 0) {
              const cTickets = await storage.getTicketsByCampaign(campaignId);
              const pIds = [...new Set(cTickets.map((t) => t.userId))];
              if (pIds.length > 0) {
                await storage.createBulkUserNotifications(pIds, "low_stock", "\u0627\u0644\u0643\u0645\u064A\u0629 \u0642\u0627\u0631\u0628\u062A \u0639\u0644\u0649 \u0627\u0644\u0646\u0641\u0627\u062F \u26A1", `\u0628\u0642\u064A ${remaining} \u0642\u0637\u0639\u0629 \u0641\u0642\u0637 \u0645\u0646 ${campaign.title}! \u0633\u0627\u0631\u0639 \u0628\u0627\u0644\u0634\u0631\u0627\u0621`, campaignId);
                sendPushNotifications(pIds, "\u0627\u0644\u0643\u0645\u064A\u0629 \u0642\u0627\u0631\u0628\u062A \u0639\u0644\u0649 \u0627\u0644\u0646\u0641\u0627\u062F \u26A1", `\u0628\u0642\u064A ${remaining} \u0642\u0637\u0639\u0629 \u0641\u0642\u0637 \u0645\u0646 ${campaign.title}! \u0633\u0627\u0631\u0639 \u0628\u0627\u0644\u0634\u0631\u0627\u0621`, { campaignId });
              }
            }
            if (remaining <= 0) {
              const cTickets = await storage.getTicketsByCampaign(campaignId);
              const pIds = [...new Set(cTickets.map((t) => t.userId))];
              if (pIds.length > 0) {
                await storage.createBulkUserNotifications(pIds, "sold_out", "\u0646\u0641\u062F\u062A \u0627\u0644\u0643\u0645\u064A\u0629! \u{1F525}", `\u062A\u0645 \u0628\u064A\u0639 \u0643\u0627\u0645\u0644 \u0643\u0645\u064A\u0629 ${campaign.title}! \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0642\u0631\u064A\u0628\u0627\u064B`, campaignId);
                sendPushNotifications(pIds, "\u0646\u0641\u062F\u062A \u0627\u0644\u0643\u0645\u064A\u0629! \u{1F525}", `\u062A\u0645 \u0628\u064A\u0639 \u0643\u0627\u0645\u0644 \u0643\u0645\u064A\u0629 ${campaign.title}! \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0642\u0631\u064A\u0628\u0627\u064B`, { campaignId });
              }
            }
          } catch (e) {
            console.error("Notification error:", e);
          }
        }
      }
      if (useWallet && walletAmount > 0) {
        await storage.deductWalletBalance(
          req.session.userId,
          walletAmount,
          `\u062E\u0635\u0645 \u0645\u062D\u0641\u0638\u0629 - \u0637\u0644\u0628 \u0633\u0644\u0629 (${allOrders.length} \u0637\u0644\u0628)`,
          allOrders[0]?.id
        );
      }
      res.json({
        orders: allOrders,
        tickets: allTickets,
        message: `Purchase successful! You received ${allTickets.length} ticket(s) across ${allOrders.length} order(s).`
      });
    } catch (error) {
      console.error("Cart purchase error:", error);
      res.status(400).json({ message: error.message || "Cart purchase failed" });
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
  app2.get("/api/tickets/campaign/:campaignId", async (req, res) => {
    try {
      const campaignTickets = await storage.getTicketsByCampaign(req.params.campaignId);
      res.json(campaignTickets);
    } catch (error) {
      console.error("Get campaign tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const userOrders = await storage.getOrdersByUser(req.session.userId);
      res.json(userOrders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(order);
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
      const receiptUrl = `/uploads/receipts/${req.file.filename}`;
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
  app2.post("/api/admin/draw/:campaignId", requireAdmin, async (req, res) => {
    try {
      const result = await storage.drawWinner(req.params.campaignId);
      if (!result) {
        return res.status(400).json({ message: "No tickets found for this campaign" });
      }
      await storage.logActivity(
        "draw",
        "Winner drawn",
        `Winner ${result.winner.username} drawn for campaign with ticket ${result.ticket.ticketNumber}`,
        req.session.userId,
        JSON.stringify({ campaignId: req.params.campaignId, winnerId: result.winner.id, ticketNumber: result.ticket.ticketNumber })
      );
      const drawnCampaign = await storage.getCampaign(req.params.campaignId);
      if (drawnCampaign) {
        sendWinnerNotification(result.winner.email, {
          campaignTitle: drawnCampaign.title,
          prizeName: drawnCampaign.prizeName,
          ticketNumber: result.ticket.ticketNumber
        });
        try {
          await storage.createUserNotification(
            result.winner.id,
            "you_won",
            "\u0645\u0628\u0631\u0648\u0643 \u0623\u0646\u062A \u0627\u0644\u0641\u0627\u0626\u0632! \u{1F3C6}\u{1F389}",
            `\u0644\u0642\u062F \u0641\u0632\u062A \u0628\u062C\u0627\u0626\u0632\u0629 ${drawnCampaign.prizeName} \u0641\u064A \u062D\u0645\u0644\u0629 ${drawnCampaign.title} \u0628\u0627\u0644\u062A\u0630\u0643\u0631\u0629 ${result.ticket.ticketNumber}!`,
            req.params.campaignId
          );
          sendPushNotifications([result.winner.id], "\u0645\u0628\u0631\u0648\u0643 \u0623\u0646\u062A \u0627\u0644\u0641\u0627\u0626\u0632! \u{1F3C6}\u{1F389}", `\u0644\u0642\u062F \u0641\u0632\u062A \u0628\u062C\u0627\u0626\u0632\u0629 ${drawnCampaign.prizeName} \u0641\u064A \u062D\u0645\u0644\u0629 ${drawnCampaign.title}!`, { campaignId: req.params.campaignId });
          const campaignTickets = await storage.getTicketsByCampaign(req.params.campaignId);
          const participantIds = [...new Set(campaignTickets.map((t) => t.userId))].filter((id) => id !== result.winner.id);
          if (participantIds.length > 0) {
            await storage.createBulkUserNotifications(
              participantIds,
              "draw_completed",
              "\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u{1F381}",
              `\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0628\u0627\u0644\u0647\u062F\u064A\u0629 \u0641\u064A \u062D\u0645\u0644\u0629 ${drawnCampaign.title}! \u062D\u0638\u0627\u064B \u0623\u0648\u0641\u0631 \u0641\u064A \u0627\u0644\u0645\u0631\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629`,
              req.params.campaignId
            );
            sendPushNotifications(participantIds, "\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u{1F381}", `\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0628\u0627\u0644\u0647\u062F\u064A\u0629 \u0641\u064A \u062D\u0645\u0644\u0629 ${drawnCampaign.title}! \u062D\u0638\u0627\u064B \u0623\u0648\u0641\u0631 \u0641\u064A \u0627\u0644\u0645\u0631\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629`, { campaignId: req.params.campaignId });
          }
          const allUsers = await storage.getAllUsers();
          const nonParticipantIds = allUsers.filter((u) => u.role !== "admin" && u.id !== result.winner.id && !participantIds.includes(u.id)).map((u) => u.id);
          if (nonParticipantIds.length > 0) {
            await storage.createBulkUserNotifications(
              nonParticipantIds,
              "winner_announced",
              "\u0641\u0627\u0626\u0632 \u062C\u062F\u064A\u062F! \u{1F38A}",
              `\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0641\u064A \u062D\u0645\u0644\u0629 ${drawnCampaign.title}!`,
              req.params.campaignId
            );
            sendPushNotifications(nonParticipantIds, "\u0641\u0627\u0626\u0632 \u062C\u062F\u064A\u062F! \u{1F38A}", `\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u0627\u0626\u0632 \u0641\u064A \u062D\u0645\u0644\u0629 ${drawnCampaign.title}!`, { campaignId: req.params.campaignId });
          }
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
      res.json({
        winner: {
          id: result.winner.id,
          username: result.winner.username
        },
        ticket: result.ticket,
        message: `Winner drawn! ${result.winner.username} with ticket ${result.ticket.ticketNumber}`
      });
    } catch (error) {
      console.error("Draw error:", error);
      res.status(400).json({ message: error.message || "Draw failed" });
    }
  });
  app2.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const allCampaigns = await storage.getCampaigns();
      const totalCampaigns = allCampaigns.length;
      const activeCampaigns = allCampaigns.filter((c) => c.status === "active").length;
      const completedCampaigns = allCampaigns.filter((c) => c.status === "completed").length;
      const totalRevenue = allCampaigns.reduce((sum3, c) => {
        return sum3 + parseFloat(c.productPrice) * c.soldQuantity;
      }, 0);
      res.json({
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalRevenue: totalRevenue.toFixed(2)
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
          const shippingCampaign = await storage.getCampaign(shippingOrder.campaignId);
          if (shippingUser && shippingCampaign) {
            sendShippingUpdate(shippingUser.email, {
              orderId: shippingOrder.id,
              campaignTitle: shippingCampaign.title,
              status: shippingStatus,
              trackingNumber
            });
            const statusText = shippingStatus === "processing" ? "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062C\u0647\u064A\u0632" : shippingStatus === "shipped" ? "\u062A\u0645 \u0627\u0644\u0634\u062D\u0646" : "\u062A\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644";
            await storage.createUserNotification(
              shippingOrder.userId,
              "shipping_update",
              `\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0634\u062D\u0646: ${statusText} \u{1F4E6}`,
              `\u0637\u0644\u0628\u0643 \u0645\u0646 ${shippingCampaign.title} \u2014 ${statusText}`,
              shippingOrder.campaignId
            );
            sendPushNotifications([shippingOrder.userId], `\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0634\u062D\u0646: ${statusText} \u{1F4E6}`, `\u0637\u0644\u0628\u0643 \u0645\u0646 ${shippingCampaign.title} \u2014 ${statusText}`, { orderId: shippingOrder.id });
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
        return res.status(400).json({ message: "Invalid payment status. Must be 'confirmed' or 'rejected'" });
      }
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (paymentStatus === "confirmed") {
        await storage.updateOrder(order.id, { status: "paid" });
        await storage.updateOrderPayment(order.id, { paymentStatus: "confirmed" });
        await storage.logActivity(
          "payment_confirmed",
          "Payment confirmed",
          `Admin confirmed payment for order ${order.id}`,
          req.session.userId,
          JSON.stringify({ orderId: order.id })
        );
      } else {
        await storage.updateOrderPayment(order.id, {
          paymentStatus: "rejected",
          rejectionReason: rejectionReason || ""
        });
        await storage.logActivity(
          "payment_rejected",
          "Payment rejected",
          `Admin rejected payment for order ${order.id}: ${rejectionReason || "No reason provided"}`,
          req.session.userId,
          JSON.stringify({ orderId: order.id, rejectionReason })
        );
      }
      const updated = await storage.getOrder(order.id);
      const orderUser = await storage.getUser(order.userId);
      const orderCampaign = await storage.getCampaign(order.campaignId);
      if (orderUser && orderCampaign) {
        sendPaymentStatusUpdate(orderUser.email, {
          orderId: order.id,
          status: paymentStatus,
          campaignTitle: orderCampaign.title,
          rejectionReason
        });
      }
      res.json(updated);
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
      const withCampaign = await Promise.all(userOrders.map(async (o) => {
        const campaign = await storage.getCampaign(o.campaignId);
        return { ...o, campaignTitle: campaign?.title || "\u2014" };
      }));
      res.json(withCampaign);
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/campaigns/:id/orders", requireAdmin, async (req, res) => {
    try {
      const campaignTickets = await storage.getTicketsByCampaign(req.params.id);
      const enriched = await Promise.all(campaignTickets.map(async (t) => {
        const u = await storage.getUser(t.userId);
        const order = t.orderId ? await storage.getOrder(t.orderId) : void 0;
        return {
          ticketNumber: t.ticketNumber,
          userId: t.userId,
          username: u?.username || "\u2014",
          fullName: u?.fullName || "\u2014",
          phone: u?.phone || "\u2014",
          isWinner: t.isWinner,
          paymentStatus: order?.paymentStatus || "\u2014",
          totalAmount: order?.totalAmount || "\u2014",
          createdAt: t.createdAt
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Get campaign orders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/winners", requireAdmin, async (req, res) => {
    try {
      const allCampaigns = await storage.getCampaigns();
      const completed = allCampaigns.filter((c) => c.status === "completed" && c.winnerId);
      const results = await Promise.all(completed.map(async (campaign) => {
        const winnerUser = campaign.winnerId ? await storage.getUser(campaign.winnerId) : null;
        const winnerInfo = winnerUser ? {
          winnerUsername: winnerUser.username,
          winnerFullName: winnerUser.fullName || "\u2014",
          winnerPhone: winnerUser.phone || "",
          winnerEmail: winnerUser.email
        } : {
          winnerUsername: "\u2014",
          winnerFullName: "\u2014",
          winnerPhone: "",
          winnerEmail: ""
        };
        const campaignTickets = await storage.getTicketsByCampaign(campaign.id);
        const winningTicket = campaignTickets.find((t) => t.isWinner);
        const winnerOrder = winningTicket?.orderId ? await storage.getOrder(winningTicket.orderId) : void 0;
        return {
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          prizeName: campaign.prizeName,
          imageUrl: campaign.imageUrl,
          drawnAt: campaign.drawAt || campaign.createdAt,
          winningTicketNumber: winningTicket?.ticketNumber || "\u2014",
          winnerOrderId: winnerOrder?.id || null,
          winnerOrderShipping: winnerOrder?.shippingStatus || "pending",
          winnerId: campaign.winnerId,
          ...winnerInfo
        };
      }));
      res.json(results);
    } catch (error) {
      console.error("Get admin winners error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const { reviews: reviewsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const allReviews = await db.select().from(reviewsTable).orderBy(desc2(reviewsTable.createdAt));
      const enriched = await Promise.all(allReviews.map(async (r) => {
        const u = await storage.getUser(r.userId);
        const c = await storage.getCampaign(r.campaignId);
        return {
          ...r,
          username: u?.username || "\u2014",
          campaignTitle: c?.title || "\u2014"
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
  app2.put("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const { title, description, price, productPrice, totalQuantity, imageUrl, endsAt, isFlashSale, originalPrice, flashSaleEndsAt, status, prizeName } = req.body;
      const updateData = {};
      if (title !== void 0) updateData.title = title;
      if (description !== void 0) updateData.description = description;
      if (prizeName !== void 0) updateData.prizeName = prizeName;
      const effectivePrice = productPrice ?? price;
      if (effectivePrice !== void 0) updateData.productPrice = String(effectivePrice);
      if (totalQuantity !== void 0) updateData.totalQuantity = Number(totalQuantity);
      if (imageUrl !== void 0) updateData.imageUrl = imageUrl ?? null;
      if (endsAt !== void 0) updateData.endsAt = endsAt ? new Date(endsAt) : null;
      if (isFlashSale !== void 0) updateData.isFlashSale = Boolean(isFlashSale);
      if (originalPrice !== void 0) updateData.originalPrice = originalPrice ? String(originalPrice) : null;
      if (flashSaleEndsAt !== void 0) updateData.flashSaleEndsAt = flashSaleEndsAt ? new Date(flashSaleEndsAt) : null;
      if (status !== void 0) updateData.status = status;
      const updated = await storage.updateCampaign(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "Campaign not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(400).json({ message: error.message || "Failed to update campaign" });
    }
  });
  app2.delete("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteCampaign(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json({ message: "Campaign deleted" });
    } catch (error) {
      console.error("Delete campaign error:", error);
      res.status(400).json({ message: error.message || "Failed to delete campaign" });
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
  app2.get("/api/reviews/:campaignId", async (req, res) => {
    try {
      const campaignReviews = await storage.getReviewsByCampaign(req.params.campaignId);
      res.json(campaignReviews);
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.post("/api/reviews", requireAuth, async (req, res) => {
    try {
      const parsed = insertReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629", errors: parsed.error.flatten() });
      }
      const existing = await storage.getUserReviewForCampaign(req.session.userId, parsed.data.campaignId);
      if (existing) {
        return res.status(400).json({ message: "\u0644\u0642\u062F \u0642\u0645\u062A \u0628\u062A\u0642\u064A\u064A\u0645 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062A\u062C \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      const review = await storage.createReview(req.session.userId, parsed.data);
      res.json(review);
    } catch (error) {
      console.error("Create review error:", error);
      res.status(500).json({ message: error.message || "Server error" });
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
  app2.post("/api/admin/campaigns/upload-image", requireAdmin, uploadCampaignImage.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }
      const imageUrl = `/uploads/campaigns/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Upload campaign image error:", error);
      res.status(500).json({ message: error.message || "Server error" });
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
      const csvHeader = "Order ID,Username,Campaign,Quantity,Total,Payment Method,Payment Status,Shipping Status,Tracking Number,Date\n";
      const csvRows = allOrders.map(
        (o) => [o.id, o.username, o.campaignTitle, o.quantity, o.totalAmount, o.paymentMethod, o.paymentStatus, o.shippingStatus, o.trackingNumber, o.createdAt].map((v) => escapeCsv(v)).join(",")
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
      const allCampaigns = await storage.getCampaigns();
      const completed = allCampaigns.filter((c) => c.status === "completed" && c.winnerId);
      const results = await Promise.all(
        completed.map(async (campaign) => {
          let winnerUsername = "";
          if (campaign.winnerId) {
            const winner = await storage.getUser(campaign.winnerId);
            if (winner) {
              winnerUsername = winner.username;
            }
          }
          return {
            ...campaign,
            winnerUsername
          };
        })
      );
      res.json(results);
    } catch (error) {
      console.error("Get winners error:", error);
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
  <title>\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 - \u0641\u0631\u0635\u0629</title>
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
    <p>\u0641\u0631\u0635\u0629 - Forsa</p>
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
    <p>\u0641\u0631\u0635\u0629 - Forsa &copy; ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
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
  <title>\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062D\u0643\u0627\u0645 - \u0641\u0631\u0635\u0629</title>
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
    <p>\u0641\u0631\u0635\u0629 - Forsa</p>
  </div>
  <div class="container">
    <div class="card">
      <h2>\u0661. \u0627\u0644\u0642\u0628\u0648\u0644 \u0628\u0627\u0644\u0634\u0631\u0648\u0637</h2>
      <p>\u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0643 \u0644\u062A\u0637\u0628\u064A\u0642 \u0641\u0631\u0635\u0629\u060C \u0641\u0625\u0646\u0643 \u062A\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062D\u0643\u0627\u0645. \u0625\u0630\u0627 \u0643\u0646\u062A \u0644\u0627 \u062A\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0623\u064A \u062C\u0632\u0621 \u0645\u0646\u0647\u0627\u060C \u064A\u064F\u0631\u062C\u0649 \u0639\u062F\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u062A\u0637\u0628\u064A\u0642.</p>
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
    <p>\u0641\u0631\u0635\u0629 - Forsa &copy; ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
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
  <title>\u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A - \u0641\u0631\u0635\u0629</title>
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
    <p>\u0641\u0631\u0635\u0629 - Forsa</p>
  </div>
  <div class="container">
    <div class="card">
      <h2>\u0643\u064A\u0641 \u064A\u0645\u0643\u0646\u0646\u0627 \u0645\u0633\u0627\u0639\u062F\u062A\u0643\u061F</h2>
      <p>\u0641\u0631\u064A\u0642 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A \u0641\u064A \u0641\u0631\u0635\u0629 \u062C\u0627\u0647\u0632 \u0644\u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0641\u064A \u0623\u064A \u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0623\u0648 \u0645\u0634\u0643\u0644\u0629 \u062A\u0648\u0627\u062C\u0647\u0643.</p>
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
      <p><a href="mailto:support@forsa.today" class="email-link">support@forsa.today</a></p>
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
    <p>\u0641\u0631\u0635\u0629 - Forsa &copy; ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
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
      const admin = await storage.getUserById(adminId);
      if (!admin) return res.status(404).json({ message: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (email && email !== admin.email) {
        const existing = await storage.getUserByEmail(email);
        if (existing && existing.id !== adminId) {
          return res.status(409).json({ message: "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
        }
        await storage.updateUserEmail(adminId, email);
      }
      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ message: "\u064A\u062C\u0628 \u0625\u062F\u062E\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629" });
        const valid = await bcrypt.compare(currentPassword, admin.password);
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
    if (origin && (origins.has(origin) || isLocalhost)) {
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
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
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
  const adminLoginPath = path2.resolve(process.cwd(), "server", "templates", "admin", "login.html");
  const adminIndexPath = path2.resolve(process.cwd(), "server", "templates", "admin", "index.html");
  const adminLoginHtml = fs.readFileSync(adminLoginPath, "utf-8");
  const adminIndexHtml = fs.readFileSync(adminIndexPath, "utf-8");
  app2.get("/admin/login", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(adminLoginHtml);
  });
  app2.get("/admin", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(adminIndexHtml);
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
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
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
  const { mkdirSync: mkdirSync2 } = await import("fs");
  mkdirSync2("uploads/receipts", { recursive: true });
  app.use("/uploads", express.static("uploads"));
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
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
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
      const hashedPassword = await bcryptSeed.hash(adminPassword, 10);
      await storage2.createUser({
        username: "admin",
        email: "admin@forsa.app",
        password: hashedPassword
      });
      const adminUser = await storage2.getUserByUsername("admin");
      if (adminUser) {
        await storage2.updateUserProfile(adminUser.id, { fullName: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645" });
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
