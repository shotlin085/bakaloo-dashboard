import axios from "axios"
import { toast } from "sonner"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
})

// Attach token to every request + RBAC mutation guard
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // ── RBAC: Block all mutations for Viewer users ──
    const method = (config.method || "get").toLowerCase()
    const isMutation = ["post", "put", "patch", "delete"].includes(method)
    const url = config.url || ""

    // Allow auth routes (login, me, logout) to pass through
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/me") ||
      url.includes("/auth/logout")

    if (isMutation && !isAuthRoute) {
      try {
        const stored = localStorage.getItem("admin-user")
        if (stored) {
          const user = JSON.parse(stored)
          const permissions: string[] = user?.state?.user?.permissions || user?.permissions || []

          // Check if user only has view permissions (Viewer role)
          const isViewer =
            permissions.length > 0 &&
            permissions.every((p: string) => p.endsWith(".view"))

          if (isViewer) {
            toast.error("Access denied — you have view-only permissions", {
              description: "Contact a Super Admin to request edit access.",
            })
            // Cancel the request by returning a rejected promise
            const cancelSource = axios.CancelToken.source()
            config.cancelToken = cancelSource.token
            cancelSource.cancel("VIEWER_BLOCKED")
            return config
          }
        }
      } catch {
        // If parsing fails, let the request through (safety)
      }
    }
  }
  return config
})

// On 401 → clear auth state and redirect to login
// But DON'T redirect if we're already on /login or calling /me (avoid loops)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't show errors for cancelled requests (Viewer blocks)
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && typeof window !== "undefined") {
      const requestUrl = error.config?.url || ""
      const isAuthCheck = requestUrl.includes("/admin/auth/me")
      const isLoginPage = window.location.pathname === "/login"

      // Don't redirect for /me validation calls or if already on login page
      if (!isAuthCheck && !isLoginPage) {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("admin-user")
        document.cookie = "auth_session=; path=/; max-age=0"
        document.cookie = "accessToken=; path=/; max-age=0"
        window.location.href = "/login"
      }
    }

    // Handle 403 PERMISSION_DENIED from backend
    if (error.response?.status === 403 && error.response?.data?.code === "PERMISSION_DENIED") {
      toast.error("Permission denied", {
        description: error.response.data.message || "You don't have permission for this action.",
      })
    }

    return Promise.reject(error)
  }
)

export default api
