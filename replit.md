# Forsa (فرصة) - Product Catalog + Draw Rounds

## Overview
متجر إلكتروني عربي بالكامل (RTL) مربوط بنظام سحب على جوائز. المتجر والسحب
**مفكوكين تماماً**: العميل بيشتري أي منتج من الكتالوج، وحسب قيمة مشترياته
بياخد تذاكر لجولة السحب النشطة. لما تنباع كل تذاكر الجولة بيتم السحب على
جائزتها، وبتفتح الجولة التالية.

### آلية التذاكر
```
عدد التذاكر = floor( (قيمة المشتريات − الخصم) ÷ سعر التذكرة )
```
- سعر التذكرة يُحدَّد لكل جولة (افتراضي 10$)
- التذاكر **تُمنح بعد تأكيد الأدمن للدفع فقط** — لا عند إنشاء الطلب
- الزيادة عن سعة الجولة تنتقل للجولة التالية تلقائياً
- إذا ما في جولة مفتوحة، التذاكر تبقى معلّقة (drawId = null) وتُسلَّم لأول جولة تُفتح

### دورة حياة الجولة
```
scheduled → active → ready_to_draw → completed
```

## Tech Stack
- **Frontend**: Expo (React Native) + expo-router
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Email**: nodemailer / Resend
- **Auth**: جلسات (express-session + connect-pg-simple)
- **State**: React Query + React Context

## Project Structure
```
app/
  _layout.tsx           الجذر مع المزوّدات
  auth.tsx              تسجيل دخول/حساب جديد
  draw.tsx              صفحة الجولة الحالية + تذاكر المستخدم + شرح الآلية
  cart.tsx              السلة (AsyncStorage) مع معاينة التذاكر المتوقعة
  checkout.tsx          الدفع — طلب واحد متعدد المنتجات
  favorites.tsx         المفضلة
  winners.tsx           الفائزون (جولات مكتملة)
  referral.tsx          برنامج الإحالة
  notifications.tsx     إشعارات المستخدم
  (tabs)/
    index.tsx           المتجر — كتالوج + بحث + تصنيفات + بانر الجولة
    tickets.tsx         طلباتي وتذاكري
    client.tsx          طلبات الشراكة التجارية
    profile.tsx         الملف الشخصي
  product/[id].tsx      صفحة المنتج (كم تذكرة بيعطي)
  order/[id].tsx        تتبّع الطلب + سطوره + تذاكره
  admin/index.tsx       لوحة الإدارة (11 قسم)
components/
  ProductCard.tsx       بطاقة منتج
  DrawBanner.tsx        بانر الجولة (الجائزة + التقدّم + تذاكر المستخدم)
lib/
  cart-context.tsx      السلة على مستوى المنتجات
  favorites-context.tsx المفضلة
server/
  routes.ts             مسارات الـ API
  storage.ts            طبقة قاعدة البيانات (checkout / awardTicketsForOrder / drawWinner)
shared/
  schema.ts             مخطط Drizzle
```

## Database Tables
`users`, `products`, `draws`, `orders`, `order_items`, `tickets`,
`payment_methods`, `coupons`, `activity_log`, `reviews`,
`admin_notifications`, `user_notifications`, `support_tickets`,
`wallet_transactions`, `email_verification_tokens`,
`password_reset_tokens`, `campaign_client_requests`

## API — المسارات الأساسية
```
GET    /api/products              كتالوج المنتجات المعروضة
GET    /api/products/:id
GET    /api/draws/current         الجولة الحالية + تقدّمها + تذاكر المستخدم
GET    /api/draws/completed       الجولات المنتهية
POST   /api/checkout              إنشاء الطلب (transaction واحد)
GET    /api/orders                طلباتي مع سطورها
GET    /api/orders/:id            تفاصيل الطلب + تذاكره
GET    /api/tickets               كل تذاكري
GET    /api/winners               الفائزون (عام)

# إدارة
GET/POST/PUT/DELETE  /api/admin/products
GET/POST/PUT/DELETE  /api/admin/draws
POST   /api/admin/draws/:id/activate
POST   /api/admin/draws/:id/draw-winner
PUT    /api/admin/orders/:id/payment     تأكيد الدفع → منح التذاكر
PUT    /api/admin/orders/:id/shipping
```

## Admin Panel (app/admin/index.tsx)
الرئيسية · الإشعارات · الطلبات · تذاكر الدعم · المستخدمين ·
**المنتجات** · **جولات السحب** · الدفع · الكوبونات · السجل · الإعدادات

