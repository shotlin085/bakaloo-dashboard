"use client"

/**
 * HQ Shops page (task 20.2) — list, create, edit shops.
 *
 * Respects `shops.create`, `shops.update`, `shops.delete` permissions via
 * PermissionGate. Uses Zod schemas matching backend for form validation.
 */

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Store,
  CheckCircle2,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { DataList, type DataListColumn } from "@/components/shared/data-list"
import { ErrorBlock } from "@/components/shared/error-block"
import { PageHeader } from "@/components/shared/PageHeader"
import { PermissionGate } from "@/components/shared/PermissionGate"

import { useDebounce } from "@/hooks/useDebounce"
import {
  useShopsList,
  useCreateShop,
  useUpdateShop,
  useDeactivateShop,
} from "@/hooks/useShops"
import type { ShopsListParams } from "@/services/shops.service"
import type { Shop } from "@/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

// Zod schema matching backend createShopSchema
const shopFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  address_line1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Must be a 6-digit pincode"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  delivery_radius_km: z.coerce.number().min(0.5).max(50),
  commission_rate: z.coerce.number().min(0).max(100),
})

type ShopFormValues = z.infer<typeof shopFormSchema>

type TriState = "all" | "yes" | "no"

function triToBool(v: TriState): boolean | undefined {
  if (v === "yes") return true
  if (v === "no") return false
  return undefined
}

export default function HQShopsPage() {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<TriState>("all")
  const [page, setPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const params: ShopsListParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      ...(triToBool(activeFilter) !== undefined && {
        is_active: triToBool(activeFilter),
      }),
    }),
    [page, debouncedSearch, activeFilter],
  )

  const { data, isLoading, isError, error, refetch } = useShopsList(params)
  const createShop = useCreateShop()
  const updateShop = useUpdateShop()
  const deactivateShop = useDeactivateShop()

  const rows = data?.items ?? []
  const pagination = data?.pagination

  const columns: DataListColumn<Shop>[] = [
    {
      id: "name",
      header: "Shop Name",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.name}</span>
          <span className="text-xs text-muted-foreground">{row.branch_code}</span>
        </div>
      ),
    },
    {
      id: "city",
      header: "City",
      cell: (row) => <span className="text-sm">{row.city}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant={row.is_active ? "default" : "secondary"}
          className={cn(
            "gap-1 text-[11px]",
            row.is_active
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : "bg-muted text-muted-foreground",
          )}
        >
          {row.is_active ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "orders",
      header: "Orders",
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {Number(row.total_orders ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: "revenue",
      header: "Revenue",
      cell: (row) => (
        <span className="text-sm tabular-nums">
          ₹{Number(row.total_revenue ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <PermissionGate require="shops.update">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setEditingShop(row)}
              aria-label={`Edit ${row.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
          <PermissionGate require="shops.delete">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Deactivate "${row.name}"?`)) {
                  deactivateShop.mutate(row.id)
                }
              }}
              aria-label={`Deactivate ${row.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="HQ — Shops" subtitle="Manage all shops across the platform">
        <PermissionGate require="shops.create">
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Shop
          </Button>
        </PermissionGate>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search shops"
            placeholder="Search by name or branch code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={activeFilter}
          onValueChange={(v) => { setActiveFilter(v as TriState); setPage(1) }}
        >
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Active</SelectItem>
            <SelectItem value="no">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Body */}
      {isError ? (
        <ErrorBlock message={(error as Error)?.message ?? ""} onRetry={() => void refetch()} />
      ) : isLoading && rows.length === 0 ? (
        <Card><CardContent className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent></Card>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <DataList<Shop>
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="No shops found"
          />
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <ShopFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title="Create Shop"
        onSubmit={async (values) => {
          await createShop.mutateAsync(values as never)
          setShowCreateDialog(false)
        }}
        isSubmitting={createShop.isPending}
      />

      {/* Edit Dialog */}
      <ShopFormDialog
        open={editingShop !== null}
        onOpenChange={(open) => { if (!open) setEditingShop(null) }}
        title="Edit Shop"
        defaultValues={editingShop ? {
          name: editingShop.name,
          address_line1: editingShop.address_line1,
          city: editingShop.city,
          state: editingShop.state,
          pincode: editingShop.pincode,
          phone: editingShop.phone ?? "",
          email: editingShop.email ?? "",
          lat: editingShop.lat,
          lng: editingShop.lng,
          delivery_radius_km: editingShop.delivery_radius_km,
          commission_rate: editingShop.commission_rate,
        } : undefined}
        onSubmit={async (values) => {
          if (!editingShop) return
          await updateShop.mutateAsync({ id: editingShop.id, body: values })
          setEditingShop(null)
        }}
        isSubmitting={updateShop.isPending}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shop Form Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface ShopFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  defaultValues?: ShopFormValues
  onSubmit: (values: ShopFormValues) => Promise<void>
  isSubmitting: boolean
}

function ShopFormDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  isSubmitting,
}: ShopFormDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(shopFormSchema),
    defaultValues: (defaultValues ?? {
      name: "",
      address_line1: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      lat: 0,
      lng: 0,
      delivery_radius_km: 5,
      commission_rate: 10,
    }) as ShopFormValues,
  })

  async function handleFormSubmit(values: Record<string, unknown>) {
    try {
      await onSubmit(values as unknown as ShopFormValues)
      reset()
    } catch {
      // Error handled by mutation hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="name">Shop Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="address_line1">Address *</Label>
              <Input id="address_line1" {...register("address_line1")} />
              {errors.address_line1 && <p className="text-xs text-destructive">{errors.address_line1.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">City *</Label>
              <Input id="city" {...register("city")} />
              {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="state">State *</Label>
              <Input id="state" {...register("state")} />
              {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input id="pincode" {...register("pincode")} />
              {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lat">Latitude *</Label>
              <Input id="lat" type="number" step="any" {...register("lat")} />
              {errors.lat && <p className="text-xs text-destructive">{errors.lat.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lng">Longitude *</Label>
              <Input id="lng" type="number" step="any" {...register("lng")} />
              {errors.lng && <p className="text-xs text-destructive">{errors.lng.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="delivery_radius_km">Delivery Radius (km)</Label>
              <Input id="delivery_radius_km" type="number" step="0.5" {...register("delivery_radius_km")} />
              {errors.delivery_radius_km && <p className="text-xs text-destructive">{errors.delivery_radius_km.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="commission_rate">Commission (%)</Label>
              <Input id="commission_rate" type="number" step="0.1" {...register("commission_rate")} />
              {errors.commission_rate && <p className="text-xs text-destructive">{errors.commission_rate.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
