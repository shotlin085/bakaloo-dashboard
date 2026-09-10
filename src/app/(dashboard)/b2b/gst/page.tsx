"use client"

import { Suspense, useState } from "react"
import { FileSpreadsheet, Search, Download } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useOrders, useDownloadTaxInvoice } from "@/hooks/useOrders"
import { useDebounce } from "@/hooks/useDebounce"
import { formatINR, formatDateTime } from "@/lib/utils"

const PAYMENT_STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  PAID: { label: "Paid", bg: "#ECFDF5", text: "#10B981" },
  PENDING: { label: "Pending", bg: "#FFF8E1", text: "#F59E0B" },
  FAILED: { label: "Failed", bg: "#FEF2F2", text: "#EF4444" },
  REFUNDED: { label: "Refunded", bg: "#F3F4F6", text: "#6B7280" },
  EXPIRED: { label: "Expired", bg: "#F3F4F6", text: "#6B7280" },
}

function GstInvoicesContent() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useOrders({
    isB2B: true,
    search: debouncedSearch || undefined,
    page,
    limit: 20,
  })
  const downloadTaxInvoice = useDownloadTaxInvoice()

  const orders = data?.orders ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <PageHeader title="GST & Invoices" subtitle="B2B orders and their GST tax invoices" />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search order number, customer, company..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<FileSpreadsheet className="h-6 w-6 text-muted-foreground" />}
                    title="No B2B orders found"
                    description={
                      search
                        ? "Try a different search term"
                        : "Orders placed by approved business accounts will appear here"
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const badge = PAYMENT_STATUS_BADGE[order.payment_status] ?? {
                  label: order.payment_status,
                  bg: "#F3F4F6",
                  text: "#6B7280",
                }
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-sm">#{order.order_number}</TableCell>
                    <TableCell>
                      <p className="text-sm">{order.buyer_company_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_name || "—"}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{order.buyer_gstin || "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatINR(order.total_amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 border-0 font-medium"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={downloadTaxInvoice.isPending}
                        onClick={() => downloadTaxInvoice.mutate(order.id)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({pagination?.total ?? 0} B2B orders)
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GstInvoicesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <GstInvoicesContent />
    </Suspense>
  )
}
