/** Granular permission keys */
export type PermissionKey =
  | "orders.view"
  | "orders.manage"
  | "orders.delete"
  | "products.view"
  | "products.manage"
  | "products.delete"
  | "categories.view"
  | "categories.manage"
  | "customers.view"
  | "customers.manage"
  | "riders.view"
  | "riders.manage"
  | "analytics.view"
  | "analytics.export"
  | "coupons.view"
  | "coupons.manage"
  | "reviews.view"
  | "reviews.moderate"
  | "wallet.view"
  | "wallet.manage"
  | "settings.view"
  | "settings.manage"
  | "team.view"
  | "team.manage"
  | "banners.view"
  | "banners.manage"
  | "notifications.view"
  | "notifications.manage"

/** Permission grouped by module */
export interface PermissionGroup {
  module: string
  permissions: {
    key: PermissionKey
    label: string
    description?: string
  }[]
}

/** Role with attached permissions */
export interface Role {
  id: string
  name: string
  description: string
  is_system: boolean
  permissions: PermissionKey[]
  admin_count?: number
  created_at: string
  updated_at: string
}

/** Admin/team member */
export interface TeamMember {
  id: string
  name: string
  email: string
  phone?: string
  role_id: string
  role_name: string
  permissions: PermissionKey[]
  is_active: boolean
  last_login_at?: string
  created_at: string
}

/** Create / update role payloads */
export interface CreateRolePayload {
  name: string
  description: string
  permissions: PermissionKey[]
}
export type UpdateRolePayload = Partial<CreateRolePayload>

/** Invite / update team member payloads */
export interface InviteMemberPayload {
  name: string
  email: string
  phone?: string
  role_id: string
  password: string
}

export interface UpdateMemberPayload {
  role_id?: string
  is_active?: boolean
}

/** All permission groups (used by permission matrix) */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: "Orders",
    permissions: [
      { key: "orders.view", label: "View orders" },
      { key: "orders.manage", label: "Create / edit / assign orders" },
      { key: "orders.delete", label: "Cancel / delete orders" },
    ],
  },
  {
    module: "Products",
    permissions: [
      { key: "products.view", label: "View products" },
      { key: "products.manage", label: "Create / edit products" },
      { key: "products.delete", label: "Delete products" },
    ],
  },
  {
    module: "Categories",
    permissions: [
      { key: "categories.view", label: "View categories" },
      { key: "categories.manage", label: "Create / edit / reorder" },
    ],
  },
  {
    module: "Customers",
    permissions: [
      { key: "customers.view", label: "View customers" },
      { key: "customers.manage", label: "Edit / block customers" },
    ],
  },
  {
    module: "Riders",
    permissions: [
      { key: "riders.view", label: "View riders" },
      { key: "riders.manage", label: "Manage rider details" },
    ],
  },
  {
    module: "Analytics",
    permissions: [
      { key: "analytics.view", label: "View analytics" },
      { key: "analytics.export", label: "Export reports" },
    ],
  },
  {
    module: "Coupons",
    permissions: [
      { key: "coupons.view", label: "View coupons" },
      { key: "coupons.manage", label: "Create / edit coupons" },
    ],
  },
  {
    module: "Reviews",
    permissions: [
      { key: "reviews.view", label: "View reviews" },
      { key: "reviews.moderate", label: "Reply / moderate reviews" },
    ],
  },
  {
    module: "Wallet",
    permissions: [
      { key: "wallet.view", label: "View wallet data" },
      { key: "wallet.manage", label: "Credit / debit wallets" },
    ],
  },
  {
    module: "Settings",
    permissions: [
      { key: "settings.view", label: "View settings" },
      { key: "settings.manage", label: "Change settings" },
    ],
  },
  {
    module: "Team",
    permissions: [
      { key: "team.view", label: "View team members" },
      { key: "team.manage", label: "Invite / manage team" },
    ],
  },
  {
    module: "Banners",
    permissions: [
      { key: "banners.view", label: "View banners" },
      { key: "banners.manage", label: "Create / edit banners" },
    ],
  },
  {
    module: "Notifications",
    permissions: [
      { key: "notifications.view", label: "View notifications" },
      { key: "notifications.manage", label: "Send notifications" },
    ],
  },
]
