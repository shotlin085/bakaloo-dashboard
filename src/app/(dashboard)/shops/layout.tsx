import type { Metadata } from "next"

/**
 * Server layout for `/shops` — exports a per-route `<title>` so the
 * document tab and screen-reader heading reflect the page the operator is
 * on (Req 13.7, 16.5). Nested routes (`/shops/new`, `/shops/[shopId]`,
 * `/shops/[shopId]/edit`, `/shops/[shopId]/staff`) override the title via
 * their own sibling server `layout.tsx` files.
 *
 * Why a layout (not page-level `metadata`): the underlying page is a
 * client component (`"use client"`) and cannot export `metadata`. A
 * tiny server `layout.tsx` co-located with the page lets us set the
 * title without converting any client code.
 *
 * Requirements: 13.7, 16.5
 */
export const metadata: Metadata = {
  title: "Shops",
}

export default function ShopsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
