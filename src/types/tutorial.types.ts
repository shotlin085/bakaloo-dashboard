/** Tutorial video entity — snake_case (backend returns raw DB rows) */
export interface TutorialVideo {
  id: string
  title: string
  video_url: string
  video_id: string
  language: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Create tutorial payload — camelCase (backend schema expects camelCase) */
export interface CreateTutorialPayload {
  title: string
  videoUrl: string
  language?: string
  isActive?: boolean
}

export type UpdateTutorialPayload = Partial<CreateTutorialPayload>

export interface ReorderTutorialsPayload {
  orderedIds: string[]
}
