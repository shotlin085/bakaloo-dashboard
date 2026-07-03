"use client"

import { useState } from "react"
import Image from "next/image"
import { Gift, ListOrdered, Plus, Power } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useBundles, useUpdateCategory } from "@/hooks/useCategories"
import { BundleDialog } from "./BundleDialog"
import { ProductRankingPanel } from "./ProductRankingPanel"
import type { Category } from "@/types"

export function BundlesTab({ canManage }: { canManage: boolean }) {
  const { data: bundles, isLoading } = useBundles()
  const updateCategory = useUpdateCategory()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rankingFor, setRankingFor] = useState<Category | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Group a few products into one promo offer, then link a banner to it — bundles never
          appear in the normal category list.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Bundle
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : !bundles || bundles.length === 0 ? (
        <Card className="p-12 text-center">
          <Gift className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No bundles yet</p>
          {canManage && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create your first bundle
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <Card key={bundle.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="relative h-12 w-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {bundle.image_url ? (
                    <Image
                      src={bundle.image_url}
                      alt={bundle.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Gift className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bundle.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {bundle.description || "No description"}
                  </p>
                </div>
                {!bundle.is_active && (
                  <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {bundle.product_count ?? 0} products
                </Badge>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        updateCategory.mutate({
                          id: bundle.id,
                          payload: { is_active: !bundle.is_active },
                        })
                      }
                    >
                      <Power className="h-3.5 w-3.5 mr-1" />
                      {bundle.is_active ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setRankingFor(bundle)}
                    >
                      <ListOrdered className="h-3.5 w-3.5 mr-1" />
                      Products
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <BundleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <ProductRankingPanel category={rankingFor} onClose={() => setRankingFor(null)} />
    </div>
  )
}
