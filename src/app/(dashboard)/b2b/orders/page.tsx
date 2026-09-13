"use client"

import { useState } from "react"
import { Clock, CheckCircle2, Landmark } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer"
import { useB2BOrders } from "@/hooks/useOrders"
import { formatDateTime } from "@/lib/utils"
import type { B2BOrderFilters } from "@/types"

const STATUS_OPTIONS: Array<{ value: NonNullable<B2BOrderFilters["status"]> | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Approval Pending" },
  { value: "APPROVED", label: "Approved" },
]

export default function B2BOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<B2BOrderFilters["status"] | "all">("all")
  const [page, setPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const { data, isLoading } = useB2BOrders({
    page,
    limit: 20,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  })

  const orders = data?.orders ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="B2B Orders"
        subtitle="Orders placed on B2B credit via “Place Order” — approve pending ones and record how customers settle them"
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as B2BOrderFilters["status"] | "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <LoadingSkeleton variant="table" count={8} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-10 w-10" />}
          title="No B2B credit orders"
          description="Orders placed with the B2B “Place Order” credit button will show up here."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Settled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const settled = Number(order.b2b_amount_settled ?? 0)
                const isPending = order.b2b_approval_status === "PENDING"
                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>{order.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                    </TableCell>
                    <TableCell>{order.company_name || "—"}</TableCell>
                    <TableCell>₹{Number(order.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      ₹{settled.toFixed(2)}
                      {settled < order.total_amount && (
                        <span className="text-muted-foreground"> / ₹{Number(order.total_amount).toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          isPending
                            ? "border-amber-200 bg-amber-500/15 text-amber-700"
                            : "border-emerald-200 bg-emerald-500/15 text-emerald-700"
                        }
                      >
                        {isPending ? (
                          <>
                            <Clock className="mr-1 h-3 w-3" /> Admin Approval Pending
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <OrderDetailDrawer
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  )
}
