/**
 * Unit tests for the shops mutation hooks (task 5.2).
 *
 * Covers the full write-side surface added in `src/hooks/useShops.ts`:
 *   - `useCreateShop`         — success toast + cache invalidation; 409
 *                               surfaces `serverFieldErrors`; non-409
 *                               failures emit a destructive toast.
 *   - `useUpdateShop`         — success toast + list & detail invalidation;
 *                               409 surfaces `serverFieldErrors`.
 *   - `useDeactivateShop`     — success toast + cache invalidation.
 *   - `useReactivateShop`     — delegates to `shopsService.reactivate`.
 *   - `useToggleVerification` — forwards the boolean verbatim.
 *   - `extractFieldErrors`    — pure-function 409 → field-path mapper.
 *
 * Validates: Requirements 5.6, 5.10, 5.11, 15.2, 15.3
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must run before importing the hooks under test)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock `shopsService` at the service-module boundary so each mutation can
 * be steered between success and failure deterministically. Other exports
 * (`ShopsListParams`) are preserved via `importOriginal` so the hook file
 * keeps compiling.
 */
vi.mock("@/services/shops.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/shops.service")>()
  return {
    ...actual,
    shopsService: {
      list: vi.fn(),
      listActive: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      reactivate: vi.fn(),
      setVerified: vi.fn(),
    },
  }
})

/**
 * Capture every `toast.success` / `toast.error` call so the tests can
 * assert that the localized success and failure messages flow through.
 * The Sonner mock is intentionally shallow — we only need the call sites,
 * not actual rendering.
 */
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import {
  extractFieldErrors,
  useCreateShop,
  useDeactivateShop,
  useReactivateShop,
  useToggleVerification,
  useUpdateShop,
} from "@/hooks/useShops"
import { shopsService } from "@/services/shops.service"
import { qk } from "@/lib/query-keys"
import { t } from "@/lib/i18n"
import { toast } from "sonner"
import type { ShopInput } from "@/lib/shop-validations"
import type { Shop } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-bandra"

/**
 * Minimal `Shop` payload used as the canonical "happy path" mutation
 * response. Keeps the test files free of the full 30-field shape — the
 * mutation hooks don't introspect the body, they just forward it.
 */
const SHOP_FIXTURE = {
  id: SHOP_ID,
  name: "Bakaloo Bandra",
  branch_code: "BR-MUM-01",
  slug: "bakaloo-bandra",
} as unknown as Shop

/**
 * Minimal `ShopInput` payload used for create/update. The hooks do not
 * inspect the body either — `shopsService.create` /  `update` does — so
 * we cast a pared-down literal to keep test set-up lean.
 */
const SHOP_INPUT_FIXTURE = {
  name: "Bakaloo Bandra",
  branch_code: "BR-MUM-01",
  slug: "bakaloo-bandra",
} as unknown as ShopInput

/** Build a 409 axios-shaped error with the given backend `code`. */
function makeConflictError(code: string, message: string) {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    response: {
      status: 409,
      data: { success: false, code, message },
    },
  })
}

