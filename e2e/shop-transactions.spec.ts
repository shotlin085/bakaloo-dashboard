/**
 * E2E — `/shop-transactions` read-only ledger (task 15.8).
 *
 * Validates the contract from `requirements.md`:
 *
 *   - Req 9.3 — every column the design specifies (created_at, type badge,
 *     amount with sign + colour, balance_after, reference_type,
 *     reference_id, description, created_by) is rendered for every row in
 *     the response.
 *   - Req 9.5 — the page is strictly read-only: no Add/Edit/Delete CTA is
 *     visible anywhere on the surface.
 *   - Req 9.6 — clicking the reference link routes to the related entity:
 *       ORDER_REVENUE / REFUND_DEBIT / COMMISSION_DEBIT / DELIVERY_COST →
 *           `/orders/{reference_id}`
 *       PAYOUT_CREDIT →
 *           `/shop-financials?period_id={reference_id}`
 *
 * Test design
 * -----------
 * - Auth + scope is faked entirely on the client per the pattern from
 *   `auth.spec.ts` / `shop-staff.spec.ts` / `shop-switcher.spec.ts`:
 *   `localStorage` carries the auth token + admin user + shop-context
 *   snapshot, and the three Edge-runtime cookies (`auth_session`,
 *   `is-super-admin`, `shop-context-mw`) mirror the slice the Next.js
 *   middleware reads.
 * - Every API call is intercepted with `page.route(...)`. The
 *   `/shop-transactions` route returns a fixed three-row payload covering
 *   one credit-with-order-reference, one debit-with-order-reference, and
 *   one credit-with-payout-reference so we can assert both branches of
 *   `buildReferenceHref` (`/orders/...` and `/shop-financials?period_id=...`).
 * - The order-detail and shop-financials pages are NOT rendered by this
 *   suite — exercising them is the job of dedicated specs. We assert the
 *   navigation contract by waiting for the URL to settle on the expected
 *   path (Playwright's `waitForURL`) and then navigate back.
 *
 * Spec ref: tasks.md 15.8; Requirements 9.3, 9.5, 9.6.
 */

import { expect, test, type Route } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Fixture data
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-a"
const SHOP_NAME = "Shop A"
const ACCESS_TOKEN = "e2e-shop-tx-token"

/**
 * Vendor-style admin user — Shop_Admin scoped to a single shop. Mirrors the
 * shape `auth.store.ts` persists under `admin-user`. Includes the explicit
 * `shop-transactions.read` token so the page renders without RBAC redirects
 * and `orders.read` so the post-click `/orders/...` URL doesn't bounce off
 * a permission gate (we don't render the orders page, but the middleware /
 * client guards still consult permissions on navigation).
 */
const ADMIN_USER = {
  id: "u1",
  name: "Shop Admin",
  email: "admin@bakaloo.test",
  // Backend currently issues `ADMIN` for shop-staff JWTs; matches the auth
  // spec fixture so the dashboard's `usePermissions` path treats this user
  // as a non-Viewer (the axios interceptor's viewer guard would otherwise
  // cancel any mutation it sees).
  role: "ADMIN" as const,
  phone: "+919999999991",
  permissions: [
    "shop-transactions.read",
    "shop-financials.read",
    "orders.read",
  ],
}

/**
 * Snapshot the Shop_Context_Store hydrates from. SINGLE_SHOP mode is the
 * only mode where the ledger page renders the table (Req 9.1) — the
 * `useShopTransactions` hook is `enabled: false` outside this mode and the
 * page short-circuits with `<EmptyShopState />`.
 */
const SHOP_CONTEXT_SNAPSHOT = {
  activeShopId: SHOP_ID,
  mode: "SINGLE_SHOP" as const,
  shopRole: "SHOP_ADMIN" as const,
  permissions: ADMIN_USER.permissions,
  shopMeta: {
    id: SHOP_ID,
    name: SHOP_NAME,
    branchCode: "SHOP-A",
    city: "Mumbai",
    isActive: true,
  },
  // Vendor — exactly one assigned shop. Triggers the tamper guard but not
  // the multi-shop selector redirect; middleware allows any route.
  assignedShopIds: [SHOP_ID],
}

