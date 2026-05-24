import type { Metadata } from "next"

import { ErrorBoundary } from "@/components/shared/error-boundary"

/**
 * Select_Shop layout — server component that:
 *
 *   1. Sets the per-route `<title>` so the document tab reflects the
 *      page the operator is on (Req 13.7).
 *   2. Wraps the page in `<ErrorBoundary />` so any uncaught render
 *      error during shop selection falls back to a friendly screen with
 *      a refresh CTA. `<ErrorBoundary />` is a client component; Next.js
 *      permits rendering client components from a server layout. The
 *      boundary logs `{ error, info, requestId }` to the console (where
 *      `requestId` is the `x-request-id` attached by the axios response
 *      interceptor).
 *
 * Requirements: 13.7, 15.7, 16.5
 */
export const metadata: Metadata = {
  title: "Select a shop",
}

export default function SelectShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
