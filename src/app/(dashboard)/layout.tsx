"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { MobileNav } from "@/components/layout/MobileNav"
import { SocketProvider } from "@/components/providers/SocketProvider"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { ViewerBanner } from "@/components/shared/PermissionGate"
import { useAuthStore } from "@/store/auth.store"
import { useSidebarStore } from "@/store/sidebar.store"
import { validateSession } from "@/services/auth.service"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isHydrated, hydrate, login, clearAuth } = useAuthStore()
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const isBuilderRoute = pathname === "/themes/builder"
  const [isValidating, setIsValidating] = useState(true)

  // Step 1: Hydrate auth from localStorage on mount
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Step 2: After hydration, validate token against backend
  // This is the KEY fix for the stale cookie/restart bug
  useEffect(() => {
    if (!isHydrated) return

    const token = localStorage.getItem("accessToken")
    if (!token) {
      // No token at all — redirect to login
      setIsValidating(false)
      router.replace("/login")
      return
    }

    // Validate the token against the backend
    validateSession()
      .then((adminUser) => {
        // Token is valid — update store with fresh user data
        login(adminUser, token)
        setIsValidating(false)
      })
      .catch(() => {
        // Token is invalid/expired — clear everything and redirect
        clearAuth()
        setIsValidating(false)
        router.replace("/login")
      })
  // Only run once after hydration
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated])

  // Show nothing while validating to prevent flash of dashboard
  if (!isHydrated || isValidating) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If not authenticated after validation, show nothing (redirect is happening)
  if (!isAuthenticated) {
    return null
  }

  return (
    <SocketProvider>
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {isBuilderRoute ? (
        <main
          id="main-content"
          aria-label="Dashboard content"
          className="h-screen overflow-hidden"
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      ) : (
        <>
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* Mobile sidebar sheet */}
          <MobileNav />

          {/* Main content area */}
          <div
            className={cn(
              "min-h-screen transition-all duration-200",
              isCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
            )}
          >
            <Header />
            <main
              id="main-content"
              aria-label="Dashboard content"
              className="p-4 md:p-6"
            >
              <ErrorBoundary>
                <ViewerBanner />
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </>
      )}
    </SocketProvider>
  )
}