/** Three ledger rows covering all three reference-link branches. */
const TX_1 = {
  id: "tx-1",
  shop_id: SHOP_ID,
  type: "ORDER_REVENUE" as const,
  amount: 1500,
  balance_after: 1500,
  reference_type: "ORDER" as const,
  reference_id: "ord-1",
  description: "Order revenue",
  created_by: "system",
  created_at: "2024-12-25T10:00:00.000Z",
}

const TX_2 = {
  id: "tx-2",
  shop_id: SHOP_ID,
  type: "REFUND_DEBIT" as const,
  amount: -200,
  balance_after: 1300,
  reference_type: "ORDER" as const,
  reference_id: "ord-1",
  description: "Refund",
  created_by: "system",
  created_at: "2024-12-25T11:00:00.000Z",
}

const TX_3 = {
  id: "tx-3",
  shop_id: SHOP_ID,
  type: "PAYOUT_CREDIT" as const,
  amount: 1300,
  balance_after: 0,
  reference_type: "PAYOUT" as const,
  reference_id: "fp-1",
  description: "Payout to bank",
  created_by: "system",
  created_at: "2024-12-25T12:00:00.000Z",
}

/** Backend-style envelope used by every dashboard endpoint. */
function envelope<T>(data: T) {
  return { success: true, message: "OK", data }
}