## Key Features
- كتالوج منتجات مع مخزون (أو غير محدود)، تصنيفات، بحث
- جولات سحب متتالية بجوائز وأعداد تذاكر يحدّدها الأدمن
- الدفع يدوي: تحويل بنكي برفع إيصال، أو دفع عند الاستلام — الأدمن يؤكّد
- محفظة رصيد تخصم فعلياً من المستحق وتُسترجع عند رفض الدفع
- كوبونات خصم (%) تُطبَّق مرة واحدة على الطلب
- إحالات: 10$ للمُحيل + 5$ ترحيبية
- إشعارات: Expo Push + FCM + APNs + إشعارات داخل التطبيق + إيميلات
- تذاكر دعم داخل التطبيق
- RTL كامل عبر I18nManager.forceRTL

## سلامة البيانات
- `checkout()` كامل داخل transaction مع `FOR UPDATE` على صفوف المنتجات والكوبون
  والمستخدم — يمنع البيع الزائد وتكرار استخدام الكوبون
- الأسعار تُحسب في السيرفر من قاعدة البيانات، لا تُؤخذ من العميل
- `awardTicketsForOrder()` idempotent — استدعاؤه مرتين لا يضاعف التذاكر
- اختيار الفائز عبر `crypto.randomInt` (بدون انحياز)

## Admin Credentials
- Username: admin
- Password: من متغيّر البيئة ADMIN_PASSWORD (الافتراضي admin123)

## Ports
- Frontend (Expo): 8081
- Backend (Express): 5000

