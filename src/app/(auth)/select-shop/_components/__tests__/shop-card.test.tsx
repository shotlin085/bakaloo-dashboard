/**
 * Unit tests for the Shop_Selector `<ShopCard />` subcomponent.
 *
 * Covers the user-visible contract from Req 2.1 and 2.6:
 *   - Renders name, branch code, city, role badge, and CTA
 *   - Calls onSelect(shop) when the CTA is clicked
 *   - Disables the CTA and shows a spinner while isSelecting
 *   - Disables the CTA and shows "Inactive" when shop.isActive is false
 *
 * Requirements: 2.1, 2.6
 */

import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { ShopCard } from "@/app/(auth)/select-shop/_components/shop-card"
import type { ShopAssignment } from "@/types/auth.types"

const ACTIVE_SHOP: ShopAssignment = {
  id: "shop-a",
  name: "Bakaloo Bandra",
  branchCode: "BR-MUM-01",
  city: "Mumbai",
  role: "SHOP_MANAGER",
  isActive: true,
}

const INACTIVE_SHOP: ShopAssignment = {
  ...ACTIVE_SHOP,
  id: "shop-b",
  name: "Bakaloo Pune",
  branchCode: "BR-PUN-01",
  city: "Pune",
  isActive: false,
}

describe("<ShopCard />", () => {
  it("renders the shop name, branch code, city, role badge, and CTA", () => {
    render(<ShopCard shop={ACTIVE_SHOP} onSelect={() => {}} />)

    expect(screen.getByText("Bakaloo Bandra")).toBeInTheDocument()
    expect(screen.getByText("BR-MUM-01")).toBeInTheDocument()
    expect(screen.getByText("Mumbai")).toBeInTheDocument()
    expect(screen.getByText("Shop manager")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /enter shop/i }),
    ).toBeInTheDocument()
  })

  it("invokes onSelect with the shop when the CTA is clicked", () => {
    const onSelect = vi.fn()
    render(<ShopCard shop={ACTIVE_SHOP} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole("button", { name: /enter shop/i }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(ACTIVE_SHOP)
  })

  it("disables the CTA and shows a spinner while isSelecting", () => {
    const onSelect = vi.fn()
    render(
      <ShopCard shop={ACTIVE_SHOP} onSelect={onSelect} isSelecting={true} />,
    )

    const button = screen.getByRole("button", { name: /entering/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")

    fireEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("renders inactive shops with a disabled 'Inactive' button", () => {
    const onSelect = vi.fn()
    render(<ShopCard shop={INACTIVE_SHOP} onSelect={onSelect} />)

    const button = screen.getByRole("button", { name: /inactive/i })
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
