import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertCampaignSchema } from "@shared/schema";
import bcrypt from "bcryptjs";

const PgSession = connectPgSimple(session);

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "luckydraw-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
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
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
      });

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "Username or email already taken" });
      }
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const user = await storage.getUserByUsername(parsed.data.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(parsed.data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
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
    });
  });

  app.get("/api/campaigns", async (_req: Request, res: Response) => {
    try {
      const allCampaigns = await storage.getCampaigns();
      res.json(allCampaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Get campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/campaigns", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const parsed = insertCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }
      const campaign = await storage.createCampaign(parsed.data);
      res.json(campaign);
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/campaigns/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/purchase", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const { campaignId, quantity = 1, paymentMethod = "card" } = req.body;
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID required" });
      }

      const result = await storage.purchaseProduct(
        req.session.userId!,
        campaignId,
        quantity,
        paymentMethod
      );

      res.json({
        order: result.order,
        tickets: result.tickets,
        message: `Purchase successful! You received ${result.tickets.length} ticket(s).`,
      });
    } catch (error: any) {
      console.error("Purchase error:", error);
      res.status(400).json({ message: error.message || "Purchase failed" });
    }
  });

  app.get("/api/tickets", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const userTickets = await storage.getTicketsByUser(req.session.userId!);
      res.json(userTickets);
    } catch (error) {
      console.error("Get tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/tickets/campaign/:campaignId", async (req: Request, res: Response) => {
    try {
      const campaignTickets = await storage.getTicketsByCampaign(req.params.campaignId);
      res.json(campaignTickets);
    } catch (error) {
      console.error("Get campaign tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/orders", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const userOrders = await storage.getOrdersByUser(req.session.userId!);
      res.json(userOrders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/draw/:campaignId", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const result = await storage.drawWinner(req.params.campaignId);
      if (!result) {
        return res.status(400).json({ message: "No tickets found for this campaign" });
      }
      res.json({
        winner: {
          id: result.winner.id,
          username: result.winner.username,
        },
        ticket: result.ticket,
        message: `Winner drawn! ${result.winner.username} with ticket ${result.ticket.ticketNumber}`,
      });
    } catch (error: any) {
      console.error("Draw error:", error);
      res.status(400).json({ message: error.message || "Draw failed" });
    }
  });

  app.get("/api/admin/stats", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const allCampaigns = await storage.getCampaigns();
      const totalCampaigns = allCampaigns.length;
      const activeCampaigns = allCampaigns.filter((c) => c.status === "active").length;
      const completedCampaigns = allCampaigns.filter((c) => c.status === "completed").length;
      const totalRevenue = allCampaigns.reduce((sum, c) => {
        return sum + parseFloat(c.productPrice) * c.soldQuantity;
      }, 0);

      res.json({
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalRevenue: totalRevenue.toFixed(2),
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
