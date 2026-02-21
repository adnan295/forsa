# LuckyDraw - E-Commerce Raffle Platform

## Overview
Mobile-first e-commerce application with an automated raffle system. Products are sold in limited quantities with real-time inventory tracking via progress bars. When a campaign sells out, the system triggers a random draw to select a winner from all ticket holders. Full Arabic UI with RTL support.

## Tech Stack
- **Frontend**: Expo (React Native) with expo-router file-based routing
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based (express-session + connect-pg-simple)
- **State**: React Query (@tanstack/react-query) + React Context

## Project Structure
```
app/                    # Expo Router screens
  _layout.tsx           # Root layout with providers
  auth.tsx              # Login/Register screen
  checkout.tsx          # Checkout page (payment method, bank details, coupon, shipping address)
  info.tsx              # Info pages (about, terms, privacy, contact) via ?type= param
  (tabs)/
    _layout.tsx         # Tab navigation (Campaigns, My Orders, Profile)
    index.tsx           # Home - campaign list with search bar, filter tabs, progress bars
    tickets.tsx         # My Orders & Tickets (dual sub-tabs, enhanced empty states)
    profile.tsx         # Profile with stats, activity menu, settings, admin entry
  campaign/
    [id].tsx            # Campaign detail → navigates to checkout
  order/
    [id].tsx            # Order tracking (payment status, receipt upload, shipping timeline)
  admin/
    index.tsx           # Comprehensive admin panel (7 tabs)
components/
  CampaignCard.tsx      # Campaign card with progress bar
  ErrorBoundary.tsx     # Error boundary wrapper
constants/
  colors.ts             # Design tokens (purple/pink gradient theme)
lib/
  auth-context.tsx      # Auth provider (login/register/logout)
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
- users (with fullName, phone, address, city, country, emailVerified), campaigns, orders (with shipping_status, tracking_number, shipping_address), tickets, payment_methods, coupons, activity_log, reviews, admin_notifications

## Design
- Luxury theme: Navy (#0A1628) + Metallic Gold (#D4A853)
- Inter font family
- Tab-based navigation with 3 tabs
- Full Arabic UI with RTL support

## Recent Changes
- Added user profile fields (fullName, phone, address, city, country) with edit-profile.tsx page
- Profile completion required before purchase (checkout redirects to edit-profile if incomplete)
- Searchable country picker with Arab countries prioritized (130+ countries in Arabic)
- Auto-fill shipping address from user profile data in checkout
- Social sharing button on campaign detail page (share-social icon in hero header)
- Reviews & ratings system on campaign pages (1-5 stars with optional comments)
- Admin notifications tab with real-time new order/receipt upload alerts
- CSV export for orders in admin panel (GET /api/admin/orders/export/csv)
- FAQ page (app/faq.tsx) with 10 expandable items in Arabic
- Admin panel expanded to 8 tabs (added Notifications section)

## Admin Credentials
- Username: admin
- Password: admin123

## Ports
- Frontend (Expo): 8081
- Backend (Express): 5000
