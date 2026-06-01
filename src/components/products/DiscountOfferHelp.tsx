"use client"

/**
 * DiscountOfferHelp — a compact, reusable explainer that disambiguates the
 * four discount/offer concepts a grocery operator deals with. Rendered on the
 * product family detail page and (optionally) the product form so admins
 * understand which lever to pull.
 *
 * This is pure presentational guidance — it stores nothing and calls no API.
 * Coupons remain a separate checkout-level system; we intentionally do NOT
 * couple product setup to coupon architecture here.
 */

import { BadgePercent, Sparkles, Tag, Ticket } from "lucide-react"

interface HelpRow {
  icon: typeof Tag
  title: string
  body: string
  accent: string
}

const ROWS: HelpRow[] = [
  {
    icon: Tag,
    title: "Sale Price",
    body: "The visible product discount. Example: MRP ₹40 → Sale ₹35. Shows a struck-through MRP and the discount on the product card.",
    accent: "text-emerald-600",
  },
  {
    icon: BadgePercent,
    title: "Value Pack",
    body: "An option-level price advantage — e.g. 2kg is cheaper per unit than two 1kg packs. Highlight it with a badge like “Best Value” or “Value Pack”.",
    accent: "text-blue-600",
  },
  {
    icon: Sparkles,
    title: "Marketing Badge",
    body: "Display text only — Best Deal, Imported, Organic. Purely cosmetic labels; they do not change price.",
    accent: "text-amber-600",
  },
  {
    icon: Ticket,
    title: "Coupon / Voucher",
    body: "A checkout-level discount applied with a code. Managed separately in the Coupons section — not part of product pricing.",
    accent: "text-purple-600",
  },
]

export function DiscountOfferHelp() {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">Pricing, discounts &amp; offers</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Four different levers — pick the right one for the effect you want.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROWS.map((row) => {
          const Icon = row.icon
          return (
            <div
              key={row.title}
              className="flex gap-2.5 rounded-md border bg-card p-3"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${row.accent}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {row.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {row.body}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DiscountOfferHelp
