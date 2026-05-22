"use client"

import { useState } from "react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { formatShort, formatINR } from "@/lib/utils"
import { useRevenueChart } from "@/hooks/useDashboard"

const PERIOD_MAP = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
} as const

export function RevenueVsOrders() {
  const [period, setPeriod] = useState<keyof typeof PERIOD_MAP>("30D")
  const { data, isLoading, isError } = useRevenueChart(PERIOD_MAP[period])

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Revenue vs Orders</CardTitle>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as keyof typeof PERIOD_MAP)}>
          <TabsList className="h-8">
            {Object.keys(PERIOD_MAP).map((p) => (
              <TabsTrigger key={p} value={p} className="text-xs px-3 h-7">
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full rounded-lg" />
        ) : isError || !data?.length ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  const d = new Date(val)
                  return `${d.getDate()}/${d.getMonth() + 1}`
                }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => formatShort(val).replace("₹", "")}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tick={{ fontSize: 11, fill: "#8B5CF6" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1F2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  if (name === "revenue") return [formatINR(value ?? 0), "Revenue"]
                  return [value ?? 0, "Orders"]
                }}
                labelFormatter={(label) => {
                  const d = new Date(label)
                  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                name="Revenue"
                fill="#1A7A3C"
                fillOpacity={0.7}
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "#8B5CF6", strokeWidth: 2, fill: "#fff" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
