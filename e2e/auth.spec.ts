/**
 * Auth flow E2E — task 15.2.
 *
 * Contract under test (post-login routing branch table from
 * `requirements.md` 1.3 / 1.4 / 1.5 and the Shop_Selector handshake from
 * Req 2.4):
 *
 *   - Single-shop user      → Auth_Module auto-calls `/auth/select-shop`
 *                             with the only shop, lands on `/dashboard`.
 *   - Multi-shop user       → Redirected to `/select-shop`. Picking a card
 *                             calls `/auth/select-shop` and lands on `/`.
 *   - Super_Admin (no shops)→ Lands on `/dashboard` in `ALL_SHOPS` mode;
 *                             the topbar Shop_Switcher trigger reads
 *                             "All shops" (Req 3.1, 3.2 — i18n key
 *                             `shopScope.allShops`).
 *
 * Strategy:
 *   - The dashboard is mounted against the dev server bound by
 *     `playwright.config.ts → webServer`. Every backend call is mocked via
 *     `page.route` so no real backend or database is required.
 *   - Mocks cover the four endpoints the auth flow touches:
 *       POST /admin/auth/login        — login response shape
 *       GET  /admin/auth/me           — token validation on dashboard mount
 *       POST /auth/select-shop        — shop-scoped JWT (single-shop +
 *                                       multi-shop branches)
 *       GET  /auth/my-shops           — Shop_Selector cards (multi-shop)
 *     Plus: Socket.IO handshake (`/socket.io/*`) is intercepted with a
 *     `204` so the dashboard's `<SocketProvider>` doesn't spam connect
 *     errors during the test (the auth flow does not depend on a live
 *     socket connection).
 *
 * Requirements: 1.3, 1.4, 1.5, 2.4
 *
 * Notes for future maintainers:
 *   - Mock URLs use a wildcard prefix (e.g. `**\u200b/admin/auth/login`)
 *     so the test remains correct if `NEXT_PUBLIC_API_URL` is reconfigured.
 *   - The dashboard reads `localStorage` for the token + admin user on
 *     mount and re-validates via `/admin/auth/me`. The test waits for that
 *     round-trip implicitly by asserting on the post-login URL.
 *   - Each test seeds its own `localStorage` cleanly via the login form
 *     rather than `addInitScript`, so the auth flow itself is exercised
 *     end-to-end (the goal of the spec).
 */

import { expect, test, type Page, type Route } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const TEST_EMAIL = "operator@bakaloo.test"
const TEST_PASSWORD = "Password123!"

interface ShopAssignmentFixture {
  id: string
  name: string
  branch_code: string
  city: string
  role:
    | "SHOP_ADMIN"
    | "SHOP_MANAGER"
    | "SHOP_STAFF"
    | "SHOP_VIEWER"
  is_active: boolean
}

const SHOP_BANDRA: ShopAssignmentFixture = {
  id: "s1",
  name: "Bandra Outlet",
  branch_code: "BND-01",
  city: "Mumbai",
  role: "SHOP_ADMIN",
  is_active: true,
}

const SHOP_ANDHERI: ShopAssignmentFixture = {
  id: "s2",
  name: "Andheri Outlet",
  branch_code: "AND-01",
  city: "Mumbai",
  role: "SHOP_MANAGER",
  is_active: true,
}

interface AdminUserFixture {
  id: string
  name: string
  email: string
  role: "ADMIN" | "SUPER_ADMIN" | "CUSTOMER" | "DELIVERY"
  phone: string
  permissions?: string[]
}

const VENDOR_USER: AdminUserFixture = {
  id: "u1",
  name: "Vendor Operator",
  email: TEST_EMAIL,
  role: "ADMIN", // backend currently issues ADMIN for shop-staff JWTs
  phone: "+919999999991",
  // Non-viewer permissions so the axios interceptor doesn't tag this user
  // as a Viewer and cancel mutations (see lib/api.ts viewer guard).
  permissions: ["orders.read", "orders.write"],
}

