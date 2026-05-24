/**
 * Unit tests for `<InviteStaffDialog />` (task 6.4 / 6.7).
 *
 * Covers the user-visible contract from the task brief:
 *
 *   1. Role select pre-fills the permission toggles from `ROLE_DEFAULTS`,
 *      and the operator can override individual tokens after the role is
 *      picked (Req 6.4).
 *   2. On 409 already-assigned, the dialog stays open with the entered
 *      values intact (role + permissions unchanged) and the user picker
 *      surfaces a field-level error (Req 6.6).
 *   3. On 422 cap-reached, a destructive `toast.error` is fired and the
 *      dialog stays open with the entered values intact (Req 6.10).
 *   4. Edit mode prefills `role`, `permissions`, and `is_active` from the
 *      provided `initialStaff` and disables the user picker (Req 6.8).
 *
 * The `useInviteShopStaff` / `useUpdateShopStaff` / `extractStaffFieldErrors`
 * helpers and `searchUsers` service are mocked at the module boundary so
 * the test focuses on the dialog wiring, not the network IO (which has
 * coverage in `useShopStaff.test.tsx`).
 *
 * `@/components/ui/select` is mocked with a native `<select>` so the role
 * dropdown can be driven via `fireEvent.change` — Radix `Select` relies
 * on layout/pointer-capture APIs that jsdom does not implement faithfully.
 *
 * Validates: Requirements 6.4, 6.6, 6.8, 6.10
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { AxiosError } from "axios"

// ─────────────────────────────────────────────────────────────────────────────
// jsdom polyfills
// ─────────────────────────────────────────────────────────────────────────────

// Radix `Switch` (and several other Radix primitives) consult `ResizeObserver`
// during mount; jsdom does not provide one. The minimal stub below is enough
// for the suite — Radix only calls `observe` / `disconnect`, never reads back.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub })
    .ResizeObserver = ResizeObserverStub
}

// Radix `PointerEvent` checks rely on `hasPointerCapture` which jsdom omits.
if (
  typeof window !== "undefined" &&
  !(Element.prototype as unknown as { hasPointerCapture?: () => boolean })
    .hasPointerCapture
) {
  Object.defineProperty(Element.prototype, "hasPointerCapture", {
    value: () => false,
    configurable: true,
  })
  Object.defineProperty(Element.prototype, "releasePointerCapture", {
    value: () => undefined,
    configurable: true,
  })
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    value: () => undefined,
    configurable: true,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must precede the component import)
// ─────────────────────────────────────────────────────────────────────────────

const inviteMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()
const extractStaffFieldErrorsMock = vi.fn(
  (_err: unknown) => ({}) as Record<string, string>,
)

vi.mock("@/hooks/useShopStaff", () => ({
  useInviteShopStaff: () => ({
    mutateAsync: inviteMutateAsync,
    isPending: false,
  }),
  useUpdateShopStaff: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
  }),
  extractStaffFieldErrors: (err: unknown) => extractStaffFieldErrorsMock(err),
}))

const searchUsersMock = vi.fn(async (_q: string) => [] as unknown[])
vi.mock("@/services/shop-staff.service", () => ({
  shopStaffService: {
    searchUsers: (q: string) => searchUsersMock(q),
  },
}))

/**
 * Sonner mock — only `toast.error` and `toast.success` are referenced by
 * the production code, so a shallow stub is sufficient. The 422 test
 * triggers `toast.error` from inside the mocked `mutateAsync` to mirror
 * what the production `useInviteShopStaff` hook does on cap-reached
 * errors (Req 6.10).
 */
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

/**
 * Replace `@/components/ui/select` with a native `<select>` driver so the
 * role dropdown can be operated by `fireEvent.change`. Radix `Select`
 * depends on layout APIs (`offsetHeight`, pointer capture, intersection
 * observation) that jsdom either omits or stubs incorrectly. The shim
 * preserves the prop contract (`value`, `onValueChange`, plus `id` and
 * `data-testid` forwarding from `SelectTrigger`) so the component under
 * test does not change.
 *
 * Uses the async-factory form so the React import resolves at module
 * load time without any synchronous `require()` calls.
 */
