/**
 * E2E: Super_Admin Shop_Switcher rotates the active shop scope.
 *
 * Validates that switching shops from the topbar `Shop_Switcher`:
 *   1. Reloads shop-scoped queries (the orders list is the canonical
 *      cross-section) with the new `X-Shop-Id` header attached
 *      (Req 3.4 / 3.6 / 10.3).
 *   2. Renders the `<ShopScopeBadge />` with the newly picked shop's name
 *      (Req 10.2).
 *
 * Test design notes
 * -----------------
 * - The dashboard is a CSR-heavy app that calls `/admin/auth/me` on every
 *   layout mount; the dev server expects the upstream Fastify backend on
 *   `NEXT_PUBLIC_API_URL`. Rather than spin up the backend, we intercept
 *   every API call with `page.route(...)`. This keeps the test
 *   deterministic and lets us assert request headers directly.
 * - The post-login state is pre-seeded into `localStorage` and the three
 *   advisory cookies the Next.js middleware reads (`auth_session`,
 *   `is-super-admin`, `shop-context-mw`) so the test starts already-authed
 *   on `/orders` without exercising the login UI (that flow is covered by
 *   `auth.spec.ts`).
 * - We capture the **first orders request after the switch** by ignoring
 *   any in-flight requests issued before the click and looking only at
 *   ones that arrive after `switchedAt`.
 *
 * Spec ref: tasks.md 15.3, design.md §"Playwright E2E (critical flows only)".
 */

import { expect, test, type Route } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Fixture data — kept inline so the test is self-contained.
// ─────────────────────────────────────────────────────────────────────────────

const SUPER_ADMIN = {
  id: "user-super-1",
  name: "Super Admin",
  email: "super@bakaloo.dev",
  role: "SUPER_ADMIN" as const,
  phone: "+910000000000",
  permissions: ["*"],
}

const ACCESS_TOKEN = "e2e-access-token"

/** Two shops the switcher will offer; ids match the data-testid suffix. */
const SHOP_A = {
  id: "shop-a",
  name: "Shop A",
  slug: "shop-a",
  branch_code: "SHOPA",
  city: "Mumbai",
  state: "MH",
  pincode: "400001",
  address_line1: "1 Main St",
  lat: 19.07,
  lng: 72.87,
  serviceable_pincodes: ["400001"],
  delivery_radius_km: 5,
  is_active: true,
  is_verified: true,
  operating_hours: {
    mon: { open: "09:00", close: "21:00", closed: false },
    tue: { open: "09:00", close: "21:00", closed: false },
    wed: { open: "09:00", close: "21:00", closed: false },
    thu: { open: "09:00", close: "21:00", closed: false },
    fri: { open: "09:00", close: "21:00", closed: false },
    sat: { open: "09:00", close: "21:00", closed: false },
    sun: { open: "09:00", close: "21:00", closed: false },
  },
  commission_rate: 10,
  total_orders: 0,
  total_revenue: 0,
  avg_rating: 0,
  rating_count: 0,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
}

const SHOP_B = {
  ...SHOP_A,
  id: "shop-b",
  name: "Shop B",
  slug: "shop-b",
  branch_code: "SHOPB",
  city: "Bengaluru",
  pincode: "560001",
}

const EMPTY_ORDERS_PAYLOAD = {
  success: true,
  message: "OK",
  data: {
    orders: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  },
}

const EMPTY_STATUS_COUNTS = {
  success: true,
  message: "OK",
  data: {
    PLACED: 0,
    CONFIRMED: 0,
    PREPARING: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    REFUNDED: 0,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** JSON shorthand for `route.fulfill`. */
function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  })
}

/**
 * Read the `localStorage`-mirrored Shop_Context_Store snapshot the
 * dashboard uses to drive the axios `X-Shop-Id` interceptor and the
 * Next.js middleware cookie. Pre-seeded as `ALL_SHOPS` so the test starts
 * with no `X-Shop-Id` header on outgoing requests.
 */
