"use client"

import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatShort, formatINR } from "@/lib/utils"
import { useRevenueChart } from "@/hooks/useDashboard"
import { Skeleton } from "@/components/ui/skeleton"

const PERIOD_MAP = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
} as const

export function RevenueChart() {
  const [period, setPeriod] = useState<keyof typeof PERIOD_MAP>("30D")
  const { data, isLoading, isError } = useRevenueChart(PERIOD_MAP[period])

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
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
            No revenue data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1A7A3C" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#1A7A3C" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => formatShort(val).replace("₹", "")}
              />
              <Tooltip
                contentStyle={{
                  background: "#1F2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                }}
                labelStyle={{ color: "#9CA3AF" }}
                formatter={(value: number | undefined) => [formatINR(value ?? 0), "Revenue"]}
                labelFormatter={(label) => {
                  const d = new Date(label)
                  return d.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#1A7A3C"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#1A7A3C", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
