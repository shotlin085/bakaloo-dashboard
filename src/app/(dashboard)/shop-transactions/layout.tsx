import type { Metadata } from "next"

/**
 * Server layout for `/shop-transactions` — sets the per-route `<title>` so
 * the document tab reflects the ledger page (Req 13.7). The page is a
 * client component and cannot export `metadata`.
 *
 * Requirements: 13.7, 16.5
 */
export const metadata: Metadata = {
  title: "Transactions",
}

export default function ShopTransactionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
