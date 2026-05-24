import type { Metadata } from "next"

/**
 * Server layout for `/shops/[shopId]` — sets the per-route `<title>` so
 * the document tab reflects the shop detail page (Req 13.7). The actual
 * shop name is rendered in the page header by the client component;
 * using a static title here keeps the layout fully server-side and
 * avoids a `generateMetadata` round-trip. Nested routes (`edit`, `staff`)
 * override the title via their own sibling layouts.
 *
 * Requirements: 13.7, 16.5
 */
export const metadata: Metadata = {
  title: "Shop details",
}

export default function ShopDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
