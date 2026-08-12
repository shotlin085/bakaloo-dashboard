"use client"

/**
 * GSTR-1 — B2CS + HSN Summary (business-wide, single GSTIN).
 *
 * Consumes `/api/v1/admin/gstr1/*`. Not shop-scoped — deliberately one
 * report across the whole business (see useGstr1.ts). Follows the same
 * conventions as /analytics: React Query hooks + service functions,
 * shadcn Table/Card/Skeleton, and the blob-download pattern already used
 * across this dashboard for CSV/PDF/Excel exports.
 */

import { Suspense, useState } from "react"
import { Download, Loader2, FileSpreadsheet, CalendarClock, AlertTriangle } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { GstPeriodPicker, defaultGstr1Period } from "@/components/gstr1/GstPeriodPicker"
import { useGstr1Period, useGstr1B2CS, useGstr1HsnSummary } from "@/hooks/useGstr1"
import { exportGstr1Excel } from "@/services/gstr1.service"
import { formatINR } from "@/lib/utils"
import type { Gstr1PeriodParams } from "@/types/gstr1.types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function Gstr1Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Gstr1Content />
    </Suspense>
  )
}

function Gstr1Content() {
  const [period, setPeriod] = useState<Gstr1PeriodParams>(defaultGstr1Period())
  const [exporting, setExporting] = useState(false)

  const { data: resolvedPeriod, isLoading: periodLoading } = useGstr1Period(period)
  const { data: b2cs, isLoading: b2csLoading } = useGstr1B2CS(period)
  const { data: hsnRows, isLoading: hsnLoading } = useGstr1HsnSummary(period)

  async function handleExportExcel() {
    setExporting(true)
    try {
      const blob = await exportGstr1Excel(period)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `gstr1-${resolvedPeriod?.startDate ?? "period"}-to-${resolvedPeriod?.endDate ?? ""}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      /* silent — matches the analytics export button's error handling */
    } finally {
      setExporting(false)
    }
  }

  const b2csTotal = (b2cs?.rows ?? []).reduce((sum, r) => sum + r.taxableValue, 0)
  const excluded = b2cs?.excludedB2CL ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title="GSTR-1"
        subtitle="B2CS and HSN Summary for the selected filing period"
      >
        <Button onClick={handleExportExcel} disabled={exporting || periodLoading}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          {exporting ? "Exporting..." : "Excel"}
        </Button>
      </PageHeader>

      <GstPeriodPicker value={period} onChange={setPeriod} />

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-muted-foreground shrink-0" />
          {periodLoading || !resolvedPeriod ? (
            <Skeleton className="h-5 w-64" />
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-muted-foreground">Filing period: </span>
                <span className="font-medium">
                  {formatDate(resolvedPeriod.startDate)} – {formatDate(resolvedPeriod.endDate)}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Filing frequency: </span>
                <Badge variant="outline">{resolvedPeriod.filingFrequency}</Badge>
              </span>
              <span>
                <span className="text-muted-foreground">Due date: </span>
                <span className="font-medium text-amber-700">{formatDate(resolvedPeriod.dueDate)}</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {excluded.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">
                {excluded.length} interstate order{excluded.length > 1 ? "s" : ""} excluded from B2CS
              </p>
              <p className="text-amber-800">
                Taxable value over ₹1,00,000 to a different state must be filed individually under
                GSTR-1 Table 5 (B2CL), not consolidated here. Total excluded:{" "}
                {formatINR(excluded.reduce((sum, r) => sum + r.taxableValue, 0))}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            B2CS — B2C Small (state + rate wise)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {b2csLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : !b2cs?.rows.length ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No B2C orders in this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Place Of Supply</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {b2cs.rows.map((row) => (
                    <TableRow key={`${row.placeOfSupply}-${row.rate}`}>
                      <TableCell>{row.placeOfSupply}</TableCell>
                      <TableCell>{row.rate}%</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(row.taxableValue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(b2csTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            HSN Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {hsnLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : !hsnRows?.length ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No order items in this period
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>UQC</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">IGST</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hsnRows.map((row) => (
                      <TableRow key={`${row.hsn}-${row.uqc}-${row.rate}`}>
                        <TableCell>{row.hsn}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                        <TableCell>{row.uqc}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                        <TableCell>{row.rate}%</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(row.taxableValue)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(row.igst)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(row.cgst)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(row.sgst)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                HSN Summary tax amounts are computed per product&apos;s configured GST rate and may not
                equal the GST actually collected (see B2CS above), which is charged as one flat rate
                per order at checkout.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
