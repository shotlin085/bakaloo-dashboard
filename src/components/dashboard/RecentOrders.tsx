"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatINR, formatRelativeTime } from "@/lib/utils"
import { STATUS_CONFIG, type OrderStatus } from "@/lib/constants"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecentOrder } from "@/types/dashboard.types"

interface RecentOrdersProps {
  data?: RecentOrder[]
  isLoading?: boolean
}

export function RecentOrders({ data, isLoading }: RecentOrdersProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        {data && data.length > 0 && (
          <span className="text-xs text-muted-foreground">{data.length} latest</span>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No recent orders
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-2">
            <div className="space-y-1">
              {data.map((order) => {
                const status = STATUS_CONFIG[order.status as OrderStatus] ?? {
                  label: order.status,
                  bg: "#F3F4F6",
                  text: "#6B7280",
                }

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2.5 border-b last:border-0 animate-fade-in"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          #{order.order_number}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-5 font-medium border-0"
                          style={{
                            backgroundColor: status.bg,
                            color: status.text,
                          }}
                        >
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">
                          {order.customer_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {order.item_count} items
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold text-foreground">
                        {formatINR(order.total_amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(order.created_at)}
                      </p>
                    </div>
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
