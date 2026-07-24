"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  Bell,
  Bike,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  CalendarDays,
  Clock,
  Coffee,
  CreditCard,
  FileText,
  Gift,
  History,
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Palette,
  Receipt,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Tags,
  Ticket,
  Timer,
  TrendingUp,
  Users,
  Users2,
  Wallet,
  Youtube,
  type LucideIcon,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePendingActions } from "@/hooks/useDashboard"
import { useMenuVisibility } from "@/hooks/useRBAC"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth.store"
import { useSidebarStore } from "@/store/sidebar.store"

type NavChild = {
  /** Stable id used for permission gating (looked up in `MENU_PERMISSIONS`). */
  id?: string
  label: string
  href: string
  icon: string
}

type NavItem = {
  /** Stable id used for permission gating (looked up in `MENU_PERMISSIONS`). */
  id?: string
  label: string
  href: string
  icon: string
  badgeKey?: "pendingOrders" | "lowStockProducts" | "pendingRiderApprovals"
  children?: NavChild[]
}

const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  BarChart3,
  Bell,
  Bike,
  ClipboardList,
  CalendarDays,
  Clock,
  Coffee,
  CreditCard,
  FileText,
  Gift,
  History,
  Image,
  LayoutDashboard,
  MapPin,
  Package,
  Palette,
  Receipt,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Store,
  Tags,
  Ticket,
  Timer,
  TrendingUp,
  Users,
  Users2,
  Wallet,
  Youtube,
}

const NAV_SECTIONS: Array<{ section: string; items: NavItem[] }> = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      {
        label: "Orders",
        href: "/orders",
        icon: "ClipboardList",
        badgeKey: "pendingOrders",
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings/fees",
        icon: "Settings",
        children: [
          { label: "Fees", href: "/settings/fees", icon: "FileText" },
          { label: "Tip Presets", href: "/settings/tip-presets", icon: "Coffee" },
          {
            label: "Payment Offers",
            href: "/settings/payment-offers",
            icon: "Gift",
          },
          { label: "Payments", href: "/settings/payments", icon: "CreditCard" },
          { label: "Wallet Settings", href: "/settings/wallet", icon: "Wallet" },
          { label: "Product Suggestions", href: "/settings/product-suggestions", icon: "Sparkles" },
          { label: "Delivery Timer", href: "/settings/delivery-timer", icon: "Timer" },
          { label: "Pincode Mapping", href: "/settings/pincode-mapping", icon: "MapPin" },
          { label: "Store Hours", href: "/settings/store-hours", icon: "Clock" },
          { label: "Delivery Calendar", href: "/settings/delivery-calendar", icon: "CalendarDays" },
        ],
      },
      {
        label: "Products",
        href: "/products",
        icon: "Package",
        badgeKey: "lowStockProducts",
      },
      { label: "Abandoned Carts", href: "/abandoned-carts", icon: "Clock" },
      { label: "Categories", href: "/categories", icon: "Tags" },
      { label: "Customers", href: "/customers", icon: "Users" },
      {
        label: "Riders",
        href: "/riders",
        icon: "Bike",
        badgeKey: "pendingRiderApprovals",
      },
    ],
  },
  {
    section: "SHOPS",
    items: [
      // Ids match `MENU_PERMISSIONS` keys — `useMenuRBAC` consults that map
      // to hide super-admin-only or `requiresActiveShop` items as the user's
      // role and Shop_Switcher selection change (Req 4.2, 4.5, 4.6, 4.7).
      { id: "shops", label: "Shops", href: "/shops", icon: "Store" },
      {
        id: "shopProducts",
        label: "Shop Products",
        href: "/shop-products",
        icon: "Package",
      },
      {
        id: "shopFinancials",
        label: "Shop Financials",
        href: "/shop-financials",
        icon: "CreditCard",
      },
      {
        id: "shopTransactions",
        label: "Shop Transactions",
        href: "/shop-transactions",
        icon: "Receipt",
      },
    ],
  },
  {
    section: "COMMERCE",
    items: [
      { label: "Coupons", href: "/coupons", icon: "Ticket" },
      { label: "Purchase Limits", href: "/purchase-limits", icon: "ShieldAlert" },
      { label: "Customer Segments", href: "/customer-segments", icon: "Users2" },
      { label: "First-Time Offers", href: "/first-time-offers", icon: "Gift" },
      { label: "Cart Milestones", href: "/cart-milestones", icon: "TrendingUp" },
      { label: "Wallet & Refunds", href: "/wallet", icon: "Wallet" },
      { label: "Notifications", href: "/notifications", icon: "Bell" },
      { label: "Reviews", href: "/reviews", icon: "Star" },
    ],
  },
  {
    section: "ANALYTICS",
    items: [{ label: "Analytics", href: "/analytics", icon: "BarChart3" }],
  },
  {
    section: "SYSTEM",
    items: [
      { label: "Banners", href: "/banners", icon: "Image" },
      { label: "Tutorials", href: "/tutorials", icon: "Youtube" },
      { label: "Activity Log", href: "/activity-log", icon: "Activity" },
      { label: "Customer Activity", href: "/customer-activity", icon: "History" },
      { label: "Team & Roles", href: "/team", icon: "Shield" },
      { label: "Themes", href: "/themes", icon: "Palette" },
      { label: "Theme Tabs", href: "/theme-tabs", icon: "Tags" },
    ],
  },
]

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface NavItemProps {
  item: NavItem
  pathname: string
  isCollapsed: boolean
  badgeCount: number
  openGroups: Set<string>
  onToggleGroup: (id: string) => void
}

