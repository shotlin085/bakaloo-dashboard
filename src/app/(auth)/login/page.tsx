"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ShoppingCart, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  loginAdmin,
  selectShop,
  validateSession,
} from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { useShopContextStore } from "@/store/shop-context.store"
import { t } from "@/lib/i18n"
import type { AuthResponse, ShopAssignment } from "@/types"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginPageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    </div>
  )
}

/**
 * Resolve the post-login redirect target.
 *
 * Honors the `?redirect=` search param when it points at a same-origin path
 * (defence against open-redirect abuse — the param comes from the
 * middleware bounce on unauthenticated access). Falls back to `/dashboard`,
 * which is the dashboard's home route.
 */
function resolveRedirectTarget(raw: string | null): string {
  if (!raw) return "/dashboard"
  // Only allow internal absolute paths (start with `/` and not `//`).
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard"
  return raw
}

/**
 * Minimal router surface used by `dispatchPostLogin`. Keeping it explicit
 * instead of importing the full `AppRouterInstance` type avoids coupling
 * the unit-tested helper to Next.js internals (task 2.7).
 */
interface DispatchRouter {
  push: (url: string) => void
  replace: (url: string) => void
}

/**
 * Dispatch the post-login routing branch described in Req 1.2 / 1.3 / 1.4 /
 * 1.5 (and design.md "Auth Flow Sequence Diagram").
 *
 * Inputs:
 *   - `data`     — the raw login response from the backend.
 *   - `redirect` — sanitized redirect target for the n=1 / super-admin
 *                  branches.
 *   - `router`   — minimal router surface used to push the next route.
 *
 * Branch table:
 *   - `isSuperAdmin === true`        → ALL_SHOPS mode + redirect to home.
 *   - `shops.length === 0` (vendor)  → toast error, stay on /login,
 *                                      clear auth state.
 *   - `shops.length === 1`           → auto-select the only shop, then
 *                                      redirect to home. Failure here
 *                                      surfaces a toast and keeps the user
 *                                      on /login (auth is cleared so they
 *                                      can retry login cleanly).
 *   - `shops.length >= 2`            → seed `assignedShopIds` and redirect
 *                                      to /select-shop.
 *
 * Persistence (Req 1.10) is handled implicitly: the auth store's
 * `login(user, token)` writes the access token to `localStorage` and the
 * shop-context store persists every snapshot transition through its own
 * persister, so a full reload restores the same session.
 */
async function dispatchPostLogin(
  data: AuthResponse,
  redirect: string,
  router: DispatchRouter,
): Promise<void> {
  const authStore = useAuthStore.getState()
  const shopStore = useShopContextStore.getState()

  authStore.login(data.user, data.accessToken)

  const shops: ShopAssignment[] = data.shops ?? []
  const isSuperAdmin = data.isSuperAdmin === true

  // ── Super_Admin: enter ALL_SHOPS mode ─────────────────────────────────
  // Vendors cannot enter ALL_SHOPS mode (the store's tamper guard rejects
  // the call when `assignedShopIds` is non-empty), so we ensure no
  // assigned-id list is leftover from a previous vendor session before
  // pivoting (Req 1.5, 3.2, 3.7).
  if (isSuperAdmin) {
    shopStore.setAssignedShopIds([])
    shopStore.setAllShopsMode()
    toast.success(`Welcome back, ${data.user.name || "Admin"}!`)
    router.push(redirect)
    return
  }

  // ── n = 0: vendor with no assignments ─────────────────────────────────
  // Show the "No shop assigned" error and stay on /login. Clear auth so the
  // user can switch accounts without a stuck token (Req 1.2).
  if (shops.length === 0) {
    authStore.clearAuth()
    shopStore.clear()
    toast.error(t("errors.noShopAssigned"))
    return
  }

  // Lock the assigned-id set so the Shop_Context_Store tamper guard kicks
  // in for every subsequent shop change (Req 3.7).
  shopStore.setAssignedShopIds(shops.map((s) => s.id))

  // ── n = 1: auto-select the only shop ──────────────────────────────────
  if (shops.length === 1) {
    const only = shops[0]
    try {
      const result = await selectShop(only.id, only)
      // Replace the access token with the shop-scoped JWT. The auth store's
      // `login(user, token)` is the canonical token-write path; we re-pass
      // the user so every other auth field is preserved (Req 1.3).
      authStore.login(data.user, result.token)
      // Pivot the Shop_Context_Store. `result.shop` falls back to the
      // assignment we passed in, so this is always present here (Req 1.3).
      const meta = result.shop ?? only
      shopStore.setActiveShop(
        {
          id: meta.id,
          name: meta.name,
          branchCode: meta.branchCode,
          city: meta.city,
          isActive: meta.isActive,
        },
        result.shopRole,
        result.permissions,
      )
      toast.success(`Welcome back, ${data.user.name || "Admin"}!`)
      router.push(redirect)
      return
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t("errors.shopSelectFailed")
      toast.error(message)
      // Failure: clear auth so the form is usable again. The user stays on
      // /login (Req 2.5 mirrors the same posture for the Shop_Selector).
      authStore.clearAuth()
      shopStore.clear()
      return
    }
  }

  // ── n ≥ 2: route to the Shop_Selector ─────────────────────────────────
  toast.success(`Welcome back, ${data.user.name || "Admin"}!`)
  router.push("/select-shop")
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const login = useAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [checkingSession, setCheckingSession] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // On mount, check if we already have a valid session
  // If yes, redirect to dashboard. If no, clear stale auth and show login form.
  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    if (!token) {
      // No token — clear any stale cookies and show login form
      clearAuth()
      setCheckingSession(false)
      return
    }

    // Validate existing token
    validateSession()
      .then((adminUser) => {
        // Valid session — redirect to dashboard
        login(adminUser, token)
        const redirect = resolveRedirectTarget(searchParams.get("redirect"))
        router.replace(redirect)
      })
      .catch(() => {
        // Invalid/expired token — clear everything and show login form
        clearAuth()
        useShopContextStore.getState().clear()
        setCheckingSession(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: LoginForm) {
    try {
      const data = await loginAdmin(values.email, values.password)
      const redirect = resolveRedirectTarget(searchParams.get("redirect"))
      await dispatchPostLogin(data, redirect, router)
    } catch (err: unknown) {
      setAttempts((a) => a + 1)
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Login failed. Check your credentials."
      toast.error(message)
    }
  }

  if (checkingSession) {
    return <LoginPageFallback />
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-2xl stat-card-primary flex items-center justify-center mb-4">
          <ShoppingCart className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in with your admin credentials
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@bakaloo.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          {attempts >= 3 && (
            <div className="rounded-lg bg-warning-bg p-3 text-xs text-yellow-800">
              ⚠️ Too many failed attempts. Please verify your credentials.
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}

// Exported for unit tests (task 2.7) so the dispatch logic can be exercised
// without mounting the full React tree.
export { dispatchPostLogin, resolveRedirectTarget }
