import { Resend } from "resend";

const APP_NAME = "لاكي درو - LuckyDraw";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email,
  };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || "onboarding@resend.dev",
  };
}

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f0ff; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 24px rgba(124,58,237,0.08); }
    .header { background: linear-gradient(135deg, #7C3AED, #6D28D9); padding: 32px 24px; text-align: center; }
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
    .btn { display: inline-block; background: linear-gradient(135deg, #7C3AED, #6D28D9); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; margin: 16px 0; }
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
      <p>منصة التسوق والسحوبات</p>
    </div>
    ${content}
    <div class="footer">
      <p>${APP_NAME}</p>
      <p>جميع الحقوق محفوظة &copy; ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

function isResendConfigured(): boolean {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isResendConfigured()) {
    console.log("[Email] Resend not configured (dev mode), skipping email to", to);
    return false;
  }

  try {
    const { client, fromEmail } = await getUncachableResendClient();
    if (!fromEmail || fromEmail === "onboarding@resend.dev") {
      console.warn("[Email] No from_email configured in Resend integration, using default");
    }
    await client.emails.send({
      from: `${APP_NAME} <${fromEmail}>`,
      to,
      subject,
      html,
    });
    console.log("[Email] Sent to", to);
    return true;
  } catch (err: any) {
    console.error("[Email] Failed to send to", to, ":", err?.message || err);
    return false;
  }
}

export async function sendOrderConfirmation(
  to: string,
  data: { orderId: string; campaignTitle: string; quantity: number; totalAmount: string; ticketNumbers: string[]; paymentMethod: string }
) {
  const ticketsHtml = data.ticketNumbers.map(t => `<span class="badge badge-info" style="margin: 2px;">${t}</span>`).join(" ");

  const html = baseTemplate(`
    <div class="body">
      <h2>تم تأكيد طلبك بنجاح!</h2>
      <p>شكراً لك! تم استلام طلبك وسيتم معالجته في أقرب وقت.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">رقم الطلب</span><span class="info-value">#${data.orderId.slice(0, 8)}</span></div>
        <div class="info-row"><span class="info-label">المنتج</span><span class="info-value">${data.campaignTitle}</span></div>
        <div class="info-row"><span class="info-label">الكمية</span><span class="info-value">${data.quantity}</span></div>
        <div class="info-row"><span class="info-label">المبلغ</span><span class="info-value">${data.totalAmount} ر.س</span></div>
        <div class="info-row"><span class="info-label">طريقة الدفع</span><span class="info-value">${data.paymentMethod}</span></div>
      </div>
      <p><strong>تذاكر السحب:</strong></p>
      <div style="margin: 12px 0;">${ticketsHtml}</div>
      <p>بالتوفيق في السحب!</p>
    </div>
  `);

  await sendEmail(to, `تأكيد الطلب #${data.orderId.slice(0, 8)} - ${APP_NAME}`, html);
}

export async function sendPaymentStatusUpdate(
  to: string,
  data: { orderId: string; status: string; campaignTitle: string; rejectionReason?: string }
) {
  const statusMap: Record<string, { label: string; badge: string; message: string }> = {
    confirmed: { label: "تم التأكيد", badge: "badge-success", message: "تم تأكيد دفعتك بنجاح! سيتم شحن طلبك قريباً." },
    rejected: { label: "مرفوض", badge: "badge-error", message: `تم رفض إيصال الدفع. ${data.rejectionReason ? `السبب: ${data.rejectionReason}` : "يرجى رفع إيصال صحيح."}` },
    pending_review: { label: "قيد المراجعة", badge: "badge-warning", message: "تم استلام إيصال الدفع وجاري مراجعته." },
  };

  const statusInfo = statusMap[data.status] || { label: data.status, badge: "badge-info", message: "" };

  const html = baseTemplate(`
    <div class="body">
      <h2>تحديث حالة الدفع</h2>
      <p>تم تحديث حالة الدفع لطلبك:</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">رقم الطلب</span><span class="info-value">#${data.orderId.slice(0, 8)}</span></div>
        <div class="info-row"><span class="info-label">المنتج</span><span class="info-value">${data.campaignTitle}</span></div>
        <div class="info-row"><span class="info-label">الحالة</span><span class="info-value"><span class="${statusInfo.badge} badge">${statusInfo.label}</span></span></div>
      </div>
      <p>${statusInfo.message}</p>
    </div>
  `);

  await sendEmail(to, `تحديث حالة الدفع - طلب #${data.orderId.slice(0, 8)} - ${APP_NAME}`, html);
}

export async function sendWinnerNotification(
  to: string,
  data: { campaignTitle: string; prizeName: string; ticketNumber: string }
) {
  const html = baseTemplate(`
    <div class="body">
      <div class="winner-box">
        <h3>مبروك! أنت الفائز!</h3>
        <p>لقد تم اختيارك كفائز في السحب</p>
      </div>
      <div class="info-box">
        <div class="info-row"><span class="info-label">الحملة</span><span class="info-value">${data.campaignTitle}</span></div>
        <div class="info-row"><span class="info-label">الجائزة</span><span class="info-value">${data.prizeName}</span></div>
        <div class="info-row"><span class="info-label">تذكرة الفوز</span><span class="info-value">${data.ticketNumber}</span></div>
      </div>
      <p>سيتم التواصل معك قريباً لترتيب تسليم الجائزة. تأكد من تحديث بيانات التواصل في ملفك الشخصي.</p>
      <p>ألف مبروك!</p>
    </div>
  `);

  await sendEmail(to, `مبروك! أنت الفائز - ${data.campaignTitle} - ${APP_NAME}`, html);
}

export async function sendEmailVerificationCode(
  to: string,
  data: { code: string; username: string }
) {
  if (!isResendConfigured()) {
    console.log(`[Email] Resend not configured. Verification code for ${to} is: ${data.code}`);
    return;
  }

  const html = baseTemplate(`
    <div class="body">
      <h2>تحقق من بريدك الإلكتروني</h2>
      <p>مرحباً ${data.username}،</p>
      <p>شكراً لتسجيلك في لاكي درو! استخدم الرمز التالي لتفعيل حسابك:</p>
      <div class="code-box">${data.code}</div>
      <p>هذا الرمز صالح لمدة <strong>15 دقيقة</strong> فقط.</p>
      <p>إذا لم تقم بالتسجيل، يرجى تجاهل هذا البريد.</p>
    </div>
  `);

  await sendEmail(to, `رمز التحقق - ${APP_NAME}`, html);
}

export async function sendPasswordResetCode(
  to: string,
  data: { code: string; username: string }
) {
  if (!isResendConfigured()) {
    console.log(`[Email] Resend not configured. Password reset code for ${to} is: ${data.code}`);
    return;
  }

  const html = baseTemplate(`
    <div class="body">
      <h2>إعادة تعيين كلمة المرور</h2>
      <p>مرحباً ${data.username}،</p>
      <p>لقد طلبت إعادة تعيين كلمة المرور. استخدم الرمز التالي:</p>
      <div class="code-box">${data.code}</div>
      <p>هذا الرمز صالح لمدة <strong>15 دقيقة</strong> فقط.</p>
      <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
    </div>
  `);

  await sendEmail(to, `رمز إعادة تعيين كلمة المرور - ${APP_NAME}`, html);
}

export async function sendShippingUpdate(
  to: string,
  data: { orderId: string; campaignTitle: string; status: string; trackingNumber?: string }
) {
  const statusMap: Record<string, { label: string; emoji: string }> = {
    processing: { label: "جاري التجهيز", emoji: "📦" },
    shipped: { label: "تم الشحن", emoji: "🚚" },
    delivered: { label: "تم التوصيل", emoji: "✅" },
  };

  const statusInfo = statusMap[data.status] || { label: data.status, emoji: "📋" };

  const html = baseTemplate(`
    <div class="body">
      <h2>${statusInfo.emoji} تحديث حالة الشحن</h2>
      <div class="info-box">
        <div class="info-row"><span class="info-label">رقم الطلب</span><span class="info-value">#${data.orderId.slice(0, 8)}</span></div>
        <div class="info-row"><span class="info-label">المنتج</span><span class="info-value">${data.campaignTitle}</span></div>
        <div class="info-row"><span class="info-label">حالة الشحن</span><span class="info-value">${statusInfo.label}</span></div>
        ${data.trackingNumber ? `<div class="info-row"><span class="info-label">رقم التتبع</span><span class="info-value">${data.trackingNumber}</span></div>` : ""}
      </div>
    </div>
  `);

  await sendEmail(to, `${statusInfo.emoji} تحديث الشحن - طلب #${data.orderId.slice(0, 8)} - ${APP_NAME}`, html);
}