function buildAllShopsSnapshot() {
  return JSON.stringify({
    activeShopId: null,
    mode: "ALL_SHOPS",
    shopRole: null,
    permissions: [],
    shopMeta: null,
    assignedShopIds: [],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Shop_Switcher", () => {
  test("super admin switches to Shop B and orders reload with X-Shop-Id: shop-b", async ({
    page,
    context,
  }) => {
    // Capture every request to /admin/orders for header inspection. We
    // record the X-Shop-Id value (or `null` when absent) plus the time
    // the request was issued so we can identify the "post-switch" call.
    const ordersRequests: Array<{ at: number; shopId: string | null }> = []

    // ───── API mocks ────────────────────────────────────────────────────
    // The dashboard's axios baseURL is `NEXT_PUBLIC_API_URL` (defaults to
    // `http://localhost:3000/api/v1`). We catch every request whose path
    // contains `/api/v1/...` so the mocks work regardless of which env
    // var the dev server picked up.
    await context.route("**/api/v1/admin/auth/me", (route) =>
      fulfillJson(route, { success: true, message: "OK", data: SUPER_ADMIN }),
    )

    await context.route("**/api/v1/shops?**", (route) =>
      // The Shop_Switcher popover requests `is_active=true&limit=100`.
      fulfillJson(route, {
        success: true,
        message: "OK",
        data: {
          shops: [SHOP_A, SHOP_B],
          total: 2,
          page: 1,
          limit: 100,
        },
      }),
    )

    await context.route("**/api/v1/admin/orders/stats-by-status", (route) =>
      fulfillJson(route, EMPTY_STATUS_COUNTS),
    )

    await context.route(/\/api\/v1\/admin\/orders(\?.*)?$/, (route, request) => {
      // Capture header BEFORE fulfilling — request.headers() is a snapshot.
      const headers = request.headers()
      const headerValue =
        headers["x-shop-id"] ?? headers["X-Shop-Id"] ?? null
      ordersRequests.push({ at: Date.now(), shopId: headerValue ?? null })
      return fulfillJson(route, EMPTY_ORDERS_PAYLOAD)
    })

    // Riders list is hit indirectly by the orders page (bulk-assign UI).
    // Stub with an empty payload so the page doesn't error on a 404.
    await context.route(/\/api\/v1\/admin\/riders(\?.*)?$/, (route) =>
      fulfillJson(route, {
        success: true,
        message: "OK",
        data: {
          riders: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        },
      }),
    )

    // Defensive: catch-all for any other API call so the page never blocks
    // on a real backend round-trip. Kept narrow to the API base path so
    // it doesn't shadow Next.js `_next/*` static routes.
    await context.route(/\/api\/v1\/.*/, (route) =>
      fulfillJson(route, { success: true, message: "OK", data: {} }),
    )

    // ───── Pre-seed the post-login state ────────────────────────────────
    // Cookies the Next.js middleware reads (see `src/middleware.ts`).
    await context.addCookies([
      {
        name: "auth_session",
        value: "1",
        url: "http://localhost:3002",
        path: "/",
      },
      {
        name: "is-super-admin",
        value: "1",
        url: "http://localhost:3002",
        path: "/",
      },
      {
        name: "shop-context-mw",
        value: encodeURIComponent(
          JSON.stringify({ activeShopId: null, assignedShopIds: [] }),
        ),
        url: "http://localhost:3002",
        path: "/",
      },
    ])

    // localStorage values the auth + shop-context stores expect on hydrate.
    const storeSnapshot = buildAllShopsSnapshot()
    await context.addInitScript(
      ({ token, user, shopContext }) => {
        try {
          localStorage.setItem("accessToken", token)
          localStorage.setItem("admin-user", user)
          localStorage.setItem("shop-context", shopContext)
        } catch {
          // Some browsers (private mode) deny localStorage; the test will
          // surface a clearer failure below if hydration didn't happen.
        }
      },
      {
        token: ACCESS_TOKEN,
        user: JSON.stringify(SUPER_ADMIN),
        shopContext: storeSnapshot,
      },
    )

    // ───── Navigate to the orders page ──────────────────────────────────
    await page.goto("/orders")

    // The switcher trigger only renders for super admins — its presence
    // confirms that auth hydration succeeded and the layout is mounted.
    const trigger = page.getByTestId("shop-switcher-trigger")
    await expect(trigger).toBeVisible()

    // Wait for at least one initial orders request to land so we can
    // assert the pre-switch header state. The orders page also fires
    // /admin/orders/stats-by-status on mount, but only the list call is
    // captured by our recorder.
    await expect
      .poll(() => ordersRequests.length, { timeout: 10_000 })
      .toBeGreaterThan(0)

    // (1a) Pre-switch invariant: ALL_SHOPS mode → no X-Shop-Id header.
    const initialRequest = ordersRequests[0]
    expect(initialRequest.shopId).toBeNull()

    // The scope badge is hidden in ALL_SHOPS mode (Req 10.2).
    await expect(page.getByTestId("shop-scope-badge")).toHaveCount(0)

    // ───── Open the switcher and pick Shop B ────────────────────────────
    const switchedAt = Date.now()
    await trigger.click()

    const shopBOption = page.getByTestId("shop-switcher-shop-shop-b")
    await expect(shopBOption).toBeVisible()
    await shopBOption.click()

    // (1b) Post-switch: the orders query is invalidated and re-issued
    //      with `X-Shop-Id: shop-b`. We poll the recorded requests for
    //      the first call dated after the click.
    await expect
      .poll(
        () =>
          ordersRequests
            .filter((r) => r.at >= switchedAt)
            .map((r) => r.shopId),
        { timeout: 10_000 },
      )
      .toContain("shop-b")

    // Every post-switch orders request carries the new header — no
    // pre-switch (null) header should leak through after the rotation.
    const postSwitchRequests = ordersRequests.filter(
      (r) => r.at >= switchedAt,
    )
    expect(postSwitchRequests.length).toBeGreaterThan(0)
    for (const req of postSwitchRequests) {
      expect(req.shopId).toBe("shop-b")
    }

    // (2) The scope badge now reflects Shop B.
    const badge = page.getByTestId("shop-scope-badge")
    await expect(badge).toBeVisible()
    await expect(badge).toContainText("Shop B")

    // The trigger label also updates to the picked shop's name.
    await expect(trigger).toContainText("Shop B")
  })
})
