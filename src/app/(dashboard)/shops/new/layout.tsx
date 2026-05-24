import type { Metadata } from "next"

/**
 * Server layout for `/shops/new` — sets the per-route `<title>` so the
 * document tab reflects the form the operator is on (Req 13.7). The page
 * itself is a client component and cannot export `metadata`, so a tiny
 * server layout segment is co-located here.
 *
 * Requirements: 13.7, 16.5
 */
export const metadata: Metadata = {
  title: "Create shop",
}

export default function NewShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
