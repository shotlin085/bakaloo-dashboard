"use client"

/**
 * Empty-shop state — rendered by single-shop pages when no shop is selected.
 *
 * Vendors get a CTA linking to `/select-shop`; super admins get an inline
 * note pointing to the topbar Shop_Switcher. Presentational only — pages pass
 * `isSuperAdmin` from `useIsSuperAdmin()`.
 *
 * Requirements: 4.5, 7.11, 8.1, 9.1, 10.5
 */

import Link from "next/link"
import { Store } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface EmptyShopStateProps {
  /** When true, render the super-admin hint instead of the vendor CTA. */
  isSuperAdmin?: boolean
  /** Optional title override — defaults to `t("emptyShop.title")`. */
  title?: string
  /** Optional description override — defaults to `t("emptyShop.description")`. */
  description?: string
  className?: string
}

export function EmptyShopState({
  isSuperAdmin = false,
  title,
  description,
  className,
}: EmptyShopStateProps) {
  const resolvedTitle = title ?? t("emptyShop.title")
  const resolvedDescription = description ?? t("emptyShop.description")

  return (
    <Card className={cn("mx-auto max-w-xl", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Store
            className="h-6 w-6 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        <h3 className="text-base font-semibold text-foreground">
          {resolvedTitle}
        </h3>

        <p className="max-w-md text-sm text-muted-foreground">
          {resolvedDescription}
        </p>

        {isSuperAdmin ? (
          <p className="text-sm text-muted-foreground">
            {t("emptyShop.action.superAdmin")}
          </p>
        ) : (
          <Button asChild size="sm" className="mt-1">
            <Link href="/select-shop">{t("emptyShop.action.vendor")}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