/**
 * Renders a single nav item (leaf or grouped). Visibility is decided by the
 * parent section via `useMenuVisibility` so hook-call order stays stable
 * regardless of the gated state. Items without an `id` are legacy and
 * unconditionally rendered (the parent passes `true` for them).
 */
function NavSectionItem({
  item,
  pathname,
  isCollapsed,
  badgeCount,
  openGroups,
  onToggleGroup,
}: NavItemProps) {
  const Icon = ICON_MAP[item.icon]

  if (item.children && !isCollapsed) {
    const groupId = item.id ?? item.href
    const isOpen = openGroups.has(groupId)
    const isGroupActive = item.children.some((child) =>
      isPathActive(pathname, child.href),
    )

    return (
      <div className="space-y-1">
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => onToggleGroup(groupId)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-sm transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isGroupActive
              ? "border-brand-500 bg-brand-50 font-semibold text-brand-500"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 shrink-0",
              isGroupActive ? "text-brand-500" : "text-muted-foreground",
            )}
          />
          <span className="flex-1 truncate text-left">{item.label}</span>
          {badgeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && (
          <div className="ml-6 space-y-1 border-l border-border/80 pl-3" role="menu">
            {item.children.map((child) => {
              const ChildIcon = ICON_MAP[child.icon]
              const childActive = isPathActive(pathname, child.href)

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  role="menuitem"
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    childActive
                      ? "bg-brand-50 font-medium text-brand-500"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{child.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const isActive = isPathActive(pathname, item.href)
  const link = (
    <Link
      href={item.href}
      role="menuitem"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-sm transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "border-brand-500 bg-brand-50 font-semibold text-brand-500"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        isCollapsed && "justify-center px-0",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive ? "text-brand-500" : "text-muted-foreground",
        )}
      />
      {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!isCollapsed && badgeCount > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

interface SidebarSectionProps {
  section: string
  items: NavItem[]
  pathname: string
  isCollapsed: boolean
  badgeCounts: Record<string, number>
  openGroups: Set<string>
  onToggleGroup: (id: string) => void
}

/**
 * Renders a labelled group of nav items. Item visibility is computed in a
 * single hook call (`useMenuVisibility`) so hook-call order is stable across
 * renders. The section heading is hidden when none of its items are visible
 * to avoid leaving an empty label in the sidebar (Req 4.2). Re-evaluation on
 * Shop_Switcher changes happens automatically via the underlying selectors
 * (Req 4.6).
 */
function SidebarSection({
  section,
  items,
  pathname,
  isCollapsed,
  badgeCounts,
  openGroups,
  onToggleGroup,
}: SidebarSectionProps) {
  // Stable id list: items without an id get the empty string, which
  // `isMenuItemAllowed` resolves to "always allowed" (legacy item).
  const ids = items.map((item) => item.id ?? "")
  const visibility = useMenuVisibility(ids)
  const visibleItems = items.filter((item) => visibility[item.id ?? ""])
  if (visibleItems.length === 0) return null

  return (
    <div>
      {!isCollapsed && (
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {section}
        </p>
      )}
      <div className="space-y-0.5">
        {visibleItems.map((item) => {
          const badgeCount = item.badgeKey
            ? badgeCounts[item.badgeKey] ?? 0
            : 0
          return (
            <NavSectionItem
              key={item.id ?? item.href}
              item={item}
              pathname={pathname}
              isCollapsed={isCollapsed}
              badgeCount={badgeCount}
              openGroups={openGroups}
              onToggleGroup={onToggleGroup}
            />
          )
        })}
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isCollapsed, setCollapsed } = useSidebarStore()
  const { data: pendingActions } = usePendingActions()
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (pathname.startsWith("/settings")) initial.add("settings")
    if (pathname.startsWith("/products")) initial.add("products")
    return initial
  })

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      let changed = false
      if (pathname.startsWith("/settings") && !next.has("settings")) {
        next.add("settings")
        changed = true
      }
      if (pathname.startsWith("/products") && !next.has("products")) {
        next.add("products")
        changed = true
      }
      return changed ? next : prev
    })
  }, [pathname])

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const badgeCounts: Record<string, number> = {
    pendingOrders: pendingActions?.pendingOrders ?? 0,
    lowStockProducts: pendingActions?.lowStockProducts ?? 0,
    pendingRiderApprovals: pendingActions?.pendingRiderApprovals ?? 0,
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-all duration-200",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <div className="flex h-16 items-center gap-3 px-4 shrink-0">
          <div className="stat-card-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="truncate text-base font-semibold text-foreground">
              Bakaloo Admin
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
              isCollapsed && "ml-0"
            )}
            onClick={() => setCollapsed(!isCollapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        <Separator />

        <ScrollArea className="flex-1 py-3">
          <nav aria-label="Main menu" role="menubar" className="space-y-5 px-3">
            {NAV_SECTIONS.map((section) => (
              <SidebarSection
                key={section.section}
                section={section.section}
                items={section.items}
                pathname={pathname}
                isCollapsed={isCollapsed}
                badgeCounts={badgeCounts}
                openGroups={openGroups}
                onToggleGroup={toggleGroup}
              />
            ))}
          </nav>
        </ScrollArea>

        <Separator />

        <div className="shrink-0 p-3">
          <div
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted",
              isCollapsed && "justify-center"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-brand-50 text-xs font-semibold text-brand-500">
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.name || "Admin"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.role_name || user?.email}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Logout"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-danger"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Logout</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
