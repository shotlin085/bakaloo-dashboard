/* ── Activity Log Types ─────────────────────────── */

export interface ActivityLog {
  id: string
  admin_id: string
  admin_name: string
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | string | null
  new_value: Record<string, unknown> | string | null
  ip_address: string | null
  created_at: string
}

export interface ActivityLogFilters {
  page?: number
  limit?: number
  adminId?: string
  action?: string
  entityType?: string
}
