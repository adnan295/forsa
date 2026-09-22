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
  DEFAULT_DELIVERY_FEE,
} from "@shared/schema";
import { db as database } from "./db";
import { normalizePaymentMethod, isBankTransferMethod, isConfiguredBankTransfer } from "@shared/commerce";
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
  constructor(private db: typeof database = database, private inTransaction = false) {}

  // Serialize financial and draw mutations across all server processes.
  private async atomic<T>(work: (store: DatabaseStorage) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(73492011)`);
      return work(new DatabaseStorage(tx as unknown as typeof database, true));
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  /* ============================ المنتجات (الكتالوج) ============================ */

  async getProducts(includeInactive = false): Promise<Product[]> {
    const query = this.db.select().from(products);
    const rows = includeInactive
      ? await query.orderBy(asc(products.sortOrder), desc(products.createdAt))
      : await query
          .where(eq(products.isActive, true))
          .orderBy(asc(products.sortOrder), desc(products.createdAt));
    return rows;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await this.db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await this.db
      .insert(products)
      .values({
        name: data.name,
        description: data.description ?? "",
        imageUrl: data.imageUrl ?? null,
        imagesJson: data.imagesJson ?? null,
        specsJson: data.specsJson ?? null,
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
    const [updated] = await this.db
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const [deleted] = await this.db.delete(products).where(eq(products.id, id)).returning();
    return !!deleted;
  }

  /* ============================== جولات السحب ============================== */

  async getDraws(): Promise<Draw[]> {
    return this.db
      .select()
      .from(draws)
      .orderBy(asc(draws.sortOrder), desc(draws.createdAt));
  }

  async getDraw(id: string): Promise<Draw | undefined> {
    const [draw] = await this.db.select().from(draws).where(eq(draws.id, id));
    return draw || undefined;
  }

  /** الجولة اللي التذاكر الجديدة بتروح إلها */
  async getActiveDraw(): Promise<Draw | undefined> {
    const [draw] = await this.db
      .select()
      .from(draws)
      .where(eq(draws.status, "active"))
      .orderBy(asc(draws.sortOrder), asc(draws.createdAt))
      .limit(1);
    return draw || undefined;
  }

  async getCompletedDraws(): Promise<Draw[]> {
    return this.db
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
    const [draw] = await this.db
      .select()
      .from(draws)
      .where(inArray(draws.status, ["active", "ready_to_draw"]))
      .orderBy(asc(draws.sortOrder), asc(draws.createdAt))
      .limit(1);
    if (draw) return draw;
    const [scheduled] = await this.db
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
    if (!this.inTransaction) return this.atomic(store => store.createDraw(data));
    const existingActive = await this.getActiveDraw();
    const [maxRow] = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(${draws.sortOrder}), 0)` })
      .from(draws);

    const [draw] = await this.db
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
    if (!this.inTransaction) return this.atomic(store => store.updateDraw(id, data));
    const existing = await this.getDraw(id);
    if (!existing) return undefined;
    if (existing.status === "completed") throw new Error("لا يمكن تعديل جولة مكتملة");
    if (data.ticketPrice !== undefined && (!Number.isFinite(Number(data.ticketPrice)) || Number(data.ticketPrice) <= 0)) throw new Error("قيمة الفرصة غير صالحة");
    if (data.targetTickets !== undefined && (!Number.isInteger(data.targetTickets) || data.targetTickets < Math.max(1, existing.soldTickets))) throw new Error("العدد المستهدف غير صالح");
    if (data.status === "active") {
      const active = await this.getActiveDraw();
      if (active && active.id !== id) throw new Error("توجد جولة نشطة بالفعل");
    }
    if (data.targetTickets !== undefined && ["active", "ready_to_draw"].includes(existing.status)) {
      data = { ...data, status: existing.soldTickets >= data.targetTickets ? "ready_to_draw" : "active" };
      if (data.status === "active") {
        const active = await this.getActiveDraw();
        if (active && active.id !== id) throw new Error("لا يمكن إعادة فتح جولة أثناء وجود جولة نشطة أخرى");
      }
    }
    const [updated] = await this.db
      .update(draws)
      .set(data)
      .where(eq(draws.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDraw(id: string): Promise<boolean> {
    if (!this.inTransaction) return this.atomic(store => store.deleteDraw(id));
    const draw = await this.getDraw(id);
    if (!draw) return false;
    if (draw.status === "completed") {
      throw new Error("ما بينفع تحذف جولة تم السحب عليها");
    }
    // التذاكر بترجع معلّقة بدل ما تنحذف
    await this.db.update(tickets).set({ drawId: null }).where(eq(tickets.drawId, id));
    const [deleted] = await this.db.delete(draws).where(eq(draws.id, id)).returning();
    return !!deleted;
  }

  /**
   * بتفعّل الجولة المجدولة التالية وبتسلّمها التذاكر المعلّقة.
   * بترجّع الجولة النشطة الجديدة أو undefined إذا ما في جولات مجدولة.
   */
  async activateNextScheduledDraw(): Promise<Draw | undefined> {
    if (!this.inTransaction) return this.atomic(store => store.activateNextScheduledDraw());
    const active = await this.getActiveDraw();
    if (active) return active;
    const [next] = await this.db
      .select()
      .from(draws)
      .where(eq(draws.status, "scheduled"))
      .orderBy(asc(draws.sortOrder), asc(draws.createdAt))
      .limit(1);
    if (!next) return undefined;

    await this.db
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
    if (!this.inTransaction) return this.atomic(store => store.assignPendingTicketsToDraw(drawId));
    const draw = await this.getDraw(drawId);
    if (!draw) return 0;

    const capacity = draw.targetTickets - draw.soldTickets;
    if (capacity <= 0) {
      if (draw.status === "active") {
        await this.updateDraw(drawId, { status: "ready_to_draw" });
      }
      return 0;
    }

    const pending = await this.db
      .select({ id: tickets.id })
      .from(tickets)
      .where(isNull(tickets.drawId))
      .orderBy(asc(tickets.createdAt))
      .limit(capacity);

    if (pending.length === 0) return 0;

    await this.db
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
    return this.db
      .select()
      .from(tickets)
      .where(eq(tickets.drawId, drawId))
      .orderBy(desc(tickets.createdAt));
  }

  /** عدد المشاركين الفريدين بجولة */
  async getDrawParticipantCount(drawId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(distinct ${tickets.userId})` })
      .from(tickets)
      .where(eq(tickets.drawId, drawId));
    return Number(row?.total ?? 0);
  }

  /** تذاكر مستخدم معيّن بجولة معيّنة */
  async getUserTicketCountForDraw(userId: string, drawId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(tickets)
      .where(and(eq(tickets.userId, userId), eq(tickets.drawId, drawId)));
    return Number(row?.total ?? 0);
  }

  /** السحب: اختيار تذكرة عشوائية من تذاكر الجولة */
  async drawWinner(drawId: string): Promise<{ winner: User; ticket: Ticket; draw: Draw }> {
    if (!this.inTransaction) return this.atomic(store => store.drawWinner(drawId));
    const draw = await this.getDraw(drawId);
    if (!draw) throw new Error("الجولة غير موجودة");
    if (draw.status === "completed") throw new Error("تم السحب على هذه الجولة مسبقاً");

    if (draw.status !== "ready_to_draw" || draw.soldTickets < draw.targetTickets) {
      throw new Error("لا يمكن إجراء السحب قبل اكتمال العدد المستهدف");
    }
    const drawTickets = await this.getTicketsByDraw(drawId);
    if (drawTickets.length !== draw.targetTickets) throw new Error("عدد التذاكر لا يطابق العدد المستهدف");
    if (drawTickets.length === 0) {
      throw new Error("لا توجد تذاكر في هذه الجولة لإجراء السحب");
    }

    const winningTicket = drawTickets[randomInt(0, drawTickets.length)];

    await this.db
      .update(tickets)
      .set({ isWinner: true })
      .where(eq(tickets.id, winningTicket.id));

    const winner = await this.getUser(winningTicket.userId);
    if (!winner) throw new Error("لم يتم العثور على المستخدم الفائز");

    const [updatedDraw] = await this.db
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
   * إنشاء الطلب وسطوره، وخصم المخزون.
   *
   * التذاكر ما بتنمنح هون — بتنمنح لما الأدمن يأكّد الدفع
   * (شوف awardTicketsForOrder).
   */
  async checkout(userId: string, payload: CheckoutPayload): Promise<OrderWithItems> {
    return this.atomic(async (store) => {
      const tx = store.db;
      if (payload.checkoutKey) {
        const [existing] = await tx.select().from(orders).where(eq(orders.checkoutKey, payload.checkoutKey));
        if (existing) {
          if (existing.userId !== userId) throw new Error("معرّف الطلب غير صالح");
          return { ...existing, items: await store.getOrderItems(existing.id) };
        }
      }
      const [method] = await tx.select().from(paymentMethods).where(and(eq(paymentMethods.enabled, true), or(eq(paymentMethods.id, payload.paymentMethod), eq(paymentMethods.name, payload.paymentMethod))));
      if (!method || !isConfiguredBankTransfer(method)) throw new Error("طريقة الدفع غير متاحة، حدّث الصفحة واختر مجدداً");
      const currentDraw = await store.getCurrentDraw();
      const ticketPrice = currentDraw ? Number(currentDraw.ticketPrice) : DEFAULT_TICKET_PRICE;
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

        discountAmount = Math.round(subtotal * coupon.discountPercent) / 100;
        appliedCouponCode = coupon.code;

        await tx
          .update(coupons)
          .set({ usedCount: coupon.usedCount + 1 })
          .where(eq(coupons.id, coupon.id));
      }

      const afterDiscount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

      // التوصيل بينضاف للمستحق بس ما بيدخل باحتساب فرص السحب
      const deliveryFee = DEFAULT_DELIVERY_FEE;
      const payable = afterDiscount + deliveryFee;

      const totalDue = payable;
      const needsReceipt = totalDue > 0;
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          subtotal: subtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          totalAmount: totalDue.toFixed(2),
          // التذاكر بتنحسب على قيمة البضاعة بعد الخصم
          ticketEligibleAmount: afterDiscount.toFixed(2),
          status: "pending",
          paymentMethod: normalizePaymentMethod(method.name),
          expectedTickets: Math.floor(afterDiscount / ticketPrice),
          checkoutKey: payload.checkoutKey,
          paymentStatus: needsReceipt ? "pending_payment" : "pending_review",
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

      return { ...order, items: insertedItems };
    });
  }

  /**
   * بتمنح تذاكر لطلب بعد تأكيد الدفع. idempotent — نداءها مرتين ما بيضاعف.
   * عدد التذاكر = floor(قيمة البضاعة بعد الخصم ÷ سعر التذكرة).
   * إذا امتلأت الجولة النشطة، الزيادة بتروح للجولة التالية،
   * وإذا ما في جولة تالية بتضلّ معلّقة لحدّ ما الأدمن يفتح جولة جديدة.
   */
  async decidePayment(orderId: string, status: "confirmed" | "rejected", reason = "") {
    return this.atomic(async (store) => {
      const order = await store.getOrder(orderId);
      if (!order) throw new Error("الطلب غير موجود");
      if (order.paymentStatus === status) return { created: 0, drawIds: [] as string[], unchanged: true };
      if (order.paymentStatus === "confirmed" || order.paymentStatus === "rejected") {
        throw new Error("تم حسم هذا الطلب مسبقاً ولا يمكن تبديل حالة الدفع");
      }
      if (status === "confirmed" && Number(order.totalAmount) > 0 && !order.receiptUrl) throw new Error("يجب رفع إيصال التحويل البنكي قبل تأكيد الدفع");
      await store.updateOrderPayment(orderId, { paymentStatus: status, rejectionReason: status === "rejected" ? reason : "" });
      await store.updateOrder(orderId, { status: status === "confirmed" ? "paid" : "failed", ...(status === "rejected" ? { shippingStatus: "cancelled" as const } : {}) });
      if (status === "confirmed") return { ...await store.awardTicketsForOrder(orderId), unchanged: false };
      for (const item of await store.getOrderItems(orderId)) {
        await store.db.update(products).set({ stock: sql`case when ${products.stock} is null then null else ${products.stock} + ${item.quantity} end`, soldCount: sql`greatest(0, ${products.soldCount} - ${item.quantity})` }).where(eq(products.id, item.productId));
      }
      if (order.couponCode) await store.db.update(coupons).set({ usedCount: sql`greatest(0, ${coupons.usedCount} - 1)` }).where(eq(coupons.code, order.couponCode));
      return { created: 0, drawIds: [] as string[], unchanged: false };
    });
  }

  async submitReceipt(orderId: string, userId: string, receiptUrl: string) {
    return this.atomic(async (store) => {
      const order = await store.getOrder(orderId);
      if (!order || order.userId !== userId) throw new Error("الطلب غير متاح");
      if (!["pending_payment", "pending_review"].includes(order.paymentStatus)) throw new Error("لا يمكن تعديل إيصال طلب محسوم");
      return store.updateOrderPayment(orderId, { receiptUrl, paymentStatus: "pending_review" });
    });
  }

  async awardTicketsForOrder(orderId: string): Promise<{ created: number; drawIds: string[] }> {
    if (!this.inTransaction) return this.atomic(store => store.awardTicketsForOrder(orderId));
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("الطلب غير موجود");
    if (order.ticketsAwarded > 0) return { created: 0, drawIds: [] };
    if (order.paymentStatus !== "confirmed") return { created: 0, drawIds: [] };

    let activeDraw = await this.getActiveDraw();
    const totalTickets = order.expectedTickets;
    if (totalTickets <= 0) {
      await this.updateOrder(orderId, { ticketsAwarded: 0 });
      return { created: 0, drawIds: [] };
    }

    const drawIds: string[] = [];
    let remaining = totalTickets;
    while (remaining > 0) {
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
    return this.db.insert(tickets).values(values).returning();
  }

  /* ================================ الطلبات ================================ */

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async getOrderWithItems(orderId: string): Promise<OrderWithItems | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;
    const items = await this.getOrderItems(orderId);
    return { ...order, items };
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined> {
    const [updated] = await this.db
      .update(orders)
      .set(data)
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async getTicketsByUser(userId: string): Promise<Ticket[]> {
    return this.db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await this.db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return this.db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(userId: string): Promise<{ orderCount: number; ticketCount: number; totalSpent: string }> {
    const [orderResult] = await this.db
      .select({ orderCount: count(), totalSpent: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.userId, userId));

    const [ticketResult] = await this.db
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
    const rows = await this.db
      .select({
        order: orders,
        username: users.username,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));

    if (rows.length === 0) return [];

    const items = await this.db
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
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id));
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

    const [updated] = await this.db
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

    const [updated] = await this.db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();
    return updated || undefined;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.db.select().from(paymentMethods).orderBy(desc(paymentMethods.createdAt));
  }

  async getEnabledPaymentMethods(): Promise<PaymentMethod[]> {
    return this.db.select().from(paymentMethods).where(eq(paymentMethods.enabled, true)).orderBy(desc(paymentMethods.createdAt));
  }

  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    if (!isBankTransferMethod(data) || (data.enabled !== false && !isConfiguredBankTransfer(data))) throw new Error("أدخل اسم البنك وصاحب الحساب ورقم الحساب لتفعيل التحويل البنكي");
    const [created] = await this.db.insert(paymentMethods).values(data).returning();
    return created;
  }

  async updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const [existing] = await this.db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    if (!existing) return undefined;
    const candidate = { ...existing, ...data };
    if (!isBankTransferMethod(candidate) || (candidate.enabled && !isConfiguredBankTransfer(candidate))) throw new Error("أدخل اسم البنك وصاحب الحساب ورقم الحساب لتفعيل التحويل البنكي");
    const [updated] = await this.db
      .update(paymentMethods)
      .set(data)
      .where(eq(paymentMethods.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    const [deleted] = await this.db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .returning();
    return !!deleted;
  }

  async getCoupons(): Promise<Coupon[]> {
    return this.db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async createCoupon(data: InsertCoupon): Promise<Coupon> {
    const [created] = await this.db.insert(coupons).values(data).returning();
    return created;
  }

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined> {
    const [updated] = await this.db
      .update(coupons)
      .set(data)
      .where(eq(coupons.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const [deleted] = await this.db
      .delete(coupons)
      .where(eq(coupons.id, id))
      .returning();
    return !!deleted;
  }

  async validateCoupon(code: string): Promise<Coupon> {
    const [coupon] = await this.db
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
    return this.db
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
    const [entry] = await this.db
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
    const [revenueResult] = await this.db
      .select({ total: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.paymentStatus, "confirmed"));

    const [ordersResult] = await this.db.select({ total: count() }).from(orders);
    const [usersResult] = await this.db.select({ total: count() }).from(users);

    const [activeProductsResult] = await this.db
      .select({ total: count() })
      .from(products)
      .where(eq(products.isActive, true));

    const [pendingResult] = await this.db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.paymentStatus, "pending_review"));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [ordersTodayResult] = await this.db
      .select({ total: count() })
      .from(orders)
      .where(gte(orders.createdAt, today));

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [newUsersResult] = await this.db
      .select({ total: count() })
      .from(users)
      .where(gte(users.createdAt, weekAgo));

    const topProducts = await this.db
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
    const [user] = await this.db.update(users).set({
      fullName: data.fullName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
    }).where(eq(users.id, userId)).returning();
    return user || undefined;
  }

  async getReviewsByProduct(productId: string): Promise<(Review & { username: string })[]> {
    return this.db
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
    const [review] = await this.db
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
    const [review] = await this.db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)));
    return review || undefined;
  }

  async getAdminNotifications(limit: number = 50): Promise<AdminNotification[]> {
    return this.db.select().from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit);
  }

  async createAdminNotification(type: string, title: string, message: string, metadata?: string): Promise<AdminNotification> {
    const [notification] = await this.db.insert(adminNotifications).values({
      type,
      title,
      message,
      metadata: metadata || null,
    }).returning();
    return notification;
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const [result] = await this.db.update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.id, id))
      .returning();
    return !!result;
  }

  async markAllNotificationsRead(): Promise<boolean> {
    await this.db.update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.isRead, false));
    return true;
  }

  async getUnreadNotificationCount(): Promise<number> {
    const [result] = await this.db.select({ count: count() }).from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));
    return result?.count || 0;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createPasswordResetToken(userId: string, code: string, expiresAt: Date): Promise<any> {
    const [token] = await this.db.insert(passwordResetTokens).values({
      userId,
      code,
      expiresAt,
    }).returning();
    return token;
  }

  async verifyPasswordResetToken(userId: string, code: string): Promise<any> {
    const [token] = await this.db.select().from(passwordResetTokens)
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
    await this.db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async updateUserEmail(userId: string, email: string): Promise<void> {
    await this.db.update(users)
      .set({ email })
      .where(eq(users.id, userId));
  }

  async createUserNotification(userId: string, type: string, title: string, body: string, drawId?: string, metadata?: string): Promise<UserNotification> {
    const [notification] = await this.db.insert(userNotifications).values({
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
    await this.db.insert(userNotifications).values(values);
  }

  async getUserNotifications(userId: string, limit = 50): Promise<UserNotification[]> {
    return this.db.select().from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(limit);
  }

  async markUserNotificationRead(id: string, userId: string): Promise<boolean> {
    const [result] = await this.db.update(userNotifications)
      .set({ isRead: true })
      .where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)))
      .returning();
    return !!result;
  }

  async markAllUserNotificationsRead(userId: string): Promise<boolean> {
    await this.db.update(userNotifications)
      .set({ isRead: true })
      .where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
    return true;
  }

  async getUnreadUserNotificationCount(userId: string): Promise<number> {
    const [result] = await this.db.select({ count: count() }).from(userNotifications)
      .where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
    return result?.count || 0;
  }

  async updateUserPushToken(userId: string, pushToken: string | null): Promise<void> {
    if (pushToken) {
      await this.db.update(users).set({ pushToken: null }).where(eq(users.pushToken, pushToken));
    }
    await this.db.update(users).set({ pushToken }).where(eq(users.id, userId));
  }

  async getUserPushTokensByIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const result = await this.db.select({ pushToken: users.pushToken })
      .from(users)
      .where(inArray(users.id, userIds));
    return result.map(r => r.pushToken).filter((t): t is string => !!t);
  }

  async getUserApnTokensByIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const result = await this.db.select({ apnToken: users.apnToken })
      .from(users)
      .where(inArray(users.id, userIds));
    return result.map(r => r.apnToken).filter((t): t is string => !!t && t.length > 20);
  }

  async updateUserDeviceTokens(userId: string, tokens: { fcmToken?: string | null; apnToken?: string | null }): Promise<void> {
    const update: Record<string, any> = {};
    if (tokens.fcmToken !== undefined) update.fcmToken = tokens.fcmToken;
    if (tokens.apnToken !== undefined) update.apnToken = tokens.apnToken;
    if (Object.keys(update).length === 0) return;
    await this.db.update(users).set(update).where(eq(users.id, userId));
  }

  async getAllUsersWithFcmTokens(): Promise<{ id: string; fcmToken: string | null; apnToken: string | null }[]> {
    const result = await this.db.select({ id: users.id, fcmToken: users.fcmToken, apnToken: users.apnToken })
      .from(users)
      .where(eq(users.isSuspended, false));
    return result;
  }

  async createEmailVerificationToken(userId: string, code: string, expiresAt: Date): Promise<any> {
    const [token] = await this.db.insert(emailVerificationTokens).values({
      userId,
      code,
      expiresAt,
    }).returning();
    return token;
  }

  async verifyEmailToken(userId: string, code: string): Promise<any> {
    const [token] = await this.db.select().from(emailVerificationTokens)
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
    await this.db.update(emailVerificationTokens)
      .set({ used: true })
      .where(eq(emailVerificationTokens.id, tokenId));
  }

  async setEmailVerified(userId: string): Promise<void> {
    await this.db.update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));
  }

  async getRecentPurchases(limit: number = 5): Promise<{ productName: string; minutesAgo: number }[]> {
    const rows = await this.db
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
    if (!this.inTransaction) return this.atomic(store => store.deleteUser(userId));
    const pendingOrders = await this.getOrdersByUser(userId);
    for (const order of pendingOrders) {
      if (["pending_payment", "pending_review"].includes(order.paymentStatus)) await this.decidePayment(order.id, "rejected", "حذف الحساب");
    }
    const affected = await this.getTicketsByUser(userId);
    await this.db.delete(supportTickets).where(eq(supportTickets.userId, userId));
    await this.db.delete(userNotifications).where(eq(userNotifications.userId, userId));
    await this.db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await this.db.delete(reviews).where(eq(reviews.userId, userId));
    await this.db.delete(tickets).where(eq(tickets.userId, userId));
    for (const drawId of new Set(affected.map(t => t.drawId).filter((id): id is string => !!id))) {
      const draw = await this.getDraw(drawId);
      if (draw && draw.status !== "completed") {
        const remaining = (await this.getTicketsByDraw(drawId)).length;
        await this.db.update(draws).set({ soldTickets: remaining, status: draw.status === "ready_to_draw" ? "scheduled" : draw.status }).where(eq(draws.id, drawId));
      }
    }
    await this.db.update(draws).set({ winnerId: null, winnerTicketId: null }).where(eq(draws.winnerId, userId));
    if (!await this.getActiveDraw()) await this.activateNextScheduledDraw();
    const userOrders = await this.db.select({ id: orders.id }).from(orders).where(eq(orders.userId, userId));
    if (userOrders.length > 0) {
      await this.db.delete(orderItems).where(inArray(orderItems.orderId, userOrders.map((o) => o.id)));
    }
    await this.db.delete(orders).where(eq(orders.userId, userId));
    const result = await this.db.delete(users).where(eq(users.id, userId));
    return (result?.rowCount ?? 0) > 0;
  }

  async createSupportTicket(userId: string, data: { subject: string; message: string; priority: string }): Promise<SupportTicket> {
    const [ticket] = await this.db.insert(supportTickets).values({
      userId,
      subject: data.subject,
      message: data.message,
      priority: data.priority,
    }).returning();
    return ticket;
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    return this.db.select().from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicketById(ticketId: string): Promise<SupportTicket | undefined> {
    const [ticket] = await this.db.select().from(supportTickets)
      .where(eq(supportTickets.id, ticketId));
    return ticket;
  }

  async getAllSupportTickets(): Promise<(SupportTicket & { username: string; email: string })[]> {
    const result = await this.db.select({
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
    const [ticket] = await this.db.update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return ticket;
  }
}

export const storage = new DatabaseStorage();


