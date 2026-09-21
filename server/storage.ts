import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Draw,
  type InsertDraw,
  type Order,
  type OrderItem,
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
  type WalletTransaction,
  type CheckoutPayload,
  users,
  products,
  draws,
  orders,
  orderItems,
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
  walletTransactions,
} from "@shared/schema";
import { db } from "./db";
import { eq, ne, asc, desc, and, or, sql, count, sum, gte, inArray, isNull } from "drizzle-orm";
import { randomBytes, randomInt } from "crypto";

/** سعر التذكرة الافتراضي لما ما يكون في جولة نشطة */
export const DEFAULT_TICKET_PRICE = 10;

function generateTicketNumber(): string {
  const prefix = "FT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export type OrderWithItems = Order & { items: OrderItem[] };

export class DatabaseStorage {
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

  /* ============================ المنتجات (الكتالوج) ============================ */

  async getProducts(includeInactive = false): Promise<Product[]> {
    const query = db.select().from(products);
    const rows = includeInactive
      ? await query.orderBy(asc(products.sortOrder), desc(products.createdAt))
      : await query
          .where(eq(products.isActive, true))
          .orderBy(asc(products.sortOrder), desc(products.createdAt));
    return rows;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        name: data.name,
        description: data.description ?? "",
        imageUrl: data.imageUrl ?? null,
        imagesJson: data.imagesJson ?? null,
        price: data.price,
        stock: data.stock ?? null,
        category: data.category ?? "other",
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
    return !!deleted;
  }

  /* ============================== جولات السحب ============================== */

  async getDraws(): Promise<Draw[]> {
    return db
      .select()
      .from(draws)
      .orderBy(asc(draws.sortOrder), desc(draws.createdAt));
  }

  async getDraw(id: string): Promise<Draw | undefined> {
    const [draw] = await db.select().from(draws).where(eq(draws.id, id));
    return draw || undefined;
  }

  /** الجولة اللي التذاكر الجديدة بتروح إلها */
  async getActiveDraw(): Promise<Draw | undefined> {
    const [draw] = await db
      .select()
      .from(draws)
      .where(eq(draws.status, "active"))
      .orderBy(asc(draws.sortOrder), asc(draws.createdAt))
      .limit(1);
    return draw || undefined;
  }

  async getCompletedDraws(): Promise<Draw[]> {
    return db
      .select()
      .from(draws)
      .where(eq(draws.status, "completed"))
      .orderBy(desc(draws.drawnAt));
  }

  /**
   * أول جولة نشطة أو مجدولة — بتُستخدم لعرض "الجولة الحالية" للمستخدم
   * حتى لو الجولة النشطة وصلت للعدد وصارت ready_to_draw.
   */
  async getCurrentDraw(): Promise<Draw | undefined> {
    const [draw] = await db
      .select()
      .from(draws)
      .where(inArray(draws.status, ["active", "ready_to_draw"]))
      .orderBy(asc(draws.sortOrder), asc(draws.createdAt))
      .limit(1);
    if (draw) return draw;
    const [scheduled] = await db
      .select()
      .from(draws)
      .where(eq(draws.status, "scheduled"))
      .orderBy(asc(draws.sortOrder), asc(draws.createdAt))
      .limit(1);
    return scheduled || undefined;
  }

  /**
   * بتنشئ جولة جديدة. إذا ما في ولا جولة نشطة بتصير هي النشطة فوراً
   * وبتستلم أي تذاكر معلّقة (drawId = null) من طلبات سابقة.
   */
  async createDraw(data: InsertDraw): Promise<Draw> {
    const existingActive = await this.getActiveDraw();
    const [maxRow] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${draws.sortOrder}), 0)` })
      .from(draws);

    const [draw] = await db
      .insert(draws)
      .values({
        title: data.title,
        prizeName: data.prizeName,
        prizeDescription: data.prizeDescription ?? null,
        prizeImageUrl: data.prizeImageUrl ?? null,
        ticketPrice: data.ticketPrice,
        targetTickets: data.targetTickets,
        sortOrder: (maxRow?.maxOrder ?? 0) + 1,
        status: existingActive ? "scheduled" : "active",
        startedAt: existingActive ? null : new Date(),
      })
      .returning();

    if (!existingActive) {
      await this.assignPendingTicketsToDraw(draw.id);
      return (await this.getDraw(draw.id)) ?? draw;
    }
    return draw;
  }

  async updateDraw(id: string, data: Partial<Draw>): Promise<Draw | undefined> {
    const [updated] = await db
      .update(draws)
      .set(data)
      .where(eq(draws.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDraw(id: string): Promise<boolean> {
    const draw = await this.getDraw(id);
    if (!draw) return false;
    if (draw.status === "completed") {
      throw new Error("ما بينفع تحذف جولة تم السحب عليها");
    }
    // التذاكر بترجع معلّقة بدل ما تنحذف
    await db.update(tickets).set({ drawId: null }).where(eq(tickets.drawId, id));
    const [deleted] = await db.delete(draws).where(eq(draws.id, id)).returning();
    return !!deleted;
  }

  /**
   * بتفعّل الجولة المجدولة التالية وبتسلّمها التذاكر المعلّقة.
   * بترجّع الجولة النشطة الجديدة أو undefined إذا ما في جولات مجدولة.
   */
  async activateNextScheduledDraw(): Promise<Draw | undefined> {
    const [next] = await db
      .select()
      .from(draws)
      .where(eq(draws.status, "scheduled"))
      .orderBy(asc(draws.sortOrder), asc(draws.createdAt))
      .limit(1);
    if (!next) return undefined;

    await db
      .update(draws)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(draws.id, next.id));

    await this.assignPendingTicketsToDraw(next.id);
    return (await this.getDraw(next.id)) ?? undefined;
  }

  /**
   * بتسلّم التذاكر المعلّقة (drawId = null) لجولة، بحدود سعتها.
   * إذا امتلأت الجولة بتصير ready_to_draw.
   */
  async assignPendingTicketsToDraw(drawId: string): Promise<number> {
    const draw = await this.getDraw(drawId);
    if (!draw) return 0;

    const capacity = draw.targetTickets - draw.soldTickets;
    if (capacity <= 0) {
      if (draw.status === "active") {
        await this.updateDraw(drawId, { status: "ready_to_draw" });
      }
      return 0;
    }

    const pending = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(isNull(tickets.drawId))
      .orderBy(asc(tickets.createdAt))
      .limit(capacity);

    if (pending.length === 0) return 0;

    await db
      .update(tickets)
      .set({ drawId })
      .where(inArray(tickets.id, pending.map((t) => t.id)));

    const newSold = draw.soldTickets + pending.length;
    await this.updateDraw(drawId, {
      soldTickets: newSold,
      ...(newSold >= draw.targetTickets ? { status: "ready_to_draw" as const } : {}),
    });

    return pending.length;
  }

  async getTicketsByDraw(drawId: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.drawId, drawId))
      .orderBy(desc(tickets.createdAt));
  }

  /** عدد المشاركين الفريدين بجولة */
  async getDrawParticipantCount(drawId: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`count(distinct ${tickets.userId})` })
      .from(tickets)
      .where(eq(tickets.drawId, drawId));
    return Number(row?.total ?? 0);
  }

  /** تذاكر مستخدم معيّن بجولة معيّنة */
  async getUserTicketCountForDraw(userId: string, drawId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(tickets)
      .where(and(eq(tickets.userId, userId), eq(tickets.drawId, drawId)));
    return Number(row?.total ?? 0);
  }

  /** السحب: اختيار تذكرة عشوائية من تذاكر الجولة */
  async drawWinner(drawId: string): Promise<{ winner: User; ticket: Ticket; draw: Draw }> {
    const draw = await this.getDraw(drawId);
    if (!draw) throw new Error("الجولة غير موجودة");
    if (draw.status === "completed") throw new Error("تم السحب على هذه الجولة مسبقاً");

    const drawTickets = await this.getTicketsByDraw(drawId);
    if (drawTickets.length === 0) {
      throw new Error("لا توجد تذاكر في هذه الجولة لإجراء السحب");
    }

    const winningTicket = drawTickets[randomInt(0, drawTickets.length)];

    await db
      .update(tickets)
      .set({ isWinner: true })
      .where(eq(tickets.id, winningTicket.id));

    const winner = await this.getUser(winningTicket.userId);
    if (!winner) throw new Error("لم يتم العثور على المستخدم الفائز");

    const [updatedDraw] = await db
      .update(draws)
      .set({
        status: "completed",
        winnerId: winner.id,
        winnerTicketId: winningTicket.id,
        winnerTicketNumber: winningTicket.ticketNumber,
        drawnAt: new Date(),
      })
      .where(eq(draws.id, drawId))
      .returning();

    // تفعيل الجولة التالية تلقائياً
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
  async checkout(userId: string, payload: CheckoutPayload): Promise<OrderWithItems> {
    return db.transaction(async (tx) => {
      // تجميع الكميات لنفس المنتج
      const wanted = new Map<string, number>();
      for (const item of payload.items) {
        wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
      }

      const productIds = [...wanted.keys()];
      const rows = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds))
        .for("update");

      const byId = new Map(rows.map((p) => [p.id, p]));

      let subtotal = 0;
      const lines: {
        productId: string;
        productName: string;
        productImageUrl: string | null;
        unitPrice: string;
        quantity: number;
        lineTotal: string;
      }[] = [];

      for (const [productId, quantity] of wanted) {
        const product = byId.get(productId);
        if (!product) throw new Error("أحد المنتجات لم يعد متوفراً");
        if (!product.isActive) throw new Error(`المنتج "${product.name}" غير متاح حالياً`);
        if (product.stock !== null && product.stock < quantity) {
          throw new Error(`متبقي ${product.stock} قطعة فقط من "${product.name}"`);
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
          lineTotal: lineTotal.toFixed(2),
        });
      }

      // الكوبون — خصم مرة وحدة على الطلب كلّه
      let discountAmount = 0;
      let appliedCouponCode: string | null = null;
      if (payload.couponCode) {
        const [coupon] = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.code, payload.couponCode.trim().toUpperCase()))
          .for("update");

        if (!coupon) throw new Error("كود الخصم غير صحيح");
        if (!coupon.enabled) throw new Error("كود الخصم غير مفعّل");
        if (coupon.usedCount >= coupon.maxUses) throw new Error("تم استنفاد كود الخصم");
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
          throw new Error("انتهت صلاحية كود الخصم");
        }

        discountAmount = (subtotal * coupon.discountPercent) / 100;
        appliedCouponCode = coupon.code;

        await tx
          .update(coupons)
          .set({ usedCount: coupon.usedCount + 1 })
          .where(eq(coupons.id, coupon.id));
      }

      const afterDiscount = Math.max(0, subtotal - discountAmount);

      // المحفظة — المبلغ بينحسب بالسيرفر، مو من العميل
      let walletAmount = 0;
      if (payload.useWallet) {
        const [user] = await tx
          .select({ walletBalance: users.walletBalance })
          .from(users)
          .where(eq(users.id, userId))
          .for("update");

        const balance = parseFloat(user?.walletBalance ?? "0");
        walletAmount = Math.min(balance, afterDiscount);

        if (walletAmount > 0) {
          await tx
            .update(users)
            .set({ walletBalance: sql`${users.walletBalance} - ${walletAmount.toFixed(2)}` })
            .where(eq(users.id, userId));
        }
      }

      const totalDue = Math.max(0, afterDiscount - walletAmount);

      const isBankTransfer = payload.paymentMethod === "bank_transfer";
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          subtotal: subtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
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
          couponCode: appliedCouponCode,
        })
        .returning();

      const insertedItems = await tx
        .insert(orderItems)
        .values(lines.map((l) => ({ ...l, orderId: order.id })))
        .returning();

      // خصم المخزون
      for (const [productId, quantity] of wanted) {
        const product = byId.get(productId)!;
        await tx
          .update(products)
          .set({
            soldCount: product.soldCount + quantity,
            ...(product.stock !== null ? { stock: product.stock - quantity } : {}),
          })
          .where(eq(products.id, productId));
      }

      if (walletAmount > 0) {
        await tx.insert(walletTransactions).values({
          userId,
          amount: (-walletAmount).toFixed(2),
          type: "debit",
          description: `خصم محفظة — طلب ${order.id.slice(0, 8)}`,
          referenceId: order.id,
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
  async awardTicketsForOrder(orderId: string): Promise<{ created: number; drawIds: string[] }> {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("الطلب غير موجود");
    if (order.ticketsAwarded > 0) return { created: 0, drawIds: [] };
    if (order.paymentStatus !== "confirmed") return { created: 0, drawIds: [] };

    const eligible = parseFloat(order.ticketEligibleAmount);
    let activeDraw = await this.getActiveDraw();
    const ticketPrice = activeDraw
      ? parseFloat(activeDraw.ticketPrice)
      : DEFAULT_TICKET_PRICE;

    const totalTickets = ticketPrice > 0 ? Math.floor(eligible / ticketPrice) : 0;
    if (totalTickets <= 0) {
      await this.updateOrder(orderId, { ticketsAwarded: 0 });
      return { created: 0, drawIds: [] };
    }

    const drawIds: string[] = [];
    let remaining = totalTickets;
    let guard = 0;

    while (remaining > 0 && guard++ < 100) {
      if (!activeDraw) {
        // ما في جولة مفتوحة — التذاكر بتنخزّن معلّقة
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
        ...(newSold >= activeDraw.targetTickets ? { status: "ready_to_draw" as const } : {}),
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

  private async createTickets(
    userId: string,
    orderId: string,
    drawId: string | null,
    quantity: number
  ): Promise<Ticket[]> {
    if (quantity <= 0) return [];
    const values = Array.from({ length: quantity }, () => ({
      ticketNumber: generateTicketNumber(),
      userId,
      orderId,
      drawId,
    }));
    return db.insert(tickets).values(values).returning();
  }

  /* ================================ الطلبات ================================ */

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async getOrderWithItems(orderId: string): Promise<OrderWithItems | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;
    const items = await this.getOrderItems(orderId);
    return { ...order, items };
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set(data)
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async getTicketsByUser(userId: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
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

  async getAllOrders(): Promise<(Order & { username: string; itemCount: number; summary: string })[]> {
    const rows = await db
      .select({
        order: orders,
        username: users.username,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));

    if (rows.length === 0) return [];

    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, rows.map((r) => r.order.id)));

    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return rows.map(({ order, username }) => {
      const orderItemList = itemsByOrder.get(order.id) ?? [];
      const itemCount = orderItemList.reduce((s, i) => s + i.quantity, 0);
      const names = orderItemList.map((i) => `${i.productName} ×${i.quantity}`);
      return {
        ...order,
        username: username || "Unknown",
        itemCount,
        summary: names.length > 0 ? names.join("، ") : "—",
      };
    });
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
    activeProducts: number;
    ordersToday: number;
    newUsersThisWeek: number;
    conversionRate: string;
    averageOrderValue: string;
    pendingReviewOrders: number;
    ticketsInActiveDraw: number;
    activeDraw: Draw | null;
    topProducts: { name: string; soldCount: number }[];
  }> {
    const [revenueResult] = await db
      .select({ total: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.paymentStatus, "confirmed"));

    const [ordersResult] = await db.select({ total: count() }).from(orders);
    const [usersResult] = await db.select({ total: count() }).from(users);

    const [activeProductsResult] = await db
      .select({ total: count() })
      .from(products)
      .where(eq(products.isActive, true));

    const [pendingResult] = await db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.paymentStatus, "pending_review"));

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

    const topProducts = await db
      .select({ name: products.name, soldCount: products.soldCount })
      .from(products)
      .orderBy(desc(products.soldCount))
      .limit(5);

    const activeDraw = (await this.getCurrentDraw()) ?? null;

    const totalOrdersCount = ordersResult?.total || 0;
    const totalUsersCount = usersResult?.total || 0;
    const totalRevenueNum = parseFloat(revenueResult?.total || "0");

    const conversionRate =
      totalUsersCount > 0 ? ((totalOrdersCount / totalUsersCount) * 100).toFixed(1) : "0.0";
    const averageOrderValue =
      totalOrdersCount > 0 ? (totalRevenueNum / totalOrdersCount).toFixed(2) : "0.00";

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
      topProducts,
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

  async getReviewsByProduct(productId: string): Promise<(Review & { username: string })[]> {
    return db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        productId: reviews.productId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        username: users.username,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(
    userId: string,
    data: { productId: string; rating: number; comment?: string }
  ): Promise<Review> {
    const [review] = await db
      .insert(reviews)
      .values({
        userId,
        productId: data.productId,
        rating: data.rating,
        comment: data.comment || null,
      })
      .returning();
    return review;
  }

  async getUserReviewForProduct(userId: string, productId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)));
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

  async createUserNotification(userId: string, type: string, title: string, body: string, drawId?: string, metadata?: string): Promise<UserNotification> {
    const [notification] = await db.insert(userNotifications).values({
      userId,
      type,
      title,
      body,
      drawId: drawId || null,
      metadata: metadata || null,
    }).returning();
    return notification;
  }

  async createBulkUserNotifications(userIds: string[], type: string, title: string, body: string, drawId?: string, metadata?: string): Promise<void> {
    if (userIds.length === 0) return;
    const values = userIds.map((userId) => ({
      userId,
      type,
      title,
      body,
      drawId: drawId || null,
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

  async getRecentPurchases(limit: number = 5): Promise<{ productName: string; minutesAgo: number }[]> {
    const rows = await db
      .select({
        productName: orderItems.productName,
        createdAt: orders.createdAt,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.paymentStatus, "confirmed"))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return rows.map((o) => ({
      productName: o.productName,
      minutesAgo: Math.max(1, Math.floor((Date.now() - new Date(o.createdAt!).getTime()) / 60000)),
    }));
  }

  async deleteUser(userId: string): Promise<boolean> {
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

