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
  users,
  campaigns,
  orders,
  tickets,
  paymentMethods,
  coupons,
  activityLog,
  reviews,
  adminNotifications,
  passwordResetTokens,
  insertReviewSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, sum, gte } from "drizzle-orm";
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

  getUserByEmail(email: string): Promise<User | undefined>;
  createPasswordResetToken(userId: string, code: string, expiresAt: Date): Promise<any>;
  verifyPasswordResetToken(userId: string, code: string): Promise<any>;
  markResetTokenUsed(tokenId: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
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

  async createOrder(data: {
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
  }): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values({
        userId: data.userId,
        campaignId: data.campaignId,
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
  }): Promise<Ticket> {
    const ticketNumber = generateTicketNumber();
    const [ticket] = await db
      .insert(tickets)
      .values({
        ticketNumber,
        userId: data.userId,
        campaignId: data.campaignId,
        orderId: data.orderId,
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
    couponCode?: string
  ): Promise<{ order: Order; tickets: Ticket[] }> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "active") throw new Error("Campaign is not active");

    const remaining = campaign.totalQuantity - campaign.soldQuantity;
    if (quantity > remaining)
      throw new Error(`Only ${remaining} items remaining`);

    let totalAmount = parseFloat(campaign.productPrice) * quantity;
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
      });
      createdTickets.push(ticket);
    }

    const newSoldQty = campaign.soldQuantity + quantity;
    const updateData: Partial<Campaign> = { soldQuantity: newSoldQty };

    if (newSoldQty >= campaign.totalQuantity) {
      updateData.status = "sold_out";
    }

    await this.updateCampaign(campaignId, updateData);

    return { order, tickets: createdTickets };
  }

  async drawWinner(
    campaignId: string
  ): Promise<{ winner: User; ticket: Ticket } | null> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "sold_out" && campaign.status !== "drawing")
      throw new Error("Campaign must be sold out before drawing");

    await this.updateCampaign(campaignId, { status: "drawing" });

    const campaignTickets = await this.getTicketsByCampaign(campaignId);
    if (campaignTickets.length === 0) return null;

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

    return {
      totalRevenue: revenueResult?.total || "0.00",
      totalOrders: ordersResult?.total || 0,
      totalUsers: usersResult?.total || 0,
      activeCampaigns: activeCampaignsResult?.total || 0,
      ordersToday: ordersTodayResult?.total || 0,
      newUsersThisWeek: newUsersResult?.total || 0,
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
}

export const storage = new DatabaseStorage();
