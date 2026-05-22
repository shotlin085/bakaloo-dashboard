"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useOrdersByHour } from "@/hooks/useDashboard"
import { Skeleton } from "@/components/ui/skeleton"

export function OrdersByHourChart() {
  const { data, isLoading, isError } = useOrdersByHour()

  // Find peak hour
  const peakHour = data?.reduce(
    (max, d) => (d.orders > max.orders ? d : max),
    { hour: 0, orders: 0 }
  )

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Orders by Hour</CardTitle>
          {peakHour && peakHour.orders > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Peak: {peakHour.hour}:00 ({peakHour.orders} orders)
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-[240px] w-full rounded-lg" />
        ) : isError || !data?.length ? (
          <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
            No hourly data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#6B7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(h) => `${h}h`}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6B7280" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1F2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                }}
                labelFormatter={(h) => `${h}:00 - ${h}:59`}
                formatter={(value: number | undefined) => [value ?? 0, "Orders"]}
              />
              <Bar dataKey="orders" radius={[4, 4, 0, 0]} maxBarSize={20}>
                {data.map((entry) => (
                  <Cell
                    key={entry.hour}
                    fill={
                      entry.hour === peakHour?.hour
                        ? "#1A7A3C"
                        : "#A5D6A7"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
