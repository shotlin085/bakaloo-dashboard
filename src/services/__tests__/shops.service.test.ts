/**
 * Unit tests for `shopsService` — task 5.8.
 *
 * Focus: the page-size cap defined at the service layer (Req 5.1, 14.4 and
 * design.md Property 12). Any caller-supplied `limit` greater than 100 must
 * be reduced to 100 BEFORE the request is built so the outbound axios call
 * never carries a value larger than the backend's hard ceiling.
 *
 * The full property-based version of this invariant is covered in task 5.9
 * via `fast-check`. Here we use targeted unit cases (boundary values + a
 * representative oversized request) so the canonical contract is also
 * documented as a plain-English example list.
 *
 * Validates: Requirements 5.1, 14.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ─────────────────────────────────────────────────────────────────────────────
// Mock the shared axios instance so we can inspect the outbound config
// without touching the network. The service module under test imports the
// instance as `default`, so we replace `default.get` with a vi.fn() that
// resolves to a minimally-shaped backend response.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

// Imports below the mock so the mocked module is what shopsService closes over.
import api from "@/lib/api"
import { shopsService } from "@/services/shops.service"

/**
 * Build the canonical envelope the service helper unwraps. Mirrors the
 * `ApiResponse<RawShopsListResponse>` shape so the post-request
 * normalization inside `shopsService.list` runs cleanly without needing
 * real shop fixtures.
 */
function makeListResponse(limit: number) {
  return {
    data: {
      success: true,
      data: { shops: [], total: 0, page: 1, limit },
    },
  }
}

beforeEach(() => {
  vi.mocked(api.get).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("shopsService.list — page-size cap (Req 5.1 / 14.4)", () => {
  it("clamps an oversized limit (500) down to 100 before issuing the request", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(makeListResponse(100))

    await shopsService.list({ limit: 500 })

    expect(api.get).toHaveBeenCalledTimes(1)
    const [url, config] = vi.mocked(api.get).mock.calls[0]

    expect(url).toBe("/shops")
    // The cap is the headline assertion: regardless of what the caller
    // supplied, the outbound axios `params.limit` is at most 100.
    expect(config?.params).toMatchObject({ limit: 100 })
  })

  it("preserves the caller-supplied limit when it is below the cap", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(makeListResponse(20))

    await shopsService.list({ limit: 20 })

    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params).toMatchObject({ limit: 20 })
  })

  it("falls back to the default limit (20) when the caller omits it entirely", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(makeListResponse(20))

    await shopsService.list({})

    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params).toMatchObject({ limit: 20 })
  })

  it("clamps the boundary value 101 to exactly 100", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(makeListResponse(100))

    await shopsService.list({ limit: 101 })

    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params).toMatchObject({ limit: 100 })
  })

  it("passes the cap value 100 through unchanged", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(makeListResponse(100))

    await shopsService.list({ limit: 100 })

    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params).toMatchObject({ limit: 100 })
  })

  it("forwards filter and pagination params alongside the capped limit", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(makeListResponse(100))

    await shopsService.list({
      limit: 250,
      page: 3,
      search: "bandra",
      city: "Mumbai",
      is_active: true,
      is_verified: false,
    })

    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params).toEqual({
      limit: 100,
      page: 3,
      search: "bandra",
      city: "Mumbai",
      // Booleans serialized to backend's "true" / "false" strings.
      is_active: "true",
      is_verified: "false",
    })
  })
})
