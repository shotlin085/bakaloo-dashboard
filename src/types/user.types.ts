export type UserRole = "CUSTOMER" | "ADMIN" | "DELIVERY"

export interface User {
  id: string
  phone: string
  email: string | null
  name: string | null
  role: UserRole
  is_blocked: boolean
  block_reason: string | null
  created_at: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: UserRole
  phone: string
  role_name?: string
  permissions?: string[]
}

export interface AuthResponse {
  accessToken: string
  user: AdminUser
}
