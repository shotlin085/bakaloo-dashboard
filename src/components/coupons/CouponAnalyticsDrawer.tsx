"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useCouponAnalytics } from "@/hooks/useCoupons"
import type { Coupon } from "@/types/coupon.types"

interface Props {
  coupon: Coupon | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export function CouponAnalyticsDrawer({ coupon, open, onOpenChange }: Props) {
  const { data: analytics, isLoading } = useCouponAnalytics(open ? coupon?.id ?? null : null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            Analytics
            {coupon && (
              <Badge variant="outline" className="font-mono">
                {coupon.code}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Redemptions</p>
                  <p className="text-xl font-bold">{analytics.totalRedemptions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">{formatINR(analytics.revenueGenerated)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Avg. Order Value</p>
                  <p className="text-xl font-bold">{formatINR(analytics.avgOrderValue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Conversion</p>
                  <p className="text-xl font-bold">{analytics.conversionRate}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily chart */}
            {analytics.dailyRedemptions.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Daily Redemptions</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={analytics.dailyRedemptions}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12 }}
                        formatter={(val: unknown) => [String(val), "Uses"]}
                        labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top users */}
            {analytics.topUsers.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Top Users</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">User</TableHead>
                        <TableHead className="text-xs text-right">Uses</TableHead>
                        <TableHead className="text-xs text-right">Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.topUsers.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{u.name}</TableCell>
                          <TableCell className="text-sm text-right">{u.uses}</TableCell>
                          <TableCell className="text-sm text-right">{formatINR(u.totalSpent)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No analytics data available for this coupon yet.
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
