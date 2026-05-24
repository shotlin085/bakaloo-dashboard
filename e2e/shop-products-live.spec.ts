/**
 * E2E — Shop_Products live updates (task 15.6).
 *
 * Drives the inventory page through a single Socket.IO `low-stock` event
 * and asserts the contract from Requirements 7.8 / 11.4 / 14.5:
 *
 *   1. The matching row's "Low stock" badge appears in place.
 *   2. A Sonner toast with the i18n string "Low stock: Bananas (3 left)"
 *      renders.
 *   3. NO new `GET /api/v1/shop-products` request is fired (the hook
 *      patches the TanStack Query cache directly — design §15
 *      "in-place cache update for socket events").
 *
 * ── Test strategy ───────────────────────────────────────────────────────────
 *
 * Auth + scope is faked client-side so the test stays hermetic, mirroring
 * `shop-staff.spec.ts` (task 15.5):
 *   - localStorage gets `accessToken`, `admin-user`, `shop-context`.
 *   - Cookies set the middleware advisory flags (`auth_session`,
 *     `is-super-admin=0`, `shop-context-mw` with `assignedShopIds`).
 *   - The dashboard layout's `validateSession()` is satisfied by mocking
 *     `GET /admin/auth/me`.
 *
 * The `<SocketProvider>` (task 11.x) opens a real socket.io-client. We
 * cannot actually connect it to a test server without standing up a
 * Fastify+Socket.IO instance, and we don't want production code changes
 * to expose a test-only `window.__socket` handle. Instead:
 *
 *   - Block the `/socket.io/*` handshake with a 204 response so the
 *     transport never establishes (the client object still exists in
 *     React state — `<SocketProvider>` calls `setSocket(s)` synchronously
 *     after `io()`, well before the connect event fires).
 *   - The `useShopProductLiveUpdates()` hook attaches its `low-stock`
 *     listener via `socket.on(...)` regardless of `socket.connected`
 *     state — see `_components/use-shop-product-live-updates.ts`.
 *   - Once the inventory page is mounted and the row is visible, walk
 *     the React fiber tree from `page.evaluate()` to find the
 *     `SocketContext.Provider`'s `value` (the live socket.io socket,
 *     uniquely identified by the `on`/`off`/`emit`/`emitEvent` methods
 *     it carries from the socket.io-client `Socket` class). Then call
 *     `socket.emitEvent(['low-stock', payload])` to dispatch the event
 *     to the local listeners (this is the same internal entry point the
 *     real engine.io transport uses to deliver inbound packets — see
 *     `node_modules/socket.io-client/build/cjs/socket.js → emitEvent`).
 *
 * That single call drives the production hook end-to-end:
 *   - `setQueriesData` patches every cached `["shop-products", "shop-a", …]`
 *     entry in place → the row's `stock_quantity` flips to 3, which
 *     crosses below `low_stock_threshold` (5) so `<StockBadgeForProduct />`
 *     renders the `data-testid="stock-badge-low"` Badge.
 *   - `toast.warning(t("shopProducts.toast.lowStock", …))` shows the
 *     "Low stock: Bananas (3 left)" toast through the global
 *     `<AccessibleToaster />` mounted at the root layout.
 *   - The cache update is structural — TanStack Query does not refetch.
 *
 * Spec references: tasks.md 15.6; Requirements 7.8 (in-place row patch),
 * 11.4 (low-stock toast contract), 14.5 (no full refetch on socket event).
 */

import { test, expect, type Route } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-a"
const SHOP_NAME = "Shop A"

/**
 * Single shop-product the inventory page renders. Stock starts at 12
 * (above the 5-unit threshold) so the "Low stock" badge is *not* rendered
 * pre-event — that's the visual delta the test asserts after dispatching
 * the socket event with `stock_quantity: 3`.
 *
 * Field shape mirrors `src/types/shop-product.types.ts → ShopProduct`.
 */
const PRODUCT = {
  id: "sp-1",
  shop_id: SHOP_ID,
  product_id: "p-1",

  price: 50,
  sale_price: null,
  cost_price: null,

  stock_quantity: 12,
  low_stock_threshold: 5,
  max_order_qty: 5,

  is_available: true,
  is_featured: false,

  sold_out_at: null,
  restock_eta: null,

  product: {
    id: "p-1",
    name: "Bananas",
    sku: "BAN-01",
    image_url: "",
  },
}

/**
 * Fake admin user persisted to localStorage as `admin-user`. Permissions
 * carry `shop-products.read` so the inventory list is visible; the live
 * updates hook itself does not check permissions, but the page does.
 */
const ADMIN_USER = {
  id: "admin-1",
  name: "Anita Admin",
  email: "anita@example.com",
  phone: "+919999999999",
  role: "ADMIN",
  permissions: [
    "shops.read",
    "shop-products.read",
    "shop-products.write",
    "shop-products.delete",
    "orders.read",
    "products.read",
    "customers.read",
  ],
}

