/**
 * Page-level test for `/shops/new` — task 5.8.
 *
 * Validates the 409 → field-error mapping contract on the shop create page
 * (Req 5.5, 5.11):
 *
 *   When the backend rejects the create with HTTP 409 and a code matching
 *   one of `DUPLICATE_BRANCH_CODE` / `DUPLICATE_SLUG`, the page surfaces
 *   the conflict on the offending field via RHF `setError(...)` while
 *   preserving every other entered value.
 *
 * Test strategy:
 *
 *   - Mock `useCreateShop` so the test owns its `serverFieldErrors` value
 *     and can flip it on between two renders. The hook exposes
 *     `serverFieldErrors` reactively in production (it's derived from the
 *     mutation's latest error); here we drive it directly so we don't
 *     need to fill every field of the schema-validated form just to reach
 *     the mutation.
 *   - Mock `useRouteRBAC` so the page mounts (super admin + write).
 *   - Mock `next/navigation`'s `useRouter` for the post-success redirect.
 *
 *   The page passes `serverFieldErrors` straight through to the shared
 *   `<ShopForm />`, which routes it onto RHF `setError` inside a
 *   `useEffect`. Re-rendering the page with the new value re-runs that
 *   effect — the same flow that fires after a real 409 mutation rejection
 *   in production.
 *
 * Validates: Requirements 5.5, 5.11
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// jsdom polyfills.
//
// `<ShopForm />` mounts a Radix `Switch` per weekday in the operating-hours
// card. Radix's underlying `useSize` hook calls `new ResizeObserver(...)`
// inside a `useLayoutEffect`, but jsdom does not ship a ResizeObserver
// implementation. Providing a no-op stub satisfies the constructor without
// affecting the assertions below (we never resize during the test).
// ─────────────────────────────────────────────────────────────────────────────

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver
}

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must run before importing the page module)
// ─────────────────────────────────────────────────────────────────────────────

const useRouterMock = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => useRouterMock(),
}))

const useRouteRBACMock = vi.fn()
vi.mock("@/hooks/useRBAC", () => ({
  useRouteRBAC: () => useRouteRBACMock(),
}))

const useCreateShopMock = vi.fn()
vi.mock("@/hooks/useShops", () => ({
  useCreateShop: () => useCreateShopMock(),
}))

// Sonner is referenced indirectly via ShopForm + i18n; stub minimal surface.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import NewShopPage from "@/app/(dashboard)/shops/new/page"
import { t } from "@/lib/i18n"
import type { ShopServerFieldErrors } from "@/hooks/useShops"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configure the mocked `useCreateShop` to return a stable shape with a
 * caller-controlled `serverFieldErrors`. Returns the recorded
 * `mutateAsync` so callers can assert call counts when relevant.
 */
function primeUseCreateShop(args: {
  serverFieldErrors?: ShopServerFieldErrors
  isPending?: boolean
} = {}) {
  const mutateAsync = vi.fn()
  useCreateShopMock.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync,
    isPending: args.isPending ?? false,
    isError: false,
    isSuccess: false,
    error: null,
    reset: vi.fn(),
    serverFieldErrors: args.serverFieldErrors ?? {},
  })
  return mutateAsync
}

