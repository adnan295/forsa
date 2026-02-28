# Forsa (فرصة) - E-Commerce Gifts Platform

## Overview
Mobile-first e-commerce application with an automated gift/prize system. Products are sold in limited quantities with real-time inventory tracking via progress bars. When a campaign sells out, the system triggers a random selection to choose a gift winner from all buyers. Full Arabic UI with RTL support.

## Tech Stack
- **Frontend**: Expo (React Native) with expo-router file-based routing
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Email**: Resend (via Replit integration)
- **Auth**: Session-based (express-session + connect-pg-simple)
- **State**: React Query (@tanstack/react-query) + React Context

## Project Structure
```
app/                    # Expo Router screens
  _layout.tsx           # Root layout with providers
  auth.tsx              # Login/Register screen
  cart.tsx              # Shopping cart page (view/edit cart items, proceed to checkout)
  checkout.tsx          # Checkout page (supports single-item and cart-based purchase)
  favorites.tsx         # Favorites page (saved campaigns)
  winners.tsx           # Winners page (completed campaigns with winner info)
  referral.tsx          # Referral program page (code, share, stats)
  info.tsx              # Info pages (about, terms, privacy, contact) via ?type= param
  (tabs)/
    _layout.tsx         # Tab navigation (Campaigns, My Orders, Profile)
    index.tsx           # Home - campaign list with search, filter, category tabs, progress bars
    tickets.tsx         # My Orders & Tickets (dual sub-tabs, enhanced empty states)
    profile.tsx         # Profile with stats, activity menu, settings, admin entry
  campaign/
    [id].tsx            # Campaign detail with countdown timer → navigates to checkout
  order/
    [id].tsx            # Order tracking (payment status, receipt upload, shipping timeline)
  admin/
    index.tsx           # Comprehensive admin panel (8 tabs) with sales charts
components/
  CampaignCard.tsx      # Campaign card with progress bar, countdown timer, favorite heart
  ErrorBoundary.tsx     # Error boundary wrapper
constants/
  colors.ts             # Design tokens (purple/pink gradient theme)
lib/
  auth-context.tsx      # Auth provider (login/register/logout)
  favorites-context.tsx # Favorites provider (AsyncStorage-based)
  cart-context.tsx       # Cart provider (AsyncStorage-based)
  query-client.ts       # React Query config + API helpers
server/
  index.ts              # Express server entry
  routes.ts             # API routes (auth, campaigns, purchases, admin, receipts)
  storage.ts            # Database storage layer (full CRUD for all entities)
  db.ts                 # Database connection
  uploads/              # Receipt image uploads directory
  templates/
    landing-page.html   # Static landing page
shared/
  schema.ts             # Drizzle schema (users, campaigns, orders, tickets, payment_methods, coupons, activity_log)
```

## Key Features
- Campaign listing with real-time progress bars
- Full checkout flow with payment method selection, bank transfer details, coupon codes, shipping address
- Receipt upload for bank transfer payments (expo-image-picker for mobile, file input for web)
- Payment verification workflow: pending_payment → pending_review → confirmed/rejected
- Order tracking page with payment status, receipt preview, shipping timeline
- My Orders tab with payment/shipping status pills and order navigation
- Unique ticket numbers (LD-{timestamp}-{random})
- Cryptographically secure random winner selection
- Session-based authentication

## Admin Panel (app/admin/index.tsx)
Comprehensive admin dashboard with 7 sections:
1. **Dashboard (الرئيسية)** - Revenue, orders, users, active campaigns stats, top campaigns
2. **Orders (الطلبات)** - All orders with shipping status management (pending/processing/shipped/delivered/cancelled), tracking numbers
3. **Users (المستخدمين)** - User list with order count, ticket count, total spent
4. **Campaigns (الحملات)** - Create/delete campaigns, draw winners, progress tracking
5. **Payment Methods (الدفع)** - CRUD with enable/disable toggle
6. **Coupons (الكوبونات)** - Create/delete discount coupons with usage tracking
7. **Activity Log (السجل)** - Audit trail of user registrations, purchases, draws

## Admin API Endpoints
- GET /api/admin/dashboard - comprehensive stats
- GET/PUT /api/admin/orders - order management with shipping
- GET /api/admin/users - user management with stats
- DELETE /api/admin/campaigns/:id - campaign deletion
- GET/POST/PUT/DELETE /api/admin/payment-methods - payment methods CRUD
- GET/POST/PUT/DELETE /api/admin/coupons - coupons CRUD
- GET /api/admin/activity-log - audit trail

## Database Tables
- users (with fullName, phone, address, city, country, emailVerified, referralCode, referredBy), campaigns (with category, endsAt), orders (with shipping_status, tracking_number, shipping_address), tickets, payment_methods, coupons, activity_log, reviews, admin_notifications, user_notifications, support_tickets, email_verification_tokens, password_reset_tokens

## Design
- Luxury theme: Purple (#7C3AED) + Pink (#EC4899) gradient
- Inter font family
- Tab-based navigation with 3 tabs
- Full Arabic UI with RTL support

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

- Store compliance: Added iOS camera/photo permissions (NSCameraUsageDescription, NSPhotoLibraryUsageDescription), Android permissions (CAMERA, READ_EXTERNAL_STORAGE, READ_MEDIA_IMAGES), expo-image-picker plugin config
- Admin auto-seed: Server auto-creates admin user on first run using ADMIN_PASSWORD env var (defaults to admin123 if not set)
- Price range filter: Home page has price filter chips (أقل من 50$, 50-100$, أكثر من 100$, الكل) below category tabs
- Admin bulk notifications: POST /api/admin/broadcast-notification endpoint, modal in admin Notifications tab to send to all users
- Admin users CSV export: GET /api/admin/users/export/csv endpoint, CSV download button in admin Users tab
- Image caching: expo-image with cachePolicy="memory-disk" on CampaignCard and campaign detail page
- Animations: Campaign card entrance fade-in + slide-up (staggered), button press scale animations (checkout, add to cart), admin tab transition
- Dark mode: ThemeProvider (lib/theme-context.tsx) detects system preference via useColorScheme, Colors.dark palette in constants/colors.ts, applied to home, profile, tickets, campaign cards, tab bar
- Admin advanced stats: Conversion rate and average order value added to admin dashboard (GET /api/admin/dashboard)

## Admin Credentials
- Username: admin
- Password: Set via ADMIN_PASSWORD environment variable (defaults to admin123)

## Ports
- Frontend (Expo): 8081
- Backend (Express): 5000
