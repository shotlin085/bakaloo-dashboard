"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatShort, formatINR } from "@/lib/utils"
import { CATEGORY_COLORS } from "@/lib/constants"
import { Skeleton } from "@/components/ui/skeleton"

interface CategoryDonutProps {
  data?: { category: string; revenue: number }[]
  isLoading?: boolean
}

export function CategoryDonut({ data, isLoading }: CategoryDonutProps) {
  const total = data?.reduce((sum, d) => sum + d.revenue, 0) ?? 0

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Revenue by Category</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-[260px] w-full rounded-lg" />
        ) : !data?.length ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            No category data
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={240} height={240}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {data.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1F2937",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                    formatter={(value: number | undefined) => [formatINR(value ?? 0), "Revenue"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{formatShort(total)}</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-xs">
              {data.map((item, i) => (
                <div key={item.category} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate">{item.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
