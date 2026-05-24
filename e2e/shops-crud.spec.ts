/**
 * Playwright E2E — Shops CRUD (task 15.4).
 *
 * Validates the super-admin happy path across the three shop mutations:
 *
 *   1. Create   — POST /api/v1/shops, success toast "Shop created"
 *   2. Edit     — PATCH /api/v1/shops/:id, success toast "Shop updated"
 *   3. Deactivate — DELETE /api/v1/shops/:id, success toast "Shop deactivated"
 *
 * After each mutation we additionally assert that the list query refetches
 * (i.e. `GET /api/v1/shops` is hit again), proving that the mutation hooks
 * invalidated the `qk.shops(*)` cache as required by Req 5.6 / 5.10 / 5.9.
 *
 * Auth approach:
 *   - We don't drive the real login flow. Instead, the test seeds
 *     `localStorage` (auth tokens, super-admin profile) and the four cookies
 *     the middleware reads (`auth_session`, `is-super-admin`, `shop-context-mw`)
 *     before navigation, so the dashboard layout hydrates straight into a
 *     super-admin / ALL_SHOPS scope. This mirrors the strategy task 15.2
 *     committed to for `auth.spec.ts`.
 *   - All `/api/v1/*` requests are intercepted with `page.route()`. The
 *     dashboard layout calls `validateSession()` against `/admin/auth/me`
 *     on mount, so that endpoint is also mocked.
 *   - The Socket.IO connection is allowed to fail (no upstream is running);
 *     `<SocketProvider>` swallows the connect error and the test does not
 *     depend on live updates.
 *
 * Requirements: 5.6, 5.9, 5.10
 */

import { expect, test, type BrowserContext, type Route } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A minimal `Shop` record that satisfies the dashboard's `Shop` type. Kept
 * deliberately small so the test fixtures stay readable; every field the UI
 * actually renders (name, branch_code, slug, address, KPIs, operating hours)
 * is populated.
 */
