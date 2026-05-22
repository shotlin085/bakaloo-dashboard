/* ── Upload Types ─────────────────────────── */

export interface UploadedImage {
  url: string
  publicId: string
  width: number
  height: number
  format: string
  bytes: number
}

export interface UploadedFile {
  url: string
  publicId: string
}
