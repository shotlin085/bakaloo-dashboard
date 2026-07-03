/** Admin-defined customer segment — a manually curated group of customers. */
export interface CustomerSegment {
  id: string
  name: string
  description: string | null
  is_active: boolean
  member_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateSegmentPayload {
  name: string
  description?: string
}

export interface UpdateSegmentPayload {
  name?: string
  description?: string
  isActive?: boolean
}

/** A customer inside a segment's member list. */
export interface SegmentMember {
  id: string
  name: string | null
  phone: string
  email: string | null
  avatar_url: string | null
  added_at: string
}

/** A customer search result when adding new members to a segment. */
export interface SegmentCandidate {
  id: string
  name: string | null
  phone: string
  email: string | null
  avatar_url: string | null
}