vi.mock("@/components/ui/select", async () => {
  const React = await import("react")

  /**
   * Shared context published by the `<Select>` parent. `<SelectTrigger>`
   * reads `value` / `onValueChange` and the materialized `items` to
   * render the native `<select>` element. Items are collected once at
   * the parent level by walking its `<SelectContent>` child, so the
   * trigger does not need the content to be its own descendant — the
   * production layout keeps `<SelectTrigger>` and `<SelectContent>` as
   * siblings under `<Select>`.
   */
  type Item = { value: string; label: React.ReactNode }
  const SelectCtx = React.createContext<{
    value: string
    onValueChange: (v: string) => void
    items: Item[]
  }>({ value: "", onValueChange: () => {}, items: [] })

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
  }) {
    // Walk the children once to materialize the option list. The
    // production list is four entries so the cost is negligible, and
    // doing it in the parent keeps the trigger free to be a leaf.
    const items: Item[] = []
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return
      const displayName = (child.type as { displayName?: string }).displayName
      if (displayName !== "SelectContent") return
      React.Children.forEach(
        (child.props as { children?: React.ReactNode }).children,
        (item) => {
          if (!React.isValidElement(item)) return
          const p = item.props as {
            value?: string
            children?: React.ReactNode
          }
          if (typeof p.value === "string") {
            items.push({ value: p.value, label: p.children })
          }
        },
      )
    })

    return (
      <SelectCtx.Provider value={{ value, onValueChange, items }}>
        {children}
      </SelectCtx.Provider>
    )
  }

  /**
   * Native `<select>` driver. The dialog passes `id` and `data-testid`;
   * both flow through to the underlying element so the tests can grab
   * it via `getByTestId("staff-role-trigger")` and dispatch a synthetic
   * `change` event.
   */
  function SelectTrigger({
    id,
    children: _children,
    ...rest
  }: React.HTMLAttributes<HTMLSelectElement> & {
    id?: string
    children?: React.ReactNode
  }) {
    const { value, onValueChange, items } = React.useContext(SelectCtx)
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        {...rest}
      >
        {items.map((it) => (
          <option key={it.value} value={it.value}>
            {it.label}
          </option>
        ))}
      </select>
    )
  }

  /**
   * Renders nothing — `<Select>` already extracted the items from this
   * subtree into context, and rendering them again would create orphan
   * `<option>` elements outside any `<select>`. The `displayName` is
   * preserved so `<Select>` can identify the marker child.
   */
  function SelectContent(_: { children?: React.ReactNode }) {
    return null
  }
  ;(SelectContent as unknown as { displayName: string }).displayName =
    "SelectContent"

  function SelectItem(_: { value: string; children?: React.ReactNode }) {
    // Never rendered — `<Select>` reads its props directly.
    return null
  }
  function SelectValue() {
    return null
  }
  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
})

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { InviteStaffDialog } from "@/app/(dashboard)/shops/[shopId]/staff/_components/invite-staff-dialog"
import { ROLE_DEFAULTS } from "@/lib/permissions"
import type { ShopStaff } from "@/types"
import { toast } from "sonner"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  )
}

function makeStaff(partial: Partial<ShopStaff> = {}): ShopStaff {
  return {
    id: partial.id ?? "ss-1",
    user_id: partial.user_id ?? "11111111-1111-4111-8111-111111111111",
    shop_id: partial.shop_id ?? "shop-a",
    role: partial.role ?? "SHOP_MANAGER",
    permissions: partial.permissions ?? [...ROLE_DEFAULTS.SHOP_MANAGER],
    is_active: partial.is_active ?? true,
    joined_at: partial.joined_at ?? "2024-01-01T00:00:00Z",
    user: partial.user ?? {
      name: "Existing Staff",
      email: "existing@example.com",
      phone: "+919999999999",
    },
  }
}

/**
 * Drive the user-picker through `search → click option`, returning once
 * the selection has been committed to the form. Used by the 409 / 422
 * tests to set up a submittable form state.
 */
