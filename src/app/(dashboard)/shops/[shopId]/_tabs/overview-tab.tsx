"use client"

/**
 * Shop detail — Overview tab.
 *
 * Renders shop identity (description + assets) plus the contact block
 * (phone, email, whatsapp) and a compact summary of the address. Heavy
 * commercial / bank / service-area surfaces live in their own tabs.
 *
 * Pure presentation — receives a `Shop` prop and renders it. No data
 * fetching, no mutations, no user input.
 *
 * Requirements: 5.7
 */

import Image from "next/image"
import { Mail, MessageCircle, Phone } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Shop } from "@/types"

export interface OverviewTabProps {
  shop: Shop
}

/** Render a label/value pair with sensible em-dash fallback. */
function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode | null | undefined
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">
        {value === null || value === undefined || value === "" ? "—" : value}
      </span>
    </div>
  )
}

export function OverviewTab({ shop }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* About / identity ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {shop.banner_url ? (
            <div className="relative h-28 w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={shop.banner_url}
                alt={`${shop.name} banner`}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={shop.logo_url}
                  alt={`${shop.name} logo`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{shop.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {shop.slug}
              </p>
            </div>
          </div>

          {shop.description ? (
            <p className="text-sm text-muted-foreground">{shop.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description provided.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Contact + address ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Phone
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{shop.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{shop.email || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{shop.whatsapp || "—"}</span>
          </div>

          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Address
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Line 1" value={shop.address_line1} />
              <Field label="Line 2" value={shop.address_line2} />
              <Field label="City" value={shop.city} />
              <Field label="State" value={shop.state} />
              <Field label="Pincode" value={shop.pincode} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
