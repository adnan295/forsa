import {
  type User,
  type InsertUser,
  type Campaign,
  type InsertCampaign,
  type Order,
  type Ticket,
  users,
  campaigns,
  orders,
  tickets,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | undefined>;

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
}

export const storage = new DatabaseStorage();