async function pickUser(userId: string): Promise<void> {
  fireEvent.click(screen.getByTestId("staff-user-picker-trigger"))
  fireEvent.change(screen.getByTestId("staff-user-picker-search"), {
    target: { value: "picked" },
  })
  const option = await screen.findByTestId(
    `staff-user-picker-option-${userId}`,
    undefined,
    { timeout: 5000 },
  )
  await act(async () => {
    fireEvent.click(option)
  })
}

const PICKED_USER_ID = "22222222-2222-4222-8222-222222222222"
const PICKED_USER = {
  id: PICKED_USER_ID,
  name: "Picked User",
  email: "picked@example.com",
  phone: "+919876543210",
  role: "ADMIN",
  is_blocked: false,
  block_reason: null,
  created_at: "2024-01-01T00:00:00Z",
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  inviteMutateAsync.mockReset()
  updateMutateAsync.mockReset()
  extractStaffFieldErrorsMock.mockReset()
  extractStaffFieldErrorsMock.mockReturnValue({})
  searchUsersMock.mockReset()
  searchUsersMock.mockResolvedValue([])
  vi.mocked(toast.error).mockReset()
  vi.mocked(toast.success).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("<InviteStaffDialog /> — role pre-fill", () => {
  it("seeds permission toggles from ROLE_DEFAULTS for the default SHOP_STAFF role", () => {
    renderWithClient(
      <InviteStaffDialog
        shopId="shop-a"
        open
        onOpenChange={() => {}}
        mode="invite"
      />,
    )

    // Default role is SHOP_STAFF; every token in ROLE_DEFAULTS.SHOP_STAFF
    // should be rendered with `aria-checked="true"` on its switch.
    for (const token of ROLE_DEFAULTS.SHOP_STAFF) {
      const sw = screen.getByTestId(`perm-token-${token}`)
      expect(sw).toHaveAttribute("aria-checked", "true")
    }
  })

  it("re-seeds permission toggles when the operator picks SHOP_MANAGER", () => {
    renderWithClient(
      <InviteStaffDialog
        shopId="shop-a"
        open
        onOpenChange={() => {}}
        mode="invite"
      />,
    )

    // Switch the role to SHOP_MANAGER via the (mocked) native select.
    const roleSelect = screen.getByTestId("staff-role-trigger")
    fireEvent.change(roleSelect, { target: { value: "SHOP_MANAGER" } })

    // Every token in ROLE_DEFAULTS.SHOP_MANAGER is now switched on…
    for (const token of ROLE_DEFAULTS.SHOP_MANAGER) {
      expect(screen.getByTestId(`perm-token-${token}`)).toHaveAttribute(
        "aria-checked",
        "true",
      )
    }
    // …and tokens that belong only to SHOP_STAFF (the prior role) but
    // not to SHOP_MANAGER are no longer set.
    const managerSet = new Set<string>(ROLE_DEFAULTS.SHOP_MANAGER)
    const staffOnly = ROLE_DEFAULTS.SHOP_STAFF.filter(
      (t) => !managerSet.has(t),
    )
    for (const token of staffOnly) {
      expect(screen.getByTestId(`perm-token-${token}`)).toHaveAttribute(
        "aria-checked",
        "false",
      )
    }
  })

  it("preserves per-token overrides while the role stays unchanged", () => {
    renderWithClient(
      <InviteStaffDialog
        shopId="shop-a"
        open
        onOpenChange={() => {}}
        mode="invite"
      />,
    )

    // Move to SHOP_MANAGER so we can override one of its defaults.
    fireEvent.change(screen.getByTestId("staff-role-trigger"), {
      target: { value: "SHOP_MANAGER" },
    })

    const tokenToToggle = ROLE_DEFAULTS.SHOP_MANAGER[0]
    const sw = screen.getByTestId(`perm-token-${tokenToToggle}`)
    expect(sw).toHaveAttribute("aria-checked", "true")

    // Manual override: turn the token off. The role stays SHOP_MANAGER,
    // so the prefill effect must NOT re-enable it.
    fireEvent.click(sw)
    expect(
      screen.getByTestId(`perm-token-${tokenToToggle}`),
    ).toHaveAttribute("aria-checked", "false")

    // Other defaults from SHOP_MANAGER stay on — the override is scoped
    // to the single token we touched.
    for (const token of ROLE_DEFAULTS.SHOP_MANAGER.slice(1)) {
      expect(screen.getByTestId(`perm-token-${token}`)).toHaveAttribute(
        "aria-checked",
        "true",
      )
    }
  })
})

describe("<InviteStaffDialog /> — 409 already-assigned", () => {
  it("keeps the dialog open with entered values intact and shows a field error", async () => {
    // Stub a 409 axios-shaped error and the field-error extractor so the
    // dialog routes the message into setError("userId", …).
    const err = {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          code: "STAFF_ALREADY_ASSIGNED",
          message: "User is already on this shop",
        },
      },
      message: "Request failed with status code 409",
    } as unknown as AxiosError

    inviteMutateAsync.mockRejectedValueOnce(err)
    extractStaffFieldErrorsMock.mockReturnValue({
      userId: "This user is already on this shop.",
    })

    searchUsersMock.mockResolvedValue([PICKED_USER])

    const onOpenChange = vi.fn()
    renderWithClient(
      <InviteStaffDialog
        shopId="shop-a"
        open
        onOpenChange={onOpenChange}
        mode="invite"
      />,
    )

    // Pick a user, switch role to SHOP_MANAGER, then override one token
    // off so we can later assert the entered values are preserved.
    await pickUser(PICKED_USER_ID)
    fireEvent.change(screen.getByTestId("staff-role-trigger"), {
      target: { value: "SHOP_MANAGER" },
    })
    const overriddenToken = ROLE_DEFAULTS.SHOP_MANAGER[0]
    fireEvent.click(screen.getByTestId(`perm-token-${overriddenToken}`))

    await act(async () => {
      fireEvent.click(screen.getByTestId("staff-submit"))
    })

    await waitFor(() => {
      expect(inviteMutateAsync).toHaveBeenCalledTimes(1)
    })
    // Dialog stayed open — onOpenChange was never asked to close.
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    // Field error rendered on the user picker.
    expect(
      await screen.findByTestId("staff-user-picker-error"),
    ).toHaveTextContent("This user is already on this shop.")
    // Role select still shows SHOP_MANAGER.
    expect(screen.getByTestId("staff-role-trigger")).toHaveValue(
      "SHOP_MANAGER",
    )
    // Permission overrides preserved across the failed submit.
    expect(
      screen.getByTestId(`perm-token-${overriddenToken}`),
    ).toHaveAttribute("aria-checked", "false")
    for (const token of ROLE_DEFAULTS.SHOP_MANAGER.slice(1)) {
      expect(screen.getByTestId(`perm-token-${token}`)).toHaveAttribute(
        "aria-checked",
        "true",
      )
    }
  })
})