/** Build an arbitrary axios-shaped error with the given status / code. */
function makeAxiosError(
  status: number,
  code: string | undefined,
  message: string,
) {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    response: {
      status,
      data: { success: false, code, message },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a fresh `QueryClient` per test with retries disabled so failure
 * paths resolve in a single tick rather than waiting on the default retry
 * policy. Seeded with one shops list entry and one detail entry so we can
 * assert tag-level invalidation at the per-key level.
 */
function makeSeededQueryClient(): QueryClient {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  qc.setQueryData(qk.shops({ page: 1, limit: 20 }), {
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })
  qc.setQueryData(qk.shop(SHOP_ID), SHOP_FIXTURE)
  return qc
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(shopsService.create).mockReset()
  vi.mocked(shopsService.update).mockReset()
  vi.mocked(shopsService.softDelete).mockReset()
  vi.mocked(shopsService.reactivate).mockReset()
  vi.mocked(shopsService.setVerified).mockReset()
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// extractFieldErrors — pure helper
// ─────────────────────────────────────────────────────────────────────────────

describe("extractFieldErrors", () => {
  it("maps DUPLICATE_BRANCH_CODE to a localized branch_code field error", () => {
    const err = makeConflictError("DUPLICATE_BRANCH_CODE", "Branch code already exists")
    expect(extractFieldErrors(err)).toEqual({
      branch_code: t("serverErrors.DUPLICATE_BRANCH_CODE"),
    })
  })

  it("maps DUPLICATE_SLUG to a localized slug field error", () => {
    const err = makeConflictError("DUPLICATE_SLUG", "Slug already exists")
    expect(extractFieldErrors(err)).toEqual({
      slug: t("serverErrors.DUPLICATE_SLUG"),
    })
  })

  it("returns an empty object for non-409 errors", () => {
    const err = makeAxiosError(500, "INTERNAL", "boom")
    expect(extractFieldErrors(err)).toEqual({})
  })

  it("returns an empty object for 409s with an unrecognized code", () => {
    const err = makeConflictError("SOME_OTHER_CONFLICT", "nope")
    expect(extractFieldErrors(err)).toEqual({})
  })

  it("returns an empty object for non-axios errors", () => {
    expect(extractFieldErrors(new Error("just a regular error"))).toEqual({})
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useCreateShop
// ─────────────────────────────────────────────────────────────────────────────

describe("useCreateShop", () => {
  it("invalidates the shops list and shows a success toast on success", async () => {
    vi.mocked(shopsService.create).mockResolvedValueOnce(SHOP_FIXTURE)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useCreateShop(), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      await result.current.mutateAsync(SHOP_INPUT_FIXTURE)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(shopsService.create).toHaveBeenCalledWith(SHOP_INPUT_FIXTURE)
    expect(toast.success).toHaveBeenCalledWith(t("shops.create.toast.success"))
    expect(toast.error).not.toHaveBeenCalled()

    // The shops list cache entry was invalidated by the tag-level call.
    const listState = qc.getQueryState(qk.shops({ page: 1, limit: 20 }))
    expect(listState?.isInvalidated).toBe(true)

    // No serverFieldErrors on a clean success.
    expect(result.current.serverFieldErrors).toEqual({})
  })

  it("surfaces serverFieldErrors and suppresses the toast on a 409 DUPLICATE_BRANCH_CODE", async () => {
    const err = makeConflictError("DUPLICATE_BRANCH_CODE", "branch code taken")
    vi.mocked(shopsService.create).mockRejectedValueOnce(err)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useCreateShop(), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      try {
        await result.current.mutateAsync(SHOP_INPUT_FIXTURE)
      } catch {
        // expected — the page handles 409 via serverFieldErrors
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.serverFieldErrors).toEqual({
      branch_code: t("serverErrors.DUPLICATE_BRANCH_CODE"),
    })
    // 409s are page-handled, so the destructive toast is intentionally
    // suppressed (avoids duplicating the field-level error in a toast).
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("emits a destructive toast on a non-409 failure (e.g. 500)", async () => {
    const err = makeAxiosError(500, "INTERNAL", "server exploded")
    vi.mocked(shopsService.create).mockRejectedValueOnce(err)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useCreateShop(), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      try {
        await result.current.mutateAsync(SHOP_INPUT_FIXTURE)
      } catch {
        // expected
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(result.current.serverFieldErrors).toEqual({})
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useUpdateShop
// ─────────────────────────────────────────────────────────────────────────────

describe("useUpdateShop", () => {
  it("invalidates list + detail and shows a success toast on success", async () => {
    vi.mocked(shopsService.update).mockResolvedValueOnce(SHOP_FIXTURE)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useUpdateShop(), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: SHOP_ID,
        body: { name: "Bakaloo Bandra (renamed)" },
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(shopsService.update).toHaveBeenCalledWith(SHOP_ID, {
      name: "Bakaloo Bandra (renamed)",
    })
    expect(toast.success).toHaveBeenCalledWith(t("shops.edit.toast.success"))

    const listState = qc.getQueryState(qk.shops({ page: 1, limit: 20 }))
    const detailState = qc.getQueryState(qk.shop(SHOP_ID))
    expect(listState?.isInvalidated).toBe(true)
    expect(detailState?.isInvalidated).toBe(true)
  })

  it("surfaces serverFieldErrors on a 409 DUPLICATE_SLUG", async () => {
    const err = makeConflictError("DUPLICATE_SLUG", "slug taken")
    vi.mocked(shopsService.update).mockRejectedValueOnce(err)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useUpdateShop(), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: SHOP_ID,
          body: { slug: "duplicate-slug" },
        })
      } catch {
        // expected
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.serverFieldErrors).toEqual({
      slug: t("serverErrors.DUPLICATE_SLUG"),
    })
    expect(toast.error).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useDeactivateShop
// ─────────────────────────────────────────────────────────────────────────────

describe("useDeactivateShop", () => {
  it("calls shopsService.softDelete, invalidates caches, and shows a success toast", async () => {
    vi.mocked(shopsService.softDelete).mockResolvedValueOnce(undefined)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useDeactivateShop(), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      await result.current.mutateAsync(SHOP_ID)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(shopsService.softDelete).toHaveBeenCalledWith(SHOP_ID)
    expect(toast.success).toHaveBeenCalledWith(t("shops.edit.toast.deactivated"))

    const listState = qc.getQueryState(qk.shops({ page: 1, limit: 20 }))
    const detailState = qc.getQueryState(qk.shop(SHOP_ID))
    expect(listState?.isInvalidated).toBe(true)
    expect(detailState?.isInvalidated).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useReactivateShop
// ─────────────────────────────────────────────────────────────────────────────

describe("useReactivateShop", () => {
  it("calls shopsService.reactivate, invalidates caches, and shows a success toast", async () => {
    vi.mocked(shopsService.reactivate).mockResolvedValueOnce(SHOP_FIXTURE)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useReactivateShop(), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      await result.current.mutateAsync(SHOP_ID)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(shopsService.reactivate).toHaveBeenCalledWith(SHOP_ID)
    expect(toast.success).toHaveBeenCalledWith(t("shops.edit.toast.reactivated"))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useToggleVerification
// ─────────────────────────────────────────────────────────────────────────────

describe("useToggleVerification", () => {
  it("forwards the boolean to shopsService.setVerified and shows a success toast", async () => {
    vi.mocked(shopsService.setVerified).mockResolvedValueOnce(SHOP_FIXTURE)

    const qc = makeSeededQueryClient()
    const { result } = renderHook(() => useToggleVerification(), {
      wrapper: makeWrapper(qc),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: SHOP_ID, value: true })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(shopsService.setVerified).toHaveBeenCalledWith(SHOP_ID, true)
    expect(toast.success).toHaveBeenCalledWith(
      t("shops.edit.toast.verificationToggled"),
    )

    // Same path for `value: false` — the service forwards the boolean
    // verbatim, so the page can drive verify and unverify off one mutation.
    vi.mocked(shopsService.setVerified).mockResolvedValueOnce(SHOP_FIXTURE)
    await act(async () => {
      await result.current.mutateAsync({ id: SHOP_ID, value: false })
    })
    expect(shopsService.setVerified).toHaveBeenLastCalledWith(SHOP_ID, false)
  })
})
