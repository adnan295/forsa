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
  users,
  campaigns,
  orders,
  tickets,
  paymentMethods,
  coupons,
  activityLog,
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
  }): Promise<Order>;
  getOrdersByUser(userId: string): Promise<Order[]>;
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
    paymentMethod: string
  ): Promise<{ order: Order; tickets: Ticket[] }>;

  drawWinner(campaignId: string): Promise<{ winner: User; ticket: Ticket } | null>;

  getAllUsers(): Promise<User[]>;
  getUserStats(userId: string): Promise<{ orderCount: number; ticketCount: number; totalSpent: string }>;
  getAllOrders(): Promise<(Order & { username: string; campaignTitle: string })[]>;
  updateOrderShipping(orderId: string, data: { shippingStatus?: string; trackingNumber?: string; shippingAddress?: string }): Promise<Order | undefined>;

  getPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<boolean>;

  getCoupons(): Promise<Coupon[]>;
  createCoupon(data: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<boolean>;

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
    paymentMethod: string
  ): Promise<{ order: Order; tickets: Ticket[] }> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "active") throw new Error("Campaign is not active");

    const remaining = campaign.totalQuantity - campaign.soldQuantity;
    if (quantity > remaining)
      throw new Error(`Only ${remaining} items remaining`);

    const totalAmount = (parseFloat(campaign.productPrice) * quantity).toFixed(2);

    const order = await this.createOrder({
      userId,
      campaignId,
      quantity,
      totalAmount,
      paymentMethod,
      status: "paid",
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
        shippingStatus: orders.shippingStatus,
        shippingAddress: orders.shippingAddress,
        trackingNumber: orders.trackingNumber,
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

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods).orderBy(desc(paymentMethods.createdAt));
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
}

export const storage = new DatabaseStorage();
