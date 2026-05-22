import api from "@/lib/api"
import type { ApiResponse, AuthResponse, AdminUser } from "@/types"

export async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<AuthResponse>>("/admin/auth/login", {
    email,
    password,
  })
  return data.data
}

/**
 * Validate current token against backend — returns admin profile if valid.
 * This is the KEY fix for the stale cookie/token bug:
 * On dashboard load, we call /me to verify the token is still valid.
 * If it fails (401), the interceptor clears auth and redirects to login.
 */
export async function validateSession(): Promise<AdminUser> {
  const { data } = await api.get<ApiResponse<AdminUser>>("/admin/auth/me")
  return data.data
}

export async function logoutAdmin(): Promise<void> {
  try {
    await api.post("/admin/auth/logout")
  } catch {
    // Ignore errors — we clear local state regardless
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put("/admin/auth/password", { currentPassword, newPassword })
}