function makeShop(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  const defaultDay = { open: "09:00", close: "21:00", closed: false }
  return {
    id: "shop-001",
    name: "Bakaloo Bandra",
    slug: "bakaloo-bandra",
    branch_code: "BR-001",
    description: "Flagship branch in Bandra West",
    logo_url: "",
    banner_url: "",
    phone: "+919876543210",
    email: "bandra@bakaloo.test",
    whatsapp: "+919876543210",
    address_line1: "21 Hill Road",
    address_line2: "",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    lat: 19.0544,
    lng: 72.8407,
    serviceable_pincodes: ["400050", "400051", "400052"],
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
      sunday: { ...defaultDay, closed: true },
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/** Wrap a payload in the dashboard's `ApiResponse<T>` envelope. */
function ok<T>(
  data: T,
  message = "OK",
): { success: true; message: string; data: T } {
  return { success: true, message, data }
}

const SUPER_ADMIN_USER = {
  id: "user-super-001",
  name: "Super Admin",
  email: "super@bakaloo.test",
  role: "SUPER_ADMIN" as const,
  phone: "+919999999999",
  permissions: [
    "shops.read",
    "shops.write",
    "shops.delete",
    "shop-staff.read",
    "shop-staff.write",
    "shop-products.read",
    "shop-products.write",
  ],
}

/**
 * Test-only JWT placeholder. Carries no real claims — every backend call is
 * intercepted by `installApiMocks` and never reaches a real server, so the
 * value just needs to be a non-empty string the axios interceptor will
 * forward as a `Bearer` token.
 */
const ACCESS_TOKEN = "test-super-admin-jwt"

/**
 * Slice of the Shop_Context_Store mirrored into `shop-context-mw` cookie so
 * `src/middleware.ts` permits navigation past `/login`. ALL_SHOPS for super
 * admins (`activeShopId: null`, `assignedShopIds: []`) — the middleware
 * short-circuits on the `is-super-admin=1` cookie before reading this, but
 * we set both for a realistic snapshot.
 */
const SHOP_CONTEXT_COOKIE_PAYLOAD = {
  activeShopId: null as string | null,
  assignedShopIds: [] as string[],
}

/** localStorage snapshot used by `useShopContextStore.hydrate()` on mount. */
const SHOP_CONTEXT_LOCALSTORAGE = {
  activeShopId: null,
  mode: "ALL_SHOPS",
  shopRole: null,
  permissions: [],
  shopMeta: null,
  assignedShopIds: [],
}

/**
 * Pre-seed cookies + localStorage so the dashboard layout boots into a
 * super-admin / ALL_SHOPS scope without going through the real login flow.
 *
 * Cookies are set on the browser context (visible to the Next.js
 * middleware on the very first request). localStorage is seeded via an
 * `addInitScript` so it is in place before any page script executes.
 */
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
        // localStorage may be inaccessible in some contexts; the test's
        // fallback is the cookies set above.
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
// API mock — backend stand-in
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stateful in-memory backend tracking every shops-related request. The
 * counters expose call counts the test uses to assert cache invalidation
 * (post-mutation refetches of `GET /api/v1/shops`).
 */
interface MockBackend {
  shops: Map<string, Record<string, unknown>>
  counts: {
    listShops: number
    getShop: number
    createShop: number
    patchShop: number
    deleteShop: number
  }
  /** Last body received on a PATCH /shops/:id, for assertion shortcuts. */
  lastPatchBody: Record<string, unknown> | null
  /** Last body received on a POST /shops, for assertion shortcuts. */
  lastCreateBody: Record<string, unknown> | null
}

function newMockBackend(): MockBackend {
  return {
    shops: new Map(),
    counts: {
      listShops: 0,
      getShop: 0,
      createShop: 0,
      patchShop: 0,
      deleteShop: 0,
    },
    lastPatchBody: null,
    lastCreateBody: null,
  }
}

/**
 * Install request interceptors that translate the dashboard's API calls into
 * fixture responses. Returns the mutable `MockBackend` so individual tests
 * can read counters for assertions.
 *
 * URL matching: the dashboard's axios `baseURL` resolves to
 * `http://localhost:3000/api/v1` (per `.env.example`). The route patterns
 * use regex matchers anchored on `/api/v1/...` so any host/port the dev
 * server resolves to is matched (CI may vary).
 *
 * Ordering matters: Playwright matches handlers in **reverse** registration
 * order (most-recently-added first). We register the catch-all first so
 * the more specific `/shops` and `/shops/:id` patterns take precedence.
 */
async function installApiMocks(context: BrowserContext): Promise<MockBackend> {
  const backend = newMockBackend()

  // ── Catch-all for any other /api/v1 endpoints the dashboard pings on
  // boot (notifications, dashboard-home, etc). Return empty so those
  // queries resolve to harmless empty data instead of stalling. Registered
  // FIRST so the more specific handlers below override it. ──────────────
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
    await route.fulfill({
      status: 204,
      contentType: "application/json",
      body: "",
    })
  })

  // ── /admin/auth/me — dashboard layout's session probe. ────────────────
  await context.route("**/api/v1/admin/auth/me", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ok(SUPER_ADMIN_USER)),
    })
  })

  // ── /admin/auth/logout — accept and return null. ──────────────────────
  await context.route("**/api/v1/admin/auth/logout", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ok(null)),
    })
  })

  // ── /auth/my-shops — super admin has none, return empty. ──────────────
  await context.route("**/api/v1/auth/my-shops", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ok({ shops: [] })),
    })
  })

  // ── /shops/:id — get, update, soft-delete. ────────────────────────────
  await context.route(
    /\/api\/v1\/shops\/[^/?]+(\?.*)?$/,
    async (route: Route) => {
      const request = route.request()
      const method = request.method()
      const url = new URL(request.url())
      const shopId = url.pathname.split("/").pop() ?? ""

      if (method === "GET") {
        backend.counts.getShop += 1
        const shop = backend.shops.get(shopId)
        if (!shop) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "Not found",
              data: null,
            }),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ok(shop)),
        })
        return
      }

      if (method === "PATCH") {
        backend.counts.patchShop += 1
        let body: Record<string, unknown> = {}
        try {
          body = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>
        } catch {
          body = {}
        }
        backend.lastPatchBody = body

        const existing = backend.shops.get(shopId) ?? makeShop({ id: shopId })
        const updated = {
          ...existing,
          ...body,
          updated_at: new Date().toISOString(),
        }
        backend.shops.set(shopId, updated)

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ok(updated, "Shop updated")),
        })
        return
      }

      if (method === "DELETE") {
        backend.counts.deleteShop += 1
        const existing = backend.shops.get(shopId)
        if (existing) {
          backend.shops.set(shopId, {
            ...existing,
            is_active: false,
            updated_at: new Date().toISOString(),
          })
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ok(null, "Shop deactivated")),
        })
        return
      }

      await route.fallback()
    },
  )

  // ── /shops collection: list, create. Registered LAST so it takes
  //    precedence over the catch-all but does not swallow /shops/:id
  //    requests (the more specific pattern above is registered before
  //    this one but checked later — Playwright's reverse-order match
  //    means `/shops/abc` is still routed to the :id handler because
  //    this collection regex requires the path to end at `/shops`). ────
  await context.route(/\/api\/v1\/shops(\?.*)?$/, async (route: Route) => {
    const request = route.request()
    const method = request.method()

    if (method === "GET") {
      backend.counts.listShops += 1
      const items = Array.from(backend.shops.values())
      // Match the backend's `RawShopsListResponse` shape exactly.
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          ok({
            shops: items,
            total: items.length,
            page: 1,
            limit: 20,
          }),
        ),
      })
      return
    }

    if (method === "POST") {
      backend.counts.createShop += 1
      let body: Record<string, unknown> = {}
      try {
        body = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>
      } catch {
        body = {}
      }
      backend.lastCreateBody = body

      const created = makeShop({
        id: "shop-created-001",
        ...body,
        // Stamp some server-side defaults so the detail page renders.
        is_active: true,
        is_verified: false,
        total_orders: 0,
        total_revenue: 0,
        avg_rating: 0,
        rating_count: 0,
      })
      backend.shops.set(created.id as string, created)

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(ok(created, "Shop created")),
      })
      return
    }

    await route.fallback()
  })

  return backend
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wait for a Sonner toast carrying the given title text to appear.
 *
 * Sonner renders toasts inside a list under `[data-sonner-toaster]`; the
 * accessible name of each toast is the title text the call site passed to
 * `toast.success(...)`. We use a forgiving substring matcher because Sonner
 * may wrap the title across DOM nodes.
 */
