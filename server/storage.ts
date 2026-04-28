import {
  type User,
  type InsertUser,
  type Campaign,
  type InsertCampaign,
  type Order,
  type Ticket,
  type PaymentMethod,
  type InsertPaymentMethod,
  type Coupon,
  type InsertCoupon,
  type ActivityLogEntry,
  type Review,
  type AdminNotification,
  type UserNotification,
  type SupportTicket,
  type CampaignProduct,
  type WalletTransaction,
  users,
  campaigns,
  orders,
  tickets,
  paymentMethods,
  coupons,
  activityLog,
  reviews,
  adminNotifications,
  userNotifications,
  passwordResetTokens,
  emailVerificationTokens,
  supportTickets,
  campaignProducts,
  walletTransactions,
  insertReviewSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, sum, gte, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  createOrder(data: {
    userId: string;
    campaignId: string;
    quantity: number;
    totalAmount: string;
    paymentMethod?: string;
    status?: string;
    paymentStatus?: string;
    shippingAddress?: string;
    shippingFullName?: string;
    shippingPhone?: string;
    shippingCity?: string;
    shippingCountry?: string;
    couponCode?: string;
    discountAmount?: string;
  }): Promise<Order>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined>;

  createTicket(data: {
    userId: string;
    campaignId: string;
    orderId: string;
    productId?: string;
  }): Promise<Ticket>;
  getTicketsByUser(userId: string): Promise<Ticket[]>;
  getTicketsByCampaign(campaignId: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  markTicketWinner(id: string): Promise<Ticket | undefined>;

  purchaseProduct(
    userId: string,
    campaignId: string,
    quantity: number,
    paymentMethod: string,
    shippingData?: { fullName: string; phone: string; city: string; address: string; country?: string },
    couponCode?: string
  ): Promise<{ order: Order; tickets: Ticket[] }>;

  drawWinner(campaignId: string): Promise<{ winner: User; ticket: Ticket } | null>;

  getAllUsers(): Promise<User[]>;
  getUserStats(userId: string): Promise<{ orderCount: number; ticketCount: number; totalSpent: string }>;
  getAllOrders(): Promise<(Order & { username: string; campaignTitle: string })[]>;
  updateOrderShipping(orderId: string, data: { shippingStatus?: string; trackingNumber?: string; shippingAddress?: string }): Promise<Order | undefined>;
  updateOrderPayment(orderId: string, data: { paymentStatus: string; receiptUrl?: string; rejectionReason?: string }): Promise<Order | undefined>;

  getPaymentMethods(): Promise<PaymentMethod[]>;
  getEnabledPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<boolean>;

  getCoupons(): Promise<Coupon[]>;
  createCoupon(data: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<boolean>;
  validateCoupon(code: string): Promise<Coupon>;

  getActivityLog(limit?: number): Promise<ActivityLogEntry[]>;
  logActivity(type: string, title: string, description?: string, userId?: string, metadata?: string): Promise<ActivityLogEntry>;

  getAdminDashboardStats(): Promise<{
    totalRevenue: string;
    totalOrders: number;
    totalUsers: number;
    activeCampaigns: number;
    ordersToday: number;
    newUsersThisWeek: number;
    conversionRate: string;
    averageOrderValue: string;
    topCampaigns: { title: string; soldQuantity: number }[];
  }>;

  updateUserProfile(userId: string, data: { fullName: string; phone: string; address: string; city: string; country: string }): Promise<User | undefined>;
  
  getReviewsByCampaign(campaignId: string): Promise<(Review & { username: string })[]>;
  createReview(userId: string, data: { campaignId: string; rating: number; comment?: string }): Promise<Review>;
  getUserReviewForCampaign(userId: string, campaignId: string): Promise<Review | undefined>;
  
  getAdminNotifications(limit?: number): Promise<AdminNotification[]>;
  createAdminNotification(type: string, title: string, message: string, metadata?: string): Promise<AdminNotification>;
  markNotificationRead(id: string): Promise<boolean>;
  markAllNotificationsRead(): Promise<boolean>;
  getUnreadNotificationCount(): Promise<number>;

  createUserNotification(userId: string, type: string, title: string, body: string, campaignId?: string, metadata?: string): Promise<UserNotification>;
  createBulkUserNotifications(userIds: string[], type: string, title: string, body: string, campaignId?: string, metadata?: string): Promise<void>;
  getUserNotifications(userId: string, limit?: number): Promise<UserNotification[]>;
  markUserNotificationRead(id: string, userId: string): Promise<boolean>;
  markAllUserNotificationsRead(userId: string): Promise<boolean>;
  getUnreadUserNotificationCount(userId: string): Promise<number>;

  updateUserPushToken(userId: string, pushToken: string | null): Promise<void>;
  updateUserDeviceTokens(userId: string, tokens: { fcmToken?: string | null; apnToken?: string | null }): Promise<void>;
  getUserPushTokensByIds(userIds: string[]): Promise<string[]>;
  getUserApnTokensByIds(userIds: string[]): Promise<string[]>;
  getAllUsersWithFcmTokens(): Promise<{ id: string; fcmToken: string | null; apnToken: string | null }[]>;

  getWalletBalance(userId: string): Promise<number>;
  addWalletCredit(userId: string, amount: number, type: string, description: string, referenceId?: string): Promise<void>;
  deductWalletBalance(userId: string, amount: number, description: string, referenceId?: string): Promise<boolean>;
  getWalletTransactions(userId: string): Promise<WalletTransaction[]>;

  getUserByEmail(email: string): Promise<User | undefined>;
  createPasswordResetToken(userId: string, code: string, expiresAt: Date): Promise<any>;
  verifyPasswordResetToken(userId: string, code: string): Promise<any>;
  markResetTokenUsed(tokenId: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  updateUserEmail(userId: string, email: string): Promise<void>;

  createEmailVerificationToken(userId: string, code: string, expiresAt: Date): Promise<any>;
  verifyEmailToken(userId: string, code: string): Promise<any>;
  markEmailTokenUsed(tokenId: string): Promise<void>;
  setEmailVerified(userId: string): Promise<void>;

  getRecentPurchases(limit?: number): Promise<{ campaignTitle: string; minutesAgo: number }[]>;
}

function generateTicketNumber(): string {
  const prefix = "LD";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(campaign).returning();
    return created;
  }

  async updateCampaign(
    id: string,
    data: Partial<Campaign>
  ): Promise<Campaign | undefined> {
    const [updated] = await db
      .update(campaigns)
      .set(data)
      .where(eq(campaigns.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const existingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.campaignId, id))
      .limit(1);
    if (existingOrders.length > 0) {
      throw new Error("Cannot delete campaign with existing orders");
    }
    const [deleted] = await db
      .delete(campaigns)
      .where(eq(campaigns.id, id))
      .returning();
    return !!deleted;
  }

  async getCampaignProducts(campaignId: string): Promise<CampaignProduct[]> {
    return db
      .select()
      .from(campaignProducts)
      .where(eq(campaignProducts.campaignId, campaignId))
      .orderBy(campaignProducts.sortOrder);
  }

  async getCampaignProduct(id: string): Promise<CampaignProduct | undefined> {
    const [product] = await db
      .select()
      .from(campaignProducts)
      .where(eq(campaignProducts.id, id));
    return product || undefined;
  }

  async createCampaignProduct(data: {
    campaignId: string;
    name: string;
    nameAr?: string;
    imageUrl?: string;
    imagesJson?: string;
    price: string;
    quantity: number;
    sortOrder?: number;
  }): Promise<CampaignProduct> {
    const [product] = await db
      .insert(campaignProducts)
      .values({
        campaignId: data.campaignId,
        name: data.name,
        nameAr: data.nameAr,
        imageUrl: data.imageUrl,
        imagesJson: data.imagesJson,
        price: data.price,
        quantity: data.quantity,
        sortOrder: data.sortOrder || 0,
      })
      .returning();
    return product;
  }

  async updateCampaignProduct(id: string, data: Partial<CampaignProduct>): Promise<CampaignProduct | undefined> {
    const [updated] = await db
      .update(campaignProducts)
      .set(data)
      .where(eq(campaignProducts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCampaignProduct(id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(campaignProducts)
      .where(eq(campaignProducts.id, id))
      .returning();
    return !!deleted;
  }

  async syncCampaignAggregates(campaignId: string): Promise<void> {
    const products = await this.getCampaignProducts(campaignId);
    if (products.length === 0) {
      await this.updateCampaign(campaignId, {
        totalQuantity: 0,
        soldQuantity: 0,
        productPrice: "0.00",
      });
      return;
    }

    const totalQty = products.reduce((s, p) => s + p.quantity, 0);
    const soldQty = products.reduce((s, p) => s + p.soldQuantity, 0);
    const minPrice = Math.min(...products.map(p => parseFloat(p.price)));

    const allSoldOut = products.every(p => p.soldQuantity >= p.quantity);

    const updateData: Partial<Campaign> = {
      totalQuantity: totalQty,
      soldQuantity: soldQty,
      productPrice: minPrice.toFixed(2),
    };

    if (allSoldOut && soldQty >= totalQty) {
      updateData.status = "sold_out";
    }

    await this.updateCampaign(campaignId, updateData);
  }

  async createOrder(data: {
    userId: string;
    campaignId: string;
    productId?: string;
    quantity: number;
    totalAmount: string;
    paymentMethod?: string;
    status?: string;
    paymentStatus?: string;
    shippingAddress?: string;
    shippingFullName?: string;
    shippingPhone?: string;
    shippingCity?: string;
    shippingCountry?: string;
    couponCode?: string;
    discountAmount?: string;
  }): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values({
        userId: data.userId,
        campaignId: data.campaignId,
        productId: data.productId,
        quantity: data.quantity,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod || "stripe",
        status: (data.status as any) || "pending",
        paymentStatus: (data.paymentStatus as any) || "pending_payment",
        shippingAddress: data.shippingAddress,
        shippingFullName: data.shippingFullName,
        shippingPhone: data.shippingPhone,
        shippingCity: data.shippingCity,
        shippingCountry: data.shippingCountry,
        couponCode: data.couponCode,
        discountAmount: data.discountAmount,
      })
      .returning();
    return order;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async updateOrder(
    id: string,
    data: Partial<Order>
  ): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set(data)
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async createTicket(data: {
    userId: string;
    campaignId: string;
    orderId: string;
    productId?: string;
  }): Promise<Ticket> {
    const ticketNumber = generateTicketNumber();
    const [ticket] = await db
      .insert(tickets)
      .values({
        ticketNumber,
        userId: data.userId,
        campaignId: data.campaignId,
        orderId: data.orderId,
        productId: data.productId || null,
      })
      .returning();
    return ticket;
  }

  async getTicketsByUser(userId: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketsByCampaign(campaignId: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.campaignId, campaignId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async markTicketWinner(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .update(tickets)
      .set({ isWinner: true })
      .where(eq(tickets.id, id))
      .returning();
    return ticket || undefined;
  }

  async purchaseProduct(
    userId: string,
    campaignId: string,
    quantity: number,
    paymentMethod: string,
    shippingData?: { fullName: string; phone: string; city: string; address: string; country?: string },
    couponCode?: string,
    productId?: string
  ): Promise<{ order: Order; tickets: Ticket[] }> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "active") throw new Error("Campaign is not active");

    const products = await this.getCampaignProducts(campaignId);
    let unitPrice: number;
    let selectedProduct: CampaignProduct | undefined;

    if (products.length > 0) {
      if (!productId) throw new Error("Product variant must be selected");
      selectedProduct = products.find(p => p.id === productId);
      if (!selectedProduct) throw new Error("Product variant not found");

      const productRemaining = selectedProduct.quantity - selectedProduct.soldQuantity;
      if (quantity > productRemaining)
        throw new Error(`فقط ${productRemaining} قطعة متبقية من هذا الموديل`);

      unitPrice = parseFloat(selectedProduct.price);
    } else {
      const remaining = campaign.totalQuantity - campaign.soldQuantity;
      if (quantity > remaining)
        throw new Error(`Only ${remaining} items remaining`);
      unitPrice = parseFloat(campaign.productPrice);
    }

    let totalAmount = unitPrice * quantity;
    let discountAmount: string | undefined;
    let appliedCouponCode: string | undefined;

    if (couponCode) {
      const coupon = await this.validateCoupon(couponCode);
      const discount = (totalAmount * coupon.discountPercent) / 100;
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
      productId: productId || undefined,
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
      discountAmount,
    });

    const createdTickets: Ticket[] = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await this.createTicket({
        userId,
        campaignId,
        orderId: order.id,
        productId: productId || undefined,
      });
      createdTickets.push(ticket);
    }

    if (selectedProduct && productId) {
      await this.updateCampaignProduct(productId, {
        soldQuantity: selectedProduct.soldQuantity + quantity,
      });
      await this.syncCampaignAggregates(campaignId);
    } else {
      const newSoldQty = campaign.soldQuantity + quantity;
      const updateData: Partial<Campaign> = { soldQuantity: newSoldQty };
      if (newSoldQty >= campaign.totalQuantity) {
        updateData.status = "sold_out";
      }
      await this.updateCampaign(campaignId, updateData);
    }

    return { order, tickets: createdTickets };
  }

  async drawWinner(
    campaignId: string
  ): Promise<{ winner: User; ticket: Ticket } | null> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    // Admin can force-draw any campaign regardless of status
    const campaignTickets = await this.getTicketsByCampaign(campaignId);
    if (campaignTickets.length === 0) {
      throw new Error("لا توجد تذاكر في هذه الحملة لإجراء السحب");
    }

    await this.updateCampaign(campaignId, { status: "drawing" });

    const randomIndex = Math.floor(
      (parseInt(randomBytes(4).toString("hex"), 16) / 0xffffffff) *
        campaignTickets.length
    );
    const winningTicket = campaignTickets[randomIndex];

    await this.markTicketWinner(winningTicket.id);

    const winner = await this.getUser(winningTicket.userId);
    if (!winner) throw new Error("Winner user not found");

    await this.updateCampaign(campaignId, {
      status: "completed",
      winnerId: winner.id,
      winnerTicketId: winningTicket.ticketNumber,
      drawAt: new Date(),
    });

    return { winner, ticket: winningTicket };
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(userId: string): Promise<{ orderCount: number; ticketCount: number; totalSpent: string }> {
    const [orderResult] = await db
      .select({ orderCount: count(), totalSpent: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.userId, userId));

    const [ticketResult] = await db
      .select({ ticketCount: count() })
      .from(tickets)
      .where(eq(tickets.userId, userId));

    return {
      orderCount: orderResult?.orderCount || 0,
      ticketCount: ticketResult?.ticketCount || 0,
      totalSpent: orderResult?.totalSpent || "0.00",
    };
  }

  async getAllOrders(): Promise<(Order & { username: string; campaignTitle: string })[]> {
    const result = await db
      .select({
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
        campaignTitle: campaigns.title,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(campaigns, eq(orders.campaignId, campaigns.id))
      .orderBy(desc(orders.createdAt));

    return result.map((row) => ({
      ...row,
      username: row.username || "Unknown",
      campaignTitle: row.campaignTitle || "Unknown",
    }));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async updateOrderShipping(
    orderId: string,
    data: { shippingStatus?: string; trackingNumber?: string; shippingAddress?: string }
  ): Promise<Order | undefined> {
    const updateData: any = {};
    if (data.shippingStatus) updateData.shippingStatus = data.shippingStatus;
    if (data.trackingNumber !== undefined) updateData.trackingNumber = data.trackingNumber;
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;

    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();
    return updated || undefined;
  }

  async updateOrderPayment(
    orderId: string,
    data: { paymentStatus: string; receiptUrl?: string; rejectionReason?: string }
  ): Promise<Order | undefined> {
    const updateData: any = { paymentStatus: data.paymentStatus };
    if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl;
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();
    return updated || undefined;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods).orderBy(desc(paymentMethods.createdAt));
  }

  async getEnabledPaymentMethods(): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods).where(eq(paymentMethods.enabled, true)).orderBy(desc(paymentMethods.createdAt));
  }

  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const [created] = await db.insert(paymentMethods).values(data).returning();
    return created;
  }

  async updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const [updated] = await db
      .update(paymentMethods)
      .set(data)
      .where(eq(paymentMethods.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .returning();
    return !!deleted;
  }

  async getCoupons(): Promise<Coupon[]> {
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async createCoupon(data: InsertCoupon): Promise<Coupon> {
    const [created] = await db.insert(coupons).values(data).returning();
    return created;
  }

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined> {
    const [updated] = await db
      .update(coupons)
      .set(data)
      .where(eq(coupons.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(coupons)
      .where(eq(coupons.id, id))
      .returning();
    return !!deleted;
  }

  async validateCoupon(code: string): Promise<Coupon> {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()));

    if (!coupon) throw new Error("Invalid coupon code");
    if (!coupon.enabled) throw new Error("This coupon is no longer active");
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new Error("This coupon has expired");
    }
    if (coupon.usedCount >= coupon.maxUses) {
      throw new Error("This coupon has reached its maximum usage limit");
    }

    return coupon;
  }

  async getActivityLog(limit: number = 50): Promise<ActivityLogEntry[]> {
    return db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async logActivity(
    type: string,
    title: string,
    description?: string,
    userId?: string,
    metadata?: string
  ): Promise<ActivityLogEntry> {
    const [entry] = await db
      .insert(activityLog)
      .values({ type, title, description, userId, metadata })
      .returning();
    return entry;
  }

  async getAdminDashboardStats(): Promise<{
    totalRevenue: string;
    totalOrders: number;
    totalUsers: number;
    activeCampaigns: number;
    ordersToday: number;
    newUsersThisWeek: number;
    conversionRate: string;
    averageOrderValue: string;
    topCampaigns: { title: string; soldQuantity: number }[];
  }> {
    const [revenueResult] = await db
      .select({ total: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.status, "paid"));

    const [ordersResult] = await db
      .select({ total: count() })
      .from(orders);

    const [usersResult] = await db
      .select({ total: count() })
      .from(users);

    const [activeCampaignsResult] = await db
      .select({ total: count() })
      .from(campaigns)
      .where(eq(campaigns.status, "active"));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [ordersTodayResult] = await db
      .select({ total: count() })
      .from(orders)
      .where(gte(orders.createdAt, today));

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [newUsersResult] = await db
      .select({ total: count() })
      .from(users)
      .where(gte(users.createdAt, weekAgo));

    const topCampaigns = await db
      .select({ title: campaigns.title, soldQuantity: campaigns.soldQuantity })
      .from(campaigns)
      .orderBy(desc(campaigns.soldQuantity))
      .limit(5);

    const totalOrdersCount = ordersResult?.total || 0;
    const totalUsersCount = usersResult?.total || 0;
    const totalRevenueNum = parseFloat(revenueResult?.total || "0");

    const conversionRate = totalUsersCount > 0
      ? ((totalOrdersCount / totalUsersCount) * 100).toFixed(1)
      : "0.0";

    const averageOrderValue = totalOrdersCount > 0
      ? (totalRevenueNum / totalOrdersCount).toFixed(2)
      : "0.00";

    return {
      totalRevenue: revenueResult?.total || "0.00",
      totalOrders: totalOrdersCount,
      totalUsers: totalUsersCount,
      activeCampaigns: activeCampaignsResult?.total || 0,
      ordersToday: ordersTodayResult?.total || 0,
      newUsersThisWeek: newUsersResult?.total || 0,
      conversionRate,
      averageOrderValue,
      topCampaigns,
    };
  }

  async updateUserProfile(userId: string, data: { fullName: string; phone: string; address: string; city: string; country: string }): Promise<User | undefined> {
    const [user] = await db.update(users).set({
      fullName: data.fullName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
    }).where(eq(users.id, userId)).returning();
    return user || undefined;
  }

  async getReviewsByCampaign(campaignId: string): Promise<(Review & { username: string })[]> {
    const result = await db.select({
      id: reviews.id,
      userId: reviews.userId,
      campaignId: reviews.campaignId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      username: users.username,
    }).from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.campaignId, campaignId))
      .orderBy(desc(reviews.createdAt));
    return result;
  }

  async createReview(userId: string, data: { campaignId: string; rating: number; comment?: string }): Promise<Review> {
    const [review] = await db.insert(reviews).values({
      userId,
      campaignId: data.campaignId,
      rating: data.rating,
      comment: data.comment || null,
    }).returning();
    return review;
  }

  async getUserReviewForCampaign(userId: string, campaignId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.campaignId, campaignId)));
    return review || undefined;
  }

  async getAdminNotifications(limit: number = 50): Promise<AdminNotification[]> {
    return db.select().from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit);
  }

  async createAdminNotification(type: string, title: string, message: string, metadata?: string): Promise<AdminNotification> {
    const [notification] = await db.insert(adminNotifications).values({
      type,
      title,
      message,
      metadata: metadata || null,
    }).returning();
    return notification;
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const [result] = await db.update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.id, id))
      .returning();
    return !!result;
  }

  async markAllNotificationsRead(): Promise<boolean> {
    await db.update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.isRead, false));
    return true;
  }

  async getUnreadNotificationCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));
    return result?.count || 0;
  }

  async generateReferralCode(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code: string;
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

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code.toUpperCase()));
    return user || undefined;
  }

  async setUserReferralCode(userId: string, code: string): Promise<void> {
    await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
  }

  async setUserReferredBy(userId: string, referrerId: string): Promise<void> {
    await db.update(users).set({ referredBy: referrerId }).where(eq(users.id, userId));
  }

  async getReferralCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users).where(eq(users.referredBy, userId));
    return result?.count || 0;
  }

  async getReferredUsers(userId: string): Promise<{ username: string; createdAt: Date }[]> {
    const result = await db.select({
      username: users.username,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.referredBy, userId)).orderBy(desc(users.createdAt));
    return result;
  }

  async ensureAllUsersHaveReferralCodes(): Promise<number> {
    const usersWithoutCodes = await db.select({ id: users.id }).from(users).where(sql`${users.referralCode} IS NULL`);
    let updated = 0;
    for (const u of usersWithoutCodes) {
      const code = await this.generateReferralCode();
      await this.setUserReferralCode(u.id, code);
      updated++;
    }
    return updated;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createPasswordResetToken(userId: string, code: string, expiresAt: Date): Promise<any> {
    const [token] = await db.insert(passwordResetTokens).values({
      userId,
      code,
      expiresAt,
    }).returning();
    return token;
  }

  async verifyPasswordResetToken(userId: string, code: string): Promise<any> {
    const [token] = await db.select().from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          eq(passwordResetTokens.code, code),
          eq(passwordResetTokens.used, false),
          gte(passwordResetTokens.expiresAt, new Date())
        )
      )
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);
    return token || null;
  }

  async markResetTokenUsed(tokenId: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async updateUserEmail(userId: string, email: string): Promise<void> {
    await db.update(users)
      .set({ email })
      .where(eq(users.id, userId));
  }

  async createUserNotification(userId: string, type: string, title: string, body: string, campaignId?: string, metadata?: string): Promise<UserNotification> {
    const [notification] = await db.insert(userNotifications).values({
      userId,
      type,
      title,
      body,
      campaignId: campaignId || null,
      metadata: metadata || null,
    }).returning();
    return notification;
  }

  async createBulkUserNotifications(userIds: string[], type: string, title: string, body: string, campaignId?: string, metadata?: string): Promise<void> {
    if (userIds.length === 0) return;
    const values = userIds.map((userId) => ({
      userId,
      type,
      title,
      body,
      campaignId: campaignId || null,
      metadata: metadata || null,
    }));
    await db.insert(userNotifications).values(values);
  }

  async getUserNotifications(userId: string, limit = 50): Promise<UserNotification[]> {
    return db.select().from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(limit);
  }

  async markUserNotificationRead(id: string, userId: string): Promise<boolean> {
    const [result] = await db.update(userNotifications)
      .set({ isRead: true })
      .where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)))
      .returning();
    return !!result;
  }

  async markAllUserNotificationsRead(userId: string): Promise<boolean> {
    await db.update(userNotifications)
      .set({ isRead: true })
      .where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
    return true;
  }

  async getUnreadUserNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(userNotifications)
      .where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
    return result?.count || 0;
  }

  async updateUserPushToken(userId: string, pushToken: string | null): Promise<void> {
    if (pushToken) {
      await db.update(users).set({ pushToken: null }).where(eq(users.pushToken, pushToken));
    }
    await db.update(users).set({ pushToken }).where(eq(users.id, userId));
  }

  async getUserPushTokensByIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const result = await db.select({ pushToken: users.pushToken })
      .from(users)
      .where(inArray(users.id, userIds));
    return result.map(r => r.pushToken).filter((t): t is string => !!t);
  }

  async getUserApnTokensByIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const result = await db.select({ apnToken: users.apnToken })
      .from(users)
      .where(inArray(users.id, userIds));
    return result.map(r => r.apnToken).filter((t): t is string => !!t && t.length > 20);
  }

  async updateUserDeviceTokens(userId: string, tokens: { fcmToken?: string | null; apnToken?: string | null }): Promise<void> {
    const update: Record<string, any> = {};
    if (tokens.fcmToken !== undefined) update.fcmToken = tokens.fcmToken;
    if (tokens.apnToken !== undefined) update.apnToken = tokens.apnToken;
    if (Object.keys(update).length === 0) return;
    await db.update(users).set(update).where(eq(users.id, userId));
  }

  async getAllUsersWithFcmTokens(): Promise<{ id: string; fcmToken: string | null; apnToken: string | null }[]> {
    const result = await db.select({ id: users.id, fcmToken: users.fcmToken, apnToken: users.apnToken })
      .from(users)
      .where(eq(users.isSuspended, false));
    return result;
  }

  async getWalletBalance(userId: string): Promise<number> {
    const [u] = await db.select({ walletBalance: users.walletBalance }).from(users).where(eq(users.id, userId));
    return parseFloat(u?.walletBalance || "0");
  }

  async addWalletCredit(userId: string, amount: number, type: string, description: string, referenceId?: string): Promise<void> {
    await db.update(users)
      .set({ walletBalance: sql`wallet_balance + ${amount}` })
      .where(eq(users.id, userId));
    await db.insert(walletTransactions).values({ userId, amount: String(amount), type, description, referenceId });
  }

  async deductWalletBalance(userId: string, amount: number, description: string, referenceId?: string): Promise<boolean> {
    const balance = await this.getWalletBalance(userId);
    if (balance < amount) return false;
    await db.update(users)
      .set({ walletBalance: sql`wallet_balance - ${amount}` })
      .where(eq(users.id, userId));
    await db.insert(walletTransactions).values({ userId, amount: String(-amount), type: "debit", description, referenceId });
    return true;
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    return db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50);
  }

  async createEmailVerificationToken(userId: string, code: string, expiresAt: Date): Promise<any> {
    const [token] = await db.insert(emailVerificationTokens).values({
      userId,
      code,
      expiresAt,
    }).returning();
    return token;
  }

  async verifyEmailToken(userId: string, code: string): Promise<any> {
    const [token] = await db.select().from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          eq(emailVerificationTokens.code, code),
          eq(emailVerificationTokens.used, false),
          gte(emailVerificationTokens.expiresAt, new Date())
        )
      )
      .orderBy(desc(emailVerificationTokens.createdAt))
      .limit(1);
    return token || null;
  }

  async markEmailTokenUsed(tokenId: string): Promise<void> {
    await db.update(emailVerificationTokens)
      .set({ used: true })
      .where(eq(emailVerificationTokens.id, tokenId));
  }

  async setEmailVerified(userId: string): Promise<void> {
    await db.update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));
  }

  async getRecentPurchases(limit: number = 5): Promise<{ campaignTitle: string; minutesAgo: number }[]> {
    const recentOrders = await db
      .select({
        campaignTitle: campaigns.title,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(campaigns, eq(orders.campaignId, campaigns.id))
      .where(eq(orders.paymentStatus, "confirmed"))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return recentOrders.map((o) => {
      const minutesAgo = Math.max(1, Math.floor((Date.now() - new Date(o.createdAt!).getTime()) / 60000));
      return { campaignTitle: o.campaignTitle, minutesAgo };
    });
  }

  async deleteUser(userId: string): Promise<boolean> {
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

  async createSupportTicket(userId: string, data: { subject: string; message: string; priority: string }): Promise<SupportTicket> {
    const [ticket] = await db.insert(supportTickets).values({
      userId,
      subject: data.subject,
      message: data.message,
      priority: data.priority,
    }).returning();
    return ticket;
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    return db.select().from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicketById(ticketId: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets)
      .where(eq(supportTickets.id, ticketId));
    return ticket;
  }

  async getAllSupportTickets(): Promise<(SupportTicket & { username: string; email: string })[]> {
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
      email: users.email,
    })
    .from(supportTickets)
    .innerJoin(users, eq(supportTickets.userId, users.id))
    .orderBy(desc(supportTickets.createdAt));
    return result as any;
  }

  async updateSupportTicket(ticketId: string, data: { status?: string; adminReply?: string }): Promise<SupportTicket | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.status) updateData.status = data.status;
    if (data.adminReply !== undefined) {
      updateData.adminReply = data.adminReply;
      updateData.repliedAt = new Date();
    }
    if (data.status === "closed") updateData.closedAt = new Date();
    const [ticket] = await db.update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return ticket;
  }
}

export const storage = new DatabaseStorage();
