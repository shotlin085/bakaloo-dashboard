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
  adminDebitWallet,
  getWalletOverviewStats,
} from "@/services/wallet.service"
import { useShopContext } from "@/hooks/useShopContext"
import { qk } from "@/lib/query-keys"
import type { WalletTransactionFilters, AdminCreditPayload, AdminDebitPayload } from "@/types/wallet.types"

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
    // Balances can change from outside this page entirely (customer app
    // top-up/debit, the Customer Profile drawer) — always refetch on mount
    // rather than trusting a cached snapshot from a previous visit.
    refetchOnMount: "always",
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
    refetchOnMount: "always",
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
      // Also drop the Customer Profile drawer's cache ("customers") — a
      // credit from this page used to leave an already-open drawer for the
      // same customer showing a stale wallet_balance.
      qc.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to credit wallet")
    },
  })
}

export function useAdminDebit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: AdminDebitPayload }) =>
      adminDebitWallet(userId, payload),
    onSuccess: () => {
      toast.success("Wallet debited successfully")
      qc.invalidateQueries({ queryKey: ["wallet"] })
      // See useAdminCredit — also drop the Customer Profile drawer's cache.
      qc.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to debit wallet")
    },
  })
}
