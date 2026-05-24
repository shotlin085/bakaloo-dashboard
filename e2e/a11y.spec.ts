/**
 * Accessibility (a11y) E2E — `axe-core` audits against the routes added
 * by the multi-vendor-dashboard-ui feature (task 15.10).
 *
 * Routes audited:
 *   - `/login`             — unauthenticated landing form
 *   - `/select-shop`       — multi-shop vendor card grid
 *   - `/shops`             — super-admin shops list
 *   - `/shop-products`     — vendor SINGLE_SHOP inventory
 *   - `/shop-financials`   — vendor SINGLE_SHOP read-only P&L
 *
 * Contract under test
 * -------------------
 * Each page is rendered against the dev server bound by
 * `playwright.config.ts → webServer`, every backend round-trip is
 * intercepted via `page.route(...)` so the test stays hermetic, and
 * `@axe-core/playwright`'s `AxeBuilder` runs a full WCAG 2.0/2.1 A + AA
 * audit on the steady-state of the page. The test fails if any violation
 * with `impact === "serious"` or `impact === "critical"` is introduced by
 * this feature.
 *
 * Why filter on `impact` rather than total violation count
 * --------------------------------------------------------
 * The dashboard inherits a handful of pre-existing minor / moderate
 * issues (low-contrast tooltips, decorative SVGs without role="img", etc.)
 * that are out of scope for this feature. WCAG considers
 * `impact: "serious" | "critical"` the bar that blocks shipping — those
 * are the failures this suite must catch. Lower-impact issues are tracked
 * separately and surfaced by `@axe-core/playwright`'s standalone reports.
 *
 * If a pre-existing serious/critical violation needs to be allowlisted
 * (e.g. a third-party widget shipping a known issue we haven't filed
 * upstream yet), add the rule id to `ALLOWLISTED_RULES` below with a
 * pointer to the tracking issue. The list starts empty so any failure
 * during the first run is treated as a regression introduced by this
 * feature.
 *
 * Test strategy
 * -------------
 *   - One `test()` per route so a failure on, say, `/shop-products`
 *     surfaces independently from `/shops` rather than masking later
 *     audits behind a single early-exit assertion.
 *   - Auth + scope is faked entirely on the client per the pattern from
 *     `auth.spec.ts`, `shop-staff.spec.ts`, and `shop-switcher.spec.ts`:
 *       - localStorage carries `accessToken`, `admin-user`,
 *         `shop-context`.
 *       - Cookies set the three middleware advisory flags
 *         (`auth_session`, `is-super-admin`, `shop-context-mw`).
 *   - Every API call is intercepted with a stable, minimal fixture so
 *     the page renders deterministically. The audit runs after the page
 *     reaches its first idle render so the assertion targets the steady
 *     state, not a transient skeleton or empty-state.
 *   - `<SocketProvider>` opens a real socket.io-client; we block the
 *     `/socket.io/*` handshake with a 204 so the provider gives up
 *     silently. The audit does not care about the socket transport.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.7
 */

import AxeBuilder from "@axe-core/playwright"
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:3002"

/**
 * WCAG tags the audit evaluates against. Mirrors the dashboard's stated
 * accessibility target (WCAG 2.1 AA + WCAG 2.0 baseline). The
 * `best-practice` tag is intentionally excluded so this suite only flags
 * spec-mandated failures, not advisory recommendations.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const

/**
 * Rule ids to skip during the audit. Populate with pointers to the
 * tracking issue when a pre-existing serious/critical violation is
 * present and needs to ship before this suite can pass. The list starts
 * empty — every failure during the first run is treated as a regression
 * introduced by this feature.
 *
 * Format: `[rule-id, justification]`. The audit calls
 * `AxeBuilder.disableRules(rule-id)` for each entry.
 */
const ALLOWLISTED_RULES: ReadonlyArray<{
  id: string
  reason: string
}> = []

/**
 * Returns true when the violation's impact level meets the failure bar
 * (serious or critical). axe-core reports `impact` as
 * `"minor" | "moderate" | "serious" | "critical" | null` — the null /
 * "minor" / "moderate" tiers are tracked separately and don't fail this
 * suite.
 */
