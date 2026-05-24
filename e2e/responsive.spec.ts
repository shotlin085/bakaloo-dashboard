/**
 * Responsive E2E — `/shops` collapses to stacked cards on mobile (task 15.9).
 *
 * Validates the responsive table↔card transformation that `<DataList />`
 * applies to the shops list. At a 360-pixel viewport (well below Tailwind's
 * `md` breakpoint of 768 px) the desktop `<table>` is hidden via
 * `hidden md:table` and the stacked `<ul>` of `<li>` cards becomes visible
 * via `flex md:hidden`. Every card must contain the textual value of every
 * column the page renders, so a vendor on a phone sees the same data they
 * would on a desktop, just stacked.
 *
 * Strategy
 * --------
 *  - Pre-seed a Super_Admin auth state into `localStorage` + the three
 *    middleware cookies, mirroring the harness used in `shops-crud.spec.ts`
 *    and `shop-switcher.spec.ts`. The login flow itself is exercised
 *    elsewhere (15.2).
 *  - Mock `GET /api/v1/shops` with three deterministic rows ("Shop A",
 *    "Shop B", "Shop C") whose values cover every column the page renders
 *    (name, branch_code, city, pincode, is_active, is_verified,
 *    total_orders, avg_rating, rating_count). Picking visually distinct
 *    values per column (e.g. unique pincodes, unique branch codes) keeps
 *    the per-card assertions unambiguous.
 *  - Resize the viewport to 360x640 BEFORE navigation so the very first
 *    render at `/shops` is mobile-sized. Playwright drives a real Chromium
 *    browser, so Tailwind's `md:` media queries evaluate against the
 *    actual viewport and the `hidden md:table` rule does what it says on
 *    the tin.
 *  - Assert four invariants from Req 12.3 / Property 14:
 *      1. The desktop `<table>` is not visible at 360 px.
 *      2. The card list `<ul>` is visible.
 *      3. Exactly three `<li>` cards render (one per row).
 *      4. Each card contains the textual value of every column.
 *
 * Requirements: 12.3, 12.5
 */

import { expect, test, type BrowserContext, type Route } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SUPER_ADMIN_USER = {
  id: "user-super-001",
  name: "Super Admin",
  email: "super@bakaloo.test",
  role: "SUPER_ADMIN" as const,
  phone: "+919999999999",
  permissions: ["*"],
}

/** Test-only JWT placeholder; every backend call is intercepted below. */
const ACCESS_TOKEN = "test-super-admin-jwt"

/**
 * Shop_Context_Store snapshot rehydrated on layout mount. ALL_SHOPS for a
 * super admin so the X-Shop-Id header is omitted and the middleware cookie
 * doesn't trigger a redirect to `/select-shop`.
 */
const SHOP_CONTEXT_LOCALSTORAGE = {
  activeShopId: null as string | null,
  mode: "ALL_SHOPS" as const,
  shopRole: null as string | null,
  permissions: [] as string[],
  shopMeta: null,
  assignedShopIds: [] as string[],
}

/** Slice of the same snapshot mirrored into the middleware cookie. */
const SHOP_CONTEXT_COOKIE_PAYLOAD = {
  activeShopId: null as string | null,
  assignedShopIds: [] as string[],
}

/**
 * Build a fully-populated `Shop` fixture. Each call defaults every field
 * the dashboard's `Shop` type declares, then layers user overrides on top.
 * The defaults are deliberately distinct per row (default branch_code,
 * city, pincode, etc.) so a per-card "contains the column value" assertion
 * is unambiguous when the override doesn't touch a given field.
 */
function makeShop(
  overrides: Partial<Record<string, unknown>> & { id: string; name: string },
): Record<string, unknown> {
  const defaultDay = { open: "09:00", close: "21:00", closed: false }
  return {
    slug: overrides.id,
    branch_code: `BR-${overrides.id.toUpperCase()}`,
    description: "",
    logo_url: "",
    banner_url: "",
    phone: "+910000000000",
    email: `${overrides.id}@bakaloo.test`,
    whatsapp: "",
    address_line1: "1 Main Street",
    address_line2: "",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    lat: 19.07,
    lng: 72.87,
    serviceable_pincodes: ["400001"],
    delivery_radius_km: 5,
    is_active: true,
    is_verified: true,
    operating_hours: {
      monday: defaultDay,
      tuesday: defaultDay,
      wednesday: defaultDay,
      thursday: defaultDay,
      friday: defaultDay,
      saturday: defaultDay,
      sunday: defaultDay,
    },
    commission_rate: 10,
    gst_number: "",
    pan_number: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
    bank_holder_name: "",
    total_orders: 0,
    total_revenue: 0,
    avg_rating: 0,
    rating_count: 0,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }
}

