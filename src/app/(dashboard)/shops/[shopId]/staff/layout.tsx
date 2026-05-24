import type { Metadata } from "next"

/**
 * Server layout for `/shops/[shopId]/staff` — sets the per-route `<title>`
 * so the document tab reflects the staff list (Req 13.7). The page is a
 * client component and cannot export `metadata`.
 *
 * Requirements: 13.7, 16.5
 */
export const metadata: Metadata = {
  title: "Shop staff",
}

export default function ShopStaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
