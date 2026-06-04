"use client"

/**
 * FamilyOptionsPanel — read-only panel shown on the product edit screen
 * for products that belong to a family. Lists sibling options with their
 * key info so admins can see at a glance how the family is structured.
 *
 * Data source: GET /api/v1/products/:id/options (Phase 1 backend)
 */

import Link from "next/link"
import Image from "next/image"
import { Edit, ExternalLink, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProductOptions } from "@/hooks/useProductFamilies"

interface FamilyOptionsPanelProps {
  productId: string
  familyId: string | null | undefined
  familyName?: string | null
}

export function FamilyOptionsPanel({
  productId,
  familyId,
  familyName,
}: FamilyOptionsPanelProps) {
  const { data, isLoading } = useProductOptions(productId)

  if (!familyId) return null

  const options = data?.options ?? []

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Options in this family</h3>
          <p className="text-xs text-muted-foreground">
            Each option is a separate product. Cart and checkout use the
            exact selected option.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={
              familyId
                ? `/products/families/${familyId}`
                : "/products/families"
            }
          >
            <Button type="button" size="sm" variant="ghost">
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Family manager
            </Button>
          </Link>
          <Link
            href={
              familyId
                ? `/products/new?familyId=${familyId}`
                : "/products/new"
            }
          >
            <Button type="button" size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add option
            </Button>
          </Link>
        </div>
      </div>

      {familyName && (
        <p className="mb-3 text-sm text-muted-foreground">
          Family:{" "}
          <span className="font-medium text-foreground">{familyName}</span>
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : options.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-dashed py-8 text-sm text-muted-foreground">
          No sibling options yet. Click &quot;Add option&quot; to create another size or pack.
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((opt) => {
            const isCurrent = opt.id === productId
            const price =
              (opt.effective_price as number | undefined) ??
              opt.sale_price ??
              opt.price
            const original =
              opt.sale_price && opt.sale_price < opt.price ? opt.price : null
            return (
              <div
                key={opt.id}
                className="flex items-center gap-3 rounded-md border bg-card p-2"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {opt.thumbnail_url ? (
                    <Image
                      src={opt.thumbnail_url}
                      alt={opt.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {opt.name}
                    </span>
                    {opt.is_default_option && (
                      <Badge variant="default" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge variant="outline" className="text-[10px]">
                        Editing
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {opt.option_label && <span>{opt.option_label}</span>}
                    <span>
                      ₹{Number(price).toFixed(0)}
                      {original && (
                        <span className="ml-1 line-through">
                          ₹{Number(original).toFixed(0)}
                        </span>
                      )}
                    </span>
                    {opt.food_type && opt.food_type !== "NONE" && (
                      <span>{opt.food_type}</span>
                    )}
                    {opt.origin_tag && opt.origin_tag !== "NONE" && (
                      <span>{opt.origin_tag}</span>
                    )}
                  </div>
                </div>
                {!isCurrent && (
                  <Link href={`/products/${opt.id}/edit`}>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Edit option"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
