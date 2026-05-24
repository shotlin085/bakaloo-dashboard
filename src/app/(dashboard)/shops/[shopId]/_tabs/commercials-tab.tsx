"use client"

/**
 * Shop detail — Commercials tab.
 *
 * Renders the shop's commercial settings: commission rate, GST number,
 * PAN number. Pure presentation — receives a `Shop` prop and renders it.
 *
 * Requirements: 5.7
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Shop } from "@/types"

export interface CommercialsTabProps {
  shop: Shop
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode | null | undefined
  mono?: boolean
}) {
  const isEmpty = value === null || value === undefined || value === ""
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={mono ? "font-mono text-sm" : "text-sm"}>
        {isEmpty ? "—" : value}
      </span>
    </div>
  )
}

export function CommercialsTab({ shop }: CommercialsTabProps) {
  const commission =
    typeof shop.commission_rate === "number"
      ? `${shop.commission_rate.toFixed(2)}%`
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commercial settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Commission rate" value={commission} />
          <Field label="GST number" value={shop.gst_number} mono />
          <Field label="PAN number" value={shop.pan_number} mono />
        </div>
      </CardContent>
    </Card>
  )
}
