/**
 * E2E — `/shop-financials` period toggle (task 15.7).
 *
 * Drives the Shop_Financials_UI through the three period buckets and asserts
 * the contract from `requirements.md`:
 *
 *   - Req 8.2 — period toggle has Daily / Weekly / Monthly options and
 *     defaults to Daily on first paint.
 *   - Req 8.3 — selecting a period calls
 *     `GET /api/v1/shop-financials?period_type=<period>` with a date range
 *     defaulting to last 30 days (Daily), last 12 weeks (Weekly), last 12
 *     months (Monthly).
 *   - Req 8.5 — a `recharts` time-series chart renders the gross/net series
 *     across the visible bucket.
 *   - Req 14.7 — the chart wrapper retains at least 240 px of height when
 *     rendered (the `<ResponsiveContainer minHeight={240} />` contract from
 *     `_components/financials-chart.tsx`).
 *
 * ── Test strategy ───────────────────────────────────────────────────────────
 *
 * Auth + scope is faked entirely on the client per the harness from
 * `auth.spec.ts` / `shop-staff.spec.ts` / `shop-transactions.spec.ts`:
 * `localStorage` carries the auth token + admin user + shop-context
 * snapshot, and the three Edge-runtime cookies (`auth_session`,
 * `is-super-admin`, `shop-context-mw`) mirror the slice the Next.js
 * middleware reads.
 *
 * The `/shop-financials` route is intercepted via `page.route(...)`. Every
 * request is captured (timestamp, `X-Shop-Id`, `period_type`, `from`,
 * `to`) so we can inspect what the page actually sends post-toggle. The
 * page debounces the encoded calendar pair at 500 ms before the query
 * key changes (`shop-financials/page.tsx → RANGE_DEBOUNCE_MS = 500`), so
 * after a tab click the request stream is:
 *
 *   1. immediately — `period_type` flips, debounced from/to is still the
 *      previous bucket's default (the `useEffect` reset to the new range
 *      hasn't propagated through `useDebounce` yet),
 *   2. ~500 ms later — both `period_type` and from/to reflect the new
 *      bucket.
 *
 * The assertions therefore poll for the *final* request matching the
 * expected period_type and then check its from/to span. Span is measured
 * in calendar days from the captured `YYYY-MM-DD` strings; a couple of
 * days of slack is allowed because `from.setMonth(-11)` and
 * `from.setDate(- 7 * 12 + 1)` round to whole calendar units.
 *
 * Spec ref: tasks.md 15.7; Requirements 8.2, 8.3, 8.5, 14.7.
 */

import { expect, test, type Route } from "@playwright/test"

import type {
  ShopFinancialPeriod,
  ShopFinancialPeriodType,
} from "../src/types/shop-financial.types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixture data
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-a"
const SHOP_NAME = "Shop A"
const ACCESS_TOKEN = "e2e-shop-financials-token"

/**
 * Vendor admin scoped to a single shop. Mirrors the shape `auth.store.ts`
 * persists under `admin-user`. Includes `shop-financials.read` so the
 * route guard at `/shop-financials` (`permissions.ts → ROUTE_GUARDS`)
 * lets the page render, plus the surrounding `orders.read` /
 * `shop-products.read` tokens so unrelated nav / sidebar items don't
 * trip a redirect during route resolution.
 */
const ADMIN_USER = {
  id: "u1",
  name: "Shop Admin",
  email: "admin@bakaloo.test",
  role: "ADMIN" as const,
  phone: "+919999999991",
  permissions: [
    "shop-financials.read",
    "shop-transactions.read",
    "shop-products.read",
    "orders.read",
  ],
}

/**
 * Snapshot the Shop_Context_Store hydrates from. SINGLE_SHOP mode is the
 * only mode where `/shop-financials` renders the dashboard surface
 * (Req 8.1) — the `useShopFinancials` hook is `enabled: false` outside
 * SINGLE_SHOP and the page short-circuits with `<EmptyShopState />`.
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
  // Vendor — exactly one assigned shop. Triggers the tamper guard but
  // not the multi-shop selector redirect; middleware allows any route.
  assignedShopIds: [SHOP_ID],
}

/**
 * Backend-style envelope used by every dashboard endpoint
 * (`{ success, message, data }`).
 */
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