describe("<InviteStaffDialog /> — 422 cap-reached", () => {
  it("surfaces a destructive toast and leaves form state unchanged", async () => {
    // Mirror the production `useInviteShopStaff` contract: the hook
    // surfaces a destructive `toast.error` for cap-reached errors
    // (`STAFF_LIMIT_REACHED` / `SHOP_STAFF_CAP_REACHED`) and re-throws so
    // the dialog's `onSubmit` can decide what to do with local state.
    // Since the hook is mocked in this suite, we simulate that contract
    // inside the mock and assert the toast call here.
    const capError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          code: "STAFF_CAP_REACHED",
          message: "This shop already has the maximum number of staff.",
        },
      },
      message: "Request failed with status code 422",
    } as unknown as AxiosError

    inviteMutateAsync.mockImplementationOnce(async () => {
      // The production hook fires the destructive toast before re-throwing
      // (see `useShopStaff.ts` → `useInviteShopStaff.onError`). The mock
      // mimics that ordering so the test exercises the same observable
      // contract the user sees.
      toast.error("This shop already has the maximum number of staff.")
      throw capError
    })

    // Cap-reached errors carry no field path, so the extractor returns {}.
    extractStaffFieldErrorsMock.mockReturnValue({})

    searchUsersMock.mockResolvedValue([PICKED_USER])

    const onOpenChange = vi.fn()
    renderWithClient(
      <InviteStaffDialog
        shopId="shop-a"
        open
        onOpenChange={onOpenChange}
        mode="invite"
      />,
    )

    // Set up a fully-entered form: pick a user, choose SHOP_MANAGER, and
    // tweak one permission so we can verify nothing is lost on the failed
    // submit.
    await pickUser(PICKED_USER_ID)
    fireEvent.change(screen.getByTestId("staff-role-trigger"), {
      target: { value: "SHOP_MANAGER" },
    })
    const overriddenToken = ROLE_DEFAULTS.SHOP_MANAGER[0]
    fireEvent.click(screen.getByTestId(`perm-token-${overriddenToken}`))

    await act(async () => {
      fireEvent.click(screen.getByTestId("staff-submit"))
    })

    await waitFor(() => {
      expect(inviteMutateAsync).toHaveBeenCalledTimes(1)
    })

    // Destructive toast fired with the cap-reached copy.
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/maximum number of staff/i),
    )

    // Dialog stayed open.
    expect(onOpenChange).not.toHaveBeenCalledWith(false)

    // No field-level error was set (cap-reached is a global toast).
    expect(
      screen.queryByTestId("staff-user-picker-error"),
    ).not.toBeInTheDocument()

    // Local form state preserved across the failed submit:
    //   - role still SHOP_MANAGER
    //   - the per-token override is still "off"
    //   - every other SHOP_MANAGER default is still "on"
    expect(screen.getByTestId("staff-role-trigger")).toHaveValue(
      "SHOP_MANAGER",
    )
    expect(
      screen.getByTestId(`perm-token-${overriddenToken}`),
    ).toHaveAttribute("aria-checked", "false")
    for (const token of ROLE_DEFAULTS.SHOP_MANAGER.slice(1)) {
      expect(screen.getByTestId(`perm-token-${token}`)).toHaveAttribute(
        "aria-checked",
        "true",
      )
    }
  })
})

