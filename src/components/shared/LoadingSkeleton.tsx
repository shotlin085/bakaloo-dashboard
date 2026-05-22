"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingSkeletonProps {
  variant?: "stat-card" | "chart" | "table" | "list"
  count?: number
  className?: string
}

export function LoadingSkeleton({ variant = "chart", count = 1, className }: LoadingSkeletonProps) {
  if (variant === "stat-card") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-28" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === "chart") {
    return (
      <div className={cn("rounded-xl border bg-card p-5 space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
    )
  }

  if (variant === "table") {
    return (
      <div className={cn("rounded-xl border bg-card p-5 space-y-3", className)}>
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  // list variant
  return (
    <div className={cn("rounded-xl border bg-card p-5 space-y-3", className)}>
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Single skeleton card — for wrapping individual widgets */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 animate-pulse", className)}>
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    </div>
  )
}
