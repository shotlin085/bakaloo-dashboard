"use client"

/**
 * Wallet hooks — wraps the existing wallet endpoints so each cache entry
 * starts with the `wallet` tag and includes `shopKey` so the Shop_Switcher's
 * predicate-based invalidation drops every entry on a shop pivot
 * (Req 3.4, 10.3).
 *
 * The transactions list is keyed via the central `qk.wallet(shopKey, …)`
 * builder. The overview-stats query is keyed by hand because it is a
 * scalar read (no `ListParams`); the literal first segment is still
 * `"wallet"` so it participates in the same prefix invalidation.
 *
 * The list / overview queries are gated by `enabled: shopKey !== "NONE"`
 * to mirror the convention from `useOrders` / `useShopProductsList`.
 * The shop scope is forwarded to the backend via the `X-Shop-Id` header
 * injected by the axios interceptor.
 *
 * Requirements: 10.1, 10.3
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getWalletTransactions,
  adminCreditWallet,
  getWalletOverviewStats,
} from "@/services/wallet.service"
import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"
import type { WalletTransactionFilters, AdminCreditPayload } from "@/types/wallet.types"

/** Sentinel used while the Shop_Context_Store is hydrating. */
const NONE_SHOP_KEY = "NONE"

/**
 * Resolve the `shopKey` used by every wallet list query. `ALL_SHOPS` →
 * `"ALL"`; `SINGLE_SHOP` → `activeShopId`; otherwise the sentinel `"NONE"`.
 */
function useShopKey(): string {
  const { mode, activeShopId } = useShopContext()
  return mode === "HQ_MODE" ? "ALL" : activeShopId ?? NONE_SHOP_KEY
}

export function useWalletStats() {
  const shopKey = useShopKey()
  return useQuery({
    // First segment `"wallet"` puts this entry in the SHOP_SCOPED_TAGS set,
    // so the Shop_Switcher predicate invalidation reaches it. `shopKey`
    // discriminates per-shop snapshots so cache lines never bleed across
    // shops. Mirrors `useOrderStatusCounts` (`["orders","status-counts"]`).
    queryKey: ["wallet", "overview-stats", shopKey] as const,
    queryFn: getWalletOverviewStats,
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useWalletTransactions(filters: WalletTransactionFilters = {}) {
  const shopKey = useShopKey()
  return useQuery({
    queryKey: qk.wallet(shopKey, filters),
    queryFn: () => getWalletTransactions(filters),
    enabled: shopKey !== NONE_SHOP_KEY,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useAdminCredit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: AdminCreditPayload }) =>
      adminCreditWallet(userId, payload),
    onSuccess: () => {
      toast.success("Wallet credited successfully")
      // Prefix-based invalidate drops every shop-keyed `wallet` entry —
      // both the overview stats and the transactions list — in one pass.
      qc.invalidateQueries({ queryKey: ["wallet"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to credit wallet")
    },
  })
}
