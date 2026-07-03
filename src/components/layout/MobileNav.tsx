"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bell,
  Bike,
  ClipboardList,
  Coffee,
  CreditCard,
  FileText,
  Gift,
  Image,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Ticket,
  Timer,
  Users,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useMenuVisibility } from "@/hooks/useRBAC"
import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/store/sidebar.store"

type NavChild = {
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
  children?: NavChild[]
}

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Bell,
  Bike,
  ClipboardList,
  Coffee,
  CreditCard,
  FileText,
  Gift,
  Image,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Star,
  Store,
  Tags,
  Ticket,
  Timer,
  Users,
  Users2,
  Wallet,
}

const NAV_SECTIONS: Array<{ section: string; items: NavItem[] }> = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "Orders", href: "/orders", icon: "ClipboardList" },
      {
        label: "Settings",
        href: "/settings",
        icon: "Settings",
        children: [
          { label: "Fees", href: "/settings/fees", icon: "FileText" },
          { label: "Tip Presets", href: "/settings/tip-presets", icon: "Coffee" },
          {
            label: "Payment Offers",
            href: "/settings/payment-offers",
            icon: "Gift",
          },
          { label: "Delivery Timer", href: "/settings/delivery-timer", icon: "Timer" },
        ],
      },
      { label: "Products", href: "/products", icon: "Package" },
      { label: "Categories", href: "/categories", icon: "Tags" },
      { label: "Customers", href: "/customers", icon: "Users" },
      { label: "Riders", href: "/riders", icon: "Bike" },
    ],
  },
  {
    section: "SHOPS",
    items: [
      // Ids match `MENU_PERMISSIONS` keys — see Sidebar.tsx for design notes.
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
      { label: "Customer Segments", href: "/customer-segments", icon: "Users2" },
      { label: "First-Time Offers", href: "/first-time-offers", icon: "Gift" },
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
      { label: "General Settings", href: "/settings", icon: "Settings" },
    ],
  },
]

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface MobileSectionProps {
  section: string
  items: NavItem[]
  pathname: string
  onClose: () => void
}

/**
 * Mobile sidebar section. Mirrors `<SidebarSection />` from Sidebar.tsx —
 * computes visibility via `useMenuVisibility` and hides the heading when
 * every item in the section is gated (Req 4.2). Re-evaluates on permission
 * or shop-context change (Req 4.6).
 */
function MobileSection({ section, items, pathname, onClose }: MobileSectionProps) {
  const ids = items.map((item) => item.id ?? "")
  const visibility = useMenuVisibility(ids)
  const visibleItems = items.filter((item) => visibility[item.id ?? ""])
  if (visibleItems.length === 0) return null

  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {section}
      </p>
      <div className="space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = ICON_MAP[item.icon]

          if (item.children) {
            const isGroupActive = item.children.some((child) =>
              isPathActive(pathname, child.href),
            )

            return (
              <div key={item.label} className="space-y-1">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                    isGroupActive
                      ? "bg-brand-50 font-semibold text-brand-500"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isGroupActive
                        ? "text-brand-500"
                        : "text-muted-foreground",
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="ml-6 space-y-0.5 border-l border-border/80 pl-3">
                  {item.children.map((child) => {
                    const ChildIcon = ICON_MAP[child.icon]
                    const childActive = isPathActive(pathname, child.href)

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-150",
                          childActive
                            ? "bg-brand-50 font-semibold text-brand-500"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        <span>{child.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          const isActive = isPathActive(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-sm transition-all duration-150",
                isActive
                  ? "border-brand-500 bg-brand-50 font-semibold text-brand-500"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-brand-500" : "text-muted-foreground",
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const { isOpen, setOpen } = useSidebarStore()

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="stat-card-primary flex h-9 w-9 items-center justify-center rounded-xl">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-semibold text-foreground">
            Bakaloo Admin
          </span>
        </div>
        <Separator />
        <ScrollArea className="h-[calc(100vh-64px)] py-3">
          <nav aria-label="Mobile menu" className="space-y-5 px-3">
            {NAV_SECTIONS.map((section) => (
              <MobileSection
                key={section.section}
                section={section.section}
                items={section.items}
                pathname={pathname}
                onClose={() => setOpen(false)}
              />
            ))}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