function isSeriousOrCritical(
  impact: string | null | undefined,
): boolean {
  return impact === "serious" || impact === "critical"
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_TOKEN = "e2e-a11y-token"

const SUPER_ADMIN_USER = {
  id: "user-super-001",
  name: "Super Admin",
  email: "super@bakaloo.test",
  role: "SUPER_ADMIN" as const,
  phone: "+919999999999",
  permissions: ["*"],
}

const VENDOR_USER = {
  id: "user-vendor-001",
  name: "Vendor Operator",
  email: "vendor@bakaloo.test",
  // Backend currently issues `ADMIN` for shop-staff JWTs (see auth fixture
  // in auth.spec.ts). The permission list is comprehensive so every
  // surface renders its full UI, which is what the audit needs.
  role: "ADMIN" as const,
  phone: "+919999999991",
  permissions: [
    "shops.read",
    "shop-staff.read",
    "shop-products.read",
    "shop-financials.read",
    "shop-transactions.read",
    "orders.read",
    "products.read",
    "customers.read",
  ],
}

const SHOP_A = {
  id: "shop-a",
  name: "Shop A",
  slug: "shop-a",
  branch_code: "SHOP-A",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  address_line1: "1 Main Street",
  address_line2: "",
  lat: 19.07,
  lng: 72.87,
  serviceable_pincodes: ["400001"],
  delivery_radius_km: 5,
  is_active: true,
  is_verified: true,
  operating_hours: {
    monday: { open: "09:00", close: "21:00", closed: false },
    tuesday: { open: "09:00", close: "21:00", closed: false },
    wednesday: { open: "09:00", close: "21:00", closed: false },
    thursday: { open: "09:00", close: "21:00", closed: false },
    friday: { open: "09:00", close: "21:00", closed: false },
    saturday: { open: "09:00", close: "21:00", closed: false },
    sunday: { open: "09:00", close: "21:00", closed: false },
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
  branch_code: "SHOP-B",
  city: "Bengaluru",
  pincode: "560001",
}

/** Vendor shop assignment shape returned by `GET /auth/my-shops`. */
const ASSIGNMENT_A = {
  id: SHOP_A.id,
  name: SHOP_A.name,
  branch_code: SHOP_A.branch_code,
  city: SHOP_A.city,
  role: "SHOP_ADMIN" as const,
  is_active: true,
}

const ASSIGNMENT_B = {
  id: SHOP_B.id,
  name: SHOP_B.name,
  branch_code: SHOP_B.branch_code,
  city: SHOP_B.city,
  role: "SHOP_MANAGER" as const,
  is_active: true,
}

/** Single shop product surfaced on `/shop-products`. */
const SHOP_PRODUCT = {
  id: "sp-1",
  shop_id: SHOP_A.id,
  product_id: "p-1",
  price: 50,
  sale_price: null as number | null,
  cost_price: null as number | null,
  stock_quantity: 12,
  low_stock_threshold: 5,
  max_order_qty: 5,
  is_available: true,
  is_featured: false,
  sold_out_at: null as string | null,
  restock_eta: null as string | null,
  product: {
    id: "p-1",
    name: "Bananas",
    sku: "BAN-01",
    image_url: "",
  },
}

/** Single financial period surfaced on `/shop-financials`. */
const FINANCIAL_PERIOD = {
  id: "fp-1",
  shop_id: SHOP_A.id,
  period_type: "DAILY" as const,
  period_start: "2024-12-25",
  period_end: "2024-12-25",
  gross_revenue: 1500,
  net_revenue: 1300,
  total_orders: 5,
  avg_order_value: 300,
  platform_commission: 100,
  delivery_costs: 50,
  refund_amount: 50,
  payout_amount: 1300,
  payout_status: "PAID" as const,
  payout_ref: "PAYOUT-001",
  paid_at: "2024-12-26T10:00:00.000Z",
  created_at: "2024-12-25T00:00:00.000Z",
  updated_at: "2024-12-26T10:00:00.000Z",
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Wrap a payload in the dashboard's `ApiResponse<T>` envelope. */
function envelope<T>(data: T): { success: true; message: string; data: T } {
  return { success: true, message: "OK", data }
}

/** Reply to a route with a JSON body wrapped in the standard envelope. */
async function fulfillJson(
  route: Route,
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

/**
 * Block the Socket.IO handshake. `<SocketProvider>` connects on token
 * change; without a real server it would otherwise spam reconnect-error
 * toasts during the audit. Returning 204 makes the polling transport hang
 * up immediately and the provider retries silently.
 */
async function blockSocketHandshake(page: Page): Promise<void> {
  await page.route("**/socket.io/**", async (route) => {
    await route.fulfill({ status: 204, body: "" })
  })
}

/**
 * Catch-all for `/api/v1/*` calls not handled by a more specific route.
 * Returns an empty success envelope so unrelated background queries
 * (notifications, dashboard-home, analytics, etc.) don't surface as red
 * network errors and don't fall through to a real backend. Anything we
 * explicitly want to assert against is registered before this and matches
 * first (Playwright's first-match-wins routing).
 */
async function installApiCatchAll(page: Page): Promise<void> {
  await page.route(/\/api\/v1\//, async (route: Route) => {
    if (route.request().method() === "GET") {
      await fulfillJson(
        route,
        200,
        envelope({
          items: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      )
      return
    }
    await fulfillJson(route, 200, envelope({}))
  })
}

interface AuthSeedOptions {
  user: typeof SUPER_ADMIN_USER | typeof VENDOR_USER
  isSuperAdmin: boolean
  shopContext: {
    activeShopId: string | null
    mode: "ALL_SHOPS" | "SINGLE_SHOP" | "UNSELECTED"
    shopRole:
      | "SHOP_ADMIN"
      | "SHOP_MANAGER"
      | "SHOP_STAFF"
      | "SHOP_VIEWER"
      | null
    permissions: string[]
    shopMeta:
      | {
          id: string
          name: string
          branchCode: string
          city: string
          isActive: boolean
        }
      | null
    assignedShopIds: string[]
  }
}

/**
 * Pre-seed the dashboard's auth + shop-context state so the audit hits
 * the page in its real-world post-login posture. Mirrors the helper in
 * `shop-staff.spec.ts` / `shop-transactions.spec.ts`.
 *
 * Two layers must agree because the Edge runtime middleware cannot read
 * `localStorage`:
 *   - localStorage carries the in-process Zustand snapshot the React tree
 *     hydrates from on mount.
 *   - The `auth_session` / `is-super-admin` / `shop-context-mw` cookies
 *     mirror the slice the middleware reads (see `src/middleware.ts`).
 *     Without these, the middleware's redirect rules trip and the audit
 *     ends up on the wrong route.
 */
async function seedAuth(
  page: Page,
  context: BrowserContext,
  opts: AuthSeedOptions,
): Promise<void> {
  await page.addInitScript(
    ({ token, user, snapshot }) => {
      try {
        window.localStorage.setItem("accessToken", token)
        window.localStorage.setItem("admin-user", JSON.stringify(user))
        window.localStorage.setItem(
          "shop-context",
          JSON.stringify(snapshot),
        )
      } catch {
        /* private mode — middleware cookies still cover us */
      }
    },
    {
      token: ACCESS_TOKEN,
      user: opts.user,
      snapshot: opts.shopContext,
    },
  )

  await context.addCookies([
    { name: "auth_session", value: "1", url: BASE_URL, path: "/" },
    {
      name: "is-super-admin",
      value: opts.isSuperAdmin ? "1" : "0",
      url: BASE_URL,
      path: "/",
    },
    {
      name: "shop-context-mw",
      value: encodeURIComponent(
        JSON.stringify({
          activeShopId: opts.shopContext.activeShopId,
          assignedShopIds: opts.shopContext.assignedShopIds,
        }),
      ),
      url: BASE_URL,
      path: "/",
    },
  ])
}

/**
 * Clear cookies + storage so `/login` renders the form (no token →
 * `validateSession()` is skipped per the page's `useEffect`).
 */
async function clearAuth(
  page: Page,
  context: BrowserContext,
): Promise<void> {
  await context.clearCookies()
  await page.addInitScript(() => {
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch {
      /* private mode — already empty */
    }
  })
}

/**
 * Run the axe audit against the current page state and assert no
 * serious/critical violations. Throws a human-readable diagnostic when
 * violations are present so the Playwright reporter shows the exact
 * rule id, impact, and node target that failed.
 *
 * Uses the WCAG 2.0/2.1 A + AA tag set; the suite is not asserting
 * advisory `best-practice` rules. Allowlisted rules are skipped via
 * `disableRules` so a known pre-existing failure can be tracked
 * separately without blocking the audit.
 */
async function runAxeAudit(
  page: Page,
  routeLabel: string,
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags([...WCAG_TAGS])
  if (ALLOWLISTED_RULES.length > 0) {
    builder = builder.disableRules(ALLOWLISTED_RULES.map((r) => r.id))
  }
  const results = await builder.analyze()

  // Slice down to serious + critical — the failure bar described in
  // tasks.md 15.10. The `impact` field on a `Result` is the maximum
  // impact across the matched nodes.
  const blocking = results.violations.filter((v) =>
    isSeriousOrCritical(v.impact),
  )

  if (blocking.length > 0) {
    // Human-friendly diagnostic: list each violation with its impact,
    // rule id, and the affected node target. Playwright's reporter
    // surfaces this string when the assertion below fails.
    const diagnostic = blocking
      .map((v) => {
        const targets = v.nodes
          .slice(0, 3)
          .map((n) => `      · ${n.target.join(" ")}`)
          .join("\n")
        const more =
          v.nodes.length > 3
            ? `\n      · …and ${v.nodes.length - 3} more node(s)`
            : ""
        return [
          `  • [${v.impact}] ${v.id} — ${v.help}`,
          `    ${v.helpUrl}`,
          targets + more,
        ].join("\n")
      })
      .join("\n\n")
    throw new Error(
      `Accessibility audit failed for ${routeLabel}: ${blocking.length} serious/critical violation(s).\n\n${diagnostic}`,
    )
  }

  // Sanity check — fails fast if the audit returned nothing at all
  // (would indicate the page didn't render and the audit has no DOM to
  // inspect).
  expect(results.passes.length + results.incomplete.length).toBeGreaterThan(0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Accessibility audits — multi-vendor-dashboard-ui routes", () => {
  test("/login is free of serious/critical axe violations", async ({
    page,
    context,
  }) => {
    await clearAuth(page, context)
    await blockSocketHandshake(page)

    await page.goto("/login")

    // Wait until the form renders — proves `validateSession()` short-
    // circuited on the missing token and the page is in its steady state.
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByLabel("Password")).toBeVisible()

    await runAxeAudit(page, "/login")
  })

  test("/select-shop is free of serious/critical axe violations", async ({
    page,
    context,
  }) => {
    // ── Mocks: my-shops + me + catch-all ───────────────────────────────
    await page.route("**/api/v1/auth/my-shops", async (route) => {
      if (route.request().method() !== "GET") {
        return route.fallback()
      }
      await fulfillJson(
        route,
        200,
        envelope({ shops: [ASSIGNMENT_A, ASSIGNMENT_B] }),
      )
    })

    await page.route("**/api/v1/admin/auth/me", async (route) => {
      if (route.request().method() !== "GET") {
        return route.fallback()
      }
      await fulfillJson(route, 200, envelope(VENDOR_USER))
    })

    await blockSocketHandshake(page)
    await installApiCatchAll(page)

    // ── Auth: vendor with two assigned shops, no active shop yet ──────
    await seedAuth(page, context, {
      user: VENDOR_USER,
      isSuperAdmin: false,
      shopContext: {
        activeShopId: null,
        mode: "UNSELECTED",
        shopRole: null,
        permissions: VENDOR_USER.permissions,
        shopMeta: null,
        assignedShopIds: [SHOP_A.id, SHOP_B.id],
      },
    })

    await page.goto("/select-shop")

    // Both shop cards land before the audit runs.
    await expect(
      page.getByRole("heading", { name: /select a shop/i, level: 1 }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(SHOP_A.name).first()).toBeVisible()
    await expect(page.getByText(SHOP_B.name).first()).toBeVisible()

    await runAxeAudit(page, "/select-shop")
  })

  test("/shops is free of serious/critical axe violations", async ({
    page,
    context,
  }) => {
    // The shops list backend response shape is `{ shops, total, page,
    // limit }` (see `shopsService.list` normalization). We return one
    // active + one inactive row so both Active/Verified badge variants
    // render — the audit needs the variants in the DOM to evaluate them.
    await page.route(/\/api\/v1\/shops(\?.*)?$/, async (route: Route) => {
      if (route.request().method() !== "GET") {
        return route.fallback()
      }
      await fulfillJson(
        route,
        200,
        envelope({
          shops: [SHOP_A, { ...SHOP_B, is_active: false, is_verified: false }],
          total: 2,
          page: 1,
          limit: 20,
        }),
      )
    })

    await page.route("**/api/v1/admin/auth/me", async (route) => {
      if (route.request().method() !== "GET") {
        return route.fallback()
      }
      await fulfillJson(route, 200, envelope(SUPER_ADMIN_USER))
    })

    await blockSocketHandshake(page)
    await installApiCatchAll(page)

    // ── Auth: super admin in ALL_SHOPS mode ─────────────────────────────
    await seedAuth(page, context, {
      user: SUPER_ADMIN_USER,
      isSuperAdmin: true,
      shopContext: {
        activeShopId: null,
        mode: "ALL_SHOPS",
        shopRole: null,
        permissions: SUPER_ADMIN_USER.permissions,
        shopMeta: null,
        assignedShopIds: [],
      },
    })

    await page.goto("/shops")

    // Wait for the rows to render so the audit sees the populated table.
    await expect(
      page.getByRole("heading", { level: 1, name: /shops/i }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(SHOP_A.name).first()).toBeVisible()
    await expect(page.getByText(SHOP_B.name).first()).toBeVisible()

    await runAxeAudit(page, "/shops")
  })

  test("/shop-products is free of serious/critical axe violations", async ({
    page,
    context,
  }) => {
    await page.route(
      (url) => /\/shop-products(\?.*)?$/.test(url.pathname + url.search),
      async (route: Route) => {
        if (route.request().method() !== "GET") {
          return route.fallback()
        }
        await fulfillJson(
          route,
          200,
          envelope({
            items: [SHOP_PRODUCT],
            total: 1,
            page: 1,
            limit: 20,
          }),
        )
      },
    )

    // Categories filter dropdown — empty list keeps the UI quiet.
    await page.route(
      (url) => url.pathname.endsWith("/api/v1/categories"),
      async (route: Route) => fulfillJson(route, 200, envelope([])),
    )

    await page.route("**/api/v1/admin/auth/me", async (route) => {
      if (route.request().method() !== "GET") {
        return route.fallback()
      }
      await fulfillJson(route, 200, envelope(VENDOR_USER))
    })

    await blockSocketHandshake(page)
    await installApiCatchAll(page)

    // ── Auth: vendor scoped to shop-a (SINGLE_SHOP) ────────────────────
    await seedAuth(page, context, {
      user: VENDOR_USER,
      isSuperAdmin: false,
      shopContext: {
        activeShopId: SHOP_A.id,
        mode: "SINGLE_SHOP",
        shopRole: "SHOP_ADMIN",
        permissions: VENDOR_USER.permissions,
        shopMeta: {
          id: SHOP_A.id,
          name: SHOP_A.name,
          branchCode: SHOP_A.branch_code,
          city: SHOP_A.city,
          isActive: SHOP_A.is_active,
        },
        assignedShopIds: [SHOP_A.id],
      },
    })

    await page.goto("/shop-products")

    // Wait until the row content lands — the audit needs the populated
    // table in the DOM, not the loading skeleton.
    await expect(
      page.getByText(SHOP_PRODUCT.product.name, { exact: true }),
    ).toBeVisible({ timeout: 15_000 })

    await runAxeAudit(page, "/shop-products")
  })

  test("/shop-financials is free of serious/critical axe violations", async ({
    page,
    context,
  }) => {
    await page.route(
      (url) => /\/shop-financials(\?.*)?$/.test(url.pathname + url.search),
      async (route: Route) => {
        if (route.request().method() !== "GET") {
          return route.fallback()
        }
        await fulfillJson(
          route,
          200,
          envelope({
            items: [FINANCIAL_PERIOD],
            total: 1,
            page: 1,
            limit: 20,
          }),
        )
      },
    )

    await page.route("**/api/v1/admin/auth/me", async (route) => {
      if (route.request().method() !== "GET") {
        return route.fallback()
      }
      await fulfillJson(route, 200, envelope(VENDOR_USER))
    })

    await blockSocketHandshake(page)
    await installApiCatchAll(page)

    // ── Auth: vendor scoped to shop-a (SINGLE_SHOP) ────────────────────
    await seedAuth(page, context, {
      user: VENDOR_USER,
      isSuperAdmin: false,
      shopContext: {
        activeShopId: SHOP_A.id,
        mode: "SINGLE_SHOP",
        shopRole: "SHOP_ADMIN",
        permissions: VENDOR_USER.permissions,
        shopMeta: {
          id: SHOP_A.id,
          name: SHOP_A.name,
          branchCode: SHOP_A.branch_code,
          city: SHOP_A.city,
          isActive: SHOP_A.is_active,
        },
        assignedShopIds: [SHOP_A.id],
      },
    })

    await page.goto("/shop-financials")

    // The h1 plus the KPI strip both need to land before the audit runs.
    // The KPI strip is the most-content-rich part of the page; the audit
    // would otherwise pick up `next/dynamic`'s `loading` skeleton state
    // on the chart wrapper and miss the steady-state markup.
    await expect(
      page.getByRole("heading", { level: 1, name: /financials/i }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("kpi-strip")).toBeVisible()
    await expect(page.getByTestId("payout-chips")).toBeVisible()

    await runAxeAudit(page, "/shop-financials")
  })
})