## Recent Changes
- User notifications system: user_notifications table, bell icon with badge in home header, notifications page (app/notifications.tsx), auto-notifications for: new campaigns → all users, low stock (10%) → campaign participants, sold out → participants, draw completed → participants, winner announced → all users, you won → winner. API: GET/PUT /api/notifications, GET /api/notifications/unread-count, PUT /api/notifications/read-all
- Shopping cart feature: CartProvider (AsyncStorage), cart page (app/cart.tsx), add-to-cart button on campaign detail, cart icon with badge in home header, POST /api/cart-purchase for multi-item checkout
- Email notification system (nodemailer) for order confirmations, payment updates, winner notifications, shipping updates, password reset
- Password reset flow with 6-digit codes (15min expiry), forgot-password.tsx page. Fallback: if email fails to send, OTP code is returned in API response and displayed on-screen in yellow warning box (same pattern as registration OTP fallback)
- Campaign image upload in admin panel (expo-image-picker + /api/admin/campaigns/upload-image endpoint)
- Rate limiting: authLimiter (20 req/15min) for auth routes, apiLimiter (60 req/min) for general API
- Auto-seed default payment methods (Bank Transfer, Cash on Delivery) on first startup
- Added user profile fields (fullName, phone, address, city, country) with edit-profile.tsx page
- Profile completion required before purchase (checkout redirects to edit-profile if incomplete)
- Reviews & ratings system on campaign pages (1-5 stars with optional comments)
- Admin notifications tab with real-time new order/receipt upload alerts
- CSV export for orders in admin panel (GET /api/admin/orders/export/csv)
- FAQ page (app/faq.tsx) with 10 expandable items in Arabic
- Admin panel expanded to 8 tabs (added Notifications section)
- Countdown timer on campaign cards and detail page (shows days/hours/minutes/seconds when endsAt is set)
- Product categories: category field on campaigns (electronics, fashion, beauty, accessories, other), category filter tabs on home page, category picker in admin campaign creation
- Favorites system: FavoritesProvider (AsyncStorage), heart icon on campaign cards and detail page, favorites page (app/favorites.tsx)
- Winners page (app/winners.tsx): Shows completed campaigns with winner usernames, GET /api/winners endpoint
- Referral program: Auto-generated 6-char referral codes, referral page (app/referral.tsx) with share/copy, GET /api/referral, POST /api/referral/apply, referral tracking
- Admin sales charts: Daily sales bar chart (last 7 days) in admin dashboard, GET /api/admin/sales-chart endpoint
- Social proof banners: Real-time recent purchase notifications on home page (GET /api/recent-purchases), hidden when no confirmed purchases exist
- Offline detection: Red banner appears at top of screen when internet connection is lost, auto-dismisses on reconnect
- Email OTP verification: 6-digit code sent on registration, POST /api/auth/verify-email, POST /api/auth/resend-verification, email_verification_tokens table, OTP input screen in auth.tsx with auto-focus and resend countdown (60s). Fallback: if email fails to send, OTP code is returned in API response and displayed on-screen. Admin can manually verify users via PUT /api/admin/verify-user/:userId
- Delete account: DELETE /api/auth/delete-account endpoint, confirmation dialog in profile page, deletes all user data (orders, tickets, notifications, reviews)
- External privacy policy and terms pages: GET /privacy-policy and GET /terms serve standalone HTML pages for App Store/Google Play submission
- App language updated: "سحوبات" (raffles/draws) replaced with "هدايا" (gifts) throughout entire app — all UI screens, server notifications, email templates, landing page, FAQ, admin panel. "السحب" → "اختيار الفائز"
- Support tickets system: support_tickets table (id, userId, subject, message, status, priority, adminReply, repliedAt, closedAt), replaced WhatsApp/Instagram contact with in-app ticket system. User API: POST/GET /api/support-tickets, GET /api/support-tickets/:id. Admin API: GET /api/admin/support-tickets, PUT /api/admin/support-tickets/:id. Admin gets "تذاكر الدعم" tab in admin panel. User gets ticket form + list in contact page. Admin reply sends user notification.
- Currency: Reverted from ر.س (Saudi Riyal) back to $ (Dollar) across all screens
- Trust proxy: Added app.set("trust proxy", 1) to fix rate limiter behind Replit proxy
- CSV export: Fixed quote escaping, newline stripping, formula injection prevention, UTF-8 BOM for Arabic support
- Color theme update: All gradients updated from deep violet only to purple→pink gradient (#7C3AED → #A855F7 → #EC4899) matching the app logo across all screens, emails, and landing page
- Splash screen: Regenerated with purple-to-pink gradient background and gift box icon matching the app logo

- iOS upload fix: Receipt and campaign image uploads use FileSystem.readAsStringAsync + Blob + FormData on native to avoid "Unsupported FormDataPart implementation" error in Expo Go. Web uses standard File + FormData.
- Store compliance: Added iOS camera/photo permissions (NSCameraUsageDescription, NSPhotoLibraryUsageDescription), Android permissions (CAMERA, READ_EXTERNAL_STORAGE, READ_MEDIA_IMAGES), expo-image-picker plugin config
- Admin auto-seed: Server auto-creates admin user on first run using ADMIN_PASSWORD env var (defaults to admin123 if not set)
- Price range filter: Home page has price filter chips (أقل من 50$, 50-100$, أكثر من 100$, الكل) below category tabs
- Admin bulk notifications: POST /api/admin/broadcast-notification endpoint, modal in admin Notifications tab to send to all users
- Admin users CSV export: GET /api/admin/users/export/csv endpoint, CSV download button in admin Users tab
- Image caching: expo-image with cachePolicy="memory-disk" on CampaignCard and campaign detail page
- Animations: Campaign card entrance fade-in + slide-up (staggered), button press scale animations (checkout, add to cart), admin tab transition
- Dark mode: ThemeProvider (lib/theme-context.tsx) detects system preference via useColorScheme, Colors.dark palette in constants/colors.ts, applied to home, profile, tickets, campaign cards, tab bar
- Full RTL conversion: All hardcoded LTR positioning (marginLeft/Right, paddingLeft/Right, left/right) converted to logical properties (marginStart/End, paddingStart/End, start/end) across all screens. Decorative elements and full-width overlays (left:0/right:0) kept as-is. I18nManager.forceRTL(true) set globally.
- Admin advanced stats: Conversion rate and average order value added to admin dashboard (GET /api/admin/dashboard)
- Multi-variant campaigns: campaign_products table for product variants (e.g., different storage/color options). Each variant has name, nameAr, price, quantity, soldQuantity. Admin can toggle "موديلات متعددة" when creating campaigns. Campaign detail shows variant selector. Cart and checkout pass productId. Campaign-level price/quantity/soldQuantity are auto-aggregated via syncCampaignAggregates(). Admin CRUD: POST/PUT/DELETE /api/admin/campaigns/:id/products, /api/admin/campaign-products/:id
- Multi-image product variants: campaign_products.images_json (text) stores JSON array of base64 image URLs. Admin panel shows thumbnails strip with +/✕ buttons (up to 5 images per variant). Upload endpoint: POST /api/admin/campaigns/upload-product-image. Frontend parses imagesJson via parseProductImages() helper. Variant card image area taps to open ImageLightbox (full-screen modal with PanResponder swipe, dots nav, prev/next arrows). Selection remains on name/price tap.
- Campaign hero banner redesign: minHeight 360, rounded bottom corners (borderRadius 28), decorative translucent circles (no image), "حملة حصرية" badge, price callout ("ابتداءً من X $"), richer gradient overlay.

## Admin Credentials
- Username: admin
- Password: Set via ADMIN_PASSWORD environment variable (defaults to admin123)

## Ports
- Frontend (Expo): 8081
- Backend (Express): 5000

## Workflow Configuration (Important)
- Frontend workflow uses `EXPO_PACKAGER_PROXY_URL=https://$REPLIT_DEV_DOMAIN:8081` (includes port 8081) — without the port, the packager proxies to port 80 → local 8082 (nothing), causing "Failed to download remote update" in the canvas simulator
- Frontend workflow does NOT use `--localhost` — allows `REACT_NATIVE_PACKAGER_HOSTNAME` to set the Replit dev domain in the exp:// URL, making the canvas simulator able to connect
- Frontend workflow does NOT use `--clear` — preserves Metro bundle cache between restarts so subsequent starts are fast (~5s vs ~90s rebuild)
- metro.config.js has `resolver.blockList` excluding `.local/**` to prevent FallbackWatcher ENOENT crash on Replit workflow-log temp dirs
