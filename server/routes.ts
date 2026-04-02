import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { pool, db } from "./db";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertCampaignSchema, insertPaymentMethodSchema, insertCouponSchema, updateProfileSchema, insertReviewSchema, insertSupportTicketSchema, reviews, orders } from "@shared/schema";
import { sum, count, and, gte, sql } from "drizzle-orm";
import { sendOrderConfirmation, sendPaymentStatusUpdate, sendWinnerNotification, sendPasswordResetCode, sendShippingUpdate, sendEmailVerificationCode } from "./email";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import { mkdirSync } from "fs";

mkdirSync("uploads/receipts", { recursive: true });
mkdirSync("uploads/campaigns", { recursive: true });

async function sendPushNotifications(userIds: string[], title: string, body: string, data?: Record<string, string>) {
  try {
    const rawTokens = await storage.getUserPushTokensByIds(userIds);
    const tokens = [...new Set(rawTokens)];
    if (tokens.length === 0) return;

    const messages = tokens.map(token => ({
      to: token,
      sound: "default" as const,
      title,
      body,
      data: data || {},
    }));

    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      }).catch(() => {});
    }
  } catch (e) {
    console.error("Push notification error:", e);
  }
}

const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/receipts/");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadReceipt = multer({
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
  },
});

const campaignStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/campaigns/");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadCampaignImage = multer({
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
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

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
      secret: process.env.SESSION_SECRET || "forsa-secret-key",
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

  app.use("/api/", apiLimiter);

  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
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
        referralCode,
      } as any);

      const { referralCode: appliedCode } = req.body;
      if (appliedCode) {
        const referrer = await storage.getUserByReferralCode(appliedCode);
        if (referrer && referrer.id !== user.id) {
          await storage.setUserReferredBy(user.id, referrer.id);
          await storage.addWalletCredit(referrer.id, 10, "referral_reward", `مكافأة إحالة: انضم ${user.username} باستخدام رمزك`, user.id);
          await storage.createUserNotification(referrer.id, "referral_reward", "مكافأة إحالة 🎉", `انضم ${user.username} باستخدام رمز إحالتك! تمت إضافة 10 ريال إلى محفظتك`);
          sendPushNotifications([referrer.id], "مكافأة إحالة 🎉", `انضم ${user.username} باستخدام رمزك! +10 ريال في محفظتك`);
          await storage.addWalletCredit(user.id, 5, "welcome_bonus", "مكافأة ترحيبية للمنضمين عبر رمز إحالة", referrer.id);
        }
      }

      await storage.logActivity("user_register", "New user registered", `User ${user.username} registered`, user.id);

      const otpCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await storage.createEmailVerificationToken(user.id, otpCode, expiresAt);
      const emailSent = await sendEmailVerificationCode(user.email, { code: otpCode, username: user.username });

      const response: any = {
        requiresVerification: true,
        email: user.email,
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
      };
      if (!emailSent) {
        response.verificationCode = otpCode;
        response.emailFallback = true;
        response.message = "تعذر إرسال البريد الإلكتروني. استخدم الرمز الظاهر على الشاشة";
      }
      res.json(response);
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل" });
      }
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/verify-email", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "البريد الإلكتروني والرمز مطلوبان" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }

      const token = await storage.verifyEmailToken(user.id, code);
      if (!token) {
        return res.status(400).json({ message: "الرمز غير صحيح أو منتهي الصلاحية" });
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
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/resend-verification", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "تم إرسال الرمز إذا كان البريد مسجلاً" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "البريد الإلكتروني مفعّل بالفعل" });
      }

      const otpCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await storage.createEmailVerificationToken(user.id, otpCode, expiresAt);
      const emailSent = await sendEmailVerificationCode(user.email, { code: otpCode, username: user.username });

      const response: any = { message: "تم إرسال رمز تحقق جديد" };
      if (!emailSent) {
        response.verificationCode = otpCode;
        response.emailFallback = true;
        response.message = "تعذر إرسال البريد الإلكتروني. استخدم الرمز الظاهر على الشاشة";
      }
      res.json(response);
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
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
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      const valid = await bcrypt.compare(parsed.data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
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
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    if (req.session?.userId) {
      await storage.updateUserPushToken(req.session.userId, null).catch(() => {});
    }
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "إذا كان البريد مسجلاً، سيتم إرسال رمز إعادة التعيين" });
      }

      const code = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await storage.createPasswordResetToken(user.id, code, expiresAt);

      const emailSent = await sendPasswordResetCode(user.email, { code, username: user.username });

      if (!emailSent) {
        res.json({ message: "تعذّر إرسال البريد الإلكتروني، استخدم الرمز المعروض", code, emailFailed: true });
      } else {
        res.json({ message: "إذا كان البريد مسجلاً، سيتم إرسال رمز إعادة التعيين" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "جميع الحقول مطلوبة" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }

      const token = await storage.verifyPasswordResetToken(user.id, code);
      if (!token) {
        return res.status(400).json({ message: "الرمز غير صحيح أو منتهي الصلاحية" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.markResetTokenUsed(token.id);

      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Server error" });
    }
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
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      city: user.city,
      country: user.country,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  });

  app.put("/api/auth/push-token", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const { pushToken } = req.body;
      if (!pushToken || typeof pushToken !== "string") {
        return res.status(400).json({ message: "pushToken is required" });
      }
      await storage.updateUserPushToken(req.session.userId!, pushToken);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/stats", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const userOrders = await storage.getOrdersByUser(userId);
      const userTickets = await storage.getTicketsByUser(userId);
      const totalSpent = userOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
      const confirmedOrders = userOrders.filter(o => o.paymentStatus === "confirmed").length;
      const winningTickets = userTickets.filter(t => t.isWinner).length;
      res.json({
        totalOrders: userOrders.length,
        confirmedOrders,
        totalTickets: userTickets.length,
        winningTickets,
        totalSpent: totalSpent.toFixed(2),
      });
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/campaigns", async (_req: Request, res: Response) => {
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

  app.get("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id as string);
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

  app.post("/api/campaigns", requireAdmin as any, async (req: Request, res: Response) => {
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
            sortOrder: i,
          });
        }
        await storage.syncCampaignAggregates(campaign.id);
      }

      try {
        const allUsers = await storage.getAllUsers();
        const userIds = allUsers.filter(u => u.role !== "admin").map(u => u.id);
        if (userIds.length > 0) {
          await storage.createBulkUserNotifications(
            userIds,
            "new_campaign",
            "منتج جديد 🎉",
            `تم إضافة منتج جديد: ${campaign.title}`,
            campaign.id
          );
          sendPushNotifications(userIds, "منتج جديد 🎉", `تم إضافة منتج جديد: ${campaign.title}`, { campaignId: campaign.id });
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

  app.put("/api/campaigns/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id as string, req.body);
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

  app.post("/api/admin/campaigns/:id/products", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id as string;
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
        sortOrder: sortOrder || 0,
      });
      await storage.syncCampaignAggregates(campaignId);
      res.json(product);
    } catch (error) {
      console.error("Add product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/campaign-products/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const { price, quantity, ...rest } = req.body;
      const updateData: any = { ...rest };
      if (price !== undefined) {
        const prc = parseFloat(price);
        if (isNaN(prc) || prc <= 0) return res.status(400).json({ message: "Invalid price" });
        updateData.price = prc.toFixed(2);
      }
      if (quantity !== undefined) {
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) return res.status(400).json({ message: "Invalid quantity" });
        updateData.quantity = qty;
      }
      const product = await storage.updateCampaignProduct(req.params.id as string, updateData);
      if (!product) return res.status(404).json({ message: "Product not found" });
      await storage.syncCampaignAggregates(product.campaignId);
      res.json(product);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/admin/campaign-products/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const product = await storage.getCampaignProduct(req.params.id as string);
      if (!product) return res.status(404).json({ message: "Product not found" });
      const deleted = await storage.deleteCampaignProduct(req.params.id as string);
      if (deleted) {
        await storage.syncCampaignAggregates(product.campaignId);
      }
      res.json({ success: deleted });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/payment-methods", async (_req: Request, res: Response) => {
    try {
      const methods = await storage.getEnabledPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/validate-coupon", async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Coupon code is required" });
      }
      const coupon = await storage.validateCoupon(code);
      res.json({
        valid: true,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
      });
    } catch (error: any) {
      res.status(400).json({ valid: false, message: error.message || "Invalid coupon" });
    }
  });

  app.post("/api/purchase", requireAuth as any, async (req: Request, res: Response) => {
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
        walletAmount = 0,
      } = req.body;
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID required" });
      }

      const shippingData = shippingFullName
        ? {
            fullName: shippingFullName,
            phone: shippingPhone || "",
            city: shippingCity || "",
            address: shippingAddress || "",
            country: shippingCountry,
          }
        : undefined;

      const result = await storage.purchaseProduct(
        req.session.userId!,
        campaignId,
        quantity,
        paymentMethod,
        shippingData,
        couponCode,
        productId
      );

      if (useWallet && walletAmount > 0) {
        await storage.deductWalletBalance(
          req.session.userId!,
          walletAmount,
          `خصم محفظة - طلب ${result.order.id}`,
          result.order.id
        );
      }

      await storage.logActivity(
        "purchase",
        "New purchase",
        `User purchased ${result.tickets.length} ticket(s) for order ${result.order.id}`,
        req.session.userId!,
        JSON.stringify({ orderId: result.order.id, campaignId, quantity, paymentMethod })
      );

      await storage.createAdminNotification(
        "new_order",
        "طلب جديد",
        `طلب جديد من المستخدم بقيمة ${result.order.totalAmount}`,
        JSON.stringify({ orderId: result.order.id, userId: req.session.userId })
      );

      const buyer = await storage.getUser(req.session.userId!);
      const campaign = await storage.getCampaign(campaignId);
      if (buyer && campaign) {
        sendOrderConfirmation(buyer.email, {
          orderId: result.order.id,
          campaignTitle: campaign.title,
          quantity: result.tickets.length,
          totalAmount: result.order.totalAmount,
          ticketNumbers: result.tickets.map((t: any) => t.ticketNumber),
          paymentMethod: paymentMethod,
        });

        try {
          const remaining = campaign.totalQuantity - campaign.soldQuantity;
          const threshold = Math.ceil(campaign.totalQuantity * 0.1);
          if (remaining <= threshold && remaining > 0) {
            const campaignTickets = await storage.getTicketsByCampaign(campaignId);
            const participantIds = [...new Set(campaignTickets.map(t => t.userId))];
            if (participantIds.length > 0) {
              await storage.createBulkUserNotifications(
                participantIds,
                "low_stock",
                "الكمية قاربت على النفاد ⚡",
                `بقي ${remaining} قطعة فقط من ${campaign.title}! سارع بالشراء`,
                campaignId
              );
              sendPushNotifications(participantIds, "الكمية قاربت على النفاد ⚡", `بقي ${remaining} قطعة فقط من ${campaign.title}! سارع بالشراء`, { campaignId });
            }
          }
          if (remaining <= 0) {
            const campaignTickets = await storage.getTicketsByCampaign(campaignId);
            const participantIds = [...new Set(campaignTickets.map(t => t.userId))];
            if (participantIds.length > 0) {
              await storage.createBulkUserNotifications(
                participantIds,
                "sold_out",
                "نفدت الكمية! 🔥",
                `تم بيع كامل كمية ${campaign.title}! اختيار الفائز قريباً`,
                campaignId
              );
              sendPushNotifications(participantIds, "نفدت الكمية! 🔥", `تم بيع كامل كمية ${campaign.title}! اختيار الفائز قريباً`, { campaignId });
            }
          }
        } catch (e) {
          console.error("Notification error:", e);
        }
      }

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

  app.post("/api/cart-purchase", requireAuth as any, async (req: Request, res: Response) => {
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
        walletAmount = 0,
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Cart items required" });
      }

      const shippingData = shippingFullName
        ? {
            fullName: shippingFullName,
            phone: shippingPhone || "",
            city: shippingCity || "",
            address: shippingAddress || "",
            country: shippingCountry,
          }
        : undefined;

      const allOrders: any[] = [];
      const allTickets: any[] = [];

      for (const item of items) {
        const { campaignId, quantity, productId } = item;
        if (!campaignId || !quantity) continue;

        const result = await storage.purchaseProduct(
          req.session.userId!,
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
          req.session.userId!,
          JSON.stringify({ orderId: result.order.id, campaignId, quantity, paymentMethod })
        );

        await storage.createAdminNotification(
          "new_order",
          "طلب جديد",
          `طلب جديد من المستخدم بقيمة ${result.order.totalAmount}`,
          JSON.stringify({ orderId: result.order.id, userId: req.session.userId })
        );

        const buyer = await storage.getUser(req.session.userId!);
        const campaign = await storage.getCampaign(campaignId);
        if (buyer && campaign) {
          sendOrderConfirmation(buyer.email, {
            orderId: result.order.id,
            campaignTitle: campaign.title,
            quantity: result.tickets.length,
            totalAmount: result.order.totalAmount,
            ticketNumbers: result.tickets.map((t: any) => t.ticketNumber),
            paymentMethod: paymentMethod,
          });

          try {
            const remaining = campaign.totalQuantity - campaign.soldQuantity;
            const threshold = Math.ceil(campaign.totalQuantity * 0.1);
            if (remaining <= threshold && remaining > 0) {
              const cTickets = await storage.getTicketsByCampaign(campaignId);
              const pIds = [...new Set(cTickets.map(t => t.userId))];
              if (pIds.length > 0) {
                await storage.createBulkUserNotifications(pIds, "low_stock", "الكمية قاربت على النفاد ⚡", `بقي ${remaining} قطعة فقط من ${campaign.title}! سارع بالشراء`, campaignId);
                sendPushNotifications(pIds, "الكمية قاربت على النفاد ⚡", `بقي ${remaining} قطعة فقط من ${campaign.title}! سارع بالشراء`, { campaignId });
              }
            }
            if (remaining <= 0) {
              const cTickets = await storage.getTicketsByCampaign(campaignId);
              const pIds = [...new Set(cTickets.map(t => t.userId))];
              if (pIds.length > 0) {
                await storage.createBulkUserNotifications(pIds, "sold_out", "نفدت الكمية! 🔥", `تم بيع كامل كمية ${campaign.title}! اختيار الفائز قريباً`, campaignId);
                sendPushNotifications(pIds, "نفدت الكمية! 🔥", `تم بيع كامل كمية ${campaign.title}! اختيار الفائز قريباً`, { campaignId });
              }
            }
          } catch (e) {
            console.error("Notification error:", e);
          }
        }
      }

      if (useWallet && walletAmount > 0) {
        await storage.deductWalletBalance(
          req.session.userId!,
          walletAmount,
          `خصم محفظة - طلب سلة (${allOrders.length} طلب)`,
          allOrders[0]?.id
        );
      }

      res.json({
        orders: allOrders,
        tickets: allTickets,
        message: `Purchase successful! You received ${allTickets.length} ticket(s) across ${allOrders.length} order(s).`,
      });
    } catch (error: any) {
      console.error("Cart purchase error:", error);
      res.status(400).json({ message: error.message || "Cart purchase failed" });
    }
  });

  app.get("/api/user/wallet", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const balance = await storage.getWalletBalance(req.session.userId!);
      const transactions = await storage.getWalletTransactions(req.session.userId!);
      res.json({ balance, transactions });
    } catch (error) {
      console.error("Wallet error:", error);
      res.status(500).json({ message: "Server error" });
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
      const campaignTickets = await storage.getTicketsByCampaign(req.params.campaignId as string);
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

  app.get("/api/orders/:id", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id as string);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(order);
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/orders/:id/receipt", requireAuth as any, uploadReceipt.single("receipt"), async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id as string);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Receipt file is required" });
      }

      const receiptUrl = `/uploads/receipts/${req.file.filename}`;
      const updated = await storage.updateOrderPayment(order.id, {
        paymentStatus: "pending_review",
        receiptUrl,
      });

      await storage.logActivity(
        "receipt_upload",
        "Receipt uploaded",
        `User uploaded receipt for order ${order.id}`,
        req.session.userId!,
        JSON.stringify({ orderId: order.id, receiptUrl })
      );

      await storage.createAdminNotification(
        "receipt_uploaded",
        "إيصال جديد",
        `تم رفع إيصال للطلب ${order.id}`,
        JSON.stringify({ orderId: order.id, userId: req.session.userId })
      );

      res.json(updated);
    } catch (error: any) {
      console.error("Upload receipt error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  app.post("/api/admin/draw/:campaignId", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const result = await storage.drawWinner(req.params.campaignId as string);
      if (!result) {
        return res.status(400).json({ message: "No tickets found for this campaign" });
      }

      await storage.logActivity(
        "draw",
        "Winner drawn",
        `Winner ${result.winner.username} drawn for campaign with ticket ${result.ticket.ticketNumber}`,
        req.session.userId!,
        JSON.stringify({ campaignId: req.params.campaignId, winnerId: result.winner.id, ticketNumber: result.ticket.ticketNumber })
      );

      const drawnCampaign = await storage.getCampaign(req.params.campaignId as string);
      if (drawnCampaign) {
        sendWinnerNotification(result.winner.email, {
          campaignTitle: drawnCampaign.title,
          prizeName: drawnCampaign.prizeName,
          ticketNumber: result.ticket.ticketNumber,
        });

        try {
          await storage.createUserNotification(
            result.winner.id,
            "you_won",
            "مبروك أنت الفائز! 🏆🎉",
            `لقد فزت بجائزة ${drawnCampaign.prizeName} في حملة ${drawnCampaign.title} بالتذكرة ${result.ticket.ticketNumber}!`,
            req.params.campaignId as string
          );
          sendPushNotifications([result.winner.id], "مبروك أنت الفائز! 🏆🎉", `لقد فزت بجائزة ${drawnCampaign.prizeName} في حملة ${drawnCampaign.title}!`, { campaignId: req.params.campaignId as string });

          const campaignTickets = await storage.getTicketsByCampaign(req.params.campaignId as string);
          const participantIds = [...new Set(campaignTickets.map(t => t.userId))].filter(id => id !== result.winner.id);
          if (participantIds.length > 0) {
            await storage.createBulkUserNotifications(
              participantIds,
              "draw_completed",
              "تم اختيار الفائز 🎁",
              `تم اختيار الفائز بالهدية في حملة ${drawnCampaign.title}! حظاً أوفر في المرة القادمة`,
              req.params.campaignId as string
            );
            sendPushNotifications(participantIds, "تم اختيار الفائز 🎁", `تم اختيار الفائز بالهدية في حملة ${drawnCampaign.title}! حظاً أوفر في المرة القادمة`, { campaignId: req.params.campaignId as string });
          }

          const allUsers = await storage.getAllUsers();
          const nonParticipantIds = allUsers
            .filter(u => u.role !== "admin" && u.id !== result.winner.id && !participantIds.includes(u.id))
            .map(u => u.id);
          if (nonParticipantIds.length > 0) {
            await storage.createBulkUserNotifications(
              nonParticipantIds,
              "winner_announced",
              "فائز جديد! 🎊",
              `تم اختيار الفائز في حملة ${drawnCampaign.title}!`,
              req.params.campaignId as string
            );
            sendPushNotifications(nonParticipantIds, "فائز جديد! 🎊", `تم اختيار الفائز في حملة ${drawnCampaign.title}!`, { campaignId: req.params.campaignId as string });
          }
        } catch (e) {
          console.error("Notification error:", e);
        }
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

  app.get("/api/admin/dashboard", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/orders", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      res.json(allOrders);
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/orders/:id/shipping", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const { shippingStatus, trackingNumber, shippingAddress } = req.body;
      const updated = await storage.updateOrderShipping(req.params.id as string, {
        shippingStatus,
        trackingNumber,
        shippingAddress,
      });
      if (!updated) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (shippingStatus && ["processing", "shipped", "delivered"].includes(shippingStatus)) {
        const shippingOrder = await storage.getOrder(req.params.id as string);
        if (shippingOrder) {
          const shippingUser = await storage.getUser(shippingOrder.userId);
          const shippingCampaign = await storage.getCampaign(shippingOrder.campaignId);
          if (shippingUser && shippingCampaign) {
            sendShippingUpdate(shippingUser.email, {
              orderId: shippingOrder.id,
              campaignTitle: shippingCampaign.title,
              status: shippingStatus,
              trackingNumber,
            });
            const statusText = shippingStatus === "processing" ? "جاري التجهيز" : shippingStatus === "shipped" ? "تم الشحن" : "تم التوصيل";
            await storage.createUserNotification(
              shippingOrder.userId,
              "shipping_update",
              `تحديث الشحن: ${statusText} 📦`,
              `طلبك من ${shippingCampaign.title} — ${statusText}`,
              shippingOrder.campaignId
            );
            sendPushNotifications([shippingOrder.userId], `تحديث الشحن: ${statusText} 📦`, `طلبك من ${shippingCampaign.title} — ${statusText}`, { orderId: shippingOrder.id });
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Update shipping error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/orders/:id/payment", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const { paymentStatus, rejectionReason } = req.body;
      if (!paymentStatus || !["confirmed", "rejected"].includes(paymentStatus)) {
        return res.status(400).json({ message: "Invalid payment status. Must be 'confirmed' or 'rejected'" });
      }

      const order = await storage.getOrder(req.params.id as string);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (paymentStatus === "confirmed") {
        await storage.updateOrder(order.id, { status: "paid" as any });
        await storage.updateOrderPayment(order.id, { paymentStatus: "confirmed" });

        await storage.logActivity(
          "payment_confirmed",
          "Payment confirmed",
          `Admin confirmed payment for order ${order.id}`,
          req.session.userId!,
          JSON.stringify({ orderId: order.id })
        );
      } else {
        await storage.updateOrderPayment(order.id, {
          paymentStatus: "rejected",
          rejectionReason: rejectionReason || "",
        });

        await storage.logActivity(
          "payment_rejected",
          "Payment rejected",
          `Admin rejected payment for order ${order.id}: ${rejectionReason || "No reason provided"}`,
          req.session.userId!,
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
          rejectionReason,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update payment error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/users", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          const stats = await storage.getUserStats(user.id);
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            ...stats,
          };
        })
      );
      res.json(usersWithStats);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/verify-user/:userId", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId as string);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.emailVerified) {
        return res.status(400).json({ message: "البريد مفعّل بالفعل" });
      }
      await storage.setEmailVerified(userId as string);
      res.json({ message: "تم تفعيل البريد الإلكتروني بنجاح" });
    } catch (error) {
      console.error("Admin verify user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/admin/campaigns/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCampaign(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json({ message: "Campaign deleted" });
    } catch (error: any) {
      console.error("Delete campaign error:", error);
      res.status(400).json({ message: error.message || "Failed to delete campaign" });
    }
  });

  app.get("/api/admin/payment-methods", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/payment-methods", requireAdmin as any, async (req: Request, res: Response) => {
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

  app.put("/api/admin/payment-methods/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const updated = await storage.updatePaymentMethod(req.params.id as string, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update payment method error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/admin/payment-methods/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deletePaymentMethod(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json({ message: "Payment method deleted" });
    } catch (error) {
      console.error("Delete payment method error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/coupons", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const allCoupons = await storage.getCoupons();
      res.json(allCoupons);
    } catch (error) {
      console.error("Get coupons error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/coupons", requireAdmin as any, async (req: Request, res: Response) => {
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

  app.put("/api/admin/coupons/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateCoupon(req.params.id as string, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update coupon error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/admin/coupons/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCoupon(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json({ message: "Coupon deleted" });
    } catch (error) {
      console.error("Delete coupon error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/activity-log", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const log = await storage.getActivityLog(limit);
      res.json(log);
    } catch (error) {
      console.error("Get activity log error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Profile update
  app.put("/api/user/profile", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: parsed.error.flatten() });
      }
      const updated = await storage.updateUserProfile(req.session.userId!, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
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
        emailVerified: updated.emailVerified,
      });
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Check if profile is complete
  app.get("/api/user/profile-status", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      const isComplete = !!(user.fullName && user.phone && user.address && user.city && user.country);
      res.json({ 
        isComplete,
        profile: {
          fullName: user.fullName,
          phone: user.phone,
          address: user.address,
          city: user.city,
          country: user.country,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Reviews
  app.get("/api/reviews/:campaignId", async (req: Request, res: Response) => {
    try {
      const campaignReviews = await storage.getReviewsByCampaign(req.params.campaignId as string);
      res.json(campaignReviews);
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/reviews", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const parsed = insertReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: parsed.error.flatten() });
      }
      const existing = await storage.getUserReviewForCampaign(req.session.userId!, parsed.data.campaignId);
      if (existing) {
        return res.status(400).json({ message: "لقد قمت بتقييم هذا المنتج مسبقاً" });
      }
      const review = await storage.createReview(req.session.userId!, parsed.data);
      res.json(review);
    } catch (error: any) {
      console.error("Create review error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin notifications
  app.get("/api/admin/notifications", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await storage.getAdminNotifications(limit);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/notifications/unread-count", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const count = await storage.getUnreadNotificationCount();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/notifications/:id/read", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      await storage.markNotificationRead(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/notifications/read-all", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsRead();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/broadcast-notification", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const { title, message } = req.body;
      if (!title || !message) {
        return res.status(400).json({ message: "العنوان والرسالة مطلوبان" });
      }
      const allUsers = await storage.getAllUsers();
      const userIds = allUsers.filter(u => u.role !== "admin").map(u => u.id);
      if (userIds.length === 0) {
        return res.status(400).json({ message: "لا يوجد مستخدمين لإرسال الإشعار إليهم" });
      }
      await storage.createBulkUserNotifications(userIds, "broadcast", title, message);
      sendPushNotifications(userIds, title, message);
      await storage.logActivity("broadcast_notification", "إشعار جماعي", `تم إرسال إشعار "${title}" إلى ${userIds.length} مستخدم`, req.session.userId!);
      res.json({ success: true, sentTo: userIds.length });
    } catch (error) {
      console.error("Broadcast notification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/campaigns/upload-image", requireAdmin as any, uploadCampaignImage.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }
      const imageUrl = `/uploads/campaigns/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Upload campaign image error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  app.post("/api/admin/seed-payment-methods", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const existing = await storage.getPaymentMethods();
      if (existing.length > 0) {
        return res.json({ message: "Payment methods already exist", count: existing.length });
      }

      const methods = [
        { name: "Bank Transfer", nameAr: "تحويل بنكي", icon: "business", enabled: true, description: "تحويل مباشر إلى الحساب البنكي" },
        { name: "Cash on Delivery", nameAr: "الدفع عند الاستلام", icon: "cash", enabled: true, description: "ادفع نقداً عند استلام المنتج" },
      ];

      for (const m of methods) {
        await storage.createPaymentMethod(m as any);
      }

      res.json({ message: "Default payment methods created", count: methods.length });
    } catch (error) {
      console.error("Seed payment methods error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // CSV export for admin orders
  app.get("/api/admin/orders/export/csv", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      const escapeCsv = (val: string | null | undefined): string => {
        const str = (val ?? "").toString().replace(/\r?\n/g, " ");
        const sanitized = /^[=+\-@]/.test(str) ? "'" + str : str;
        return '"' + sanitized.replace(/"/g, '""') + '"';
      };
      const csvHeader = "Order ID,Username,Campaign,Quantity,Total,Payment Method,Payment Status,Shipping Status,Tracking Number,Date\n";
      const csvRows = allOrders.map(o => 
        [o.id, o.username, o.campaignTitle, o.quantity, o.totalAmount, o.paymentMethod, o.paymentStatus, o.shippingStatus, o.trackingNumber, o.createdAt]
          .map(v => escapeCsv(v as any))
          .join(",")
      ).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
      res.send("\uFEFF" + csvHeader + csvRows);
    } catch (error) {
      console.error("Export CSV error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/users/export/csv", requireAdmin as any, async (_req: Request, res: Response) => {
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
            createdAt: user.createdAt,
          };
        })
      );
      const escapeCsv = (val: string | null | undefined): string => {
        const str = (val ?? "").toString().replace(/\r?\n/g, " ");
        const sanitized = /^[=+\-@]/.test(str) ? "'" + str : str;
        return '"' + sanitized.replace(/"/g, '""') + '"';
      };
      const csvHeader = "Username,Email,Email Verified,Order Count,Ticket Count,Total Spent,Created At\n";
      const csvRows = usersWithStats.map(u =>
        [u.username, u.email, u.emailVerified, u.orderCount, u.ticketCount, u.totalSpent, u.createdAt]
          .map(v => escapeCsv(v as any))
          .join(",")
      ).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=users.csv");
      res.send("\uFEFF" + csvHeader + csvRows);
    } catch (error) {
      console.error("Export users CSV error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // User Notifications API
  app.get("/api/notifications", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getUserNotifications(req.session.userId!);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const count = await storage.getUnreadUserNotificationCount(req.session.userId!);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const success = await storage.markUserNotificationRead(req.params.id as string, req.session.userId!);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/notifications/read-all", requireAuth as any, async (req: Request, res: Response) => {
    try {
      await storage.markAllUserNotificationsRead(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/recent-purchases", async (_req: Request, res: Response) => {
    try {
      const purchases = await storage.getRecentPurchases(8);
      res.json(purchases);
    } catch (error) {
      console.error("Get recent purchases error:", error);
      res.json([]);
    }
  });

  app.get("/api/winners", async (_req: Request, res: Response) => {
    try {
      const allCampaigns = await storage.getCampaigns();
      const completed = allCampaigns.filter(c => c.status === "completed" && c.winnerId);
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
            winnerUsername,
          };
        })
      );
      res.json(results);
    } catch (error) {
      console.error("Get winners error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/sales-chart", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const days: { date: string; total: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const [result] = await db
          .select({
            total: sum(orders.totalAmount),
            count: count(),
          })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, dayStart),
              sql`${orders.createdAt} <= ${dayEnd}`
            )
          );

        days.push({
          date: dayStart.toISOString().split("T")[0],
          total: result?.total || "0",
          count: result?.count || 0,
        });
      }
      res.json(days);
    } catch (error) {
      console.error("Sales chart error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/referral", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
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
        referredUsers: referredUsers.map(u => ({
          username: u.username,
          joinedAt: u.createdAt,
        })),
      });
    } catch (error) {
      console.error("Get referral error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/referral/apply", async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Referral code is required" });
      }
      const referrer = await storage.getUserByReferralCode(code.toUpperCase());
      if (!referrer) {
        return res.status(404).json({ valid: false, message: "رمز الإحالة غير صحيح" });
      }
      res.json({ valid: true, referrerUsername: referrer.username });
    } catch (error) {
      console.error("Apply referral error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/generate-referral-codes", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const updated = await storage.ensureAllUsersHaveReferralCodes();
      res.json({ message: `Generated referral codes for ${updated} users`, updated });
    } catch (error) {
      console.error("Generate referral codes error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/auth/delete-account", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role === "admin") {
        return res.status(403).json({ message: "لا يمكن حذف حساب المدير" });
      }
      await storage.deleteUser(userId);
      req.session.destroy(() => {});
      res.json({ message: "تم حذف الحساب بنجاح" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/privacy-policy", (_req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>سياسة الخصوصية - فرصة</title>
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
    <h1>سياسة الخصوصية</h1>
    <p>فرصة - Forsa</p>
  </div>
  <div class="container">
    <div class="card">
      <h2>المعلومات التي نجمعها</h2>
      <ul>
        <li>بيانات الحساب: اسم المستخدم، البريد الإلكتروني</li>
        <li>بيانات الطلبات: تاريخ الشراء، المبالغ، المنتجات</li>
        <li>بيانات الشحن: العنوان، رقم الهاتف، المدينة</li>
        <li>إيصالات الدفع: صور إيصالات التحويل البنكي</li>
      </ul>
    </div>
    <div class="card">
      <h2>كيف نستخدم بياناتك</h2>
      <ul>
        <li>معالجة طلباتك وتوصيل الهدايا</li>
        <li>التحقق من المدفوعات</li>
        <li>شحن المنتجات والهدايا</li>
        <li>تحسين تجربة المستخدم</li>
        <li>التواصل معك بشأن طلباتك</li>
      </ul>
    </div>
    <div class="card">
      <h2>حماية البيانات</h2>
      <p>نستخدم تقنيات تشفير متقدمة لحماية بياناتك الشخصية. لن نشارك معلوماتك مع أطراف ثالثة إلا بموافقتك أو عند الحاجة القانونية.</p>
    </div>
    <div class="card">
      <h2>حقوقك</h2>
      <ul>
        <li>طلب نسخة من بياناتك الشخصية</li>
        <li>تصحيح أو تحديث بياناتك</li>
        <li>طلب حذف حسابك وبياناتك</li>
        <li>إلغاء الاشتراك في الإشعارات</li>
      </ul>
    </div>
    <div class="card">
      <h2>التواصل</h2>
      <p>لأي استفسار حول سياسة الخصوصية، تواصل معنا عبر البريد الإلكتروني أو صفحة التواصل في التطبيق.</p>
    </div>
  </div>
  <div class="footer">
    <p>فرصة - Forsa &copy; ${new Date().getFullYear()}</p>
    <p>آخر تحديث: ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
</body>
</html>`);
  });

  app.get("/terms", (_req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>الشروط والأحكام - فرصة</title>
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
    <h1>الشروط والأحكام</h1>
    <p>فرصة - Forsa</p>
  </div>
  <div class="container">
    <div class="card">
      <h2>١. القبول بالشروط</h2>
      <p>باستخدامك لتطبيق فرصة، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يُرجى عدم استخدام التطبيق.</p>
    </div>
    <div class="card">
      <h2>٢. الأهلية</h2>
      <p>يجب أن يكون عمرك 18 عاماً أو أكثر لاستخدام هذا التطبيق. بالتسجيل، أنت تؤكد أنك تستوفي هذا الشرط.</p>
    </div>
    <div class="card">
      <h2>٣. الحساب والأمان</h2>
      <p>أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور. يجب إبلاغنا فوراً عن أي استخدام غير مصرح به.</p>
    </div>
    <div class="card">
      <h2>٤. عمليات الشراء والدفع</h2>
      <p>جميع عمليات الشراء نهائية وغير قابلة للاسترجاع بعد تأكيد الدفع. يتم التحقق من جميع المدفوعات قبل تأكيد الطلب. مع كل عملية شراء تحصل على هدية مجانية.</p>
    </div>
    <div class="card">
      <h2>٥. الهدايا</h2>
      <p>يتم اختيار الهدايا بشكل عشوائي عند اكتمال بيع جميع المنتجات في الحملة. يتم شحن المنتجات والهدايا خلال 14 يوم عمل.</p>
    </div>
    <div class="card">
      <h2>٦. التعديلات</h2>
      <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إبلاغك بأي تغييرات جوهرية.</p>
    </div>
  </div>
  <div class="footer">
    <p>فرصة - Forsa &copy; ${new Date().getFullYear()}</p>
    <p>آخر تحديث: ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
</body>
</html>`);
  });

  app.get("/support", (_req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>الدعم الفني - فرصة</title>
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
    <h1>الدعم الفني</h1>
    <p>فرصة - Forsa</p>
  </div>
  <div class="container">
    <div class="card">
      <h2>كيف يمكننا مساعدتك؟</h2>
      <p>فريق الدعم الفني في فرصة جاهز لمساعدتك في أي استفسار أو مشكلة تواجهك.</p>
    </div>
    <div class="card">
      <h2>الدعم من داخل التطبيق</h2>
      <p>أسهل وأسرع طريقة للتواصل معنا هي من خلال نظام تذاكر الدعم داخل التطبيق:</p>
      <ul>
        <li>افتح التطبيق وانتقل إلى <strong>الملف الشخصي</strong></li>
        <li>اضغط على <strong>تواصل معنا</strong></li>
        <li>أرسل تذكرة دعم وسنرد عليك في أقرب وقت</li>
      </ul>
    </div>
    <div class="card">
      <h2>البريد الإلكتروني</h2>
      <p>يمكنك أيضاً التواصل معنا عبر البريد الإلكتروني:</p>
      <p><a href="mailto:support@forsa.today" class="email-link">support@forsa.today</a></p>
    </div>
    <div class="card">
      <h2>الأسئلة الشائعة</h2>
      <ul>
        <li><strong>كيف أشتري منتج؟</strong> — تصفح المنتجات، اختر المنتج، وأكمل عملية الشراء بالطريقة المناسبة لك.</li>
        <li><strong>كيف يتم اختيار الفائز؟</strong> — عند بيع جميع القطع، يتم اختيار فائز عشوائي تلقائياً من جميع المشترين.</li>
        <li><strong>هل أحصل على المنتج حتى لو لم أفز؟</strong> — نعم! المنتج مضمون لك، والهدية فرصة إضافية.</li>
        <li><strong>كيف أتابع طلبي؟</strong> — من تبويب "طلباتي" يمكنك متابعة حالة الطلب والشحن.</li>
        <li><strong>كيف أرفع إيصال الدفع؟</strong> — ادخل على تفاصيل الطلب واضغط "رفع الإيصال" واختر صورة الإيصال من جهازك.</li>
      </ul>
    </div>
    <div class="card">
      <h2>أوقات الاستجابة</h2>
      <p>نسعى للرد على جميع الاستفسارات خلال <strong>24 ساعة</strong> من استلامها.</p>
    </div>
  </div>
  <div class="footer">
    <p>فرصة - Forsa &copy; ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`);
  });

  // Support Tickets API - User endpoints
  app.post("/api/support-tickets", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const parsed = insertSupportTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: parsed.error.flatten() });
      }
      const ticket = await storage.createSupportTicket(req.session.userId!, parsed.data);
      res.json(ticket);
    } catch (error) {
      console.error("Create support ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/support-tickets", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const tickets = await storage.getUserSupportTickets(req.session.userId!);
      res.json(tickets);
    } catch (error) {
      console.error("Get support tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/support-tickets/:id", requireAuth as any, async (req: Request, res: Response) => {
    try {
      const ticket = await storage.getSupportTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });
      if (ticket.userId !== req.session.userId!) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Get support ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Support Tickets API - Admin endpoints
  app.get("/api/admin/support-tickets", requireAdmin as any, async (_req: Request, res: Response) => {
    try {
      const tickets = await storage.getAllSupportTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Get all support tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/support-tickets/:id", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const { status, adminReply } = req.body;
      if (status && !["open", "in_progress", "closed"].includes(status)) {
        return res.status(400).json({ message: "حالة غير صالحة" });
      }
      const ticket = await storage.updateSupportTicket(req.params.id, { status, adminReply });
      if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });
      if (adminReply) {
        await storage.createUserNotification(
          ticket.userId,
          "support_reply",
          "رد على تذكرة الدعم 📩",
          `تم الرد على تذكرتك: ${ticket.subject}`,
        );
        sendPushNotifications([ticket.userId], "رد على تذكرة الدعم 📩", `تم الرد على تذكرتك: ${ticket.subject}`);
      }
      res.json(ticket);
    } catch (error) {
      console.error("Update support ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/account-settings", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      const adminId = (req.session as any).userId;
      const admin = await storage.getUserById(adminId);
      if (!admin) return res.status(404).json({ message: "المستخدم غير موجود" });

      if (email && email !== admin.email) {
        const existing = await storage.getUserByEmail(email);
        if (existing && existing.id !== adminId) {
          return res.status(409).json({ message: "هذا البريد الإلكتروني مستخدم بالفعل" });
        }
        await storage.updateUserEmail(adminId, email);
      }

      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ message: "يجب إدخال كلمة السر الحالية" });
        const valid = await bcrypt.compare(currentPassword, admin.password);
        if (!valid) return res.status(401).json({ message: "كلمة السر الحالية غير صحيحة" });
        const hashed = await bcrypt.hash(newPassword, 10);
        await storage.updateUserPassword(adminId, hashed);
      }

      return res.json({ message: "تم تحديث الإعدادات بنجاح" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "حدث خطأ" });
    }
  });

  app.post("/api/admin/create-admin", requireAdmin as any, async (req: Request, res: Response) => {
    try {
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        return res.status(400).json({ message: "جميع الحقول مطلوبة" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });

      const hashed = await bcrypt.hash(password, 10);
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newAdmin = await storage.createUser({
        email,
        username,
        password: hashed,
        role: "admin",
        emailVerified: true,
        referralCode,
      } as any);

      return res.status(201).json({ message: "تم إنشاء حساب الأدمن بنجاح", user: { id: newAdmin.id, email: newAdmin.email, username: newAdmin.username } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "حدث خطأ" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
