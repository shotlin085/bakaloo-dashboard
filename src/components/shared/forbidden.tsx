"use client"

/**
 * 403 fallback — rendered by guarded layouts when the active user fails the
 * route's RBAC guard.
 *
 * Per Req 4.3 / 4.4 the dashboard MUST render a "Not authorized" page in
 * place of the underlying screen and MUST keep the underlying API request
 * from being issued. The intended call site is the guarded layout (or page)
 * itself, which short-circuits before the data hooks run:
 *
 * ```tsx
 * // app/(dashboard)/shops/layout.tsx
 * "use client"
 * import { usePathname } from "next/navigation"
 * import { useRouteRBAC } from "@/hooks/useRBAC"
 * import { Forbidden } from "@/components/shared/forbidden"
 *
 * export default function ShopsLayout({ children }: { children: React.ReactNode }) {
 *   const pathname = usePathname()
 *   const { isAuthorized } = useRouteRBAC(pathname)
 *   if (!isAuthorized) return <Forbidden />
 *   return <>{children}</>
 * }
 * ```
 *
 * Because the guarded layout returns `<Forbidden />` *before* mounting the
 * page subtree, the page-level TanStack Query hooks never run and no
 * outbound `/api/v1/*` request is made.
 *
 * Read-only Shop_Viewer pages additionally hide write affordances via
 * `useRouteRBAC().canWrite` — see Req 4.4.
 *
 * Requirements: 4.3, 4.4
 */

import Link from "next/link"
import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface ForbiddenProps {
  /**
   * Optional override for the description body. Defaults to
   * `t("forbidden.description")` ("You do not have permission to view this
   * page.").
   */
  message?: string
  /**
   * Optional override for the back-link target. Defaults to `"/dashboard"`,
   * which is the dashboard home for both vendor and super-admin users.
   */
  backHref?: string
  className?: string
}

/**
 * "Not authorized" fallback used by the App Router for guarded routes.
 *
 * Rendered as an `role="alert"` region so screen readers announce the gating
 * decision immediately. Does NOT trigger any API request — every value it
 * displays is local.
 */
export function Forbidden({
  message,
  backHref = "/dashboard",
  className,
}: ForbiddenProps) {
  const resolvedMessage = message ?? t("forbidden.description")

  return (
    <Card
      role="alert"
      aria-live="polite"
      className={cn("mx-auto max-w-xl border-destructive/30", className)}
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert
            className="h-6 w-6 text-destructive"
            aria-hidden="true"
          />
        </div>

        <h2 className="text-base font-semibold text-foreground">
          {t("forbidden.title")}
        </h2>

        <p className="max-w-md text-sm text-muted-foreground">
          {resolvedMessage}
        </p>

        <Button asChild size="sm" variant="outline" className="mt-1">
          <Link href={backHref}>{t("forbidden.back")}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
