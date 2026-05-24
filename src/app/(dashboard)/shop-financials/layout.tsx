import type { Metadata } from "next"

/**
 * Server layout for `/shop-financials` — sets the per-route `<title>` so
 * the document tab reflects the financials page (Req 13.7). The page is
 * a client component and cannot export `metadata`.
 *
 * Requirements: 13.7, 16.5
 */
export const metadata: Metadata = {
  title: "Financials",
}

export default function ShopFinancialsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
