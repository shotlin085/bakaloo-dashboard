/**
 * E2E — `/shops/:shopId/staff` invite flow (task 15.5).
 *
 * Drives the full Shop_Admin invite happy-path:
 *
 *   1. Operator lands on `/shops/shop-a/staff` with an empty staff list.
 *   2. Clicks "Invite staff" to open `<InviteStaffDialog />`.
 *   3. Types into the user picker and selects the returned user.
 *   4. Picks "SHOP_MANAGER" from the role select and asserts that the
 *      master toggles for the Orders and Products permission groups
 *      flip on per `ROLE_DEFAULTS.SHOP_MANAGER`.
 *   5. Toggles the Settings group master switch on (an extra,
 *      non-default group) so we can verify the override survives the
 *      submit body shape.
 *   6. Submits and asserts the POST body that hits
 *      `/api/v1/shops/shop-a/staff` matches the expected shape.
 *   7. Once the dialog closes, the staff list refetch returns the new
 *      Riya row — the test asserts the row appears.
 *
 * Auth + scope is faked entirely on the client so the test stays
 * hermetic. We seed:
 *   - localStorage `accessToken`, `admin-user`, `shop-context`.
 *   - Cookies `auth_session=1`, `is-super-admin=0`, `shop-context-mw`.
 *   - All API responses Playwright's `page.route()` mocks.
 *
 * Spec references: tasks.md 15.5; Requirements 6.3 (typeahead picker)
 * and 6.5 (invite POST → row appears).
 */

import { test, expect, type Route } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** The single shop the fake Shop_Admin is assigned to. */
const SHOP_ID = "shop-a"
const SHOP_NAME = "Shop A"

/** Fake admin user persisted to localStorage as `admin-user`. */
const ADMIN_USER = {
  id: "admin-1",
  name: "Anita Admin",
  email: "anita@example.com",
  phone: "+919999999999",
  role: "ADMIN",
  // The dashboard reads `permissions` from the JWT claim; for a
  // Shop_Admin scoped to a single shop we mirror what the backend
  // would emit on `POST /auth/select-shop`. Includes both read +
  // write tokens so the page renders with full mutation affordances.
  permissions: [
    "shops.read",
    "shop-staff.read",
    "shop-staff.write",
    "shop-staff.delete",
    "shop-products.read",
    "shop-products.write",
    "shop-products.delete",
    "shop-financials.read",
    "shop-transactions.read",
    "orders.read",
    "orders.write",
    "products.read",
    "customers.read",
    "activity-log.read",
  ],
}

/** Snapshot the Shop_Context_Store hydrates from. */
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
  // not the multi-shop selector redirect (assignedShopIds.length === 1
  // means "single assigned shop"; middleware allows any route).
  assignedShopIds: [SHOP_ID],
}

/** User the picker returns for query "Riya". */
const PICKED_USER = {
  id: "user-1",
  name: "Riya",
  email: "riya@example.com",
  phone: "+919876543210",
  role: "CUSTOMER",
  is_blocked: false,
  block_reason: null,
  created_at: "2024-01-01T00:00:00.000Z",
}

/** Fresh staff record returned by the POST mock + subsequent list refetch. */
const NEW_STAFF_ROW = {
  id: "staff-1",
  user_id: PICKED_USER.id,
  shop_id: SHOP_ID,
  role: "SHOP_MANAGER",
  permissions: [] as string[], // Filled in from the captured request body.
  is_active: true,
  joined_at: new Date().toISOString(),
  user: {
    name: PICKED_USER.name ?? "",
    email: PICKED_USER.email ?? "",
    phone: PICKED_USER.phone,
  },
}