/**
 * One synthetic period row per bucket. The page renders the chart only
 * when `chartData.length > 0`, so we always return at least one row so
 * Req 8.5 / 14.7 (the chart wrapper exists with min-height ≥ 240 px) can
 * be asserted regardless of which bucket is active.
 *
 * The values are deliberately uninteresting — no test assertion depends
 * on specific revenue numbers. Period_start/end are placeholders; the
 * page only consumes them for ordering and the X-axis label, never as
 * date arithmetic input.
 */
function periodRow(
  period_type: ShopFinancialPeriodType,
  index: number,
): ShopFinancialPeriod {
  return {
    id: `fp-${period_type}-${index}`,
    shop_id: SHOP_ID,
    period_type,
    period_start: "2024-01-01",
    period_end: "2024-01-01",
    gross_revenue: 1000 + index,
    net_revenue: 800 + index,
    total_orders: 10,
    avg_order_value: 100,
    platform_commission: 100,
    delivery_costs: 50,
    refund_amount: 0,
    payout_amount: 800,
    payout_status: "PENDING" as const,
    payout_ref: null,
    paid_at: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calendar-day span between two `YYYY-MM-DD` strings (inclusive of both
 * endpoints). Returns `null` if either argument is missing or unparseable.
 *
 * Uses UTC components so daylight-saving boundaries don't introduce a
 * ±1-day drift in the assertion (the page formats dates from local-time
 * components, so its outputs are also DST-stable for the windows under
 * test — DAILY ≤ 30 d, WEEKLY ≈ 84 d, MONTHLY ≈ 365 d).
 */
function spanDays(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  const f = Date.parse(`${from}T00:00:00Z`)
  const t = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(f) || Number.isNaN(t)) return null
  return Math.round((t - f) / 86_400_000) + 1 // inclusive
}

interface CapturedRequest {
  at: number
  shopId: string | null
  period_type: ShopFinancialPeriodType | null
  from: string | null
  to: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Shop financials period toggle", () => {
  test("Daily/Weekly/Monthly toggle re-renders the chart and updates the default date range per period", async ({
    page,
    context,
  }) => {
    // ── Seed auth + shop scope before any page script runs ────────────────
    //
    // `addInitScript` runs inside the page context before navigation, so
    // by the time `(dashboard)/layout.tsx` calls `useAuthStore.hydrate()`
    // and `useShopContextStore.hydrate()` the snapshots are already in
    // localStorage.
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
    // catch-all. The shop-financials handler captures every inbound
    // request onto a stack so post-toggle assertions can inspect them
    // (the page issues multiple requests during a tab change — see the
    // module docstring).
    const captured: CapturedRequest[] = []

    // Block Socket.IO handshakes — `<SocketProvider>` connects on token
    // change and we don't want a flood of `connect_error` toasts polluting
    // the test. Returning 204 makes the client treat the server as
    // unreachable; the provider retries silently.
    await page.route("**/socket.io/**", async (route) => {
      await route.fulfill({ status: 204, body: "" })
    })

    // Token validation on dashboard mount.
    await page.route("**/admin/auth/me", async (route) => {
      if (route.request().method() !== "GET") return route.fallback()
      await fulfillJson(route, envelope(ADMIN_USER))
    })

    // Logout — the layout doesn't call this, but we wire it for safety.
    await page.route("**/admin/auth/logout", async (route) => {
      if (route.request().method() !== "POST") return route.fallback()
      await fulfillJson(route, envelope({}))
    })

    // The shop-financials endpoint — matched on the path so any query
    // string the page appends (period_type, from, to, page, limit, …)
    // still hits this handler. We log the captured slice for assertion
    // and reply with a single fixture row keyed off the requested
    // `period_type` so the chart always has data to render.
    await page.route(
      (url) => url.pathname.endsWith("/shop-financials"),
      async (route: Route) => {
        if (route.request().method() !== "GET") return route.fallback()
        const u = new URL(route.request().url())
        const headers = route.request().headers()
        const periodParam = u.searchParams.get(
          "period_type",
        ) as ShopFinancialPeriodType | null
        captured.push({
          at: Date.now(),
          shopId: headers["x-shop-id"] ?? headers["X-Shop-Id"] ?? null,
          period_type: periodParam,
          from: u.searchParams.get("from"),
          to: u.searchParams.get("to"),
        })
        await fulfillJson(
          route,
          envelope({
            // One row is enough to satisfy `chartData.length > 0` in the
            // page so the `<FinancialsChart />` (and therefore the
            // `recharts-responsive-container` div) renders.
            items: [periodRow(periodParam ?? "DAILY", captured.length)],
            total: 1,
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
    // page doesn't surface red network errors during the test.
    await page.route(/\/api\/v1\//, async (route) => {
      await fulfillJson(route, envelope({}))
    })

    // ── 1. Navigate ───────────────────────────────────────────────────────
    await page.goto("/shop-financials")

    // The page header proves the layout's `validateSession()` resolved
    // and we're past the loading splash.
    await expect(
      page.getByRole("heading", { name: "Financials", level: 1 }),
    ).toBeVisible()

    // The KPI strip is rendered once data lands — its presence is the
    // canonical signal that the initial query resolved (the loading
    // skeletons are replaced by the strip + chart + table block).
    await expect(page.getByTestId("kpi-strip")).toBeVisible()

    // ── 2. Initial state — Daily, last 30 days (Req 8.2 + 8.3) ────────────
    //
    // Default tab is Daily (Req 8.2). The Tabs trigger flips its
    // `data-state` attribute to `"active"` for the selected option.
    await expect(page.getByTestId("period-daily")).toHaveAttribute(
      "data-state",
      "active",
    )

    // The first network call must be `period_type=DAILY` with a span of
    // at most 30 calendar days. `defaultRangeFor("DAILY")` produces
    // exactly 30 days (`from.setDate(from.getDate() - 29)` + the inclusive
    // `to`), so we tolerate a one-day slack on either side just in case
    // the calendar arithmetic crosses a DST boundary on the test machine.
    await expect
      .poll(() => captured.length, { timeout: 10_000 })
      .toBeGreaterThan(0)
    expect(captured[0].shopId).toBe(SHOP_ID)
    expect(captured[0].period_type).toBe("DAILY")
    const initialSpan = spanDays(captured[0].from, captured[0].to)
    expect(initialSpan).not.toBeNull()
    expect(initialSpan!).toBeGreaterThanOrEqual(28)
    expect(initialSpan!).toBeLessThanOrEqual(31)

    // ── 3. Chart renders with min-height ≥ 240 px (Req 8.5 + 14.7) ────────
    //
    // Recharts emits a `<div class="recharts-responsive-container">` with
    // an inline `min-height: 240px` style (set by `<ResponsiveContainer
    // minHeight={240} />` in `_components/financials-chart.tsx`). The
    // explicit `height={280}` on the container produces an actual
    // bounding-box height of ~280 px, well above the budget.
    const chartWrapper = page.locator(".recharts-responsive-container").first()
    await expect(chartWrapper).toBeVisible()
    const initialBox = await chartWrapper.boundingBox()
    expect(initialBox).not.toBeNull()
    expect(initialBox!.height).toBeGreaterThanOrEqual(240)

    // ── 4. Switch to Weekly — last 12 weeks (Req 8.3) ─────────────────────
    //
    // The page debounces the encoded from/to pair by 500 ms
    // (`RANGE_DEBOUNCE_MS = 500`), so after a tab click the request
    // stream contains:
    //   - one or more transitional calls with the new period_type but the
    //     previous bucket's range (debounced from/to hasn't caught up),
    //   - then a final call with the new period_type AND the new range.
    // We wait for the final call by polling until a captured request
    // matches `period_type=WEEKLY` AND has a span ≥ 60 days (the WEEKLY
    // default is 84; the DAILY default is 30, so > 60 unambiguously
    // identifies the post-debounce request).
    const callsBeforeWeekly = captured.length
    await page.getByTestId("period-weekly").click()
    await expect(page.getByTestId("period-weekly")).toHaveAttribute(
      "data-state",
      "active",
    )

    await expect
      .poll(
        () =>
          captured
            .slice(callsBeforeWeekly)
            .some(
              (r) =>
                r.period_type === "WEEKLY" &&
                (spanDays(r.from, r.to) ?? 0) >= 60,
            ),
        { timeout: 10_000 },
      )
      .toBe(true)

    const weeklyFinal = [...captured]
      .reverse()
      .find((r) => r.period_type === "WEEKLY")
    expect(weeklyFinal).toBeDefined()
    expect(weeklyFinal!.shopId).toBe(SHOP_ID)
    const weeklySpan = spanDays(weeklyFinal!.from, weeklyFinal!.to)
    expect(weeklySpan).not.toBeNull()
    // 12 weeks = 84 days, ±2 days of slack for calendar arithmetic.
    expect(weeklySpan!).toBeGreaterThanOrEqual(82)
    expect(weeklySpan!).toBeLessThanOrEqual(86)

    // The chart re-rendered for the new bucket — wrapper still satisfies
    // the 240 px minimum (Req 14.7).
    const weeklyBox = await chartWrapper.boundingBox()
    expect(weeklyBox).not.toBeNull()
    expect(weeklyBox!.height).toBeGreaterThanOrEqual(240)

    // ── 5. Switch to Monthly — last 12 months (Req 8.3) ───────────────────
    //
    // 12 months ≈ 365 days, with monthly arithmetic landing anywhere from
    // 365 to 366 days (or 334 in the unlikely case `setMonth(-11)` lands
    // in February — but `defaultRangeFor("MONTHLY")` uses calendar-month
    // arithmetic which always preserves the day-of-month, so a 12-month
    // span from any starting date falls in [336, 366] days). We allow a
    // generous `[330, 370]` window so the assertion is stable regardless
    // of when the test runs.
    const callsBeforeMonthly = captured.length
    await page.getByTestId("period-monthly").click()
    await expect(page.getByTestId("period-monthly")).toHaveAttribute(
      "data-state",
      "active",
    )

    await expect
      .poll(
        () =>
          captured
            .slice(callsBeforeMonthly)
            .some(
              (r) =>
                r.period_type === "MONTHLY" &&
                (spanDays(r.from, r.to) ?? 0) >= 330,
            ),
        { timeout: 10_000 },
      )
      .toBe(true)

    const monthlyFinal = [...captured]
      .reverse()
      .find((r) => r.period_type === "MONTHLY")
    expect(monthlyFinal).toBeDefined()
    expect(monthlyFinal!.shopId).toBe(SHOP_ID)
    const monthlySpan = spanDays(monthlyFinal!.from, monthlyFinal!.to)
    expect(monthlySpan).not.toBeNull()
    expect(monthlySpan!).toBeGreaterThanOrEqual(330)
    expect(monthlySpan!).toBeLessThanOrEqual(370)

    // ── 6. Round-trip back to Daily — default range restored ──────────────
    //
    // Clicking Daily again should reset the range to the canonical
    // last-30-days window. We wait for a post-click request whose span
    // is back inside the DAILY budget — a span ≤ 35 days unambiguously
    // distinguishes the new daily call from the previous monthly /
    // weekly captures (84 and ~365 days respectively).
    const callsBeforeDaily = captured.length
    await page.getByTestId("period-daily").click()
    await expect(page.getByTestId("period-daily")).toHaveAttribute(
      "data-state",
      "active",
    )

    await expect
      .poll(
        () =>
          captured
            .slice(callsBeforeDaily)
            .some(
              (r) =>
                r.period_type === "DAILY" &&
                (spanDays(r.from, r.to) ?? 999) <= 35,
            ),
        { timeout: 10_000 },
      )
      .toBe(true)

    const dailyFinal = [...captured]
      .slice(callsBeforeDaily)
      .reverse()
      .find(
        (r) =>
          r.period_type === "DAILY" && (spanDays(r.from, r.to) ?? 999) <= 35,
      )
    expect(dailyFinal).toBeDefined()
    const dailyAgainSpan = spanDays(dailyFinal!.from, dailyFinal!.to)
    expect(dailyAgainSpan).not.toBeNull()
    expect(dailyAgainSpan!).toBeGreaterThanOrEqual(28)
    expect(dailyAgainSpan!).toBeLessThanOrEqual(31)

    // The chart remains rendered after the second round-trip — the page
    // never enters the empty-state branch because every mock returns at
    // least one row.
    const finalBox = await chartWrapper.boundingBox()
    expect(finalBox).not.toBeNull()
    expect(finalBox!.height).toBeGreaterThanOrEqual(240)
  })
})