describe("<InviteStaffDialog /> — edit mode prefill", () => {
  it("prefills role + permissions + is_active from initialStaff and disables the picker", () => {
    const staff = makeStaff({
      role: "SHOP_VIEWER",
      permissions: [...ROLE_DEFAULTS.SHOP_VIEWER],
      is_active: false,
    })

    renderWithClient(
      <InviteStaffDialog
        shopId="shop-a"
        open
        onOpenChange={() => {}}
        mode="edit"
        initialStaff={staff}
      />,
    )

    // User picker disabled in edit mode.
    expect(screen.getByTestId("staff-user-picker-trigger")).toBeDisabled()

    // Permissions are seeded from the row.
    for (const token of ROLE_DEFAULTS.SHOP_VIEWER) {
      expect(screen.getByTestId(`perm-token-${token}`)).toHaveAttribute(
        "aria-checked",
        "true",
      )
    }

    // is_active toggle reflects the row.
    const activeToggle = screen.getByTestId("staff-is-active-toggle")
    expect(activeToggle).toHaveAttribute("aria-checked", "false")

    // Submit button uses the edit copy.
    expect(screen.getByTestId("staff-submit")).toHaveTextContent(
      /save changes/i,
    )
  })

  it("submit calls the update mutation with the staffId and patched body", async () => {
    const staff = makeStaff({
      role: "SHOP_MANAGER",
      permissions: [...ROLE_DEFAULTS.SHOP_MANAGER],
      is_active: true,
    })
    updateMutateAsync.mockResolvedValueOnce(staff)

    const onOpenChange = vi.fn()
    renderWithClient(
      <InviteStaffDialog
        shopId="shop-a"
        open
        onOpenChange={onOpenChange}
        mode="edit"
        initialStaff={staff}
      />,
    )

    // Submit without changes — the dialog still posts the current
    // role/permissions/is_active to the update endpoint.
    await act(async () => {
      fireEvent.click(screen.getByTestId("staff-submit"))
    })

    expect(updateMutateAsync).toHaveBeenCalledTimes(1)
    const call = updateMutateAsync.mock.calls[0][0]
    expect(call.staffId).toBe(staff.id)
    expect(call.body.role).toBe("SHOP_MANAGER")
    expect(call.body.is_active).toBe(true)
    expect(Array.isArray(call.body.permissions)).toBe(true)

    // On success, the dialog closed.
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
