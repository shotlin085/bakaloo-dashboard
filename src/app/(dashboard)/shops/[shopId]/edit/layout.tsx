import type { Metadata } from "next"

/**
 * Server layout for `/shops/[shopId]/edit` — sets the per-route `<title>`
 * so the document tab reflects the edit form (Req 13.7). The page itself
 * is a client component and cannot export `metadata`.
 *
 * Requirements: 13.7, 16.5
 */
export const metadata: Metadata = {
  title: "Edit shop",
}

export default function EditShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
