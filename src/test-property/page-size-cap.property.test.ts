/**
 * Property test for the page-size cap shared by every list service.
 *
 * Feature: multi-vendor-dashboard-ui, Property 12: Page-size cap
 * Validates: Requirements 5.1, 6.1, 7.1, 9.2, 14.4
 *
 * Property statement (design.md §Property 12):
 *   For any user-supplied list-query input, the outbound request's `limit`
 *   parameter is at most 100.
 *
 * Test strategy:
 *   We exercise the four list services that participate in the cap —
 *   `shopsService.list`, `shopStaffService.list`, `shopProductsService.list`,
 *   and `shopTransactionsService.list` — by mocking `@/lib/api` (the axios
 *   client). For each fast-check run we generate a single user-supplied
 *   `limit` in `[1, 10_000]` (deliberately covering values well above the
 *   100-row cap), call every service with that limit, and assert each
 *   recorded `api.get` invocation forwarded `params.limit <= 100`.
 *
 *   We do NOT test the response normalization here (other tests cover that);
 *   the assertion targets only the outbound query params, which is exactly
 *   what Property 12 constrains.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import fc from "fast-check"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks — must precede the service imports so each service resolves
// the mocked `@/lib/api` instead of the real axios client.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import api from "@/lib/api"
import { shopsService } from "@/services/shops.service"
import { shopStaffService } from "@/services/shop-staff.service"
import { shopProductsService } from "@/services/shop-products.service"
import { shopTransactionsService } from "@/services/shop-transactions.service"

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Hard cap shared by every list service (Req 5.1 / 6.1 / 7.1 / 9.2 / 14.4). */
const MAX_LIMIT = 100

/** Stable dummy `shopId` for `shopStaffService.list(shopId, params)`. */
const SHOP_ID = "shop-a"

/**
 * Stub response shape — carries every key the four services destructure
 * (`shops`, `staff`, `items`) plus the standard pagination metadata, so a
 * single `mockResolvedValue` covers all four code paths without per-call
 * branching.
 */
const STUB_RESPONSE = {
  data: {
    data: {
      shops: [],
      staff: [],
      items: [],
      total: 0,
      page: 1,
      limit: 0,
    },
  },
}

const apiGetMock = api.get as ReturnType<typeof vi.fn>

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  apiGetMock.mockReset()
  apiGetMock.mockResolvedValue(STUB_RESPONSE)
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 12: page-size cap across list services", () => {
  it("caps the outbound `limit` query param at 100 for every list service", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10_000 }),
        async (userLimit) => {
          // Reset call history so we only inspect calls from THIS run; the
          // resolved value installed in beforeEach is preserved by mockClear.
          apiGetMock.mockClear()

          await shopsService.list({ limit: userLimit })
          await shopStaffService.list(SHOP_ID, { limit: userLimit })
          await shopProductsService.list({ limit: userLimit })
          await shopTransactionsService.list({ limit: userLimit })

          // Sanity: every service must have produced exactly one outbound
          // GET so we know the mock actually intercepted the request.
          expect(apiGetMock.mock.calls.length).toBe(4)

          for (const call of apiGetMock.mock.calls) {
            // axios.get(url, config) — config is the second positional arg.
            const config = call[1] as
              | { params?: { limit?: number } }
              | undefined
            expect(config).toBeDefined()
            expect(config?.params).toBeDefined()
            const outboundLimit = config?.params?.limit
            expect(typeof outboundLimit).toBe("number")
            expect(outboundLimit as number).toBeLessThanOrEqual(MAX_LIMIT)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
