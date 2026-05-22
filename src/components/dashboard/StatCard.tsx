"use client"

import { cn, formatTrend } from "@/lib/utils"
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts"

interface StatCardProps {
  label: string
  value: string
  change?: number
  sparkline?: number[]
  icon: React.ReactNode
  variant?: "primary" | "default"
  className?: string
}

export function StatCard({
  label,
  value,
  change,
  sparkline,
  icon,
  variant = "default",
  className,
}: StatCardProps) {
  const trend = change !== undefined ? formatTrend(change) : null
  const isPrimary = variant === "primary"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:shadow-md",
        isPrimary
          ? "stat-card-primary text-white"
          : "bg-card border shadow-sm",
        className
      )}
    >
      {/* Header: Label + Icon */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wider",
            isPrimary ? "text-white/80" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isPrimary ? "bg-white/20" : "bg-brand-50"
          )}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div
        className={cn(
          "text-2xl font-bold tracking-tight",
          isPrimary ? "text-white" : "text-foreground"
        )}
      >
        {value}
      </div>

      {/* Trend + Sparkline row */}
      <div className="flex items-center justify-between mt-2">
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              isPrimary
                ? "text-white/90"
                : trend.isPositive
                ? "text-success"
                : "text-danger"
            )}
          >
            {trend.text}{" "}
            <span
              className={cn(
                "font-normal",
                isPrimary ? "text-white/60" : "text-muted-foreground"
              )}
            >
              vs last period
            </span>
          </span>
        )}

        {/* Mini Sparkline */}
        {sparkline && sparkline.length > 1 && (
          <div className="h-8 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline.map((v, i) => ({ v, i }))}>
                <defs>
                  <linearGradient id={`spark-${isPrimary ? "w" : "g"}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isPrimary ? "#ffffff" : "#1A7A3C"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={isPrimary ? "#ffffff" : "#1A7A3C"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={isPrimary ? "#ffffff" : "#1A7A3C"}
                  strokeWidth={1.5}
                  fill={`url(#spark-${isPrimary ? "w" : "g"})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
