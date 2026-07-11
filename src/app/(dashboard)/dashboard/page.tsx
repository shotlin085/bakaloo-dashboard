"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import Link from "next/link"
import {
  IndianRupee,
  ShoppingCart,
  Package,
  Users,
  Activity,
  Clock,
  AlertTriangle,
  Bike,
  TrendingUp,
  Banknote,
  RotateCcw,
  ArrowRight,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/dashboard/StatCard"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { RevenueVsOrders } from "@/components/dashboard/RevenueVsOrders"
import { CategoryDonut } from "@/components/dashboard/CategoryDonut"
import { OrdersByHourChart } from "@/components/dashboard/OrdersByHourChart"
import { TopProducts } from "@/components/dashboard/TopProducts"
import { RecentOrders } from "@/components/dashboard/RecentOrders"
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts"
import { PendingActions } from "@/components/dashboard/PendingActions"
import {
  useDashboardStats,
  useLiveStats,
  useRecentOrders,
  useCategoryRevenue,
} from "@/hooks/useDashboard"
import { useAbandonedCartsSummary } from "@/hooks/useAbandonedCarts"
import { formatShort, formatNumberShort } from "@/lib/utils"

// Dynamic import for map — heavy, no SSR
const LiveRiderMap = dynamic(
  () => import("@/components/dashboard/LiveRiderMap").then((m) => m.LiveRiderMap),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-card p-5">
        <div className="h-[300px] animate-shimmer rounded-lg" />
      </div>
    ),
  }
)

type Period = "today" | "week" | "month" | "year"

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("week")
  const { data: stats, isLoading: statsLoading } = useDashboardStats(period)
  const { data: liveStats } = useLiveStats()
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(10)
  const { data: categoryData, isLoading: categoryLoading } = useCategoryRevenue()
  const { data: abandonedSummary } = useAbandonedCartsSummary()

  return (
    <div className="space-y-6">
      {/* Page Header + Period Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your store performance"
        />
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-9">
            <TabsTrigger value="today" className="text-xs px-3">Today</TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-3">This Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-3">This Month</TabsTrigger>
            <TabsTrigger value="year" className="text-xs px-3">This Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Live activity bar */}
      {liveStats && (
        <div className="flex items-center gap-4 rounded-lg bg-brand-50 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-brand-500" />
            <span className="font-medium text-brand-700">Live</span>
          </div>
          <span className="text-brand-600">
            {liveStats.activeOrders} active orders
          </span>
          <span className="text-brand-600">
            {liveStats.onlineRiders} riders online
          </span>
          <span className="text-brand-600 hidden sm:inline">
            Today: {formatShort(liveStats.todayRevenue)} · {liveStats.todayOrders} orders
          </span>
        </div>
      )}

      {/* Stat Cards Row — 10 KPIs */}
      {statsLoading ? (
        <LoadingSkeleton variant="stat-card" count={10} />
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatShort(stats.revenue.value)}
            change={stats.revenue.change}
            sparkline={stats.revenue.sparkline}
            icon={<IndianRupee className="h-4 w-4 text-white" />}
            variant="primary"
          />
          <StatCard
            label="Total Orders"
            value={formatNumberShort(stats.orders.value)}
            change={stats.orders.change}
            sparkline={stats.orders.sparkline}
            icon={<ShoppingCart className="h-4 w-4 text-brand-500" />}
          />
          <StatCard
            label="Products"
            value={formatNumberShort(stats.products.value)}
            change={stats.products.change}
            icon={<Package className="h-4 w-4 text-brand-500" />}
          />
          <StatCard
            label="Customers"
            value={formatNumberShort(stats.customers.value)}
            change={stats.customers.change}
            icon={<Users className="h-4 w-4 text-brand-500" />}
          />
          <StatCard
            label="Pending Orders"
            value={formatNumberShort(liveStats?.activeOrders ?? stats.pendingOrders)}
            icon={<Clock className="h-4 w-4 text-amber-500" />}
          />
          <StatCard
            label="Low Stock Items"
            value={formatNumberShort(stats.lowStockCount)}
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          />
          <StatCard
            label="Online Riders"
            value={formatNumberShort(liveStats?.onlineRiders ?? stats.riders.active)}
            icon={<Bike className="h-4 w-4 text-green-500" />}
          />
          <StatCard
            label="Today's Revenue"
            value={formatShort(liveStats?.todayRevenue ?? stats.today.revenue)}
            icon={<IndianRupee className="h-4 w-4 text-brand-500" />}
          />
          <StatCard
            label="Avg Order Value"
            value={stats.orders.value > 0 ? formatShort(stats.revenue.value / stats.orders.value) : "₹0"}
            icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
          />
          <StatCard
            label="COD Collections"
            value={formatShort(stats.today.codCollections)}
            icon={<Banknote className="h-4 w-4 text-emerald-500" />}
          />
        </div>
      ) : null}

      {/* Abandoned Carts summary widget */}
      {abandonedSummary && (
        <Link href="/products/abandoned-carts" className="block">
          <div className="rounded-xl border bg-card shadow-sm p-4 transition-all hover:shadow-md hover:border-brand-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-brand-500" />
                Abandoned Carts
              </h3>
              <span className="inline-flex items-center h-7 text-xs font-medium text-brand-500">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Open Carts"
                value={formatNumberShort(abandonedSummary.openCount)}
                icon={<ShoppingCart className="h-4 w-4 text-brand-500" />}
              />
              <StatCard
                label="Value at Risk"
                value={formatShort(abandonedSummary.openValue)}
                icon={<IndianRupee className="h-4 w-4 text-amber-500" />}
              />
              <StatCard
                label="Recovered Today"
                value={formatNumberShort(abandonedSummary.recoveredToday)}
                icon={<RotateCcw className="h-4 w-4 text-green-500" />}
              />
              <StatCard
                label="7-Day Recovery Rate"
                value={`${(abandonedSummary.recoveryRate7d * 100).toFixed(0)}%`}
                icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
              />
            </div>
          </div>
        </Link>
      )}

      {/* Charts Row: Revenue (60%) + Category Donut (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RevenueChart />
        </div>
        <div className="lg:col-span-2">
          <CategoryDonut data={categoryData} isLoading={categoryLoading} />
        </div>
      </div>

      {/* Revenue vs Orders comparison */}
      <RevenueVsOrders />

      {/* Orders by Hour + Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <OrdersByHourChart />
        </div>
        <div className="lg:col-span-2">
          <PendingActions />
        </div>
      </div>

      {/* Top Products + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProducts />
        <RecentOrders data={recentOrders} isLoading={ordersLoading} />
      </div>

      {/* Low Stock Alerts + Live Rider Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LowStockAlerts />
        <LiveRiderMap />
      </div>
    </div>
  )
}
