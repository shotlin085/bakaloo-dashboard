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
import { loginAdmin, validateSession } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"

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

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useAuthStore((s) => s.login)
  const clearAuth = useAuthStore((s) => s.clearAuth)
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
        const redirect = searchParams.get("redirect") || "/dashboard"
        router.replace(redirect)
      })
      .catch(() => {
        // Invalid/expired token — clear everything and show login form
        clearAuth()
        setCheckingSession(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: LoginForm) {
    try {
      const data = await loginAdmin(values.email, values.password)
      login(data.user, data.accessToken)
      toast.success(`Welcome back, ${data.user.name || "Admin"}!`)
      const redirect = searchParams.get("redirect") || "/dashboard"
      router.push(redirect)
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
