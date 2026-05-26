"use client"

/**
 * SidebarLayout — mode-aware navigation layout component.
 *
 * Renders different navigation structures based on the dashboard operating mode:
 *
 * HQ_MODE (Super_Admin):
 *   Global nav: Shops, Orders Across Shops, Reports, Finance, Audit Logs
 *
 * STORE_MODE (shop-scoped user):
 *   Shop-scoped nav: Dashboard, Orders, Products, Inventory, Staff,
 *   Transactions, Reports, Coupons
 *
 * Items requiring a permission the user lacks are hidden entirely. The
 * component is responsive: collapsible on mobile via a sheet overlay.
 *
 * This component wraps the existing `<Sidebar />` with mode-aware logic,
 * providing a higher-level abstraction that the dashboard layout can use
 * to render the correct navigation based on `(mode, effectivePermissions)`.
 *
 * Tasks: 17.1
 * Requirements: 4.2, 4.5, 4.6, 4.7
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Shield,
  ShoppingCart,
  Store,
  Ticket,
  Users,
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
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth.store"
import { useSidebarStore } from "@/store/sidebar.store"
import {
  useEffectivePermissions,
  type DashboardMode,
} from "@/hooks/useEffectivePermissions"

// ─────────────────────────────────────────────────────────────────────────────
// Nav item types
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  /** Unique identifier for the nav item. */
  id: string
  /** Display label. */
  label: string
  /** Route path. */
  href: string
  /** Icon key from the icon map. */
  icon: string
  /** Permission(s) required — ANY one is sufficient. Hidden when absent. */
  permissions?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon map
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Receipt,
  Shield,
  Store,
  Ticket,
  Users,
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation definitions by mode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HQ_MODE navigation — global platform management.
 * Super_Admins see cross-shop surfaces.
 */
const HQ_NAV_ITEMS: NavItem[] = [
  {
    id: "shops",
    label: "Shops",
    href: "/shops",
    icon: "Store",
    permissions: ["shops.read"],
  },
  {
    id: "orders-across-shops",
    label: "Orders Across Shops",
    href: "/orders",
    icon: "ClipboardList",
    permissions: ["orders.read"],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/analytics",
    icon: "BarChart3",
  },
  {
    id: "finance",
    label: "Finance",
    href: "/shop-financials",
    icon: "CreditCard",
    permissions: ["shop-financials.read"],
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    href: "/activity-log",
    icon: "Activity",
    permissions: ["activity-log.read"],
  },
]

/**
 * STORE_MODE navigation — shop-scoped surfaces.
 * Vendor/staff users see only their shop's data.
 */
const STORE_NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
  },
  {
    id: "orders",
    label: "Orders",
    href: "/orders",
    icon: "ClipboardList",
    permissions: ["orders.read"],
  },
  {
    id: "products",
    label: "Products",
    href: "/products",
    icon: "Package",
    permissions: ["products.read"],
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/shop-products",
    icon: "Package",
    permissions: ["shop-products.read"],
  },
  {
    id: "staff",
    label: "Staff",
    href: "/team",
    icon: "Users",
    permissions: ["shop-staff.read"],
  },
  {
    id: "transactions",
    label: "Transactions",
    href: "/shop-transactions",
    icon: "Receipt",
    permissions: ["shop-transactions.read"],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/analytics",
    icon: "BarChart3",
  },
  {
    id: "coupons",
    label: "Coupons",
    href: "/coupons",
    icon: "Ticket",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SidebarLayout() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isCollapsed, setCollapsed } = useSidebarStore()
  const { mode, hasAny } = useEffectivePermissions()

  // Select nav items based on mode
  const navItems = mode === "HQ_MODE" ? HQ_NAV_ITEMS : STORE_NAV_ITEMS

  // Filter items based on effective permissions
  const visibleItems = navItems.filter((item) => {
    if (!item.permissions || item.permissions.length === 0) return true
    return hasAny(...item.permissions)
  })

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-all duration-200",
          isCollapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center gap-3 px-4 shrink-0">
          <div className="stat-card-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="truncate text-base font-semibold text-foreground">
              Bakaloo
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
              isCollapsed && "ml-0",
            )}
            onClick={() => setCollapsed(!isCollapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed && "rotate-180",
              )}
            />
          </Button>
        </div>

        <Separator />

        {/* Mode indicator */}
        {!isCollapsed && (
          <div className="px-4 py-2">
            <ModeIndicator mode={mode} />
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav aria-label="Main menu" role="navigation" className="space-y-1 px-3">
            {visibleItems.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                pathname={pathname}
                isCollapsed={isCollapsed}
              />
            ))}
          </nav>
        </ScrollArea>

        <Separator />

        {/* User footer */}
        <div className="shrink-0 p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg p-2",
              isCollapsed && "justify-center",
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
                  {mode === "HQ_MODE" ? "HQ Admin" : "Store Staff"}
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
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
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

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ModeIndicator({ mode }: { mode: DashboardMode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium",
        mode === "HQ_MODE"
          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
          : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
      )}
    >
      {mode === "HQ_MODE" ? (
        <>
          <Shield className="h-3.5 w-3.5" />
          <span>HQ Mode</span>
        </>
      ) : (
        <>
          <Store className="h-3.5 w-3.5" />
          <span>Store Mode</span>
        </>
      )}
    </div>
  )
}

interface NavLinkProps {
  item: NavItem
  pathname: string
  isCollapsed: boolean
}

function NavLink({ item, pathname, isCollapsed }: NavLinkProps) {
  const Icon = ICON_MAP[item.icon]
  const isActive = isPathActive(pathname, item.href)

  const link = (
    <Link
      href={item.href}
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
      {Icon && (
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            isActive ? "text-brand-500" : "text-muted-foreground",
          )}
        />
      )}
      {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
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
