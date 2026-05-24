"use client"

/**
 * Shop_Selector card subcomponent.
 *
 * Renders a single `ShopAssignment` as a card with the shop's name,
 * branch code, city, a localized role badge, and an "Enter shop" CTA
 * that calls `onSelect(shop)`. While the parent reports `isSelecting`,
 * the button shows a loading spinner and disables itself so the user
 * cannot trigger a duplicate `selectShop` mutation.
 *
 * Inactive shops (`shop.isActive === false`) render with a muted style
 * and a disabled button labeled "Inactive" — selecting them would only
 * surface a backend rejection.
 *
 * Requirements: 2.1, 2.6
 * Design: design.md §"Folder & Module Layout" → select-shop/_components
 */

import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { ShopAssignment } from "@/types/auth.types"

export interface ShopCardProps {
  /** The shop assignment to render. */
  shop: ShopAssignment
  /** Invoked when the user clicks "Enter shop". */
  onSelect: (shop: ShopAssignment) => void
  /**
   * When true, the CTA shows a spinner and is disabled. The parent flips
   * this on for the card whose `selectShop` mutation is in flight.
   */
  isSelecting?: boolean
}

export function ShopCard({ shop, onSelect, isSelecting = false }: ShopCardProps) {
  const isInactive = !shop.isActive
  const isDisabled = isSelecting || isInactive

  return (
    <Card
      data-testid="shop-card"
      data-shop-id={shop.id}
      className={cn(
        "flex flex-col transition-shadow",
        isInactive ? "opacity-60" : "hover:shadow-md",
      )}
      aria-disabled={isInactive || undefined}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base">{shop.name}</CardTitle>
            <CardDescription className="truncate">
              {shop.branchCode}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {t(`shopStaff.invite.role.${shop.role}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground">
        {shop.city}
      </CardContent>

      <CardFooter className="mt-auto pt-2">
        <Button
          type="button"
          className="w-full"
          onClick={() => onSelect(shop)}
          disabled={isDisabled}
          aria-busy={isSelecting || undefined}
        >
          {isSelecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Entering…</span>
            </>
          ) : isInactive ? (
            "Inactive"
          ) : (
            "Enter shop"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
