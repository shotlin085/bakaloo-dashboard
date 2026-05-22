# Bakaloo Grocery Dashboard — Tester & Developer Guide

> **Version:** 1.0.0  
> **Last Updated:** June 2025  
> **Dashboard URL:** `http://localhost:3002`  
> **Backend API:** `http://localhost:3000/api/v1`

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Project File Structure](#3-project-file-structure)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Dashboard Layout & Navigation](#5-dashboard-layout--navigation)
6. [Feature-by-Feature Testing Guide](#6-feature-by-feature-testing-guide)
   - [6.1 Dashboard (Home)](#61-dashboard-home)
   - [6.2 Orders](#62-orders)
   - [6.3 Create New Order](#63-create-new-order-multi-step-wizard)
   - [6.4 Products](#64-products)
   - [6.5 Create / Edit Product](#65-create--edit-product)
   - [6.6 Categories](#66-categories)
   - [6.7 Customers](#67-customers)
   - [6.8 Riders](#68-riders)
   - [6.9 Reviews](#69-reviews)
   - [6.10 Wallet & Transactions](#610-wallet--transactions)
   - [6.11 Coupons](#611-coupons)
   - [6.12 Banners](#612-banners)
   - [6.13 Notifications](#613-notifications)
   - [6.14 Analytics](#614-analytics)
   - [6.15 Settings](#615-settings)
   - [6.16 Team & Roles](#616-team--roles)
   - [6.17 Activity Log](#617-activity-log)
7. [Real-Time Features (Socket.IO)](#7-real-time-features-socketio)
8. [Dark Mode Testing](#8-dark-mode-testing)
9. [Responsive / Mobile Testing](#9-responsive--mobile-testing)
10. [Drag-and-Drop Testing](#10-drag-and-drop-testing)
11. [Form Validation Testing](#11-form-validation-testing)
12. [State Management Overview](#12-state-management-overview)
13. [API Service Layer](#13-api-service-layer)
14. [Known Patterns & Conventions](#14-known-patterns--conventions)
15. [Bug Report Template](#15-bug-report-template)
16. [Improvement Suggestion Template](#16-improvement-suggestion-template)
17. [Testing Checklist](#17-testing-checklist)

---

## 1. Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| PostgreSQL | 14+ |
| Redis | 6+ |
| npm / yarn / pnpm | Latest |

### Setup Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd bakaloo

# 2. Start the Backend
cd backend
cp .env.example .env          # Configure DB, Redis, JWT secrets
npm install
npm run migrate                # Run database migrations
npm run seed                   # Seed sample data
npm run dev                    # Starts on http://localhost:3000

# 3. Start the Dashboard
cd ../bakaloo-dashboard
npm install
npm run dev                    # Starts on http://localhost:3002
```

### Login Credentials

| Field | Value |
|---|---|
| **URL** | `http://localhost:3002/login` |
| **Email** | `admin@bakaloo.com` |
| **Password** | `Admin@123` |

> **Rate Limit:** 5 login attempts per 15 minutes. After 3 failed attempts, a warning message appears.

---

## 2. Tech Stack & Architecture

### Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.35 | App Router, SSR framework |
| React | 18 | UI library |
| TypeScript | Strict mode | Type safety |
| Tailwind CSS | 3.x | Utility-first styling, `darkMode: "class"` |
| Shadcn UI | new-york style | Pre-built accessible components |
| TanStack Query | 5.90.21 | Server state, caching, mutations |
| Zustand | 5.0.11 | Client-side state management |
| Axios | 1.13.5 | HTTP client with interceptors |
| Recharts | 3.7.0 | Charts & data visualization |
| Socket.IO Client | 4.x | Real-time WebSocket communication |
| @dnd-kit | core 6.3.1 / sortable 10.0.0 | Drag-and-drop functionality |
| Zod | 4.3.6 | Form & data validation |
| Sonner | 2.0.7 | Toast notifications |
| next-themes | 0.4.6 | Dark/light mode theming |
| dayjs | 1.11.19 | Date formatting & relative time |
| react-day-picker | latest | Date range pickers |

### Architecture Pattern

```
┌──────────────────────────────────────────────────────┐
│                    Next.js App Router                  │
│                                                        │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │  Pages    │──│  Hooks    │──│  Services (API)  │───│──→ Backend API
│  │  (UI)     │  │  (Logic)  │  │  (Axios calls)   │   │
│  └──────────┘  └───────────┘  └──────────────────┘   │
│       │              │                                  │
│       ▼              ▼                                  │
│  ┌──────────┐  ┌───────────┐                           │
│  │Components │  │  Stores   │                           │
│  │ (Reusable)│  │ (Zustand) │                           │
│  └──────────┘  └───────────┘                           │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────┐  ┌───────────┐                           │
│  │  Types   │  │   Lib     │                           │
│  │  (TS)    │  │ (Helpers) │                           │
│  └──────────┘  └───────────┘                           │
└──────────────────────────────────────────────────────┘
```

**Data flow:** Page → Hook (TanStack Query) → Service (Axios) → Backend API → Response → Cache → UI

---

## 3. Project File Structure

```
bakaloo-dashboard/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx              # Login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                  # Dashboard layout (sidebar + header + auth guard)
│   │   │   ├── dashboard/page.tsx          # Home dashboard with KPIs & charts
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx                # Orders list with bulk actions
│   │   │   │   └── new/page.tsx            # 6-step manual order wizard
│   │   │   ├── products/
│   │   │   │   ├── page.tsx                # Products list (table + grid views)
│   │   │   │   ├── new/page.tsx            # Create product form
│   │   │   │   └── [id]/edit/page.tsx      # Edit product form
│   │   │   ├── categories/page.tsx         # Category tree with drag-and-drop
│   │   │   ├── customers/page.tsx          # Customer management
│   │   │   ├── riders/page.tsx             # Rider management (grid + table)
│   │   │   ├── reviews/page.tsx            # Product reviews & moderation
│   │   │   ├── wallet/page.tsx             # Wallet transactions
│   │   │   ├── coupons/page.tsx            # Coupon management
│   │   │   ├── banners/page.tsx            # Banner management with DnD reorder
│   │   │   ├── notifications/page.tsx      # Templates & campaigns
│   │   │   ├── analytics/page.tsx          # Full analytics dashboard
│   │   │   ├── settings/page.tsx           # 14 settings groups + 2FA
│   │   │   ├── team/page.tsx               # Team members + roles/permissions
│   │   │   └── activity-log/page.tsx       # Audit trail
│   │   ├── globals.css                     # Global styles
│   │   └── layout.tsx                      # Root layout
│   │
│   ├── components/
│   │   ├── dashboard/                      # Dashboard-specific widgets
│   │   │   ├── StatCard.tsx                # KPI stat card with sparkline
│   │   │   ├── RevenueChart.tsx            # Revenue time series line chart
│   │   │   ├── CategoryDonut.tsx           # Category revenue donut chart
│   │   │   ├── RevenueVsOrders.tsx         # Dual-axis comparison chart
│   │   │   ├── OrdersByHourChart.tsx        # Hourly orders bar chart
│   │   │   ├── TopProducts.tsx             # Top products table widget
│   │   │   ├── RecentOrders.tsx            # Recent orders feed
│   │   │   ├── LowStockAlerts.tsx          # Low stock warning widget
│   │   │   ├── PendingActions.tsx          # Admin action items
│   │   │   ├── LiveRiderMap.tsx            # Real-time rider GPS map
│   │   │   └── index.ts                   # Barrel exports
│   │   │
│   │   ├── layout/                         # Layout components
│   │   │   ├── Sidebar.tsx                 # Main navigation sidebar
│   │   │   ├── Header.tsx                  # Top header bar
│   │   │   ├── ThemeToggle.tsx             # Dark/light mode switch
│   │   │   ├── GlobalSearch.tsx            # Command palette search
│   │   │   ├── MobileNav.tsx              # Mobile slide-out navigation
│   │   │   └── NotificationPanel.tsx       # Notification popover panel
│   │   │
│   │   ├── shared/                         # Shared reusable components
│   │   │   ├── DateRangePicker.tsx         # Date range picker component
│   │   │   ├── EmptyState.tsx             # Empty state placeholder
│   │   │   ├── ErrorBoundary.tsx          # React error boundary
│   │   │   ├── LoadingSkeleton.tsx        # Loading skeleton component
│   │   │   └── PageHeader.tsx             # Page title + actions header
│   │   │
│   │   ├── banners/
│   │   │   └── BannerDialog.tsx           # Create/edit banner modal
│   │   ├── coupons/
│   │   │   ├── CouponDialog.tsx           # Create/edit coupon modal
│   │   │   └── CouponAnalyticsDrawer.tsx  # Coupon analytics slide-over
│   │   ├── customers/
│   │   │   └── CustomerProfileDrawer.tsx  # Customer detail slide-over
│   │   ├── notifications/
│   │   │   ├── CampaignDialog.tsx         # Send/schedule campaign modal
│   │   │   └── TemplateDialog.tsx         # Create/edit template modal
│   │   ├── orders/
│   │   │   └── OrderDetailDrawer.tsx      # Order detail slide-over
│   │   ├── products/
│   │   │   ├── BulkImportDialog.tsx       # CSV bulk import modal
│   │   │   ├── ImageUpload.tsx            # Image upload with preview
│   │   │   ├── InlineStockEdit.tsx        # Inline stock editing
│   │   │   └── ProductForm.tsx            # Full product form (create/edit)
│   │   ├── reviews/
│   │   │   └── ReviewCard.tsx             # Individual review display
│   │   ├── riders/
│   │   │   └── RiderDetailDrawer.tsx      # Rider detail slide-over
│   │   ├── wallet/
│   │   │   └── BulkCreditDialog.tsx       # CSV bulk wallet credit modal
│   │   │
│   │   ├── providers/                      # Context providers
│   │   │   ├── QueryProvider.tsx           # TanStack Query provider
│   │   │   ├── SocketProvider.tsx          # Socket.IO connection provider
│   │   │   └── ThemeProvider.tsx           # Theme (dark/light) provider
│   │   │
│   │   └── ui/                             # Shadcn UI primitives (20+ components)
│   │       ├── button.tsx, card.tsx, dialog.tsx, drawer.tsx, dropdown-menu.tsx
│   │       ├── input.tsx, label.tsx, select.tsx, switch.tsx, table.tsx
│   │       ├── tabs.tsx, badge.tsx, popover.tsx, separator.tsx, sheet.tsx
│   │       ├── skeleton.tsx, sonner.tsx, textarea.tsx, tooltip.tsx
│   │       └── ... (avatar, calendar, chart, checkbox, command, radio-group, scroll-area, slider)
│   │
│   ├── hooks/                              # Custom React hooks (18 hooks)
│   │   ├── useActivityLogs.ts             # Activity log queries
│   │   ├── useAnalytics.ts               # Analytics data queries
│   │   ├── useBanners.ts                 # Banner CRUD + reorder
│   │   ├── useCategories.ts              # Category CRUD + reorder
│   │   ├── useCoupons.ts                 # Coupon CRUD + analytics
│   │   ├── useCustomers.ts               # Customer queries + actions
│   │   ├── useDashboard.ts               # Dashboard stats + live data
│   │   ├── useDebounce.ts                # Input debounce utility
│   │   ├── useNotifications.ts           # Notification template/campaign hooks
│   │   ├── useOrders.ts                  # Order queries + mutations
│   │   ├── useProducts.ts                # Product CRUD + bulk actions
│   │   ├── useRBAC.ts                    # Role-based access control
│   │   ├── useReviews.ts                 # Review queries + moderation
│   │   ├── useRiders.ts                  # Rider queries + live locations
│   │   ├── useSettings.ts                # Settings read/write
│   │   ├── useSocket.ts                  # Socket.IO connection hook
│   │   ├── useUploads.ts                 # File upload hook
│   │   └── useWallet.ts                  # Wallet queries + credit actions
│   │
│   ├── services/                          # API service layer (17 services)
│   │   ├── activity-log.service.ts        # GET /activity-logs
│   │   ├── analytics.service.ts          # GET /analytics/*
│   │   ├── auth.service.ts               # POST /auth/login, GET /auth/me
│   │   ├── banners.service.ts            # CRUD /banners
│   │   ├── categories.service.ts         # CRUD /categories + reorder
│   │   ├── coupons.service.ts            # CRUD /coupons + analytics
│   │   ├── customers.service.ts          # GET/PATCH /customers
│   │   ├── dashboard.service.ts          # GET /dashboard/*
│   │   ├── notifications.service.ts      # CRUD /notifications/*
│   │   ├── orders.service.ts             # CRUD /orders + bulk ops
│   │   ├── products.service.ts           # CRUD /products + import/export
│   │   ├── rbac.service.ts               # CRUD /roles, /permissions
│   │   ├── reviews.service.ts            # GET/PATCH /reviews
│   │   ├── riders.service.ts             # CRUD /riders
│   │   ├── settings.service.ts           # GET/PATCH /settings
│   │   ├── uploads.service.ts            # POST /uploads
│   │   └── wallet.service.ts             # GET/POST /wallet
│   │
│   ├── types/                             # TypeScript type definitions (17 files)
│   │   ├── api.types.ts                  # Generic API response types
│   │   ├── index.ts                      # Barrel exports
│   │   ├── user.types.ts                 # User/Admin types
│   │   ├── upload.types.ts               # Upload response types
│   │   └── [feature].types.ts            # Per-feature type definitions
│   │
│   ├── store/                             # Zustand stores (3 stores)
│   │   ├── auth.store.ts                 # Auth state (user, token, login/logout)
│   │   ├── notifications.store.ts        # Notification state (list, unread count)
│   │   └── sidebar.store.ts              # Sidebar collapsed/expanded state
│   │
│   ├── lib/                               # Utility library
│   │   ├── api.ts                        # Axios instance with auth interceptor
│   │   ├── constants.ts                  # App-wide constants
│   │   ├── queryClient.ts               # TanStack Query client config
│   │   ├── utils.ts                      # Helper functions (cn, formatCurrency, etc.)
│   │   └── validations.ts               # Zod validation schemas
│   │
│   └── middleware.ts                      # Next.js middleware (route protection)
│
├── public/                                # Static assets
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── components.json                        # Shadcn UI configuration
```

---

## 4. Authentication & Authorization

### Auth Flow

1. **Login:** User enters email + password → POST `/api/v1/auth/login`
2. **Token Storage:** JWT access token + user object saved to `localStorage`
3. **Cookie:** `auth_session=1` cookie set (7-day expiry) for middleware route protection
4. **Middleware:** Checks `auth_session` cookie on every navigation — redirects unauthenticated users to `/login?redirect=<original-path>`
5. **API Calls:** Axios interceptor auto-attaches `Authorization: Bearer <token>` header
6. **Logout:** Clears localStorage + cookie → redirects to `/login`
7. **Session Hydration:** On page load, dashboard layout hydrates auth from localStorage

### What to Test

- [ ] Login with valid credentials → redirects to `/dashboard`
- [ ] Login with wrong password → shows toast error, no redirect
- [ ] Login with wrong email → shows toast error
- [ ] Login 3+ times wrong → rate limit warning appears
- [ ] After login, refresh the page → should stay logged in (localStorage hydration)
- [ ] Open `/dashboard` without login → redirects to `/login`
- [ ] Open `/login` while logged in → redirects to `/dashboard`
- [ ] Click Logout → clears session, returns to login
- [ ] Password field eye toggle → shows/hides password text

---

## 5. Dashboard Layout & Navigation

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ ┌──────┐ ┌──────────────────────────────────────┐   │
│ │      │ │  Header: Search | Connection | Theme  │   │
│ │      │ │          | Notifications | User       │   │
│ │      │ ├──────────────────────────────────────┤   │
│ │ Side │ │                                        │  │
│ │ bar  │ │         Page Content Area              │  │
│ │      │ │                                        │  │
│ │      │ │                                        │  │
│ │      │ │                                        │  │
│ │      │ │                                        │  │
│ └──────┘ └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Sidebar Navigation

| Section | Pages | Badge Info |
|---|---|---|
| **MAIN** | Dashboard, Orders, Products, Categories, Customers, Riders | Orders: pending count, Products: low stock count, Riders: pending approvals |
| **COMMERCE** | Coupons, Wallet & Refunds, Notifications, Reviews | — |
| **ANALYTICS** | Analytics | — |
| **SYSTEM** | Banners, Activity Log, Team & Roles, Settings | — |

### What to Test

- [ ] Sidebar collapse/expand toggle works
- [ ] Collapsed sidebar shows icons only + tooltips on hover
- [ ] Active page is highlighted with accent border
- [ ] Badge counts update when data changes (orders, products, riders)
- [ ] User card at bottom shows correct name + email
- [ ] Logout button works from sidebar
- [ ] Global search opens command palette
- [ ] Connection status indicator shows green (connected) / yellow (reconnecting) / gray (disconnected)
- [ ] Notification bell shows unread count
- [ ] Click notification bell → opens notification panel popover
- [ ] "Mark all read" in notification panel works
- [ ] Theme toggle switches dark ↔ light mode

---

## 6. Feature-by-Feature Testing Guide

### 6.1 Dashboard (Home)

**URL:** `/dashboard`

#### Features

| Feature | Description |
|---|---|
| **Period Selector** | Tabs: Today / This Week / This Month / This Year — changes all stats |
| **Live Activity Bar** | Real-time: active orders, online riders, today's revenue, order count |
| **10 KPI Stat Cards** | Revenue, Orders, Products, Customers, Pending Orders, Low Stock, Online Riders, Today's Revenue, Avg Order Value, COD Collections — each with sparkline chart & % change |
| **Revenue Chart** | Line/area chart showing revenue over time (60% width) |
| **Category Donut** | Donut chart showing revenue breakdown by category (40% width) |
| **Revenue vs Orders** | Dual-axis comparison chart |
| **Orders by Hour** | Bar chart showing hourly order distribution |
| **Top Products** | Table: ranked products by sales |
| **Recent Orders** | Last 10 orders summary |
| **Low Stock Alerts** | Products below stock threshold |
| **Pending Actions** | Actionable items for admin |
| **Live Rider Map** | Real-time GPS map of rider positions (Leaflet/Mapbox, dynamically loaded) |

#### Test Scenarios

- [ ] Switch period tabs → all stat cards and charts reload correctly
- [ ] Stat cards show values, % change arrow (green up / red down), and sparkline
- [ ] Revenue chart renders correctly with tooltip on hover
- [ ] Category donut shows segments with labels
- [ ] Revenue vs Orders chart shows both axes
- [ ] Orders by hour chart renders bars for each hour
- [ ] Top products table shows product names + sales numbers
- [ ] Recent orders shows clickable order entries
- [ ] Low stock alerts shows product names + stock levels
- [ ] Pending actions shows actionable items
- [ ] Live rider map loads (may need backend + active riders)
- [ ] Live activity bar updates in real-time when orders come in

---

### 6.2 Orders

**URL:** `/orders`

#### Features

| Feature | Description |
|---|---|
| **Status Tabs** | ALL + per-status tabs with live badge counts |
| **Search** | Debounced search by order ID, customer name, phone |
| **Advanced Filters** | Payment method, date range, delivery type (express/scheduled/standard), min/max amount, assigned rider, area/pincode |
| **Table** | Checkbox, Order ID, Customer (name + phone), Amount, Payment, Status badge, Rider, Date |
| **Bulk Actions** | Update Status, Assign Rider, Print Packing Slips, Export Selected (CSV) |
| **Row Click** | Opens Order Detail Drawer (slide-over) |
| **Export CSV** | Global export with applied filters |
| **Create Order** | Button → navigates to `/orders/new` |
| **Real-time** | Socket.IO connection status badge with green "Live" dot |
| **Pagination** | Numbered pages with Previous/Next |

#### Test Scenarios

- [ ] Click each status tab → filter updates, badge counts match
- [ ] Type in search box → results filter after debounce delay (~300ms)
- [ ] Open filters panel → test each filter independently and in combination
- [ ] Date range picker → select custom range → orders filter
- [ ] Select multiple rows with checkboxes → bulk action bar appears
- [ ] Bulk Update Status → select new status → orders update
- [ ] Bulk Assign Rider → select rider → orders assigned
- [ ] Bulk Print → opens print-friendly page/URL
- [ ] Export Selected → downloads CSV with selected rows
- [ ] Export CSV (global) → downloads all filtered orders
- [ ] Click a row → Order Detail Drawer opens with full order info
- [ ] Pagination → navigate between pages
- [ ] "New Order" button → navigates to `/orders/new`
- [ ] Socket "Live" indicator visible in top corner

---

### 6.3 Create New Order (Multi-Step Wizard)

**URL:** `/orders/new`

#### 6-Step Wizard

| Step | Name | Fields / Actions |
|---|---|---|
| 1 | **Customer** | Search customers by name/phone → select from results → shows selected customer card |
| 2 | **Products** | Search products → click to add to cart → ± quantity buttons → remove items → subtotal display |
| 3 | **Address** | Address Line, City*, State, Pincode* |
| 4 | **Payment** | Radio: Cash on Delivery / Manual Payment |
| 5 | **Coupon** | Optional coupon code input + clear button |
| 6 | **Confirm** | Full summary: customer, items, subtotal, address, payment, coupon → "Place Order" button |

#### Test Scenarios

- [ ] Step 1: Search a customer → results appear → select one → shows selected
- [ ] Step 1: "Change" button → re-enables customer search
- [ ] Step 2: Search a product → click to add → appears in cart
- [ ] Step 2: Increase/decrease quantity → line total updates
- [ ] Step 2: Remove item from cart
- [ ] Step 2: Cart subtotal calculates correctly
- [ ] Step 3: Fill City + Pincode (required) → can proceed
- [ ] Step 3: Leave required fields empty → cannot proceed to next step
- [ ] Step 4: Select payment method
- [ ] Step 5: Enter coupon code (or skip)
- [ ] Step 6: Review full summary → verify all info matches
- [ ] Step 6: "Place Order" → API call succeeds → redirects to orders list
- [ ] Navigation: Back/Next buttons work correctly
- [ ] Step indicator shows completed, current, and upcoming steps
- [ ] Cannot skip ahead — step validation gates progression

---

### 6.4 Products

**URL:** `/products`

#### Features

| Feature | Description |
|---|---|
| **Search** | Debounced search by name, SKU, barcode |
| **Filters** | Category dropdown, Status (Active / Inactive / On Sale / Low Stock / Out of Stock) |
| **View Toggle** | Table view ↔ Grid view |
| **Table View** | Image + name + SKU, Category, Price (sale + strikethrough MRP), Stock (inline edit), Status badges, Actions dropdown |
| **Grid View** | Product cards with image, hover overlay (Edit + Duplicate), status badge overlays |
| **Inline Stock Edit** | Click stock number in table → edit directly → save |
| **Row Actions** | Edit (→ edit page), Duplicate, Delete |
| **Bulk Actions** | Activate, Deactivate, Delete (confirm dialog) |
| **Import** | CSV bulk import dialog |
| **Export** | CSV export button |
| **Add Product** | Button → `/products/new` |
| **Pagination** | Numbered pages |

#### Test Scenarios

- [ ] Search -> results filter by name/SKU/barcode
- [ ] Filter by category → products filter
- [ ] Filter by status → correct products shown
- [ ] Switch Table ↔ Grid view → layout changes
- [ ] **Table view:** Click stock number → inline edit appears → change value → save → stock updates
- [ ] **Table view:** See price with sale price + strikethrough MRP
- [ ] **Table view:** Status badges (Active, Inactive, Featured, Out of Stock, Low Stock) are correct
- [ ] **Grid view:** Hover over card → Edit + Duplicate buttons appear
- [ ] **Grid view:** Status badges overlay correctly
- [ ] Actions: Edit → navigates to `/products/[id]/edit`
- [ ] Actions: Duplicate → creates copy
- [ ] Actions: Delete → confirm dialog → product removed
- [ ] Select multiple products → bulk actions: Activate / Deactivate / Delete
- [ ] Import → opens CSV import dialog → upload CSV → products imported
- [ ] Export → downloads CSV file
- [ ] Add Product → navigates to `/products/new`

---

### 6.5 Create / Edit Product

**URL:** `/products/new` (create) or `/products/[id]/edit` (edit)

#### Form Fields

| Section | Fields |
|---|---|
| **Basic** | Name*, Description, Category* |
| **Pricing** | MRP*, Sale Price, Cost Price |
| **Inventory** | Stock*, Unit* (kg/g/L/mL/pcs), SKU, Barcode |
| **Media** | Thumbnail URL (image upload), drag-and-drop image reorder |
| **Properties** | Is Featured toggle, Is Active toggle, Low Stock Threshold, Max Order Qty |
| **Variants** | Enable/disable variants, Variant Group Name, Dynamic list: Name, Price, Sale Price, Stock, SKU, Active |
| **SEO** | Meta Title, Meta Description |
| **Food Info** | Ingredients, Allergen Info, Shelf Life, Storage Instructions, Certifications, Nutrition Rows |
| **Tags** | Tag list input |

#### Test Scenarios

- [ ] Create product with just required fields (Name, Category, MRP, Stock, Unit) → saves
- [ ] Fill all fields → saves correctly
- [ ] Edit existing product → form pre-populated → change value → save
- [ ] Validation: Empty required field → error shown
- [ ] Variants: Enable variants → add variants → fill name/price/stock → save
- [ ] Variants: Remove a variant row
- [ ] Image upload → image preview appears
- [ ] Image drag-and-drop reorder (if multiple images)
- [ ] Tags: Add/remove tags
- [ ] SEO fields saved and loaded in edit
- [ ] Nutrition rows: Add/remove rows
- [ ] Back button returns to `/products`

---

### 6.6 Categories

**URL:** `/categories`

#### Features

| Feature | Description |
|---|---|
| **Category Tree** | Hierarchical parent-child display with expand/collapse |
| **Drag-and-Drop** | Reorder categories within same level; grip handle on each row |
| **Each Row** | Drag handle, expand chevron, image, name + description, product count, Active/Inactive status |
| **Actions** | Edit, Add Subcategory, Delete |
| **Create/Edit Dialog** | Name*, Description, Image Upload, Parent Category selector, Sort Order, Active toggle |

#### Test Scenarios

- [ ] Categories display in tree hierarchy
- [ ] Expand a parent → children visible
- [ ] Collapse a parent → children hidden
- [ ] **Drag-and-Drop:** Grab handle → drag category → drop in new position → order updates
- [ ] Drag-and-drop → check new order persists after page refresh
- [ ] Create category → fill name → save → appears in tree
- [ ] Edit category → change name → save → reflects in tree
- [ ] Add Subcategory → creates child under selected parent
- [ ] Delete category → confirm → removed from tree
- [ ] Image upload in dialog works
- [ ] Active/Inactive toggle changes badge
- [ ] Product count badge shows correct number

---

### 6.7 Customers

**URL:** `/customers`

#### Features

| Feature | Description |
|---|---|
| **Summary Cards** | Total Customers, Active, Blocked, Total Revenue |
| **Search** | By name, phone, email |
| **Filters** | Status (Active/Blocked), Segment (VIP/Churned), Sort (Newest/Name/Most Orders/Highest Spent) |
| **Advanced Filters** | Joined date range, Order count min/max, Total spent min/max |
| **Segments** | VIP: ≥10 orders OR ≥₹10,000 spent; Churned: last order >60 days + ≥2 orders |
| **Table** | Name + email + VIP/Churned badge, Phone, Orders count, Total Spent, Wallet, Status, Joined date, Actions |
| **Actions** | Block/Unblock per row |
| **Row Click** | Opens Customer Profile Drawer |
| **Export** | CSV export button |

#### Test Scenarios

- [ ] Summary cards show correct totals
- [ ] Search by name → filters correctly
- [ ] Search by phone/email → filters correctly
- [ ] Filter by Active/Blocked status
- [ ] Filter VIP segment → shows customers with ≥10 orders or ≥₹10k spent
- [ ] Filter Churned → shows customers with last order >60 days ago
- [ ] Advanced filters: date range, order count, spent amount
- [ ] Sort options: Newest, Name, Most Orders, Highest Spent
- [ ] Block a customer → status changes to Blocked
- [ ] Unblock a customer → status changes to Active
- [ ] Click row → Customer Detail Drawer opens
- [ ] Export → downloads CSV

---

### 6.8 Riders

**URL:** `/riders`

#### Features

| Feature | Description |
|---|---|
| **Status Tabs** | All / Online / On Delivery / Offline / Pending Approval / Suspended |
| **Search** | By name or phone |
| **View Toggle** | Grid (cards) ↔ Table view |
| **Grid View** | Avatar, name, phone, status badge, stats: Deliveries, Rating, Vehicle |
| **Table View** | Avatar + name + phone, Vehicle (type + number), Deliveries, Rating, Commission, Status |
| **Row/Card Click** | Opens Rider Detail Drawer |
| **Real-time** | Live rider GPS locations via Socket.IO, "X live" indicator |
| **Pagination** | Page X of Y with Previous/Next |

#### Test Scenarios

- [ ] Click each status tab → correct riders shown
- [ ] Search by name → filters
- [ ] Search by phone → filters
- [ ] Switch Grid ↔ Table view
- [ ] **Grid:** Cards show avatar, name, stats, status badge
- [ ] **Table:** Columns display all rider info
- [ ] Click rider → Rider Detail Drawer opens with full profile
- [ ] Live indicator shows number of active riders
- [ ] Connection status visible
- [ ] Pagination works

---

### 6.9 Reviews

**URL:** `/reviews`

#### Features

| Feature | Description |
|---|---|
| **Product Selector** | Search products → click to select → reviews load |
| **Average Rating** | Star visual + numeric + total count badge |
| **Rating Filter** | All / 5★ / 4★ / 3★ / 2★ / 1★ tabs |
| **Distribution Chart** | Horizontal bars per star level with count + % |
| **Review Cards** | Individual reviews with rating, text, customer info |
| **Moderation** | Reply to review, Approve/Reject, Delete |

#### Test Scenarios

- [ ] Search for a product → select → reviews load
- [ ] Average rating displays correctly
- [ ] Click rating filter tab → reviews filter by star count
- [ ] Distribution chart shows correct bar widths and percentages
- [ ] Reply to a review → reply saves and appears
- [ ] Moderate a review (Approve) → status changes
- [ ] Moderate a review (Reject) → status changes
- [ ] Delete a review → confirm → review removed
- [ ] Pagination between review pages

---

### 6.10 Wallet & Transactions

**URL:** `/wallet`

#### Features

| Feature | Description |
|---|---|
| **Stats Cards** | Total Balance, Total Added (green), Total Used (red), Total Refunded (blue) |
| **Filters** | Search by user ID, Type tabs: All / Credits / Debits / Refunds |
| **Table** | Type badge (Credit/Debit/Refund/Bonus/Scratch with colors), Amount (±), Description, Reference ID, Balance After, Date |
| **Admin Credit** | Dialog: User ID + Amount + Description → credit user wallet |
| **Bulk Credit** | CSV-based bulk wallet credit dialog |

#### Test Scenarios

- [ ] Stats cards show correct totals
- [ ] Search by user ID → filters transactions
- [ ] Click type tabs → filters by Credit/Debit/Refund
- [ ] Type badges have correct colors
- [ ] Amount formatting: green for credits, red for debits
- [ ] Admin Credit dialog: enter User ID + Amount + Description → submit → success toast
- [ ] Bulk Credit dialog: upload CSV → processes → credits applied
- [ ] Pagination works

---

### 6.11 Coupons

**URL:** `/coupons`

#### Features

| Feature | Description |
|---|---|
| **Search** | By code or description |
| **Status Tabs** | All / Active / Expired / Upcoming |
| **Table** | Code (monospace), Discount (% / ₹ flat / Free Delivery / BOGO / Cashback), Min Order, Usage ratio, Dates, Status, Actions |
| **Discount Types** | PERCENTAGE, FLAT, FREE_DELIVERY, BOGO (Buy One Get One), CASHBACK |
| **Actions** | Edit, Analytics, Delete |
| **Create/Edit** | Coupon Dialog with all fields |
| **Coupon Analytics** | Drawer with usage statistics |

#### Test Scenarios

- [ ] Search by coupon code → filters
- [ ] Click status tabs → correct coupons shown
- [ ] Active/Expired/Upcoming status logic correct
- [ ] Create coupon → fill fields → save → appears in list
- [ ] Edit coupon → changes reflect
- [ ] Delete coupon → confirm → removed
- [ ] Coupon Analytics drawer → shows usage stats
- [ ] All discount types display correctly with badges (%, ₹, Free Delivery, BOGO, Cashback)
- [ ] Usage count / limit display (e.g., "45/100")
- [ ] BOGO: Need to select a product
- [ ] Cashback: Need to set cashback %

---

### 6.12 Banners

**URL:** `/banners`

#### Features

| Feature | Description |
|---|---|
| **Filter Tabs** | All (count) / Active / Scheduled / Inactive |
| **Banner Cards** | Banner image, status + type + sort order badges, drag handle on hover |
| **Drag-and-Drop** | Reorder banners by dragging cards → persists new order |
| **Actions** | Edit, Activate/Deactivate, Delete |
| **Create/Edit Dialog** | Title, Image URL, Link Type (none/product/category/url), Link Value, Banner Type (carousel/popup/strip), Active toggle, Start/End Date |
| **Status Logic** | Active / Inactive / Scheduled (future start date) / Expired (past end date) |

#### Test Scenarios

- [ ] Filter tabs: All / Active / Scheduled / Inactive → correct banners
- [ ] Banner cards display images, badges (status, type, sort order)
- [ ] **Drag-and-Drop:** Hover → drag handle appears → drag → reorder → new order saved
- [ ] Drag-and-drop order persists after refresh
- [ ] Create banner → fill fields → save → appears in grid
- [ ] Edit banner → change title/image → save → reflects
- [ ] Activate/Deactivate toggle → status changes
- [ ] Delete banner → confirm → removed
- [ ] Banner type badges: carousel / popup / strip
- [ ] Scheduled banner: set future start date → shows "Scheduled" status
- [ ] Link types: none, product, category, URL → verify link target

---

### 6.13 Notifications

**URL:** `/notifications`

#### Features

**Templates Tab:**
| Feature | Description |
|---|---|
| **Table** | Name, Type (PUSH/SMS/EMAIL/IN_APP), Title, Variables, Updated date, Actions |
| **Types** | PUSH, SMS, EMAIL, IN_APP with colored badges |
| **Actions** | Edit, Delete |
| **Create** | Template Dialog: name, type, title, body, variables |

**Campaigns Tab:**
| Feature | Description |
|---|---|
| **Table** | Title + body preview, Segment, Status (QUEUED/SENDING/SENT/FAILED/SCHEDULED/CANCELLED), Sent count, Opened count + rate %, Date |
| **Segments** | all, active, inactive, new, riders, specific (with phone list) |
| **Send Now** | Campaign Dialog in send mode |
| **Schedule** | Campaign Dialog in schedule mode |

#### Test Scenarios

- [ ] **Templates Tab:**
  - [ ] View template list with type badges
  - [ ] Create template → fill fields → save → appears in list
  - [ ] Edit template → change content → save
  - [ ] Delete template → confirm → removed
- [ ] **Campaigns Tab:**
  - [ ] View campaign list with status badges
  - [ ] Send Now → select segment → compose → send
  - [ ] Schedule → select segment → compose → set date → schedule
  - [ ] Segment "riders" option available
  - [ ] Segment "specific" → enter target phone numbers
  - [ ] Campaign status badges display correctly
  - [ ] Open rate % calculation correct

---

### 6.14 Analytics

**URL:** `/analytics`

#### Features

| Feature | Description |
|---|---|
| **Date Range** | 7D / 30D / 90D tab selector |
| **Group By** | Day / Week / Month toggle |
| **Export** | PDF + Excel download buttons |
| **Summary Cards (4)** | Total Revenue, Total Orders, Avg Order Value, Unique Customers (with % change) |
| **Revenue & Orders Chart** | Dual-axis AreaChart: revenue area + orders dashed line |
| **Top Products Table** | Product, Category, Units Sold, Revenue, Margin Estimate, Conversion Rate |
| **Delivery Performance** | 4 stats (Deliveries, Avg Time, Rating, On-Time %) + hourly BarChart |
| **Rider Comparison** | Table: Rider, Deliveries, Rating, On-Time %, Online/Offline status |
| **Financial Summary** | Gross Revenue, Discounts, Delivery Fees, Net; Payment method breakdown; GST breakdown |
| **Period Comparison** | Current vs Previous: Revenue, Orders, Customers, AOV with % arrows |
| **Customer Cohort Retention** | Heat map: cohort months × order months → retention % |
| **Dead Stock Report** | Products unsold 60+ days: name, SKU, category, stock, days unsold, last sold |
| **Geographic Distribution** | Area table + Top 10 areas bar chart |

#### Test Scenarios

- [ ] Switch date range tabs → all data reloads
- [ ] Group by Day/Week/Month → chart granularity changes
- [ ] Export PDF → downloads PDF file
- [ ] Export Excel → downloads Excel file
- [ ] Summary cards show correct values + % change arrows
- [ ] Revenue & Orders chart renders with tooltips
- [ ] Top Products table sorts correctly
- [ ] Margin column shows estimates
- [ ] Delivery Performance: 4 stat tiles + hourly bar chart
- [ ] Rider Comparison table: rider names, stats, online/offline status
- [ ] Financial Summary: revenue, discounts, delivery fees, net
- [ ] Payment method breakdown adds up to Net
- [ ] GST breakdown by rate
- [ ] Period Comparison shows arrows (up green / down red)
- [ ] Cohort Retention heat map colors intensity matches %
- [ ] Dead Stock: products with dates and stock counts
- [ ] Geographic: area table + bar chart of top 10

---

### 6.15 Settings

**URL:** `/settings`

#### 14 Settings Groups

| # | Group | Key Settings |
|---|---|---|
| 1 | **Delivery** | Fee, free_delivery_above, radius_km, express_delivery_min |
| 2 | **Pricing & Limits** | Platform fee, min_order_amount, cod_max_amount |
| 3 | **Store Info** | Name, GSTIN, support_phone, support_email |
| 4 | **Rider Payouts** | Tiered base pay (0–3km, 3–5km, 5–8km, 8+km), rating_bonus |
| 5 | **Loyalty** | Points per ₹1, value per point |
| 6 | **Payment** | Razorpay keys, COD/Wallet toggles, wallet min/max |
| 7 | **Notifications** | SMS provider, API key, OTP template, order SMS |
| 8 | **Integrations** | Google Maps, Cloudinary, Firebase push toggle |
| 9 | **App Config** | App version, maintenance mode, OTP expiry, low stock threshold |
| 10 | **Delivery Zones** | 3 zones with name, radius, fee |
| 11 | **Delivery Slots** | 3 slots with label, start, end, enabled toggle |
| 12 | **Backup & Data** | Auto backup, frequency, retention, S3 bucket, export toggle |
| 13 | **Branding** | Logo URL, favicon URL, timezone, currency code/symbol |
| 14 | **Email Templates** | From address/name, subjects (welcome/order/delivery), SMTP |

#### Special Features

- **Dirty Tracking:** "Unsaved changes" badge appears when values modified
- **Sticky Save Bar:** Fixed bottom bar with Reset + Save buttons
- **2FA Section:** Enable/disable, QR code setup, 6-digit verification, recovery codes

#### Test Scenarios

- [ ] All 14 groups render with correct settings
- [ ] Change a number setting → "Unsaved changes" badge appears
- [ ] Change a text setting → badge appears
- [ ] Toggle a switch setting → badge appears
- [ ] Click Reset/Discard → changes revert to original
- [ ] Click Save → only changed values sent → success toast
- [ ] Sticky save bar visible when scrolled
- [ ] Sensitive fields (API keys) displayed appropriately
- [ ] 2FA: Enable → QR code dialog appears → enter OTP → verify → recovery codes shown
- [ ] 2FA: Disable toggle
- [ ] Recovery codes display correctly (8 codes in grid)

---

### 6.16 Team & Roles

**URL:** `/team`

#### Features

**Members Tab:**
| Feature | Description |
|---|---|
| **Table** | Name, Email, Role (badge), Status (Active/Inactive), Last Login, Actions |
| **Actions** | Change Role, Activate/Deactivate, Remove |
| **Invite** | Dialog: Full Name, Email, Phone, Password, Role → Send Invite |

**Roles Tab:**
| Feature | Description |
|---|---|
| **Cards** | Role name, description, member count, permission count, badge list |
| **System Roles** | Built-in roles (cannot delete) |
| **Create Role** | Name + Description + Permission checkboxes |
| **Permission Matrix** | Module-level toggle with "select all" / indeterminate, per-permission toggle |

#### Test Scenarios

- [ ] **Members Tab:**
  - [ ] All team members visible with correct roles
  - [ ] Change Role → select new role → saves
  - [ ] Activate/Deactivate member → status toggles
  - [ ] Remove member → confirm → removed
  - [ ] Invite → fill all fields → send → new member added
- [ ] **Roles Tab:**
  - [ ] Role cards display correctly with permission badges
  - [ ] System role cannot be deleted
  - [ ] Create new role → name + description + select permissions → save
  - [ ] Permission matrix: module-level "select all" checkbox
  - [ ] Permission matrix: indeterminate state when partial selection
  - [ ] Edit role permissions → save → reflects in card
  - [ ] Delete custom role → confirm → removed

---

### 6.17 Activity Log

**URL:** `/activity-log`

#### Features

| Feature | Description |
|---|---|
| **Search** | Debounced search on action text |
| **Entity Filter** | All / Orders / Products / Users / Riders / Banners / Coupons / Settings |
| **Total Count** | Total actions badge displayed inline |
| **Table** | Admin (avatar + name), Action, Entity (colored badge), Changes (old → new diff), Time |
| **Entity Colors** | Order=blue, Product=green, User=purple, Rider=orange, Banner=pink, Coupon=amber, Settings=muted |
| **Change Diff** | Old value (red strikethrough) → New value (green) |

#### Test Scenarios

- [ ] Activity entries load with correct format
- [ ] Search by action text → filters results
- [ ] Filter by entity type → shows only relevant entries
- [ ] Entity badges have correct colors
- [ ] Change diff shows old (red) → new (green) values
- [ ] Relative timestamps correct (e.g., "2 hours ago")
- [ ] Pagination works
- [ ] Total count reflects current filter

---

## 7. Real-Time Features (Socket.IO)

### What Uses Socket.IO

| Feature | Events | Location |
|---|---|---|
| **Live Rider Map** | Rider GPS positions | Dashboard page |
| **Live Rider Count** | Rider locations feed | Riders page ("X live") |
| **Live Stats** | Active orders, online riders, today's metrics | Dashboard activity bar |
| **Order Status Updates** | Real-time status changes | Orders page |
| **Push Notifications** | New notification events | Header bell + NotificationPanel |
| **Connection Status** | Connected/Reconnecting/Disconnected | Header indicator |

### How to Test

1. **Connection Status:**
   - Open dashboard → Header should show green dot with Wifi icon (connected)
   - Stop backend → indicator should turn yellow (reconnecting) then gray (disconnected)
   - Restart backend → should auto-reconnect (green)

2. **Live Notifications:**
   - Trigger an event that generates a notification (e.g., new order)
   - Notification bell badge should increment
   - Open panel → new notification visible with correct type icon

3. **Live Rider Map (Dashboard):**
   - Need active riders with GPS data
   - Riders should appear as markers on the map
   - Markers should update positions in real-time

4. **Order Status:**
   - Update an order status from backend/API
   - Orders page should reflect new status without manual refresh

---

## 8. Dark Mode Testing

### How to Toggle

Click the **sun/moon icon** in the Header (top-right area).

### What to Test

- [ ] Toggle dark → light → dark — immediate switch, no flash
- [ ] All pages render correctly in dark mode (no white/unreadable text)
- [ ] Charts (Recharts) adapt colors for dark background
- [ ] Stat cards, badges, and indicators are visible in both modes
- [ ] Form inputs, dialogs, and drawers have proper dark styling
- [ ] Drag-and-drop overlays visible in dark mode
- [ ] Preference persists after page refresh (stored in localStorage)
- [ ] Sidebar, header, and footer contrast correct

---

## 9. Responsive / Mobile Testing

### Breakpoints

- **Desktop:** Full sidebar + main content → `≥1024px`
- **Tablet:** Collapsible sidebar → `768px–1023px`
- **Mobile:** Sheet navigation + hamburger menu → `<768px`

### What to Test

- [ ] Resize browser to mobile width → sidebar disappears, hamburger icon appears
- [ ] Click hamburger → mobile sheet navigation opens
- [ ] Navigate via mobile nav → content loads, sheet closes
- [ ] Tables scroll horizontally on small screens
- [ ] Cards stack vertically on mobile
- [ ] Dialogs/modals are usable on mobile
- [ ] Forms are accessible and usable
- [ ] Charts resize appropriately

---

## 10. Drag-and-Drop Testing

### Where DnD Exists

| Location | What Dragging Does |
|---|---|
| **Categories Page** | Reorder categories within same parent level |
| **Banners Page** | Reorder banner display order |
| **Product Images** (Edit) | Reorder uploaded images |

### What to Test

- [ ] **Categories:** Grab drag handle (dots icon) → drag to new position → drop → order persists post-refresh
- [ ] **Banners:** Hover card → drag handle appears → drag → reorder → API save → verify new order
- [ ] **Product Images:** Drag image thumbnails to new order
- [ ] Keyboard accessibility: Can reorder with keyboard (Space to pick up, arrows to move, Space to drop)
- [ ] Visual feedback during drag: item lifts, placeholder shown
- [ ] Cancel drag (Escape key) → item returns to original position

---

## 11. Form Validation Testing

All forms use **Zod v4** validation schemas defined in `src/lib/validations.ts`.

### Key Validation Rules

| Form | Required Fields | Special Rules |
|---|---|---|
| **Login** | Email, Password | Password ≥ 6 chars |
| **Product** | Name, Category, MRP, Stock, Unit | MRP > 0, Stock ≥ 0, SKU format |
| **Coupon** | Code, Type, Value, Start/End Date | Code: alphanumeric + uppercase regex |
| **Manual Order** | Customer, Items, Address, Payment | At least 1 item, valid address |
| **Team Invite** | Email, Name, Role | Valid email, role: admin/manager/viewer |
| **Store Settings** | Store Name, Phone, Email | Valid phone, email formats |
| **Banner** | Title, Image URL | Valid URL format |
| **Category** | Name | Max length limits |
| **Campaign** | Title, Body, Segment | Segment: all/active/inactive/new/riders/specific |

### What to Test

- [ ] Submit empty required fields → error messages shown below fields
- [ ] Submit invalid email format → "Invalid email" error
- [ ] Submit short password (<6) → error
- [ ] Product: negative MRP → error
- [ ] Product: negative stock → error
- [ ] Coupon code: lowercase → should reject or auto-uppercase
- [ ] Fix an error → error message disappears
- [ ] All error messages are human-readable (not technical)

---

## 12. State Management Overview

### Zustand Stores

| Store | File | Purpose |
|---|---|---|
| **Auth** | `src/store/auth.store.ts` | User, token, isAuthenticated; login/logout/hydrate actions |
| **Notifications** | `src/store/notifications.store.ts` | Notifications array (max 50), unread count; add/markRead/markAllRead |
| **Sidebar** | `src/store/sidebar.store.ts` | Collapsed/expanded state |

### TanStack Query (Server State)

All API data is managed via TanStack Query hooks:
- **Auto-caching:** Results cached and auto-refetched on window focus
- **Optimistic updates:** Some mutations update cache immediately
- **Loading/Error states:** Each hook returns `isLoading`, `isError`, `error`
- **Pagination:** Managed via query key changes

---

## 13. API Service Layer

### Base Configuration

```
File: src/lib/api.ts
Base URL: http://localhost:3000/api/v1
Auth: Bearer token auto-attached via Axios interceptor
Error handling: 401 → auto-logout, other errors → toast notification
```

### Service Files (17)

Each service maps to a backend domain:

| Service | Key Endpoints |
|---|---|
| `auth` | POST `/auth/login`, GET `/auth/me` |
| `dashboard` | GET `/dashboard/stats`, `/dashboard/live-stats` |
| `orders` | GET/POST/PATCH/DELETE `/orders`, bulk status/assign |
| `products` | GET/POST/PATCH/DELETE `/products`, import/export CSV |
| `categories` | GET/POST/PATCH/DELETE `/categories`, reorder |
| `customers` | GET/PATCH `/customers` |
| `riders` | GET/PATCH `/riders` |
| `reviews` | GET/PATCH/DELETE `/reviews`, reply, moderate |
| `wallet` | GET/POST `/wallet`, bulk credit |
| `coupons` | GET/POST/PATCH/DELETE `/coupons`, analytics |
| `banners` | GET/POST/PATCH/DELETE `/banners`, reorder |
| `notifications` | Templates + Campaigns CRUD, send/schedule |
| `analytics` | Sales, products, delivery, financial, cohorts, geographic, dead stock |
| `settings` | GET/PATCH `/settings` |
| `rbac` | Roles + permissions CRUD |
| `uploads` | POST `/uploads` (file upload) |
| `activity-log` | GET `/activity-logs` |

---

## 14. Known Patterns & Conventions

### Code Patterns

| Pattern | Description |
|---|---|
| **Service → Hook → Page** | API call in service, wrapped in TanStack Query in hook, consumed by page component |
| **Debounced search** | All search inputs use `useDebounce` (300ms default) |
| **Loading skeletons** | Skeleton components shown during data fetch |
| **Empty states** | `EmptyState` component when no data matches filters |
| **Error boundary** | `ErrorBoundary` wraps page content to catch render errors |
| **Toast notifications** | Success/error toasts via Sonner for all mutations |
| **Drawer pattern** | Detail views open as slide-over drawers (Sheet component) |
| **Dialog pattern** | Create/edit forms open as modal dialogs |
| **Badge colors** | Consistent: green=active/success, red=blocked/error, yellow=pending, blue=info |
| **Currency format** | ₹ prefix with Indian number formatting |
| **Relative time** | Using dayjs `.fromNow()` for timestamps |

### Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Pages | `page.tsx` in route folder | `orders/page.tsx` |
| Components | PascalCase | `OrderDetailDrawer.tsx` |
| Hooks | camelCase, `use` prefix | `useOrders.ts` |
| Services | kebab-case + `.service.ts` | `orders.service.ts` |
| Types | kebab-case + `.types.ts` | `orders.types.ts` |
| Stores | kebab-case + `.store.ts` | `auth.store.ts` |

---

## 15. Bug Report Template

When reporting a bug, please use this format:

```markdown
## Bug Report

### Page/Feature
[Which page or feature? e.g., "Orders Page — Bulk Status Update"]

### Severity
[Critical / High / Medium / Low]
- **Critical:** App crashes, data loss, auth bypass
- **High:** Feature completely broken, no workaround
- **Medium:** Feature partially works, has workaround
- **Low:** Cosmetic issue, minor inconvenience

### Environment
- **Browser:** [Chrome 120 / Safari 17 / Firefox 122 / Edge]
- **OS:** [macOS 14.2 / Windows 11 / etc.]
- **Screen Size:** [Desktop / Tablet / Mobile + resolution]
- **Theme:** [Light / Dark]

### Steps to Reproduce
1. Navigate to [page]
2. Click [element]
3. Enter [data]
4. Click [button]
5. ...

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens — include error messages if any]

### Screenshots / Screen Recording
[Attach screenshots or video if possible]

### Console Errors
[Open browser DevTools → Console tab → paste any red error messages]

### Network Errors
[Open DevTools → Network tab → check for failed API calls → note the URL, status code, and response body]

### Additional Context
[Any other relevant info: specific data that triggered it, workaround found, etc.]
```

---

## 16. Improvement Suggestion Template

```markdown
## Improvement Suggestion

### Category
[UI/UX / Performance / Feature Request / Accessibility / Code Quality]

### Page/Feature
[Which page or area? e.g., "Dashboard — Stat Cards"]

### Current Behavior
[How it works now]

### Suggested Improvement
[What should change and why]

### Priority
[Nice-to-have / Should-have / Must-have]

### Mockup / Reference
[Attach wireframe, screenshot, or reference URL if applicable]

### Impact
[Who benefits? How does this improve the user experience?]
```

---

## 17. Testing Checklist

### Global Checks (Run on Every Page)

- [ ] Page loads without console errors
- [ ] Loading skeleton shown while data fetches
- [ ] Empty state shown when no data
- [ ] Error handling works when API fails (stop backend → check)
- [ ] Dark mode renders correctly
- [ ] Mobile responsive layout works
- [ ] Navigation via sidebar works
- [ ] Back button (browser) works correctly
- [ ] Page refresh maintains state (where applicable)

### Authentication Checks

- [ ] Login with valid credentials ✓
- [ ] Login with invalid credentials → error message ✓
- [ ] Rate limit after 3+ failed attempts ✓
- [ ] Session persists across refresh ✓
- [ ] Logout clears session completely ✓
- [ ] Protected routes redirect to login ✓
- [ ] Login page redirects authenticated users ✓

### Data Integrity Checks

- [ ] Create → item appears in list ✓
- [ ] Edit → changes reflected ✓
- [ ] Delete → item removed ✓
- [ ] Pagination → correct items per page ✓
- [ ] Filters → correct subset shown ✓
- [ ] Search → matches expected results ✓
- [ ] Sort → correct ordering ✓

### Real-Time Checks

- [ ] Socket connected indicator (green) ✓
- [ ] Disconnect recovery (reconnect) ✓
- [ ] Notifications arrive in real-time ✓
- [ ] Rider locations update ✓

### Performance Checks

- [ ] Pages load within 2-3 seconds
- [ ] No excessive API calls (check Network tab)
- [ ] Large lists paginate properly (no freeze)
- [ ] Charts render smoothly
- [ ] No memory leaks on page navigation (check DevTools → Performance)

### Cross-Browser (Test on at Least 2)

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

---

## Quick Reference: All Pages & URLs

| # | Page | URL | Key Actions |
|---|---|---|---|
| 1 | Login | `/login` | Email/password auth |
| 2 | Dashboard | `/dashboard` | View KPIs, charts, live data |
| 3 | Orders | `/orders` | List, filter, bulk ops, detail drawer |
| 4 | New Order | `/orders/new` | 6-step wizard |
| 5 | Products | `/products` | List (table/grid), inline edit, bulk ops |
| 6 | New Product | `/products/new` | Full product form + variants |
| 7 | Edit Product | `/products/[id]/edit` | Edit existing product |
| 8 | Categories | `/categories` | Tree + DnD reorder + CRUD |
| 9 | Customers | `/customers` | List, filter, block/unblock, profile drawer |
| 10 | Riders | `/riders` | Grid/table, live tracking, detail drawer |
| 11 | Reviews | `/reviews` | Product reviews, moderation |
| 12 | Wallet | `/wallet` | Transactions, credit, bulk credit |
| 13 | Coupons | `/coupons` | CRUD, 5 types, analytics |
| 14 | Banners | `/banners` | Grid, DnD reorder, CRUD |
| 15 | Notifications | `/notifications` | Templates + Campaigns |
| 16 | Analytics | `/analytics` | 10+ analytics sections, export |
| 17 | Settings | `/settings` | 14 groups, 2FA, dirty tracking |
| 18 | Team & Roles | `/team` | Members + roles/permissions |
| 19 | Activity Log | `/activity-log` | Audit trail with diff view |

---

> **Tester:** If you find anything not listed here or have questions about expected behavior, please document it using the Bug Report or Improvement Suggestion templates above.  
> **Developer Contact:** [Your contact info here]
