import { create } from "zustand"
import type { AdminUser } from "@/types"

const TWENTY_DAYS_SECONDS = 20 * 24 * 60 * 60 // 1,728,000

interface AuthState {
  user: AdminUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isHydrated: boolean
  login: (user: AdminUser, token: string) => void
  logout: () => void
  hydrate: () => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false,

  login: (user, token) => {
    localStorage.setItem("accessToken", token)
    localStorage.setItem("admin-user", JSON.stringify(user))
    // Set marker cookie for Next.js middleware — 20 days
    document.cookie = `auth_session=1; path=/; max-age=${TWENTY_DAYS_SECONDS}; samesite=lax`
    set({ user, accessToken: token, isAuthenticated: true, isHydrated: true })
  },

  logout: () => {
    // Call backend logout to clear httpOnly cookies (fire-and-forget)
    const token = localStorage.getItem("accessToken")
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem("accessToken")
    localStorage.removeItem("admin-user")
    // Clear auth cookies
    document.cookie = "auth_session=; path=/; max-age=0"
    document.cookie = "accessToken=; path=/; max-age=0"
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true })
    window.location.href = "/login"
  },

  // Silently clear auth state without redirect (used when /me fails)
  clearAuth: () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("admin-user")
    document.cookie = "auth_session=; path=/; max-age=0"
    document.cookie = "accessToken=; path=/; max-age=0"
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true })
  },

  hydrate: () => {
    if (typeof window === "undefined") return
    const token = localStorage.getItem("accessToken")
    const userStr = localStorage.getItem("admin-user")
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AdminUser
        set({ user, accessToken: token, isAuthenticated: true, isHydrated: true })
      } catch {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("admin-user")
        set({ isHydrated: true })
      }
    } else {
      set({ isHydrated: true })
    }
  },
}))
