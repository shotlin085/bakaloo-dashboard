"use client"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLowStockAlerts } from "@/hooks/useDashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, Package } from "lucide-react"

export function LowStockAlerts() {
  const { data, isLoading, isError } = useLowStockAlerts()

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <CardTitle className="text-base font-semibold">Low Stock Alerts</CardTitle>
        </div>
        {data && data.length > 0 && (
          <Badge variant="outline" className="bg-warning-bg text-warning border-0 text-xs"
            style={{ backgroundColor: "#FFFBEB", color: "#F59E0B" }}>
            {data.length} items
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError || !data?.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            All products are well stocked
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-1">
              {data
                .sort((a, b) => a.stock_quantity - b.stock_quantity)
                .map((item) => {
                  const isOutOfStock = item.stock_quantity === 0
                  const isCritical = item.stock_quantity <= 3

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    >
                      {/* Product image */}
                      <div className="relative h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {item.thumbnail_url ? (
                          <Image
                            src={item.thumbnail_url}
                            alt={item.name}
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

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.category} · Threshold: {item.low_stock_threshold}
                        </p>
                      </div>

                      {/* Stock count */}
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold border-0 px-2"
                        style={{
                          backgroundColor: isOutOfStock
                            ? "#FEF2F2"
                            : isCritical
                            ? "#FFFBEB"
                            : "#EFF6FF",
                          color: isOutOfStock
                            ? "#EF4444"
                            : isCritical
                            ? "#F59E0B"
                            : "#3B82F6",
                        }}
                      >
                        {item.stock_quantity}
                      </Badge>
                    </div>
                  )
                })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