/**
 * Snapshot the Shop_Context_Store hydrates from. `mode: SINGLE_SHOP` and
 * a single assigned shop are the preconditions the live-updates hook
 * checks before subscribing (see `useShopProductLiveUpdates`).
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
  assignedShopIds: [SHOP_ID],
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Wrap a payload in the dashboard's `ApiResponse<T>` envelope. */
function envelope<T>(data: T) {
  return { success: true, message: "OK", data }
}

/** Reply to a route with a JSON body wrapped in the standard envelope. */
async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Shop_Products live updates", () => {
  test("low-stock socket event patches the row in place + toasts without a refetch", async ({
    page,
    context,
  }) => {
    // ── 1. Pre-seed auth + shop scope ─────────────────────────────────────
    //
    // `addInitScript` runs in the page context before navigation so by the
    // time the dashboard layout's auth + Shop_Context hydrators fire the
    // snapshots are already there. Mirrors task 15.5's seeding pattern.
    await page.addInitScript(
      ({ user, snapshot }) => {
        try {
          window.localStorage.setItem("accessToken", "fake-token")
          window.localStorage.setItem("admin-user", JSON.stringify(user))
          window.localStorage.setItem(
            "shop-context",
            JSON.stringify(snapshot),
          )
        } catch {
          /* private mode — middleware cookies still cover us */
        }
      },
      { user: ADMIN_USER, snapshot: SHOP_CONTEXT_SNAPSHOT },
    )

    // The Next.js middleware reads cookies (Edge runtime cannot see
    // localStorage). Mirror the snapshot into the three flags it expects.
    await context.addCookies([
      {
        name: "auth_session",
        value: "1",
        url: "http://localhost:3002",
      },
      {
        name: "is-super-admin",
        value: "0",
        url: "http://localhost:3002",
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
      },
    ])

    // ── 2. Track GET /shop-products call count ────────────────────────────
    //
    // The contract under test (Req 14.5) says the live-updates hook applies
    // a direct cache patch — no follow-up list request. We compare the
    // count before/after the dispatched event to prove that.
    let listCallCount = 0
    await page.route(
      (url) => /\/shop-products(\?.*)?$/.test(url.pathname + url.search),
      async (route: Route) => {
        if (route.request().method() !== "GET") {
          return route.fallback()
        }
        listCallCount += 1
        await fulfillJson(
          route,
          200,
          envelope({
            items: [PRODUCT],
            total: 1,
            page: 1,
            limit: 20,
          }),
        )
      },
    )

    // ── 3. Block the Socket.IO transport ─────────────────────────────────
    //
    // The `<SocketProvider>` calls `io(NEXT_PUBLIC_SOCKET_URL)`; without
    // a real server the engine.io handshake fails after a few retries.
    // Returning 204 here makes the polling transport hang up immediately
    // so the browser doesn't spam reconnect-error toasts during the
    // test. The socket *object* is still created — the React context
    // value is set synchronously at the bottom of the provider's effect
    // ("Set immediately (even before connect) so consumers can attach
    // listeners") — so the live-updates hook still binds its
    // `low-stock` listener regardless of the dropped transport.
    await page.route("**/socket.io/**", async (route) => {
      await route.fulfill({ status: 204, body: "" })
    })

    // ── 4. /admin/auth/me — token validation on dashboard mount ──────────
    await page.route(
      (url) => url.pathname.endsWith("/admin/auth/me"),
      async (route: Route) =>
        fulfillJson(route, 200, envelope(ADMIN_USER)),
    )

    // ── 5. Categories filter dropdown — empty list keeps the UI quiet ────
    await page.route(
      (url) => url.pathname.endsWith("/api/v1/categories"),
      async (route: Route) => fulfillJson(route, 200, envelope([])),
    )

    // ── 6. Catch-all for any other `/api/v1/*` queries ───────────────────
    //
    // Returns an empty paginated envelope so unrelated background queries
    // (notifications, dashboard stats, etc.) don't surface as red network
    // errors and don't fall through to a real backend. Anything we
    // explicitly assert against is registered above and matches first.
    await page.route(/\/api\/v1\//, async (route: Route) => {
      await fulfillJson(
        route,
        200,
        envelope({
          items: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      )
    })

    // ── 7. Navigate to the inventory page ─────────────────────────────────
    await page.goto("/shop-products")

    // Wait for the row to render. Once "Bananas" is visible the:
    //   - dashboard layout has finished `validateSession()`,
    //   - `<SocketProvider>` has set the socket in React state,
    //   - the inventory page has run `useShopProductLiveUpdates()` and
    //     attached the `low-stock` listener.
    await expect(page.getByText("Bananas", { exact: true })).toBeVisible()

    // Capture pre-event call count and badge state. Mounting the page
    // fires exactly one `GET /shop-products` (Req 14.2: one paginated
    // list query per visible list view); record whatever count we see
    // and assert against it after the event so the test isn't fragile
    // to React-StrictMode-style double-mounts in future Next versions.
    const initialCount = listCallCount
    expect(initialCount).toBeGreaterThanOrEqual(1)

    // Pre-event: stock = 12 > threshold = 5 → no "Low stock" badge.
    await expect(page.getByTestId("stock-badge-low")).toHaveCount(0)

    // ── 8. Dispatch the low-stock event ──────────────────────────────────
    //
    // Walk the React fiber tree to find the live socket.io-client
    // instance held by `<SocketContext.Provider value={socket}>`, then
    // call `socket.emitEvent(['low-stock', payload])`. `emitEvent` is
    // socket.io-client's internal dispatcher for inbound packets — it
    // calls `super.emit.apply(this, args)` on the underlying Emitter so
    // every `socket.on('low-stock', …)` listener fires. This drives the
    // production `useShopProductLiveUpdates` hook end-to-end (cache
    // patch + Sonner toast) without standing up a real Socket.IO server.
    //
    // Selectors via fiber predicate (`on` + `off` + `emit` + `emitEvent`
    // all functions) uniquely match a socket.io-client `Socket`. No
    // other context value in the dashboard satisfies that surface.
    await page.evaluate(
      (payload) => {
        type Fiber = {
          memoizedProps?: { value?: unknown } & Record<string, unknown>
          child?: Fiber | null
          sibling?: Fiber | null
          return?: Fiber | null
          stateNode?: { current?: Fiber } & Record<string, unknown>
        }

        type SocketLike = {
          on: (...args: unknown[]) => unknown
          off: (...args: unknown[]) => unknown
          emit: (...args: unknown[]) => unknown
          emitEvent: (args: unknown[]) => unknown
        }

        function isSocket(v: unknown): v is SocketLike {
          if (v == null || typeof v !== "object") return false
          const o = v as Record<string, unknown>
          return (
            typeof o.on === "function" &&
            typeof o.off === "function" &&
            typeof o.emit === "function" &&
            typeof o.emitEvent === "function"
          )
        }

        function findRootFiber(): Fiber | null {
          // React 18+ stores the HostRoot fiber on the DOM container under
          // `__reactContainer$<id>`. Any descendant element carries
          // `__reactFiber$<id>` pointing into the tree; walk `.return` to
          // reach the root from there.
          const candidates: Element[] = [
            document.body,
            ...Array.from(document.body.getElementsByTagName("*")),
          ]
          for (const el of candidates) {
            for (const k of Object.keys(el)) {
              if (k.startsWith("__reactContainer$")) {
                const container = (el as unknown as Record<string, Fiber>)[k]
                return container?.stateNode?.current ?? container ?? null
              }
              if (k.startsWith("__reactFiber$")) {
                let fiber = (el as unknown as Record<string, Fiber>)[k]
                while (fiber?.return) fiber = fiber.return
                return fiber ?? null
              }
            }
          }
          return null
        }

        function findSocketInTree(fiber: Fiber | null): SocketLike | null {
          if (!fiber) return null
          const v = fiber.memoizedProps?.value
          if (isSocket(v)) return v
          let child = fiber.child ?? null
          while (child) {
            const found = findSocketInTree(child)
            if (found) return found
            child = child.sibling ?? null
          }
          return null
        }

        const root = findRootFiber()
        const socket = findSocketInTree(root)
        if (!socket) {
          throw new Error(
            "[shop-products-live] socket.io client not found in React tree — " +
              "did <SocketProvider> mount?",
          )
        }

        // Dispatch the inbound `low-stock` event. The hook's listener will
        // see it as if it arrived from the engine.io transport and run the
        // exact production code path (cache patch + Sonner toast).
        socket.emitEvent(["low-stock", payload])
      },
      {
        shop_product_id: PRODUCT.id,
        name: PRODUCT.product.name,
        stock_quantity: 3,
        shop_id: SHOP_ID,
      },
    )

    // ── 9. Assert the contract ────────────────────────────────────────────
    //
    // (a) The "Low stock" badge appears in the row. The hook patched
    //     `stock_quantity = 3`, which is ≤ `low_stock_threshold = 5`, so
    //     `<StockBadgeForProduct />` now renders the
    //     `data-testid="stock-badge-low"` Badge (see `stock-badge.tsx`).
    await expect(page.getByTestId("stock-badge-low")).toBeVisible()

    // (b) A Sonner toast renders with the i18n-formatted message. The
    //     hook calls `toast.warning(t("shopProducts.toast.lowStock", …))`
    //     and the bundle template is `"Low stock: {name} ({qty} left)"`
    //     (see `lib/i18n.ts`).
    await expect(
      page.getByText("Low stock: Bananas (3 left)"),
    ).toBeVisible()

    // (c) No new `GET /shop-products` request was issued — the hook
    //     mutates the cache in place (Req 14.5). Wait a beat for any
    //     in-flight microtasks to settle, then re-check the counter.
    await page.waitForTimeout(500)
    expect(listCallCount).toBe(initialCount)
  })
})
