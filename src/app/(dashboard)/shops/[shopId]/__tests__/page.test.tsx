/**
 * Unit tests for the shop detail page (task 5.5).
 *
 * Covers the page-level behaviours owned by this task:
 *   - Header — renders shop name, branch code, status badges, and the KPI
 *     strip with `total_orders`, `total_revenue`, `avg_rating`,
 *     `rating_count` (Req 5.7).
 *   - Action bar — Edit / Toggle Active / Toggle Verified are visible only
 *     when the user is a Super_Admin (Req 5.8).
 *   - Loading state — shows skeletons while the underlying `useShop` query
 *     is in flight.
 *   - Error state — renders `<ErrorBlock />` with retry when the query
 *     fails.
 *
 * The tab subcomponents are stubbed so the test focuses on the detail
 * page's wiring; their own behaviours are covered separately.
 *
 * Validates: Requirements 5.7, 5.8.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks (must precede the page import)
// ─────────────────────────────────────────────────────────────────────────────

const useShopMock = vi.fn()
const useDeactivateShopMock = vi.fn()
const useReactivateShopMock = vi.fn()
const useToggleVerificationMock = vi.fn()

vi.mock("@/hooks/useShops", () => ({
  useShop: (...args: unknown[]) => useShopMock(...args),
  useDeactivateShop: () => useDeactivateShopMock(),
  useReactivateShop: () => useReactivateShopMock(),
  useToggleVerification: () => useToggleVerificationMock(),
}))

const useRouteRBACMock = vi.fn()
vi.mock("@/hooks/useRBAC", () => ({
  useRouteRBAC: (...args: unknown[]) => useRouteRBACMock(...args),
}))

const useIsSuperAdminMock = vi.fn()
const useShopContextMock = vi.fn()
vi.mock("@/hooks/useShopContext", () => ({
  useIsSuperAdmin: () => useIsSuperAdminMock(),
  useShopContext: () => useShopContextMock(),
}))

// Stub the tab subcomponents — their own behaviours are covered elsewhere
// and we don't want their internal fetches firing inside the page test.
vi.mock("../_tabs/overview-tab", () => ({
  OverviewTab: () => <div data-testid="tab-overview">overview</div>,
}))
vi.mock("../_tabs/service-area-tab", () => ({
  ServiceAreaTab: () => (
    <div data-testid="tab-service-area">service-area</div>
  ),
}))
vi.mock("../_tabs/operating-hours-tab", () => ({
  OperatingHoursTab: () => <div data-testid="tab-hours">hours</div>,
}))
vi.mock("../_tabs/commercials-tab", () => ({
  CommercialsTab: () => <div data-testid="tab-commercials">commercials</div>,
}))
vi.mock("../_tabs/bank-tab", () => ({
  BankTab: () => <div data-testid="tab-bank">bank</div>,
}))
vi.mock("../_tabs/staff-tab", () => ({
  StaffTab: () => <div data-testid="tab-staff">staff</div>,
}))
vi.mock("../_tabs/activity-tab", () => ({
  ActivityTab: () => <div data-testid="tab-activity">activity</div>,
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import ShopDetailPage from "@/app/(dashboard)/shops/[shopId]/page"
import type { Shop } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-a",
    name: "Shop A",
    slug: "shop-a",
    branch_code: "BR-A-001",
    description: "",
    logo_url: "",
    banner_url: "",
    phone: "",
    email: "",
    whatsapp: "",
    address_line1: "1 Example Street",
    address_line2: "",
    city: "Mumbai",
    state: "MH",
    pincode: "400001",
    lat: 19.076,
    lng: 72.8777,
    serviceable_pincodes: ["400001"],
    delivery_radius_km: 5,
    is_active: true,
    is_verified: true,
    operating_hours: {
      monday: { open: "09:00", close: "21:00", closed: false },
      tuesday: { open: "09:00", close: "21:00", closed: false },
      wednesday: { open: "09:00", close: "21:00", closed: false },
      thursday: { open: "09:00", close: "21:00", closed: false },
      friday: { open: "09:00", close: "21:00", closed: false },
      saturday: { open: "09:00", close: "21:00", closed: false },
      sunday: { open: "09:00", close: "21:00", closed: false },
    },
    commission_rate: 5,
    gst_number: "",
    pan_number: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
    bank_holder_name: "",
    total_orders: 12345,
    total_revenue: 567890,
    avg_rating: 4.32,
    rating_count: 87,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    ...overrides,
  }
}

function primeAuthorized() {
  useRouteRBACMock.mockReturnValue({
    isAuthorized: true,
    canRead: true,
    canWrite: true,
    requiresActiveShop: false,
    superAdminOnly: false,
    guard: null,
  })
  useShopContextMock.mockReturnValue({
    activeShopId: "shop-a",
    mode: "STORE_MODE",
    shopRole: "SHOP_ADMIN",
    permissions: [],
    shopMeta: null,
    isReady: true,
  })
  useDeactivateShopMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  })
  useReactivateShopMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  })
  useToggleVerificationMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  })
}

function primeShop(shop: Shop) {
  useShopMock.mockReturnValue({
    data: shop,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  primeAuthorized()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("Shop detail page — header + KPI strip (Req 5.7)", () => {
  it("renders the shop name, branch code, and KPI values", () => {
    const shop = makeShop()
    primeShop(shop)
    useIsSuperAdminMock.mockReturnValue(true)

    render(<ShopDetailPage params={{ shopId: shop.id }} />)

    // Name + branch code in the page header
    expect(screen.getByText("Shop A")).toBeInTheDocument()
    expect(screen.getByText("BR-A-001")).toBeInTheDocument()

    // KPI values
    expect(screen.getByText("12,345")).toBeInTheDocument() // total_orders
    // Currency uses Intl.NumberFormat("en", currency: "INR"), so the grouping
    // is en-US-style (567,890.00) rather than en-IN-style (5,67,890.00).
    expect(screen.getByText(/567,890/)).toBeInTheDocument() // total_revenue
    expect(screen.getByText("4.32")).toBeInTheDocument() // avg_rating
    expect(screen.getByText("87")).toBeInTheDocument() // rating_count
  })

  it("renders an em-dash for avg rating when there are no ratings", () => {
    primeShop(makeShop({ rating_count: 0, avg_rating: 0 }))
    useIsSuperAdminMock.mockReturnValue(true)

    render(<ShopDetailPage params={{ shopId: "shop-a" }} />)

    expect(screen.getByText("—")).toBeInTheDocument()
  })
})

describe("Shop detail page — action bar gating (Req 5.8)", () => {
  it("renders Edit / Deactivate / Unverify buttons for super-admin users", () => {
    primeShop(makeShop())
    useIsSuperAdminMock.mockReturnValue(true)

    render(<ShopDetailPage params={{ shopId: "shop-a" }} />)

    expect(
      screen.getByRole("link", { name: /edit shop/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /deactivate/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /unverify/i }),
    ).toBeInTheDocument()
  })

  it("hides every action-bar control for non-super-admin users", () => {
    primeShop(makeShop())
    useIsSuperAdminMock.mockReturnValue(false)

    render(<ShopDetailPage params={{ shopId: "shop-a" }} />)

    expect(
      screen.queryByRole("link", { name: /edit shop/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /deactivate/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /unverify/i }),
    ).not.toBeInTheDocument()
  })

  it("swaps Deactivate for Reactivate when the shop is inactive", () => {
    primeShop(makeShop({ is_active: false }))
    useIsSuperAdminMock.mockReturnValue(true)

    render(<ShopDetailPage params={{ shopId: "shop-a" }} />)

    expect(
      screen.getByRole("button", { name: /reactivate/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^deactivate$/i }),
    ).not.toBeInTheDocument()
  })

  it("swaps Unverify for Verify when the shop is not yet verified", () => {
    primeShop(makeShop({ is_verified: false }))
    useIsSuperAdminMock.mockReturnValue(true)

    render(<ShopDetailPage params={{ shopId: "shop-a" }} />)

    expect(
      screen.getByRole("button", { name: /^verify$/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /unverify/i }),
    ).not.toBeInTheDocument()
  })
})

describe("Shop detail page — loading + error states", () => {
  it("renders skeletons while the query is loading", () => {
    useShopMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useIsSuperAdminMock.mockReturnValue(true)

    const { container } = render(
      <ShopDetailPage params={{ shopId: "shop-a" }} />,
    )

    // Skeleton elements use the Tailwind `animate-pulse` utility from the
    // shared `<Skeleton />` primitive — assert at least one is present so
    // we know the loading branch rendered.
    const skeletons = container.querySelectorAll(".animate-pulse")
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders the error block with a retry when the query fails", () => {
    const refetch = vi.fn()
    useShopMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "Boom", response: { status: 500 } },
      refetch,
    })
    useIsSuperAdminMock.mockReturnValue(true)

    render(<ShopDetailPage params={{ shopId: "shop-a" }} />)

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByText("Boom")).toBeInTheDocument()
  })
})

describe("Shop detail page — RBAC gate", () => {
  it("renders the Forbidden fallback when the route guard fails", () => {
    useRouteRBACMock.mockReturnValue({
      isAuthorized: false,
      canRead: false,
      canWrite: false,
      requiresActiveShop: false,
      superAdminOnly: false,
      guard: null,
    })

    render(<ShopDetailPage params={{ shopId: "shop-a" }} />)

    expect(screen.getByText(/not authorized/i)).toBeInTheDocument()
  })
})
