# Bakaloo Admin Dashboard — Developer Guide

> **Version**: Phase 1 — Foundation + Dashboard Overview  
> **Stack**: Next.js 14 (App Router) + TypeScript + Shadcn UI + TanStack Query + Recharts + Socket.IO  
> **Runs on**: `http://localhost:3002`  
> **Backend API**: `http://localhost:3000/api/v1`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Design System](#design-system)
5. [Authentication Flow](#authentication-flow)
6. [Data Fetching Pattern](#data-fetching-pattern)
7. [Real-Time (Socket.IO)](#real-time-socketio)
8. [Dashboard Page Breakdown](#dashboard-page-breakdown)
9. [Component Reference](#component-reference)
10. [Adding a New Page](#adding-a-new-page)
11. [Environment Variables](#environment-variables)
12. [File-by-File Reference](#file-by-file-reference)

---

## Quick Start

```bash
# 1. Navigate to the dashboard project
cd bakaloo-dashboard

# 2. Install dependencies (already done)
npm install

# 3. Copy env and configure
cp .env.example .env.local
# Edit .env.local if your backend is on a different host/port

# 4. Start the backend first (in another terminal)
cd ../bakaloo-backend && npm run dev

# 5. Start the dashboard
npm run dev -- -p 3002

# 6. Open http://localhost:3002
# You'll be redirected to /login — use admin credentials
```

### Default Admin Credentials
Create an admin user via the backend seed or API. The login endpoint is:
```
POST /api/v1/admin/auth/login
Body: { "email": "admin@bakaloo.com", "password": "Admin@123" }
```

---

## Project Structure

```
bakaloo-dashboard/
├── .env.local              # Environment variables
├── .env.example            # Template for env vars
├── next.config.mjs         # Next.js config (image domains, rewrites)
├── tailwind.config.ts      # Tailwind + brand colors + animations
├── components.json         # Shadcn UI configuration
├── src/
│   ├── app/
│   │   ├── globals.css          # Design tokens, custom CSS, brand colors
│   │   ├── layout.tsx           # Root layout: fonts, QueryProvider, Toaster
│   │   ├── page.tsx             # Root redirect → /dashboard
│   │   ├── (auth)/
│   │   │   ├── layout.tsx       # Centered auth layout (no sidebar)
│   │   │   └── login/page.tsx   # Login form with react-hook-form + zod
│   │   └── (dashboard)/
│   │       ├── layout.tsx       # Auth-guarded: Sidebar + Header + SocketProvider
│   │       ├── dashboard/page.tsx   # ★ Main dashboard overview
│   │       ├── orders/page.tsx      # Placeholder (Phase 2)
│   │       ├── products/page.tsx    # Placeholder (Phase 2)
│   │       ├── categories/page.tsx  # Placeholder (Phase 2)
│   │       ├── customers/page.tsx   # Placeholder (Phase 2)
│   │       ├── riders/page.tsx      # Placeholder (Phase 2)
│   │       ├── coupons/page.tsx     # Placeholder (Phase 2)
│   │       ├── wallet/page.tsx      # Placeholder (Phase 2)
│   │       ├── notifications/page.tsx # Placeholder (Phase 2)
│   │       ├── reviews/page.tsx     # Placeholder (Phase 2)
│   │       ├── analytics/page.tsx   # Placeholder (Phase 2)
│   │       ├── banners/page.tsx     # Placeholder (Phase 2)
│   │       └── settings/page.tsx    # Placeholder (Phase 2)
│   ├── components/
│   │   ├── ui/                 # 21 Shadcn UI components (button, card, dialog, etc.)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # 260px collapsible sidebar, nav sections
│   │   │   ├── Header.tsx       # 64px header with search + notification bell
│   │   │   ├── MobileNav.tsx    # Sheet-based mobile sidebar
│   │   │   └── NotificationPanel.tsx  # Popover notification dropdown
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx     # Stat card (primary green gradient + default white)
│   │   │   ├── RevenueChart.tsx # Area chart with period switcher (7D/30D/90D)
│   │   │   ├── CategoryDonut.tsx    # Pie chart – revenue by category
│   │   │   ├── OrdersByHourChart.tsx # Bar chart – 24h order distribution
│   │   │   ├── TopProducts.tsx      # Ranked list with progress bars
│   │   │   ├── RecentOrders.tsx     # Scrollable order feed with status badges
│   │   │   ├── LowStockAlerts.tsx   # Urgency-sorted stock alerts
│   │   │   ├── PendingActions.tsx   # 4 count badges (orders, stock, riders, campaigns)
│   │   │   ├── LiveRiderMap.tsx     # Google Maps with rider pins
│   │   │   └── index.ts            # Barrel exports
│   │   ├── shared/
│   │   │   ├── PageHeader.tsx    # Reusable page header (title + subtitle + actions)
│   │   │   ├── LoadingSkeleton.tsx  # Multiple skeleton variants (stat-card, chart, table, list)
│   │   │   └── EmptyState.tsx   # Empty state with icon + message + optional CTA
│   │   └── providers/
│   │       ├── QueryProvider.tsx    # TanStack Query provider + DevTools
│   │       └── SocketProvider.tsx   # Socket.IO connection + dashboard event handlers
│   ├── hooks/
│   │   ├── useDashboard.ts     # 9 TanStack Query hooks for dashboard data
│   │   ├── useDebounce.ts      # Generic debounce hook
│   │   └── useSocket.ts        # useRiderLocations() + useSocketEvent()
│   ├── services/
│   │   ├── auth.service.ts     # loginAdmin(), changePassword()
│   │   └── dashboard.service.ts # 9 API functions (stats, charts, orders, etc.)
│   ├── store/
│   │   ├── auth.store.ts       # Zustand: user, token, login/logout/hydrate
│   │   ├── sidebar.store.ts    # Zustand: isOpen (mobile), isCollapsed (desktop)
│   │   └── notifications.store.ts  # Zustand: notifications array, unreadCount
│   ├── lib/
│   │   ├── api.ts              # Axios instance: Bearer token, 401 redirect, 15s timeout
│   │   ├── constants.ts        # ORDER_STATUSES, STATUS_CONFIG, SIDEBAR_NAV, CATEGORY_COLORS
│   │   ├── queryClient.ts      # SSR-safe QueryClient singleton
│   │   └── utils.ts            # cn(), formatINR(), formatShort(), formatDate(), etc.
│   ├── types/
│   │   ├── api.types.ts        # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   │   ├── dashboard.types.ts  # DashboardStats, RevenueDataPoint, TopProduct, etc.
│   │   ├── order.types.ts      # Order, OrderItem, OrderTimeline, OrderDetail
│   │   ├── user.types.ts       # UserRole, User, AdminUser, AuthResponse
│   │   └── index.ts            # Barrel export
│   └── middleware.ts           # Next.js middleware (placeholder for server-side auth)
```

---

## Architecture Overview

```
┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐
│   Browser     │    │   Next.js 14     │    │   Backend (3000)  │
│   (port 3002) │───▶│   App Router     │───▶│   Fastify API     │
│               │    │                  │    │   PostgreSQL      │
│               │    │   SocketProvider │◀──▶│   Socket.IO       │
└──────────────┘    └──────────────────┘    │   Redis           │
                                            └───────────────────┘
```

### Data Flow

```
User Interaction
    │
    ▼
Component (React)
    │
    ▼
Hook (useDashboardStats, useRecentOrders, etc.)
    │  ← TanStack Query manages caching, refetching, loading states
    ▼
Service (dashboard.service.ts)
    │  ← Axios HTTP call with Bearer token
    ▼
Backend API (GET /api/v1/admin/dashboard/stats)
    │
    ▼
Response → TanStack Query cache → Component re-render
```

### Real-Time Flow

```
Backend emits Socket.IO event
    │
    ▼
SocketProvider receives event (e.g., "dashboard:new_order")
    │
    ├──▶ Toast notification (sonner)
    ├──▶ Invalidate TanStack Query keys (auto-refetch)
    └──▶ Update notification store (Zustand)
```

---

## Design System

### Brand Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `brand-500` | `#1A7A3C` | Primary brand green |
| `brand-50` | `#E8F5E9` | Light green background |
| `brand-400` | `#66BB6A` | Secondary green |
| `brand-700` | `#10602A` | Dark green text |

### Semantic Colors
| Token | Hex | Background | Usage |
|-------|-----|------------|-------|
| `success` | `#10B981` | `#ECFDF5` | Delivered, positive trends |
| `warning` | `#F59E0B` | `#FFFBEB` | Pending, low stock |
| `danger` | `#EF4444` | `#FEF2F2` | Cancelled, out of stock, errors |
| `info` | `#3B82F6` | `#EFF6FF` | Confirmed, informational |

### Typography
- **Font**: Geist Sans (loaded locally via `next/font/local`)
- **Headings**: `font-bold tracking-tight` (2xl for page titles, base for card titles)
- **Body**: 14px (text-sm)
- **Labels**: 12px uppercase tracking-wider

### Layout Constants
- **Sidebar width**: 260px (collapsed: 72px)
- **Header height**: 64px
- **Main content padding**: 16px (mobile), 24px (desktop)

### Status Badge Colors
Each order status has a specific background + text color pair defined in `src/lib/constants.ts`:
- PENDING: amber (#FFF8E1 / #F59E0B)
- CONFIRMED: blue (#EFF6FF / #3B82F6)
- PREPARING: purple (#F5F3FF / #8B5CF6)
- OUT_FOR_DELIVERY: green (#E8F5E9 / #1A7A3C)
- DELIVERED: emerald (#ECFDF5 / #10B981)
- CANCELLED: red (#FEF2F2 / #EF4444)

---

## Authentication Flow

1. **Login** (`/login`): User enters email + password
2. **API call**: `POST /api/v1/admin/auth/login` → returns `{ user, accessToken }`
3. **Persist**: Token + user object stored in `localStorage` via Zustand auth store
4. **Redirect**: Navigate to `/dashboard`
5. **Guard**: `(dashboard)/layout.tsx` hydrates auth from `localStorage` on mount; redirects to `/login` if no token
6. **API calls**: Axios interceptor attaches `Authorization: Bearer <token>` to every request
7. **401 handling**: If backend returns 401, Axios interceptor clears storage and redirects to `/login`
8. **Logout**: Clears `localStorage`, redirects to `/login`

### Token Details
- **Type**: JWT (8 hour expiry, set by backend)
- **Storage**: `localStorage` keys: `accessToken`, `admin-user`
- **No refresh token**: Admin tokens have long expiry; user must re-login after 8 hours

---

## Data Fetching Pattern

### Services Layer (`src/services/`)
Each service file exports async functions that make HTTP calls:

```typescript
// Example: src/services/dashboard.service.ts
export async function getDashboardStats(period): Promise<DashboardStats> {
  const { data } = await api.get('/admin/dashboard/stats', { params: { period } })
  return data.data  // unwrap ApiResponse<T>
}
```

### Hooks Layer (`src/hooks/`)
Each hook wraps a service function with TanStack Query:

```typescript
// Example: src/hooks/useDashboard.ts
export function useDashboardStats(period = "week") {
  return useQuery({
    queryKey: ["dashboard", "stats", period],
    queryFn: () => getDashboardStats(period),
    staleTime: 60 * 1000,  // 1 minute
  })
}
```

### Component Layer
Components consume hooks and render data:

```tsx
const { data, isLoading, isError } = useDashboardStats("week")

if (isLoading) return <LoadingSkeleton variant="stat-card" count={4} />
if (isError) return <EmptyState title="Failed to load" />
return <StatCard value={data.revenue.value} ... />
```

### Cache Configuration
| Data | staleTime | Refresh | Notes |
|------|-----------|---------|-------|
| Dashboard stats | 60s | On period change | Main stat cards |
| Revenue chart | 5min | On period switch | 7D/30D/90D |
| Orders by hour | 5min | Manual | BarChart |
| Top products | 5min | Manual | Ranked list |
| Low stock alerts | 2min | Manual | Urgency |
| Pending actions | 30s | Manual | Count badges |
| Live stats | 10s | Every 15s (auto) | Active bar |
| Recent orders | 30s | On new_order event | Feed |
| Category revenue | 5min | Manual | Donut chart |

---

## Real-Time (Socket.IO)

### Connection
`SocketProvider.tsx` creates a Socket.IO connection:
- **URL**: `NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3000`)
- **Auth**: Passes JWT token in `auth.token`
- **Reconnection**: Enabled with 5 attempts

### Dashboard Events

| Event | Trigger | Action |
|-------|---------|--------|
| `dashboard:new_order` | New order placed | Toast + invalidate `dashboard` queries |
| `dashboard:low_stock` | Product hits threshold | Toast warning + add to notification store |
| `dashboard:payment_received` | Payment confirmed | Toast success |
| `dashboard:rider_locations` | Every 10s | Update rider map markers |

### Adding a New Event
1. Add handler in `src/components/providers/SocketProvider.tsx`
2. Optionally create a hook in `src/hooks/useSocket.ts`
3. Invalidate relevant query keys for auto-refresh

---

## Dashboard Page Breakdown

The dashboard page (`src/app/(dashboard)/dashboard/page.tsx`) assembles these sections:

### 1. Page Header + Period Filter
- Title: "Dashboard" with subtitle
- Period tabs: Today / This Week / This Month / This Year
- Period change re-fetches stat cards

### 2. Live Activity Bar
- Green accent bar showing real-time data
- Active orders count, online riders, today's revenue
- Auto-refreshes every 15 seconds via `useLiveStats()`

### 3. Stat Cards (4-column grid)
- **Total Revenue** (primary green gradient with sparkline)
- **Total Orders** (white card with sparkline)
- **Products** (white card)
- **Customers** (white card)
- Each shows value, trend percentage, and comparison text

### 4. Charts Row (60/40 split)
- **Revenue Trend** (AreaChart): Switchable 7D/30D/90D periods
- **Revenue by Category** (PieChart/Donut): 6 category segments with center total

### 5. Orders + Actions Row (60/40 split)
- **Orders by Hour** (BarChart): 24-hour distribution with peak highlight
- **Pending Actions**: 4 colored count cards (orders, stock, riders, campaigns)

### 6. Product + Order Row (50/50 split)
- **Top Products**: Ranked list with images, progress bars, revenue
- **Recent Orders**: Scrollable feed with status badges and relative time

### 7. Alerts + Map Row (50/50 split)
- **Low Stock Alerts**: Urgency-sorted, color-coded stock counts
- **Live Rider Map**: Google Maps with rider location pins (real-time)

---

## Component Reference

### StatCard
```tsx
<StatCard
  label="Total Revenue"
  value="₹1.24L"
  change={12.5}           // positive = green, negative = red
  sparkline={[10,15,12,20,18,25]}  // optional mini chart
  icon={<IndianRupee />}
  variant="primary"       // "primary" = green gradient, "default" = white
/>
```

### RevenueChart
Self-contained: manages its own period state and fetches data via `useRevenueChart()`.

### CategoryDonut
```tsx
<CategoryDonut
  data={[{ category: "Fruits", revenue: 50000 }, ...]}
  isLoading={false}
/>
```

### RecentOrders
```tsx
<RecentOrders data={recentOrders} isLoading={false} />
```
Expects array of `RecentOrder` objects (order_number, customer_name, total_amount, status, created_at).

### LiveRiderMap
Self-contained: subscribes to `useRiderLocations()` for real-time data. Falls back to placeholder if no Google Maps API key.

---

## Adding a New Page

Example: Adding a full "Orders" management page.

### 1. Create the types
```typescript
// src/types/order.types.ts — already exists
```

### 2. Create the service
```typescript
// src/services/orders.service.ts
import api from "@/lib/api"
import type { ApiResponse, PaginatedResponse, Order } from "@/types"

export async function getOrders(params): Promise<PaginatedResponse<Order>> {
  const { data } = await api.get('/admin/orders', { params })
  return data.data
}
```

### 3. Create the hook
```typescript
// src/hooks/useOrders.ts
import { useQuery } from "@tanstack/react-query"
import { getOrders } from "@/services/orders.service"

export function useOrders(params) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => getOrders(params),
  })
}
```

### 4. Create the page
```typescript
// src/app/(dashboard)/orders/page.tsx
"use client"
import { useOrders } from "@/hooks/useOrders"
// ... build your table, filters, etc.
```

### 5. Sidebar entry
Already configured in `src/lib/constants.ts` → `SIDEBAR_NAV`.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3000/api/v1` | Backend API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | `http://localhost:3000` | Socket.IO server URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | No | — | Google Maps API key for rider map |

---

## File-by-File Reference

### Configuration

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Brand color scale, semantic colors, font family, custom animations |
| `globals.css` | CSS variables: shadcn HSL vars, brand hex colors, shadows, layout vars, shimmer animation, stat-card gradient |
| `components.json` | Shadcn UI: new-york style, CSS variables, path aliases |
| `next.config.mjs` | Image domains (Cloudinary), optional API proxy rewrites |
| `.env.local` | Runtime environment: API URL, Socket URL, Maps key |

### Core Libraries

| File | Purpose |
|------|---------|
| `lib/api.ts` | Axios instance with Bearer token interceptor, 401 auto-redirect |
| `lib/utils.ts` | Utility functions: `cn()`, `formatINR()`, `formatShort()`, `formatDate()`, `formatTrend()` |
| `lib/constants.ts` | Order statuses with badge colors, sidebar navigation, chart colors |
| `lib/queryClient.ts` | SSR-safe TanStack QueryClient factory |

### State Management (Zustand)

| Store | State | Key Methods |
|-------|-------|-------------|
| `auth.store.ts` | `user`, `accessToken`, `isAuthenticated` | `login()`, `logout()`, `hydrate()` |
| `sidebar.store.ts` | `isOpen`, `isCollapsed` | `toggle()`, `setCollapsed()` |
| `notifications.store.ts` | `notifications[]`, `unreadCount` | `addNotification()`, `markAllRead()` |

### Services → Hooks → Components

```
dashboard.service.ts
├── getDashboardStats(period)    → useDashboardStats()     → StatCard × 4
├── getRevenueChart(days)        → useRevenueChart()       → RevenueChart
├── getOrdersByHour()            → useOrdersByHour()       → OrdersByHourChart
├── getTopProducts(limit)        → useTopProducts()        → TopProducts
├── getLowStockAlerts(threshold) → useLowStockAlerts()     → LowStockAlerts
├── getPendingActions()          → usePendingActions()     → PendingActions
├── getLiveStats()               → useLiveStats()          → Live Activity Bar
├── getRecentOrders(limit)       → useRecentOrders()       → RecentOrders
└── getCategoryRevenue()         → useCategoryRevenue()    → CategoryDonut
```

---

## Backend API Endpoints Used

| Endpoint | Method | Dashboard Component |
|----------|--------|---------------------|
| `/admin/auth/login` | POST | Login page |
| `/admin/dashboard/stats` | GET | Stat cards |
| `/admin/dashboard/revenue-chart` | GET | Revenue line chart |
| `/admin/dashboard/orders-by-hour` | GET | Orders bar chart |
| `/admin/dashboard/top-products` | GET | Top products list |
| `/admin/dashboard/low-stock-alerts` | GET | Low stock alerts |
| `/admin/dashboard/pending-actions` | GET | Pending actions |
| `/admin/dashboard/live-stats` | GET | Live activity bar |
| `/admin/dashboard/category-revenue` | GET | Category donut |
| `/admin/orders` | GET | Recent orders |

---

## Build & Deploy

```bash
# Development
npm run dev -- -p 3002

# Production build
npm run build
npm start -- -p 3002

# Type checking only
npx tsc --noEmit

# Lint
npm run lint
```

### Build Output
The production build generates 19 static pages:
- 1 redirect page (`/`)
- 1 auth page (`/login`)
- 1 main dashboard page (`/dashboard`)
- 12 placeholder pages (orders, products, etc.)
- Dashboard page JS bundle: ~265 kB (first load, includes Recharts)

---

*Generated for Phase 1. In Phase 2, placeholder pages will be replaced with full feature implementations (orders table, product CRUD, rider management, etc.).*
