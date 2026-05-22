"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Package,
  ShoppingCart,
  User,
  Loader2,
  ArrowRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDebounce } from "@/hooks/useDebounce"
import { useProducts } from "@/hooks/useProducts"
import { useOrders } from "@/hooks/useOrders"
import { useCustomers } from "@/hooks/useCustomers"
import { formatINR } from "@/lib/utils"
import { cn } from "@/lib/utils"

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debouncedQuery = useDebounce(query, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasSearch = debouncedQuery.length >= 2

  const { data: productsData, isLoading: productsLoading } = useProducts(
    hasSearch ? { search: debouncedQuery, limit: 5 } : { limit: 0 }
  )
  const { data: ordersData, isLoading: ordersLoading } = useOrders(
    hasSearch ? { search: debouncedQuery, limit: 5 } : { limit: 0 }
  )
  const { data: customersData, isLoading: customersLoading } = useCustomers(
    hasSearch ? { search: debouncedQuery, limit: 5 } : { limit: 0 }
  )

  const isLoading = productsLoading || ordersLoading || customersLoading

  // Build results
  type SearchResult = {
    type: "product" | "order" | "customer"
    id: string
    title: string
    subtitle: string
    href: string
  }

  const results: SearchResult[] = useMemo(() => {
    if (!hasSearch) return []
    const r: SearchResult[] = []

    // Orders
    for (const o of ordersData?.orders ?? []) {
      r.push({
        type: "order",
        id: o.id,
        title: `#${o.order_number}`,
        subtitle: `${o.customer_name ?? "Unknown"} · ${formatINR(o.total_amount)}`,
        href: `/orders?selected=${o.id}`,
      })
    }
    // Products
    for (const p of productsData?.products ?? []) {
      r.push({
        type: "product",
        id: p.id,
        title: p.name,
        subtitle: `${formatINR(p.sale_price ?? p.price ?? 0)} · Stock: ${p.stock_quantity}`,
        href: `/products/${p.id}/edit`,
      })
    }
    // Customers
    for (const c of customersData?.customers ?? []) {
      r.push({
        type: "customer",
        id: c.id,
        title: c.name || c.phone,
        subtitle: `${c.phone} · ${c.order_count} orders`,
        href: `/customers?selected=${c.id}`,
      })
    }

    return r
  }, [hasSearch, ordersData, productsData, customersData])

  const navigate = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery("")
      router.push(href)
    },
    [router]
  )

  // Keyboard nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (!open) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault()
        navigate(results[activeIndex].href)
      }
      if (e.key === "Escape") {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, results, activeIndex, navigate])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    setActiveIndex(0)
  }, [debouncedQuery])

  const ICONS: Record<string, React.ReactNode> = {
    order: <ShoppingCart className="h-4 w-4 text-blue-500" />,
    product: <Package className="h-4 w-4 text-green-500" />,
    customer: <User className="h-4 w-4 text-purple-500" />,
  }

  const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    order: { label: "Order", color: "bg-blue-50 text-blue-600" },
    product: { label: "Product", color: "bg-green-50 text-green-600" },
    customer: { label: "Customer", color: "bg-purple-50 text-purple-600" },
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search orders, products, customers... (⌘K)"
          aria-label="Global search"
          className="pl-9 bg-muted border-border h-9 text-sm pr-16"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length >= 2) setOpen(true)
          }}
          onFocus={() => {
            if (query.length >= 2) setOpen(true)
          }}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          ⌘K
        </kbd>
      </div>

      {/* Dropdown */}
      {open && hasSearch && (
        <div className="absolute top-full mt-1 w-full bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </div>
          ) : (
            <ScrollArea className="max-h-[320px]">
              {results.map((result, i) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => navigate(result.href)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    i === activeIndex ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  {ICONS[result.type]}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.subtitle}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] border-0",
                      TYPE_LABELS[result.type].color
                    )}
                  >
                    {TYPE_LABELS[result.type].label}
                  </Badge>
                  {i === activeIndex && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              ))}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  )
}