/**
 * Three deterministic rows. Every column value is unique across rows so the
 * per-card assertions can match values without cross-talk. `is_active` and
 * `is_verified` toggle across rows to exercise the badge text fallback —
 * the badge contents must include literal text per Req 13.6, so the
 * matching card should contain "Active"/"Inactive" and "Verified"/
 * "Unverified" depending on the row's flags.
 */
const SHOPS = [
  makeShop({
    id: "shop-a",
    name: "Shop A",
    branch_code: "BR-AAA",
    city: "Mumbai",
    pincode: "400001",
    is_active: true,
    is_verified: true,
    total_orders: 12,
    avg_rating: 4.5,
    rating_count: 8,
  }),
  makeShop({
    id: "shop-b",
    name: "Shop B",
    branch_code: "BR-BBB",
    city: "Bengaluru",
    pincode: "560002",
    is_active: false,
    is_verified: true,
    total_orders: 34,
    avg_rating: 4.1,
    rating_count: 15,
  }),
  makeShop({
    id: "shop-c",
    name: "Shop C",
    branch_code: "BR-CCC",
    city: "Pune",
    pincode: "411003",
    is_active: true,
    is_verified: false,
    total_orders: 56,
    avg_rating: 3.9,
    rating_count: 22,
  }),
]

/** Wrap a payload in the dashboard's `ApiResponse<T>` envelope. */
function ok<T>(
  data: T,
  message = "OK",
): { success: true; message: string; data: T } {
  return { success: true, message, data }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-seed super admin auth + scope before any page script runs
// ─────────────────────────────────────────────────────────────────────────────

async function seedSuperAdminAuth(context: BrowserContext): Promise<void> {
  const baseUrl = "http://localhost:3002"

  await context.addCookies([
    { name: "auth_session", value: "1", url: baseUrl, sameSite: "Lax" },
    { name: "is-super-admin", value: "1", url: baseUrl, sameSite: "Lax" },
    {
      name: "shop-context-mw",
      value: encodeURIComponent(JSON.stringify(SHOP_CONTEXT_COOKIE_PAYLOAD)),
      url: baseUrl,
      sameSite: "Lax",
    },
  ])

  await context.addInitScript(
    ({ token, user, shopContext }) => {
      try {
        localStorage.setItem("accessToken", token)
        localStorage.setItem("admin-user", JSON.stringify(user))
        localStorage.setItem("shop-context", JSON.stringify(shopContext))
      } catch {
        // Cookies (set above) cover the middleware path even when
        // localStorage is unavailable.
      }
    },
    {
      token: ACCESS_TOKEN,
      user: SUPER_ADMIN_USER,
      shopContext: SHOP_CONTEXT_LOCALSTORAGE,
    },
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// API mock harness
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Install request interceptors. The shops list response uses the backend's
 * `RawShopsListResponse` shape exactly — `{ shops, total, page, limit }` —
 * so `shopsService.list` can normalize it into the canonical `Paginated<T>`
 * shape the page consumes.
 *
 * Ordering: the catch-all is registered first so the more specific handlers
 * below take precedence (Playwright matches handlers in reverse-registration
 * order).
 */
async function installApiMocks(context: BrowserContext): Promise<void> {
  // Catch-all for the dashboard's other queries (notifications,
  // dashboard-home, analytics, etc). Empty success envelopes keep them
  // resolving without a real backend.
  await context.route(/\/api\/v1\/.*/, async (route: Route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ok({ items: [], total: 0, page: 1, limit: 20 })),
      })
      return
    }
    await route.fulfill({ status: 204, contentType: "application/json", body: "" })
  })

  // /admin/auth/me — session probe on layout mount.
  await context.route("**/api/v1/admin/auth/me", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ok(SUPER_ADMIN_USER)),
    })
  })

  // /auth/my-shops — super admin has none, return empty.
  await context.route("**/api/v1/auth/my-shops", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ok({ shops: [] })),
    })
  })

  // /shops collection — list endpoint that drives the responsive table.
  // The page also lets the user paginate and filter, but the test never
  // changes either, so we ignore the query string and always return the
  // same three rows.
  await context.route(/\/api\/v1\/shops(\?.*)?$/, async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        ok({
          shops: SHOPS,
          total: SHOPS.length,
          page: 1,
          limit: 20,
        }),
      ),
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Shops list responsive layout", () => {
  test.beforeEach(async ({ context }) => {
    await seedSuperAdminAuth(context)
    await installApiMocks(context)
  })

  test("at 360 px viewport, shops list renders as cards with every column value per card and the desktop table is hidden", async ({
    page,
  }) => {
    // Resize BEFORE navigation so the first paint is mobile-sized.
    // Tailwind's default `md` breakpoint is 768 px; 360x640 is the iPhone
    // SE / "small phone" reference width called out in Req 12.5.
    await page.setViewportSize({ width: 360, height: 640 })

    await page.goto("/shops")

    // Wait until the heading renders — proves the layout's `validateSession()`
    // resolved and the page mounted with our mocked data.
    await expect(
      page.getByRole("heading", { level: 1, name: /shops/i }),
    ).toBeVisible()

    // Wait for the data to land so the empty/loading skeletons are gone
    // before we inspect the responsive shell. The card list is the
    // `<ul>` rendered with `md:hidden` inside `<DataList />`; scoping
    // by that class disambiguates it from any other unordered list on
    // the page (sidebar, dropdowns, etc.).
    const cardList = page.locator("ul.md\\:hidden")
    const cards = cardList.locator("> li")
    await expect(cards).toHaveCount(SHOPS.length, { timeout: 10_000 })

    // ── Assertion 1: desktop `<table>` is not visible. ──────────────────
    // `<DataList />` renders a `<table class="hidden ... md:table">`. At
    // 360 px the `hidden` class wins (the `md:` variant only applies at
    // ≥ 768 px) so `isVisible()` returns false. Playwright's `isVisible`
    // honours computed styles, so `display: none` reliably reports false
    // here.
    const table = page.locator("table")
    expect(await table.isVisible()).toBe(false)

    // ── Assertion 2: the card list `<ul>` is visible. ───────────────────
    // The mobile shell is `<ul class="flex ... md:hidden">`. Below md the
    // `flex` rule wins.
    await expect(cardList).toBeVisible()

    // ── Assertion 3: exactly 3 `<li>` cards render. ─────────────────────
    // Already asserted via `toHaveCount` above when waiting for the data,
    // but assert once more under a descriptive name so a future failure
    // mode (e.g. duplicate render, off-by-one pagination) surfaces with
    // an obvious message.
    await expect(cards).toHaveCount(SHOPS.length)

    // ── Assertion 4: every card contains the textual value of every
    // column for that row. We pair each `<li>` with the matching shop
    // fixture by name, then assert the per-column textual values are
    // present in the same card. Using `toContainText` keeps the
    // assertion forgiving of icon glyphs, nested spans, and surrounding
    // copy that the cell components render alongside the raw value.
    //
    // We don't assume render order; we look up each card by the unique
    // shop name so the test stays resilient to incidental sort changes.
    for (const shop of SHOPS) {
      // The shop name renders as a hyperlink inside the card. Filtering
      // the `<li>` set by the row's name picks the exact card that
      // corresponds to this fixture row.
      const card = cardList
        .locator("> li")
        .filter({ hasText: shop.name as string })
      await expect(card).toHaveCount(1)

      // Identity columns
      await expect(card).toContainText(shop.name as string)
      await expect(card).toContainText(shop.slug as string)
      await expect(card).toContainText(shop.branch_code as string)

      // Address columns
      await expect(card).toContainText(shop.city as string)
      await expect(card).toContainText(shop.pincode as string)

      // Status badges — the badge components render literal text in
      // addition to colour (Req 13.6), so the card always contains the
      // human-readable label.
      await expect(card).toContainText(
        shop.is_active ? "Active" : "Inactive",
      )
      await expect(card).toContainText(
        shop.is_verified ? "Verified" : "Unverified",
      )

      // KPI columns — `total_orders` is rendered via `toLocaleString()`
      // and `avg_rating` via `toFixed(2)`. We assert against the same
      // formatted strings the page produces so the assertion mirrors
      // what a human user would see.
      await expect(card).toContainText(
        (shop.total_orders as number).toLocaleString(),
      )
      const ratingCount = shop.rating_count as number
      if (ratingCount > 0) {
        await expect(card).toContainText(
          (shop.avg_rating as number).toFixed(2),
        )
        // The rating cell also surfaces the count in parentheses, e.g.
        // "(8)" — useful as a secondary anchor confirming the rating
        // cell rendered fully (vs. a partially-loaded skeleton).
        await expect(card).toContainText(`(${ratingCount})`)
      }
    }
  })
})
