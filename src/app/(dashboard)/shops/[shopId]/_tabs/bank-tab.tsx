"use client"

/**
 * Shop detail — Bank Details tab.
 *
 * Renders the shop's payout bank details with the account number masked
 * to its last four digits. The full account number is never displayed —
 * even super admins must look it up server-side if they need the full
 * value.
 *
 * Pure presentation — receives a `Shop` prop and renders it.
 *
 * Requirements: 5.7
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Shop } from "@/types"

export interface BankTabProps {
  shop: Shop
}

/**
 * Mask an account number, leaving only the last four digits visible.
 * Returns "—" for empty / nullish inputs and bullets for short strings.
 *
 * Pads the masked portion to a maximum of 8 dots so the bullet count
 * doesn't accidentally leak account-number length for very long inputs.
 */
export function maskAccountNumber(value: string | null | undefined): string {
  if (!value) return "—"
  const trimmed = value.trim()
  if (trimmed.length === 0) return "—"
  if (trimmed.length <= 4) return "•".repeat(trimmed.length)
  const tail = trimmed.slice(-4)
  const maskedLen = Math.min(trimmed.length - 4, 8)
  return `${"•".repeat(maskedLen)} ${tail}`
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

export function BankTab({ shop }: BankTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bank details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Account number"
            value={maskAccountNumber(shop.bank_account_number)}
            mono
          />
          <Field label="IFSC" value={shop.bank_ifsc} mono />
          <Field label="Bank name" value={shop.bank_name} />
          <Field label="Holder name" value={shop.bank_holder_name} />
        </div>
      </CardContent>
    </Card>
  )
}
