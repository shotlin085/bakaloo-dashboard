"use client"

import { Suspense, useMemo, useState } from "react"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ShieldAlert } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchaseLimitRuleDialog } from "@/components/purchase-limits/PurchaseLimitRuleDialog"
import {
  usePurchaseLimitRules,
  useTogglePurchaseLimitRule,
  useDeletePurchaseLimitRule,
} from "@/hooks/usePurchaseLimits"
import { useDebounce } from "@/hooks/useDebounce"
import { usePermissions } from "@/hooks/usePermissions"
import type { PurchaseLimitRule } from "@/types/purchase-limit.types"

type FilterTab = "all" | "category" | "product" | "active" | "inactive"

/** e.g. "5 / week", "3 / 2 weeks", or "—" when the rolling-window cap is off. */
function formatWindowCap(rule: PurchaseLimitRule): string {
  if (!rule.windowEnabled || !rule.maxQtyPerWindow || !rule.windowCount || !rule.windowPeriod) {
    return "—"
  }
  const periodWord = rule.windowPeriod.toLowerCase()
  const unit = rule.windowCount === 1 ? periodWord : `${rule.windowCount} ${periodWord}s`
  return `${rule.maxQtyPerWindow} / ${unit}`
}

function PurchaseLimitsContent() {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<FilterTab>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PurchaseLimitRule | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const { data: rules, isLoading } = usePurchaseLimitRules()
  const toggleMutation = useTogglePurchaseLimitRule()
  const deleteMutation = useDeletePurchaseLimitRule()
  const { can } = usePermissions()
  // No dedicated "purchase-limits.manage" permission exists in the backend's
  // canonical set yet — First-Time Offers (also a Commerce-section, platform-
  // wide surface with no bespoke permission) reuses "coupons.manage" for the
  // same reason, so this follows that same precedent.
  const canManage = can("coupons.manage")

  // Client-side filter over the already-fetched (unpaginated) list.
  const filtered = useMemo(() => {
    let list = rules ?? []
    if (tab === "category") list = list.filter((r) => r.targetType === "CATEGORY")
    if (tab === "product") list = list.filter((r) => r.targetType === "PRODUCT")
    if (tab === "active") list = list.filter((r) => r.isActive)
    if (tab === "inactive") list = list.filter((r) => !r.isActive)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter((r) => r.label.toLowerCase().includes(q))
    }
    return list
  }, [rules, tab, debouncedSearch])

  const openCreate = () => {
    setEditingRule(null)
    setDialogOpen(true)
  }

  const openEdit = (rule: PurchaseLimitRule) => {
    setEditingRule(rule)
    setDialogOpen(true)
  }

  const handleDelete = (rule: PurchaseLimitRule) => {
    if (confirm(`Delete "${rule.label}"?`)) deleteMutation.mutate(rule.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Limits"
        subtitle="Cap how many units of a category or product a customer can buy per order or over time"
      >
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Rule
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search purchase limit rules"
            placeholder="Search by label..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="category">Category rules</TabsTrigger>
            <TabsTrigger value="product">Product rules</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="hidden md:table-cell">Per-order cap</TableHead>
              <TableHead className="hidden md:table-cell">Window cap</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<ShieldAlert className="h-6 w-6 text-muted-foreground" />}
                    title="No purchase limit rules found"
                    description={
                      search || tab !== "all"
                        ? "Try a different search or tab"
                        : "Create a rule to cap how much of a category or product a customer can buy"
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((rule) => (
                <TableRow
                  key={rule.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openEdit(rule)}
                >
                  <TableCell className="font-medium">{rule.label}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {rule.targetType === "CATEGORY"
                        ? `Category: ${rule.categoryName ?? "—"}`
                        : `Product: ${rule.productName ?? "—"}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {rule.maxQtyPerOrder ?? "—"}
                    {rule.maxQtyPerOrder != null && rule.exemptOrderCapWithOtherItems && (
                      <span className="block text-xs text-muted-foreground">solo orders only</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{formatWindowCap(rule)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={rule.isActive}
                      disabled={!canManage || toggleMutation.isPending}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, isActive: v })}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(rule)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(rule)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <PurchaseLimitRuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        rule={editingRule}
      />
    </div>
  )
}

export default function PurchaseLimitsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <PurchaseLimitsContent />
    </Suspense>
  )
}
