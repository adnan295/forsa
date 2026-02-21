# LuckyDraw - E-Commerce Raffle Platform

## Overview
Mobile-first e-commerce application with an automated raffle system. Products are sold in limited quantities with real-time inventory tracking via progress bars. When a campaign sells out, the system triggers a random draw to select a winner from all ticket holders.

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
  (tabs)/
    _layout.tsx         # Tab navigation (Campaigns, My Tickets, Profile)
    index.tsx           # Home - campaign list with progress
    tickets.tsx         # User's raffle tickets
    profile.tsx         # Profile + Admin dashboard
  campaign/
    [id].tsx            # Campaign detail with purchase flow
components/
  CampaignCard.tsx      # Campaign card with progress bar
  ErrorBoundary.tsx     # Error boundary wrapper
constants/
  colors.ts             # Design tokens (navy + gold theme)
lib/
  auth-context.tsx      # Auth provider (login/register/logout)
  query-client.ts       # React Query config + API helpers
server/
  index.ts              # Express server entry
  routes.ts             # API routes (auth, campaigns, purchases, admin)
  storage.ts            # Database storage layer
  db.ts                 # Database connection
  templates/
    landing-page.html   # Static landing page
shared/
  schema.ts             # Drizzle schema (users, campaigns, orders, tickets)
```

## Key Features
- Campaign listing with real-time progress bars
- Purchase flow with quantity selection and ticket generation
- Unique ticket numbers (LD-{timestamp}-{random})
- Cryptographically secure random winner selection
- Admin dashboard (stats, create campaigns, draw winners)
- Session-based authentication

## Design
- Luxury theme: Navy (#0A1628) + Metallic Gold (#D4A853)
- Inter font family
- Tab-based navigation with 3 tabs

## Admin Credentials
- Username: admin
- Password: admin123

## Ports
- Frontend (Expo): 8081
- Backend (Express): 5000