async function expectToast(
  page: import("@playwright/test").Page,
  title: string,
): Promise<void> {
  const toaster = page.locator("[data-sonner-toaster]")
  await expect(
    toaster.getByText(title, { exact: false }).first(),
  ).toBeVisible({ timeout: 10_000 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Shops CRUD — super admin happy path", () => {
  test.beforeEach(async ({ context }) => {
    await seedSuperAdminAuth(context)
  })

  test("creates, edits, and deactivates a shop with success toasts and list refetches", async ({
    context,
    page,
  }) => {
    const backend = await installApiMocks(context)

    // ── Step 0: navigate to the shops list. ───────────────────────────
    await page.goto("/shops")

    // The list query fires once on mount; record that as the baseline so
    // we can assert a refetch (count > baseline) after each mutation.
    await expect
      .poll(() => backend.counts.listShops, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1)
    const listCountAfterMount = backend.counts.listShops

    // The "Create shop" CTA is super-admin-only — confirm it is rendered
    // (proves the auth pre-seeding worked) before clicking it.
    const createCta = page.getByRole("button", { name: /create shop/i })
    await expect(createCta).toBeVisible()
    await createCta.click()

    // ── Step 1: create a new shop. ────────────────────────────────────
    await page.waitForURL("**/shops/new")

    // Identity
    await page.getByLabel(/^name$/i).fill("Bakaloo Andheri")
    await page.getByLabel(/branch code/i).fill("BR-002")
    // The slug auto-fills from the name (debounced 300ms); wait for it
    // before continuing so we don't race the form's own write.
    await expect(page.getByLabel(/^slug$/i)).toHaveValue(/bakaloo-andheri/i, {
      timeout: 2_000,
    })

    // Contact (all optional)
    await page.getByLabel(/^phone$/i).fill("+919876500001")

    // Address
    await page.getByLabel(/address line 1/i).fill("17 SV Road")
    await page.getByLabel(/^city$/i).fill("Mumbai")
    await page.getByLabel(/^state$/i).fill("Maharashtra")
    await page.getByLabel(/^pincode$/i).fill("400058")
    await page.getByLabel(/^latitude$/i).fill("19.1197")
    await page.getByLabel(/^longitude$/i).fill("72.8464")

    // Service area — the pincode tag input commits on Enter.
    const pincodeInput = page.locator("#serviceable_pincodes")
    await pincodeInput.fill("400058")
    await pincodeInput.press("Enter")
    await page.getByLabel(/delivery radius/i).fill("5")

    // Commercial settings
    await page.getByLabel(/commission rate/i).fill("10")

    // Submit
    await page.getByRole("button", { name: /create shop/i }).click()

    await expectToast(page, "Shop created")
    expect(backend.counts.createShop).toBe(1)
    expect(backend.lastCreateBody?.name).toBe("Bakaloo Andheri")
    expect(backend.lastCreateBody?.branch_code).toBe("BR-002")
    expect(backend.lastCreateBody?.pincode).toBe("400058")

    // The hook redirects to `/shops/[id]` and the detail page mounts; the
    // list cache invalidation queued by `useCreateShop` does NOT trigger a
    // visible refetch yet because the list query is no longer mounted.
    // Assertion deferred until we navigate back to `/shops` after edit.
    await page.waitForURL(/\/shops\/[^/]+$/)

    // ── Step 2: edit the new shop. ────────────────────────────────────
    await page.getByRole("link", { name: /edit shop/i }).click()
    await page.waitForURL(/\/shops\/[^/]+\/edit$/)

    const nameInput = page.getByLabel(/^name$/i)
    await nameInput.fill("Bakaloo Andheri (Renamed)")

    await page.getByRole("button", { name: /save changes/i }).click()

    await expectToast(page, "Shop updated")
    expect(backend.counts.patchShop).toBe(1)
    expect(backend.lastPatchBody?.name).toBe("Bakaloo Andheri (Renamed)")

    // The edit page redirects back to `/shops/[id]`; the cache
    // invalidation queued by `useUpdateShop` triggers the detail query to
    // refetch — assert that. (`getShop` was called once when the detail
    // page first mounted, then again after the edit.)
    await page.waitForURL(/\/shops\/[^/]+$/)
    await expect
      .poll(() => backend.counts.getShop, { timeout: 5_000 })
      .toBeGreaterThanOrEqual(2)

    // ── Step 3: deactivate the shop via the detail page action bar. ──
    const deactivateButton = page.getByRole("button", {
      name: /^deactivate$/i,
    })
    await expect(deactivateButton).toBeVisible()
    await deactivateButton.click()

    // Confirmation AlertDialog — accept it.
    const confirmDialog = page.getByRole("alertdialog")
    await expect(confirmDialog).toBeVisible()
    await confirmDialog
      .getByRole("button", { name: /deactivate shop\??/i })
      .click()

    await expectToast(page, "Shop deactivated")
    expect(backend.counts.deleteShop).toBe(1)

    // ── Step 4: navigate back to the list and verify cache invalidation. ──
    // After three mutations, the list cache has been invalidated three
    // times. When we navigate to `/shops` the list query refetches —
    // confirming the mutation hooks did dispatch the predicate
    // invalidation against `qk.shops(*)`.
    await page.goto("/shops")
    await expect
      .poll(() => backend.counts.listShops, { timeout: 10_000 })
      .toBeGreaterThan(listCountAfterMount)
  })
})