function primeAuthorized() {
  useRouteRBACMock.mockReturnValue({
    isAuthorized: true,
    canRead: true,
    canWrite: true,
    requiresActiveShop: false,
    superAdminOnly: true,
    guard: null,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useRouterMock.mockReset()
  useRouterMock.mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })
  useRouteRBACMock.mockReset()
  useCreateShopMock.mockReset()
  primeAuthorized()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("NewShopPage — 409 field-error mapping", () => {
  it("renders the form when the user is authorized", () => {
    primeUseCreateShop()

    render(<NewShopPage />)

    // The identity card mounts with the labelled inputs we'll exercise
    // below. Asserting one expected label keeps the test stable against
    // markup tweaks while proving the form rendered.
    expect(
      screen.getByLabelText(t("shops.create.field.name")),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(t("shops.create.field.branchCode")),
    ).toBeInTheDocument()
  })

  it(
    "routes a 409 DUPLICATE_BRANCH_CODE onto the branch_code input via setError " +
      "while preserving every other entered value",
    () => {
      // ── Initial render: no server error in flight. ────────────────────
      primeUseCreateShop({ serverFieldErrors: {} })

      const { rerender } = render(<NewShopPage />)

      // The user fills in several fields. We exercise the trio called out
      // in the task brief (`name`, `city`, `branch_code`) plus the slug
      // input — the slug is one of the two paths a 409 can land on, so
      // its preservation is also part of the contract.
      const nameInput = screen.getByLabelText(
        t("shops.create.field.name"),
      ) as HTMLInputElement
      const branchCodeInput = screen.getByLabelText(
        t("shops.create.field.branchCode"),
      ) as HTMLInputElement
      const cityInput = screen.getByLabelText(
        t("shops.create.field.city"),
      ) as HTMLInputElement
      const slugInput = screen.getByLabelText(
        t("shops.create.field.slug"),
      ) as HTMLInputElement

      fireEvent.change(nameInput, { target: { value: "Bakaloo Bandra" } })
      // The branch_code regex requires uppercase + digits + hyphens — pick
      // a value that would be a valid submission so the only conflict
      // surfaced by the test is the synthetic 409 we drive below.
      fireEvent.change(branchCodeInput, { target: { value: "BR-MUM-01" } })
      fireEvent.change(cityInput, { target: { value: "Mumbai" } })
      // Override the auto-filled slug with an explicit value so the
      // assertion below can confirm it was preserved verbatim.
      fireEvent.change(slugInput, { target: { value: "bakaloo-bandra" } })

      // ── Sanity: pre-409 state, no server-error message rendered. ─────
      expect(
        screen.queryByText(t("serverErrors.DUPLICATE_BRANCH_CODE")),
      ).not.toBeInTheDocument()
      expect(branchCodeInput.getAttribute("aria-invalid")).not.toBe("true")

      // ── 409 lands. ────────────────────────────────────────────────
      // Flip the mock so the next `useCreateShop()` call (triggered by
      // the rerender below) returns `serverFieldErrors.branch_code`. The
      // form's `useEffect` watches this prop and calls
      // `setError("branch_code", { type: "server", message })`, which is
      // exactly the production pathway after a real 409 mutation rejects.
      primeUseCreateShop({
        serverFieldErrors: {
          branch_code: t("serverErrors.DUPLICATE_BRANCH_CODE"),
        },
      })

      rerender(<NewShopPage />)

      // ── Branch code: setError surfaced the localized message. ─────────
      // The form renders field errors as `<p id="<field>-error">`, so we
      // can assert both the message text and the input's aria-invalid /
      // aria-describedby wiring.
      const branchCodeError = screen.getByText(
        t("serverErrors.DUPLICATE_BRANCH_CODE"),
      )
      expect(branchCodeError).toBeInTheDocument()

      const refreshedBranchCode = screen.getByLabelText(
        t("shops.create.field.branchCode"),
      ) as HTMLInputElement
      expect(refreshedBranchCode.getAttribute("aria-invalid")).toBe("true")
      expect(refreshedBranchCode.getAttribute("aria-describedby")).toBe(
        "branch_code-error",
      )

      // ── Other entered values preserved verbatim. ──────────────────────
      // Re-query each input after the rerender so we read the current
      // controlled value rather than a stale reference.
      expect(
        (
          screen.getByLabelText(t("shops.create.field.name")) as HTMLInputElement
        ).value,
      ).toBe("Bakaloo Bandra")
      expect(refreshedBranchCode.value).toBe("BR-MUM-01")
      expect(
        (
          screen.getByLabelText(t("shops.create.field.city")) as HTMLInputElement
        ).value,
      ).toBe("Mumbai")
      expect(
        (
          screen.getByLabelText(t("shops.create.field.slug")) as HTMLInputElement
        ).value,
      ).toBe("bakaloo-bandra")

      // The slug field should not carry an error — only branch_code did.
      expect(
        screen.queryByText(t("serverErrors.DUPLICATE_SLUG")),
      ).not.toBeInTheDocument()
    },
  )

  it("routes a 409 DUPLICATE_SLUG onto the slug input via setError", () => {
    primeUseCreateShop({ serverFieldErrors: {} })
    const { rerender } = render(<NewShopPage />)

    // Fill in just enough to assert preservation across the rerender.
    const nameInput = screen.getByLabelText(
      t("shops.create.field.name"),
    ) as HTMLInputElement
    const slugInput = screen.getByLabelText(
      t("shops.create.field.slug"),
    ) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: "Bakaloo Pune" } })
    fireEvent.change(slugInput, { target: { value: "bakaloo-pune" } })

    primeUseCreateShop({
      serverFieldErrors: {
        slug: t("serverErrors.DUPLICATE_SLUG"),
      },
    })
    rerender(<NewShopPage />)

    // Slug field shows the conflict; name remains untouched.
    expect(
      screen.getByText(t("serverErrors.DUPLICATE_SLUG")),
    ).toBeInTheDocument()
    expect(
      (
        screen.getByLabelText(t("shops.create.field.slug")) as HTMLInputElement
      ).value,
    ).toBe("bakaloo-pune")
    expect(
      (
        screen.getByLabelText(t("shops.create.field.name")) as HTMLInputElement
      ).value,
    ).toBe("Bakaloo Pune")
  })
})
