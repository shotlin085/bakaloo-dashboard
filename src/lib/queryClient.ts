import { QueryClient } from "@tanstack/react-query"

/**
 * TanStack Query client factory.
 *
 * Default `gcTime` of 5 min keeps memory bounded on the 4 GB production
 * server when operators leave many tabs open (multi-vendor-dashboard-ui
 * design.md §15 — "Performance Budget"). Per-hook `staleTime` overrides
 * apply on top of this default:
 *   - shops             60 s
 *   - shop-products     30 s
 *   - shop-financials   60 s
 *   - shop-transactions 30 s
 *   - my-shops          5 min
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,            // 1 minute — default freshness
        gcTime: 5 * 60 * 1000,           // 5 minutes — bounded memory budget
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new client
    return makeQueryClient()
  }
  // Browser: reuse client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
