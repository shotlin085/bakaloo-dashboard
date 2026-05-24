"use client"

/**
 * Time-series chart for the Shop_Financials_UI page (task 9.3).
 *
 * Renders an `<AreaChart>` with two series (`gross_revenue`, `net_revenue`)
 * from Recharts. Lives in its own file so the parent page can load it via
 * `next/dynamic({ ssr: false })` and keep Recharts out of the initial JS
 * bundle (design §15 — performance budget).
 *
 * Dataset is capped at 365 points/series before render — both because the
 * design budget calls for it (Req 14.7) and because Recharts performance
 * degrades quickly past that threshold for `<AreaChart>`.
 *
 * Validates: Requirements 8.5, 14.7
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatCurrency, formatDate, t } from "@/lib/i18n"

/**
 * Single data point for the chart. `period_start` is an ISO date string used
 * both as the X-axis label and as the React key per point.
 */
export interface FinancialsChartDatum {
  period_start: string
  gross_revenue: number
  net_revenue: number
}

export interface FinancialsChartProps {
  data: FinancialsChartDatum[]
}

/** Hard cap on the number of points/series rendered (Req 14.7). */
const MAX_POINTS = 365

/**
 * Best-effort short label for the X axis. Falls back to the raw period_start
 * when the value is not a parseable date.
 */
function tickFormatter(value: string): string {
  try {
    return formatDate(value, "short")
  } catch {
    return value
  }
}

export default function FinancialsChart({ data }: FinancialsChartProps) {
  // Guard against very large series — slice rather than reject so a partial
  // chart still renders if the backend ever returns more rows than the cap.
  const capped = data.length > MAX_POINTS ? data.slice(0, MAX_POINTS) : data

  return (
    <ResponsiveContainer width="100%" height={280} minHeight={240}>
      <AreaChart
        data={capped}
        margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="gross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A7A3C" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#1A7A3C" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="net" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="period_start"
          tick={{ fontSize: 11, fill: "#6B7280" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFormatter}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6B7280" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
          }
          width={56}
        />
        <Tooltip
          contentStyle={{
            background: "#1F2937",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
          }}
          formatter={(value: number | undefined, name) => {
            const label =
              name === "gross_revenue"
                ? t("shopFinancials.kpi.grossRevenue")
                : t("shopFinancials.kpi.netRevenue")
            return [formatCurrency(value ?? 0), label]
          }}
          labelFormatter={(label) => {
            if (typeof label !== "string") return null
            try {
              return formatDate(label, "long")
            } catch {
              return label
            }
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(name) =>
            name === "gross_revenue"
              ? t("shopFinancials.kpi.grossRevenue")
              : t("shopFinancials.kpi.netRevenue")
          }
        />
        <Area
          type="monotone"
          dataKey="gross_revenue"
          stroke="#1A7A3C"
          strokeWidth={2}
          fill="url(#gross)"
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="net_revenue"
          stroke="#8B5CF6"
          strokeWidth={2}
          fill="url(#net)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
