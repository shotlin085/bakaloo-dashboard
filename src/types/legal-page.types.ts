/** Legal page entity — snake_case (backend returns raw DB rows) */
export interface LegalPage {
  slug: "terms" | "privacy" | "about"
  title: string
  content_html: string
  updated_at: string
  updated_by: string | null
}

export interface UpdateLegalPagePayload {
  title: string
  contentHtml: string
}
