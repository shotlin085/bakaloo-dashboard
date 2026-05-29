/**
 * Unit tests for `usePermissions` — the role-aware permission hook.
 *
 * Focus: the SUPER_ADMIN / ADMIN role bypass added to fix the dashboard
 * product-management access bug. Platform Super_Admin / Admin operators
 * carry the backend's canonical permission vocabulary (e.g. `shop_products.*`)
 * in their JWT, which never literally contains the legacy UI gating strings
 * (`products.manage`, `orders.manage`, …). Without the role bypass these
 * operators could never see the Add/Edit/Delete affordances even though the
 * backend (`authorize(['ADMIN'])`) authorises the request.
 *
 * The hook reads `user` from the Zustand auth store, so each test seeds the
 * store via `useAuthStore.setState` before rendering the hook.
 */

import { afterEach, describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"

import { usePermissions } from "@/hooks/usePermissions"
import { useAuthStore } from "@/store/auth.store"
import type { AdminUser } from "@/types"

function seedUser(partial: Partial<AdminUser> | null): void {
  if (partial === null) {
    useAuthStore.setState({ user: null })
    return
  }
  useAuthStore.setState({
    user: {
      id: "u1",
      name: "Test",
      email: "t@example.com",
      phone: "",
      role: "CUSTOMER",
      ...partial,
    } as AdminUser,
  })
}

afterEach(() => {
  useAuthStore.setState({ user: null })
})

describe("usePermissions — SUPER_ADMIN / ADMIN role bypass", () => {
  it("grants any permission to SUPER_ADMIN regardless of the permissions array", () => {
    seedUser({ role: "SUPER_ADMIN", permissions: [] })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isSuperAdmin).toBe(true)
    expect(result.current.can("products.manage")).toBe(true)
    expect(result.current.can("orders.manage")).toBe(true)
    expect(result.current.canAny("anything.at.all")).toBe(true)
    expect(result.current.canAll("a", "b", "c")).toBe(true)
  })

  it("grants any permission to ADMIN (legacy platform super-admin role)", () => {
    seedUser({ role: "ADMIN", permissions: [] })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isSuperAdmin).toBe(true)
    expect(result.current.can("products.manage")).toBe(true)
  })

  it("never reports a Super_Admin / Admin as a viewer", () => {
    seedUser({ role: "ADMIN", permissions: ["shop_products.view"] })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isViewer).toBe(false)
  })
})

describe("usePermissions — granular checks for non-super roles", () => {
  it("requires the exact permission string for shop staff", () => {
    seedUser({
      role: "CUSTOMER",
      permissions: ["shop_products.view", "shop_products.update"],
    })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isSuperAdmin).toBe(false)
    expect(result.current.can("products.manage")).toBe(false)
    expect(result.current.can("shop_products.update")).toBe(true)
    expect(result.current.canAny("products.manage", "shop_products.view")).toBe(
      true,
    )
    expect(result.current.canAll("shop_products.view", "products.manage")).toBe(
      false,
    )
  })

  it("flags a view-only operator as a viewer", () => {
    seedUser({
      role: "CUSTOMER",
      permissions: ["shop_products.view", "orders.view"],
    })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isViewer).toBe(true)
  })

  it("denies everything when there is no signed-in user", () => {
    seedUser(null)
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isSuperAdmin).toBe(false)
    expect(result.current.can("products.manage")).toBe(false)
    expect(result.current.isViewer).toBe(false)
  })
})
