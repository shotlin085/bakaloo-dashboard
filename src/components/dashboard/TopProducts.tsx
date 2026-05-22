"use client"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useTopProducts } from "@/hooks/useDashboard"
import { formatINR, formatNumberShort } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Package } from "lucide-react"

export function TopProducts() {
  const { data, isLoading, isError } = useTopProducts(5)

  const maxUnits = data?.[0]?.units_sold ?? 1

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Products</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : isError || !data?.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No product data available
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((product, idx) => (
              <div key={product.id} className="flex items-center gap-3">
                {/* Rank badge */}
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {idx + 1}
                </div>

                {/* Product image */}
                <div className="relative h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {product.thumbnail_url ? (
                    <Image
                      src={product.thumbnail_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Name + Progress bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress
                      value={(product.units_sold / maxUnits) * 100}
                      className="h-1.5 flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatNumberShort(product.units_sold)} sold
                    </span>
                  </div>
                </div>

                {/* Revenue */}
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  {formatINR(product.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