const SUPER_ADMIN_USER: AdminUserFixture = {
  id: "u2",
  name: "Platform Admin",
  email: TEST_EMAIL,
  role: "SUPER_ADMIN",
  phone: "+919999999992",
  permissions: ["*"],
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Standard ApiResponse envelope used by the backend. */
function ok<T>(data: T, message = "ok") {
  return { success: true, message, data }
}

/** Reply to a route with JSON wrapped in the standard envelope. */
async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

interface AuthMockOptions {
  loginResponse: {
    accessToken: string
    user: AdminUserFixture
    shops?: ShopAssignmentFixture[]
    isSuperAdmin?: boolean
  }
  meResponse: AdminUserFixture
  myShops: ShopAssignmentFixture[]
  selectShopResponse?: {
    token: string
    shop_id: string
    shop_role: ShopAssignmentFixture["role"]
    permissions: string[]
  }
}

/**
 * Install the four-mock harness used by every test in this file.
 *
 * Order matters: more specific routes are registered before the catch-all
 * so Playwright's first-match-wins routing applies the targeted handlers
 * for the auth endpoints and the catch-all only handles everything else.
 */
async function installAuthMocks(page: Page, opts: AuthMockOptions) {
  // Block Socket.IO handshakes — `<SocketProvider>` connects on token
  // change and we don't want a flood of `connect_error` toasts polluting
  // the auth flow assertions. Returning 204 makes the client treat the
  // server as unreachable; the provider retries silently.
  await page.route("**/socket.io/**", async (route) => {
    await route.fulfill({ status: 204, body: "" })
  })

  await page.route("**/admin/auth/login", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback()
    }
    await fulfillJson(route, 200, ok(opts.loginResponse, "Logged in"))
  })

  await page.route("**/admin/auth/me", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback()
    }
    await fulfillJson(route, 200, ok(opts.meResponse))
  })

  await page.route("**/admin/auth/logout", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback()
    }
    await fulfillJson(route, 200, ok({}, "Logged out"))
  })

  await page.route("**/auth/my-shops", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback()
    }
    await fulfillJson(route, 200, ok({ shops: opts.myShops }))
  })

  await page.route("**/auth/select-shop", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback()
    }
    if (!opts.selectShopResponse) {
      // Tests that don't expect a select-shop call still get a stable
      // failure response so a stray request fails loudly rather than
      // hanging the suite.
      return fulfillJson(route, 500, {
        success: false,
        message: "select-shop not expected in this scenario",
      })
    }
    await fulfillJson(route, 200, ok(opts.selectShopResponse, "Shop selected"))
  })

  // Catch-all for the dashboard's other queries (dashboard stats, banners,
  // notifications, etc.) so they don't fall through to a real backend and
  // hang the test. We respond with empty success envelopes; the post-login
  // assertions don't care about the dashboard contents.
  await page.route("**/api/v1/**", async (route) => {
    if (route.request().method() === "GET") {
      return fulfillJson(
        route,
        200,
        ok({
          items: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      )
    }
    return route.fallback()
  })
}

/**
 * Fill in the login form and submit. Helper centralises the form
 * interaction so each test focuses on the post-login expectation.
 */
async function submitLogin(page: Page) {
  await page.goto("/login")
  // Wait for the login form to be visible (the page renders a session-check
  // spinner first, then the form once `clearAuth()` resolves).
  await expect(page.getByLabel("Email")).toBeVisible()
  await page.getByLabel("Email").fill(TEST_EMAIL)
  await page.getByLabel("Password").fill(TEST_PASSWORD)
  await page.getByRole("button", { name: /sign in/i }).click()
}

/**
 * Read the persisted Shop_Context_Store snapshot from `localStorage`.
 * Returns `null` when the snapshot has not been written yet.
 */
async function readShopContextSnapshot(page: Page): Promise<{
  activeShopId: string | null
  mode: string
  assignedShopIds: string[]
} | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("shop-context")
    if (!raw) return null
    try {
      return JSON.parse(raw) as {
        activeShopId: string | null
        mode: string
        assignedShopIds: string[]
      }
    } catch {
      return null
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-test setup — clear storage so the login form renders cleanly
// ─────────────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  // The login page reads `localStorage.accessToken` on mount and skips the
  // form if a token is present. Clear all storage so each test starts from
  // an unauthenticated state.
  await page.addInitScript(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — Single-shop user lands on `/dashboard`
// Validates: Req 1.3 (post-login auto-select), Req 2.4 (`/auth/select-shop`).
// ─────────────────────────────────────────────────────────────────────────────

test("single-shop vendor: lands on /dashboard with the shop auto-selected", async ({
  page,
}) => {
  await installAuthMocks(page, {
    loginResponse: {
      accessToken: "vendor-jwt-1",
      user: VENDOR_USER,
      shops: [SHOP_BANDRA],
      isSuperAdmin: false,
    },
    meResponse: VENDOR_USER,
    myShops: [SHOP_BANDRA],
    selectShopResponse: {
      token: "vendor-jwt-1-scoped",
      shop_id: SHOP_BANDRA.id,
      shop_role: SHOP_BANDRA.role,
      permissions: ["orders.read", "orders.write"],
    },
  })

  await submitLogin(page)

  // The dispatcher pushes to `/` (resolved as `/dashboard` via the root
  // `app/page.tsx` redirect). Wait for the URL to settle.
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 })

  // The Shop_Context_Store should hold the only shop as the active scope
  // (Req 1.3). The store persists to localStorage on every transition,
  // so reading the snapshot is a deterministic assertion target.
  const snap = await readShopContextSnapshot(page)
  expect(snap).not.toBeNull()
  expect(snap?.mode).toBe("SINGLE_SHOP")
  expect(snap?.activeShopId).toBe(SHOP_BANDRA.id)
  expect(snap?.assignedShopIds).toEqual([SHOP_BANDRA.id])
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — Multi-shop user lands on `/select-shop`
// Validates: Req 1.4 (multi-shop redirect), Req 2.4 (Shop_Selector handshake).
// ─────────────────────────────────────────────────────────────────────────────

test("multi-shop vendor: lands on /select-shop and can pick a shop", async ({
  page,
}) => {
  await installAuthMocks(page, {
    loginResponse: {
      accessToken: "vendor-jwt-2",
      user: VENDOR_USER,
      shops: [SHOP_BANDRA, SHOP_ANDHERI],
      isSuperAdmin: false,
    },
    meResponse: VENDOR_USER,
    myShops: [SHOP_BANDRA, SHOP_ANDHERI],
    selectShopResponse: {
      token: "vendor-jwt-2-scoped",
      shop_id: SHOP_ANDHERI.id,
      shop_role: SHOP_ANDHERI.role,
      permissions: ["orders.read"],
    },
  })

  await submitLogin(page)

  // Req 1.4 — vendor with ≥ 2 shops is redirected to /select-shop.
  await page.waitForURL(/\/select-shop$/, { timeout: 15_000 })

  // Both shop cards render with the shop name visible (Req 2.1).
  await expect(
    page.getByRole("heading", { name: /select a shop/i }),
  ).toBeVisible()
  await expect(page.getByText(SHOP_BANDRA.name).first()).toBeVisible()
  await expect(page.getByText(SHOP_ANDHERI.name).first()).toBeVisible()

  // Pre-pivot snapshot: assignedShopIds is locked, but no shop is active.
  const before = await readShopContextSnapshot(page)
  expect(before?.activeShopId).toBeNull()
  expect(before?.assignedShopIds).toEqual([SHOP_BANDRA.id, SHOP_ANDHERI.id])

  // Pick the second shop. The shop card renders an "Enter shop" CTA per
  // task 2.4. Use a regex against the button accessible name so the test
  // is resilient to copy tweaks (icon-only or icon+label).
  await page.getByRole("button", { name: /enter shop/i }).nth(1).click()

  // After a successful select-shop, the page redirects to `/` → `/dashboard`.
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 })

  const after = await readShopContextSnapshot(page)
  expect(after?.mode).toBe("SINGLE_SHOP")
  expect(after?.activeShopId).toBe(SHOP_ANDHERI.id)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — Super_Admin lands on `/dashboard` with the All-Shops chip in topbar
// Validates: Req 1.5 (super-admin lands on home in ALL_SHOPS), Req 3.1, 3.2.
// ─────────────────────────────────────────────────────────────────────────────

test("super admin: lands on /dashboard in ALL_SHOPS mode with the topbar switcher", async ({
  page,
}) => {
  await installAuthMocks(page, {
    loginResponse: {
      accessToken: "super-jwt",
      user: SUPER_ADMIN_USER,
      shops: [],
      isSuperAdmin: true,
    },
    meResponse: SUPER_ADMIN_USER,
    myShops: [],
  })

  await submitLogin(page)

  // Super_Admin is routed straight to the dashboard (Req 1.5).
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 })

  // The Shop_Context_Store is in ALL_SHOPS mode for super admins.
  const snap = await readShopContextSnapshot(page)
  expect(snap?.mode).toBe("ALL_SHOPS")
  expect(snap?.activeShopId).toBeNull()
  expect(snap?.assignedShopIds).toEqual([])

  // The Shop_Switcher trigger is mounted in the topbar for super admins
  // (Req 3.1). The trigger carries `data-testid="shop-switcher-trigger"`
  // (set in `components/layout/shop-switcher.tsx` per task 4.3) and shows
  // the `shopScope.allShops` label when no shop is selected.
  const switcher = page.getByTestId("shop-switcher-trigger")
  await expect(switcher).toBeVisible()
  await expect(switcher).toHaveText(/all shops/i)
})
