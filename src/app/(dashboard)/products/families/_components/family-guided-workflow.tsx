"use client"

/**
 * FamilyGuidedWorkflow — a lightweight, guided panel shown on the product
 * family detail page so a non-technical grocery operator can set up a
 * multi-option product (e.g. Atta 500g / 1kg / 2kg) without guessing.
 *
 * It composes existing building blocks rather than reinventing the product
 * form:
 *   Step 1 (Family details) — already done on this page (name/category/image).
 *   Step 2 (Options)        — quick presets deep-link to the full product form
 *                             pre-filled with this family + option label.
 *   Step 3 (Assign to store)— contextual guidance based on the active shop.
 *   Step 4 (Mobile preview) — links to the live app preview affordances.
 *
 * No new API surface — every action routes to flows that already exist.
 */

import Link from "next/link"
import { Layers, Plus, Smartphone, Store } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useShopContext } from "@/hooks/useShopContext"
import { DiscountOfferHelp } from "@/components/products/DiscountOfferHelp"

/** Common grocery option presets (TASK 4 quick presets). */
const OPTION_PRESETS = [
  "100g",
  "250g",
  "500g",
  "1kg",
  "2kg",
  "5kg",
  "Pack of 2",
  "Pack of 4",
] as const

interface Props {
  familyId: string
  familyName: string
}

export function FamilyGuidedWorkflow({ familyId, familyName }: Props) {
  const { mode, shopMeta } = useShopContext()
  const hasActiveShop = mode === "STORE_MODE" && Boolean(shopMeta)

  const optionHref = (label?: string) => {
    const params = new URLSearchParams({
      familyId,
      familyName,
    })
    if (label) params.set("optionLabel", label)
    return `/products/new?${params.toString()}`
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Layers className="h-4 w-4 text-brand-600" />
        <h3 className="text-base font-semibold">Guided setup</h3>
      </div>

      <ol className="space-y-4">
        {/* Step 2 — Options (Step 1 family details is the card above) */}
        <li className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              Step 2
            </Badge>
            <span className="text-sm font-semibold">Add options</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Each size/pack is a separate option with its own price &amp; sale
            price. Tap a preset to create one pre-labelled, or add a custom
            option.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPTION_PRESETS.map((label) => (
              <Link key={label} href={optionHref(label)}>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  {label}
                </Button>
              </Link>
            ))}
            <Link href={optionHref()}>
              <Button type="button" size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Custom option
              </Button>
            </Link>
          </div>
        </li>

        {/* Step 3 — Assign to store */}
        <li className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              Step 3
            </Badge>
            <span className="text-sm font-semibold">Assign to store</span>
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {hasActiveShop ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Active store:{" "}
                <span className="font-medium text-foreground">
                  {shopMeta?.name}
                </span>
                . Assign options and set their store price, sale price, stock,
                and max order quantity. Only this selected store will receive
                these options.
              </p>
              <Link href="/shop-products" className="mt-3 inline-block">
                <Button type="button" variant="outline" size="sm">
                  <Store className="mr-1 h-3.5 w-3.5" />
                  Open store inventory
                </Button>
              </Link>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              No store selected — you&apos;re creating master catalog options
              only. Switch to a store from the top bar to assign these options
              and set store-specific pricing &amp; stock.
            </p>
          )}
        </li>

        {/* Step 4 — Mobile preview */}
        <li className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              Step 4
            </Badge>
            <span className="text-sm font-semibold">Preview on mobile</span>
            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Customers see one card for &ldquo;{familyName}&rdquo; with an
            &ldquo;N options&rdquo; label. Tapping ADD opens the option sheet
            with each size, its price, and any discount. Single-option products
            add directly.
          </p>
        </li>
      </ol>

      <div className="mt-5">
        <DiscountOfferHelp />
      </div>
    </Card>
  )
}

export default FamilyGuidedWorkflow