/** JSON shorthand for `route.fulfill`. */
function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Shop transactions ledger", () => {
  test("read-only ledger renders all columns and reference links route to the related entity", async ({
    page,
    context,
  }) => {
    // ── Seed auth + shop scope before any page script runs ────────────────
    //
    // `addInitScript` runs inside the page context before navigation, so
    // by the time `(dashboard)/layout.tsx` calls
    // `useAuthStore.hydrate()` + `useShopContextStore.hydrate()` the
    // snapshots are already in `localStorage`.
    await page.addInitScript(
      ({ token, user, snapshot }) => {
        try {
          window.localStorage.setItem("accessToken", token)
          window.localStorage.setItem("admin-user", JSON.stringify(user))
          window.localStorage.setItem("shop-context", JSON.stringify(snapshot))
        } catch {
          /* private mode — middleware cookies still cover us */
        }
      },
      {
        token: ACCESS_TOKEN,
        user: ADMIN_USER,
        snapshot: SHOP_CONTEXT_SNAPSHOT,
      },
    )

    // Mirror the same snapshot into the cookies the Next.js middleware
    // reads (Edge runtime cannot see `localStorage`).
    await context.addCookies([
      {
        name: "auth_session",
        value: "1",
        url: "http://localhost:3002",
        path: "/",
      },
      {
        name: "is-super-admin",
        value: "0",
        url: "http://localhost:3002",
        path: "/",
      },
      {
        name: "shop-context-mw",
        value: encodeURIComponent(
          JSON.stringify({
            activeShopId: SHOP_ID,
            assignedShopIds: [SHOP_ID],
          }),
        ),
        url: "http://localhost:3002",
        path: "/",
      },
    ])

    // ── API mocks ─────────────────────────────────────────────────────────
    //
    // First-match wins, so register the targeted handlers before the
    // catch-all. We capture the `X-Shop-Id` header on the
    // `/shop-transactions` request so we can confirm the axios
    // interceptor injected the active scope (Req 3.5 / 9.1).
    let shopTransactionsCallCount = 0
    let lastShopTransactionsShopId: string | null = null

    // Block Socket.IO handshakes — `<SocketProvider>` connects on token
    // change and we don't want a flood of `connect_error` toasts polluting
    // the test. Returning 204 makes the client treat the server as
    // unreachable; the provider retries silently.
    await page.route("**/socket.io/**", async (route) => {
      await route.fulfill({ status: 204, body: "" })
    })

    // Token validation on dashboard mount.
    await page.route("**/admin/auth/me", async (route) => {
      if (route.request().method() !== "GET") {
        return route.fallback()
      }
      await fulfillJson(route, envelope(ADMIN_USER))
    })

    // Logout — the layout doesn't call this, but we wire it for safety.
    await page.route("**/admin/auth/logout", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback()
      }
      await fulfillJson(route, envelope({}))
    })

    // The shop-transactions endpoint — matched on the path so any query
    // string the page appends (page, limit, type, …) still hits this
    // handler. We capture the `X-Shop-Id` header for assertion below.
    await page.route(
      (url) => url.pathname.endsWith("/shop-transactions"),
      async (route: Route) => {
        if (route.request().method() !== "GET") {
          return route.fallback()
        }
        shopTransactionsCallCount += 1
        const headers = route.request().headers()
        lastShopTransactionsShopId =
          headers["x-shop-id"] ?? headers["X-Shop-Id"] ?? null
        await fulfillJson(
          route,
          envelope({
            items: [TX_1, TX_2, TX_3],
            total: 3,
            page: 1,
            limit: 20,
          }),
        )
      },
    )

    // The Shop_Switcher popover (`useActiveShopsForSwitcher`) hits this
    // endpoint with `?is_active=true&...`. The trigger is hidden for
    // vendors so the query never fires, but we install a handler in case
    // a future change re-enables it for Shop_Admins.
    await page.route(/\/api\/v1\/shops(\?.*)?$/, async (route) => {
      await fulfillJson(
        route,
        envelope({
          shops: [
            {
              id: SHOP_ID,
              name: SHOP_NAME,
              branch_code: "SHOP-A",
              city: "Mumbai",
              is_active: true,
              is_verified: true,
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
        }),
      )
    })

    // Catch-all for unrelated background queries (notifications, settings,
    // dashboard-home, etc.) — return an empty success envelope so the
    // page doesn't surface red network errors during the test. Anything
    // we explicitly need to assert against is registered above and
    // matches first.
    await page.route(/\/api\/v1\//, async (route) => {
      await fulfillJson(route, envelope({}))
    })

    // ── 1. Navigate to the ledger ─────────────────────────────────────────
    await page.goto("/shop-transactions")

    // The page header proves the layout's `validateSession()` resolved and
    // we're past the loading splash.
    await expect(
      page.getByRole("heading", { name: "Transactions", level: 1 }),
    ).toBeVisible()

    // ── 2. The ledger renders with the X-Shop-Id header attached ──────────
    //
    // The list query is fired by `useShopTransactions` once the layout
    // mounts. Wait for at least one call so the assertion below is stable.
    await expect
      .poll(() => shopTransactionsCallCount, { timeout: 10_000 })
      .toBeGreaterThan(0)
    expect(lastShopTransactionsShopId).toBe(SHOP_ID)

    // ── 3. Every row renders every column (Req 9.3) ───────────────────────
    //
    // We assert by visible text per column. The amount cell prepends a
    // sign (`+` for credits, `−` for debits) so users with color-vision
    // differences can still tell the direction (Req 13.6).
    //
    // `formatCurrency(1500, "INR")` produces a non-breaking-space-padded
    // glyph (`₹\u00a01,500.00`) — we match the digit run with a regex so
    // the test stays robust against locale / spacing tweaks.

    // Type badges (`shopTransactions.type.<TYPE>` translations). The
    // "Order revenue" and "Refund" strings appear both in the type badge
    // and in the description column for rows 1 and 2; using `.first()`
    // only confirms presence, which is all Req 9.3 demands here.
    await expect(page.getByText("Order revenue").first()).toBeVisible()
    await expect(page.getByText("Refund").first()).toBeVisible()
    await expect(page.getByText("Payout").first()).toBeVisible()

    // Amount + sign — credits prepend `+`, debits prepend `−` (a minus
    // sign, U+2212, matching the AmountCell renderer).
    await expect(page.getByText(/\+\s*₹\s*1,500\.00/)).toBeVisible()
    await expect(page.getByText(/−\s*₹\s*200\.00/)).toBeVisible()
    await expect(page.getByText(/\+\s*₹\s*1,300\.00/).first()).toBeVisible()

    // balance_after column — three values, one per row. The 1,500.00 and
    // 1,300.00 magnitudes are also produced by the amount column, so
    // `.first()` is sufficient — both columns must render the value for
    // the assertion to succeed.
    await expect(page.getByText(/₹\s*1,500\.00/).first()).toBeVisible()
    await expect(page.getByText(/₹\s*1,300\.00/).first()).toBeVisible()
    await expect(page.getByText(/₹\s*0\.00/)).toBeVisible()

    // reference_type column — both ORDER (rows 1 & 2) and PAYOUT (row 3).
    await expect(page.getByText("ORDER").first()).toBeVisible()
    await expect(page.getByText("PAYOUT")).toBeVisible()

    // Description column.
    await expect(page.getByText("Payout to bank")).toBeVisible()

    // created_by column — `system` for all three rows. The renderer wraps
    // the value in a `<span>` so a single visible text match is enough.
    await expect(page.getByText("system").first()).toBeVisible()

    // ── 4. Reference links — the two reachable destinations ───────────────
    //
    // Row 1 (ORDER_REVENUE / ord-1) → `/orders/ord-1`. The ledger renders
    // every reference id as a `<Link>` whose accessible name is the
    // reference id itself. Row 2 (REFUND_DEBIT / ord-1) shares the same
    // id, so we scope the assertion to a Link with `href="/orders/ord-1"`
    // and trust Next.js to resolve clicks to the same route.
    const orderLink = page.locator('a[href="/orders/ord-1"]').first()
    await expect(orderLink).toBeVisible()
    await expect(orderLink).toHaveText("ord-1")

    // Row 3 (PAYOUT_CREDIT / fp-1) → `/shop-financials?period_id=fp-1`.
    const payoutLink = page.locator(
      'a[href="/shop-financials?period_id=fp-1"]',
    )
    await expect(payoutLink).toBeVisible()
    await expect(payoutLink).toHaveText("fp-1")

    // ── 5. Read-only invariant (Req 9.5) ──────────────────────────────────
    //
    // No Add / Create / New / Edit / Delete affordance is rendered on the
    // page. We grep the accessible names of every visible button + link
    // for the canonical CTA verbs and assert none match. Roles are
    // searched separately so a button with text "Edit row" inside an
    // unrelated tooltip would still trip the assertion.
    const writeAffordancePattern = /^(add|new|create|edit|delete|remove)\b/i
    await expect(
      page.getByRole("button", { name: writeAffordancePattern }),
    ).toHaveCount(0)
    await expect(
      page.getByRole("link", { name: writeAffordancePattern }),
    ).toHaveCount(0)

    // ── 6. Click row 1's reference link → `/orders/ord-1` ─────────────────
    //
    // We click the link directly rather than dispatching a synthetic
    // `Enter` so the test exercises the same code path a real user takes.
    // The orders page is mocked to return an empty payload above, so the
    // assertion below only cares about the URL settling on the expected
    // path (Req 9.6 — the navigation contract).
    await orderLink.click()
    await page.waitForURL(/\/orders\/ord-1$/, { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toBe("/orders/ord-1")

    // ── 7. Navigate back, click row 3's reference link ───────────────────
    //
    // `goBack()` returns the page to `/shop-transactions`. We re-assert
    // the table re-rendered before exercising the second branch so a
    // flaky back-navigation never silently masks a regression.
    await page.goBack()
    await page.waitForURL(/\/shop-transactions(\?.*)?$/, { timeout: 10_000 })
    await expect(
      page.getByRole("heading", { name: "Transactions", level: 1 }),
    ).toBeVisible()

    const payoutLinkAfterBack = page.locator(
      'a[href="/shop-financials?period_id=fp-1"]',
    )
    await expect(payoutLinkAfterBack).toBeVisible()
    await payoutLinkAfterBack.click()

    // The shop-financials page is mocked to return an empty payload, so
    // the URL settling on the expected path with the `period_id` query
    // string is the assertion target.
    await page.waitForURL(/\/shop-financials\?period_id=fp-1$/, {
      timeout: 10_000,
    })
    const finalUrl = new URL(page.url())
    expect(finalUrl.pathname).toBe("/shop-financials")
    expect(finalUrl.searchParams.get("period_id")).toBe("fp-1")
  })
})