/** Wrap a payload in the dashboard's `ApiResponse<T>` envelope. */
function envelope<T>(data: T) {
  return { success: true, message: "OK", data }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Shop staff invite flow", () => {
  test("Shop_Admin invites a user, selects SHOP_MANAGER, toggles permission group, and the row appears in the list", async ({
    page,
    context,
  }) => {
    // ── Seed auth + shop scope before any page script runs ────────────────
    //
    // `addInitScript` runs in the page context before navigation, so by the
    // time `(dashboard)/layout.tsx` calls `useAuthStore.hydrate()` and
    // `useShopContextStore.hydrate()` the snapshots are already there.
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

    // Mirror the same snapshot into the cookies the Next.js middleware
    // reads (Edge runtime cannot see `localStorage`).
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

    // ── State the mocks share ─────────────────────────────────────────────
    //
    // The list endpoint flips from "empty" to "one row" once the invite
    // POST resolves. We capture the POST body so we can assert the exact
    // shape the dialog submits and reflect the same permissions back into
    // the row (so the screenshot of state is internally consistent).
    let staffRows: typeof NEW_STAFF_ROW[] = []
    let capturedInviteBody: {
      user_id: string
      role: string
      permissions: string[]
      is_active: boolean
    } | null = null
    let inviteCallCount = 0

    // GET + POST /shops/:shopId/staff — shared route. The list reflects
    // `staffRows`, which is rewritten by the POST handler so the second
    // GET returns the inserted row.
    await page.route(
      (url) => url.pathname.endsWith(`/shops/${SHOP_ID}/staff`),
      async (route: Route) => {
        const method = route.request().method()
        if (method === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              envelope({
                staff: staffRows,
                total: staffRows.length,
                page: 1,
                limit: 20,
              }),
            ),
          })
          return
        }
        if (method === "POST") {
          inviteCallCount += 1
          const raw = route.request().postData() ?? "{}"
          capturedInviteBody = JSON.parse(raw)
          // Reflect the captured permissions back into the new row so a
          // subsequent `GET` is consistent with what the user submitted.
          staffRows = [
            {
              ...NEW_STAFF_ROW,
              role:
                (capturedInviteBody?.role as typeof NEW_STAFF_ROW.role) ??
                "SHOP_MANAGER",
              permissions: capturedInviteBody?.permissions ?? [],
              is_active: capturedInviteBody?.is_active ?? true,
            },
          ]
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(envelope(staffRows[0])),
          })
          return
        }
        await route.fallback()
      },
    )

    // GET /users?q=... — typeahead user picker.
    await page.route(
      (url) => url.pathname.endsWith("/users"),
      async (route: Route) => {
        if (route.request().method() !== "GET") {
          await route.fallback()
          return
        }
        const q =
          new URL(route.request().url()).searchParams.get("q") ?? ""
        // Filter the fixture by a case-insensitive substring on
        // name/email/phone so the picker behaves like the real backend
        // (an empty query never round-trips — the service short-circuits
        // on empty).
        const matches =
          q.trim().length === 0
            ? []
            : [PICKED_USER].filter((u) => {
                const needle = q.toLowerCase()
                return (
                  (u.name ?? "").toLowerCase().includes(needle) ||
                  (u.email ?? "").toLowerCase().includes(needle) ||
                  u.phone.toLowerCase().includes(needle)
                )
              })
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(envelope({ users: matches })),
        })
      },
    )

    // GET /admin/auth/me — the dashboard layout validates the token on
    // mount; respond with the same admin user so it doesn't bounce us
    // back to /login.
    await page.route(
      (url) => url.pathname.endsWith("/admin/auth/me"),
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(envelope(ADMIN_USER)),
        })
      },
    )

    // Catch-all for any remaining `/api/v1/*` requests — return an empty
    // 200 envelope so unrelated background queries (notifications,
    // analytics, etc.) don't surface as red network errors during the
    // test. Anything we explicitly need to assert against is registered
    // above and matches first.
    await page.route(/\/api\/v1\//, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(envelope({})),
      })
    })

    // ── 1. Navigate to the staff list ─────────────────────────────────────
    await page.goto(`/shops/${SHOP_ID}/staff`)

    // Wait until the page header is visible — proves the layout's
    // `validateSession()` resolved and we're past the loading splash.
    await expect(
      page.getByRole("heading", { name: "Staff", level: 1 }),
    ).toBeVisible()

    // The list is initially empty — the empty-state copy from the i18n
    // bundle should render in the data-list shell.
    await expect(
      page.getByText("No staff assigned to this shop yet."),
    ).toBeVisible()

    // ── 2. Open the invite dialog ─────────────────────────────────────────
    await page.getByRole("button", { name: "Invite staff" }).click()

    // The dialog mounts — Radix `Dialog` exposes `role="dialog"`.
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    // Dialog title is the same i18n string as the CTA — scope by the
    // dialog so the assertion is unambiguous.
    await expect(
      dialog.getByRole("heading", { name: "Invite staff" }),
    ).toBeVisible()

    // ── 3. Pick a user via the typeahead ──────────────────────────────────
    await dialog.getByTestId("staff-user-picker-trigger").click()
    await dialog.getByTestId("staff-user-picker-search").fill("Riya")

    // The typeahead is debounced at 300 ms — wait for the option to
    // appear before clicking. Using the testid keeps the selector stable
    // even if the visible label copy changes.
    const pickedOption = page.getByTestId(
      `staff-user-picker-option-${PICKED_USER.id}`,
    )
    await expect(pickedOption).toBeVisible({ timeout: 5_000 })
    await pickedOption.click()

    // Confirm the picker collapsed and now shows the selected user.
    await expect(
      dialog.getByTestId("staff-user-picker-trigger"),
    ).toContainText("Riya")

    // ── 4. Pick "SHOP_MANAGER" from the role select ───────────────────────
    //
    // Radix Select: clicking the trigger opens a portalled listbox, which
    // is *outside* the dialog, so we look up by role on the page itself.
    await dialog.getByTestId("staff-role-trigger").click()
    await page.getByRole("option", { name: "Shop manager" }).click()

    // Assert the per-token switches updated per `ROLE_DEFAULTS.SHOP_MANAGER`
    // = orders.read, orders.write, shop-products.read, shop-products.write,
    //   shop-financials.read.
    //
    // We assert by-token (rather than every master switch) because the
    // master is only `data-state="checked"` when *every* token in the
    // group is on, and SHOP_MANAGER grants only a subset of the Orders
    // and Products groups (no `*.delete`, no master-catalog
    // `products.*`). The financials group has exactly one token, so its
    // master *does* flip fully on.
    //
    // Token-row switches live inside `<details>` sections that may be
    // collapsed; `toHaveAttribute` inspects DOM state regardless of
    // visibility, so the assertion is robust to the open/closed
    // accordion.
    await expect(
      dialog.getByTestId("perm-token-orders.read"),
    ).toHaveAttribute("data-state", "checked")
    await expect(
      dialog.getByTestId("perm-token-orders.write"),
    ).toHaveAttribute("data-state", "checked")
    await expect(
      dialog.getByTestId("perm-token-orders.delete"),
    ).toHaveAttribute("data-state", "unchecked")
    await expect(
      dialog.getByTestId("perm-token-shop-products.read"),
    ).toHaveAttribute("data-state", "checked")
    await expect(
      dialog.getByTestId("perm-token-shop-products.write"),
    ).toHaveAttribute("data-state", "checked")
    // The financials group has exactly one token, so the master switch
    // is fully on after the role pick.
    await expect(
      dialog.getByTestId("perm-master-financials"),
    ).toHaveAttribute("data-state", "checked")
    // Settings is *not* in `ROLE_DEFAULTS.SHOP_MANAGER`, so its master
    // must start as off — proves the role-pick computed permissions
    // correctly without leaking unrelated tokens.
    await expect(
      dialog.getByTestId("perm-master-settings"),
    ).toHaveAttribute("data-state", "unchecked")

    // ── 5. Flip the Settings master switch on ─────────────────────────────
    await dialog.getByTestId("perm-master-settings").click()
    await expect(
      dialog.getByTestId("perm-master-settings"),
    ).toHaveAttribute("data-state", "checked")

    // ── 6. Submit ────────────────────────────────────────────────────────
    await dialog.getByTestId("staff-submit").click()

    // The dialog closes once the mutation resolves.
    await expect(page.getByRole("dialog")).toBeHidden()

    // The POST hit the network exactly once.
    expect(inviteCallCount).toBe(1)

    // The captured body matches the expected shape: snake_case, the
    // picked user id, the chosen role, the merged permission set
    // (defaults for SHOP_MANAGER plus the `shop-staff.*` tokens
    // unlocked by the Settings master toggle), and `is_active: true`.
    expect(capturedInviteBody).not.toBeNull()
    const body = capturedInviteBody!
    expect(body.user_id).toBe(PICKED_USER.id)
    expect(body.role).toBe("SHOP_MANAGER")
    expect(body.is_active).toBe(true)
    // Defaults from ROLE_DEFAULTS.SHOP_MANAGER must be present.
    for (const required of [
      "orders.read",
      "orders.write",
      "shop-products.read",
      "shop-products.write",
      "shop-financials.read",
    ]) {
      expect(body.permissions).toContain(required)
    }
    // The Settings master flip should have unlocked the shop-staff
    // tokens grouped under that section.
    expect(body.permissions).toContain("shop-staff.read")
    expect(body.permissions).toContain("shop-staff.write")

    // ── 7. The new row shows up in the list ──────────────────────────────
    //
    // The mutation hook invalidates `qk.shopStaff(shopId, …)` on success,
    // which refetches the list. Our `staffRows` was rewritten above so
    // the refetch returns Riya. Assert the row by name.
    await expect(page.getByText("Riya", { exact: true })).toBeVisible()
    await expect(page.getByText("riya@example.com")).toBeVisible()
  })
})
