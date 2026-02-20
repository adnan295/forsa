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

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("user"),
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
  status: campaignStatusEnum("status").notNull().default("active"),
  winnerId: varchar("winner_id"),
  winnerTicketId: varchar("winner_ticket_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  drawAt: timestamp("draw_at"),
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
  quantity: integer("quantity").notNull().default(1),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
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

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  tickets: many(tickets),
}));

export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  orders: many(orders),
  tickets: many(tickets),
  winner: one(users, {
    fields: [campaigns.winnerId],
    references: [users.id],
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
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Order = typeof orders.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
