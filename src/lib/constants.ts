/** Order status values matching backend */
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Status badge styling — matches 01_UI_DESIGN_SYSTEM.md exactly */
export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  PENDING: { label: "Pending", bg: "#FFF8E1", text: "#F59E0B", icon: "●" },
  CONFIRMED: { label: "Confirmed", bg: "#EFF6FF", text: "#3B82F6", icon: "●" },
  PREPARING: { label: "Preparing", bg: "#F5F3FF", text: "#8B5CF6", icon: "●" },
  PACKED: { label: "Packed", bg: "#FFF3E0", text: "#FF9800", icon: "●" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", bg: "#E8F5E9", text: "#1A7A3C", icon: "●" },
  DELIVERED: { label: "Delivered", bg: "#ECFDF5", text: "#10B981", icon: "✓" },
  CANCELLED: { label: "Cancelled", bg: "#FEF2F2", text: "#EF4444", icon: "✕" },
  REFUNDED: { label: "Refunded", bg: "#F5F3FF", text: "#8B5CF6", icon: "↩" },
}

/** Order type — derived from delivery_mode + quick_delivery_selected on the backend */
export const ORDER_TYPES = ["EXPRESS", "SCHEDULED", "STANDARD"] as const
export type OrderType = (typeof ORDER_TYPES)[number]

export const ORDER_TYPE_CONFIG: Record<
  OrderType,
  { label: string; bg: string; text: string; icon: string }
> = {
  EXPRESS: { label: "Express", bg: "#FFEDD5", text: "#EA580C", icon: "●" },
  SCHEDULED: { label: "Scheduled", bg: "#F5F3FF", text: "#7C3AED", icon: "●" },
  STANDARD: { label: "Standard", bg: "#E0F2FE", text: "#0284C7", icon: "●" },
}

export const PAYMENT_METHODS = ["COD", "ONLINE", "WALLET", "MANUAL"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "Cash on Delivery",
  ONLINE: "Online (Razorpay)",
  WALLET: "Wallet",
  MANUAL: "Manual",
}

/** Allowed status transitions (for UI action buttons) */
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
}

/** Sidebar navigation items matching design system */
export const SIDEBAR_NAV = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "Orders", href: "/orders", icon: "ClipboardList" },
      { label: "Products", href: "/products", icon: "Package" },
      { label: "Categories", href: "/categories", icon: "Tags" },
      { label: "Customers", href: "/customers", icon: "Users" },
      { label: "Riders", href: "/riders", icon: "Bike" },
    ],
  },
  {
    section: "COMMERCE",
    items: [
      { label: "Coupons", href: "/coupons", icon: "Ticket" },
      { label: "Wallet & Refunds", href: "/wallet", icon: "Wallet" },
      { label: "Notifications", href: "/notifications", icon: "Bell" },
      { label: "Reviews", href: "/reviews", icon: "Star" },
    ],
  },
  {
    section: "ANALYTICS",
    items: [
      { label: "Analytics", href: "/analytics", icon: "BarChart3" },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { label: "Banners", href: "/banners", icon: "Image" },
      { label: "Settings", href: "/settings", icon: "Settings" },
    ],
  },
] as const

/** Chart colors for category donut matching design system */
export const CATEGORY_COLORS = [
  "#1A7A3C", // Fruits & Vegetables
  "#66BB6A", // Dairy & Eggs
  "#AED581", // Meat & Fish
  "#F9A825", // Bakery & Snacks
  "#42A5F5", // Beverages
  "#AB47BC", // Pulses & Grains
]
