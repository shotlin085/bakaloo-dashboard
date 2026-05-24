"use client"

/**
 * Permission group toggles (`<PermissionGroupToggles />`) — task 6.5.
 *
 * Renders the per-shop staff permission editor as five accordion sections
 * (Orders, Products, Financials, Transactions, Settings) per design.md §7.
 * Each section carries a master `Switch` plus a per-token `Switch` row, and
 * the master toggle flips every token in the group on/off in a single call.
 *
 * The component is purely controlled — the parent owns the
 * `PermissionToken[]` value and gets a fresh array back on every change.
 * That keeps the component composable with `react-hook-form` (the
 * `<InviteStaffDialog />` invokes it as a controlled field) and trivial to
 * snapshot in tests.
 *
 * Grouping rules:
 *   - Tokens are routed by their `<entity>.<action>` prefix to the matching
 *     accordion section.
 *   - `shops.*`, `shop-staff.*`, `customers.*`, and `activity-log.*` all
 *     fall under Settings since they govern the shop's configuration and
 *     identity-management surfaces (the spec calls for exactly five
 *     sections — design.md §7 / requirement 6.4).
 *   - Sections with no tokens are not rendered (defensive: every token in
 *     `ROLE_DEFAULTS` resolves to a known group today, but the helper
 *     stays robust if a future token is added without an entry here).
 *
 * Accessibility:
 *   - The native `<details>` element drives the accordion. It ships with
 *     keyboard activation (Enter/Space on the `<summary>`) and is read as
 *     "expanded/collapsed" by screen readers without extra ARIA wiring.
 *   - The master `Switch` lives inside the `<summary>` but stops click +
 *     keydown propagation so toggling the master does not also toggle the
 *     accordion's open state.
 *   - Each per-token row carries an `aria-label` of `Toggle <token>` so
 *     screen readers announce the token a switch governs.
 *
 * Test selectors (kept stable for `<InviteStaffDialog />` tests):
 *   - `data-testid="perm-master-{groupKey}"` on the group's master switch
 *   - `data-testid="perm-token-{token}"` on each per-token switch
 *
 * Requirements: 6.4
 */

import { useMemo } from "react"
import { ChevronsUpDown } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { t } from "@/lib/i18n"
import { ROLE_DEFAULTS, type PermissionToken } from "@/lib/permissions"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Group metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One of the five accordion sections defined by design.md §7. The keys are
 * stable strings used for `data-testid` so the dialog's tests can target
 * the master switch without scraping label text.
 */
type PermissionGroupKey =
  | "orders"
  | "products"
  | "financials"
  | "transactions"
  | "settings"

interface PermissionGroup {
  key: PermissionGroupKey
  /** i18n bundle key for the section's display label. */
  labelKey: string
  /**
   * Entity prefixes routed into this group. A token's prefix is the
   * substring before its first `.` (e.g. `shop-products.read` →
   * `shop-products`).
   */
  prefixes: readonly string[]
}

/**
 * Section list in the exact order the design calls for. The `Settings`
 * group catches everything administrative (`shops`, `shop-staff`) plus
 * the cross-cutting tokens (`customers`, `activity-log`) so we render
 * exactly five sections instead of overflowing into a sixth bucket.
 */
const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    key: "orders",
    labelKey: "shopStaff.invite.permissions.group.orders",
    prefixes: ["orders"],
  },
  {
    key: "products",
    labelKey: "shopStaff.invite.permissions.group.products",
    // `products.*` (master catalog) and `shop-products.*` (per-shop
    // inventory) both surface under "Products" so the operator does not
    // need to know our internal split.
    prefixes: ["products", "shop-products"],
  },
  {
    key: "financials",
    labelKey: "shopStaff.invite.permissions.group.financials",
    prefixes: ["shop-financials"],
  },
  {
    key: "transactions",
    labelKey: "shopStaff.invite.permissions.group.transactions",
    prefixes: ["shop-transactions"],
  },
  {
    key: "settings",
    labelKey: "shopStaff.invite.permissions.group.settings",
    prefixes: ["shops", "shop-staff", "customers", "activity-log"],
  },
] as const

/** Every PermissionToken across every role default, deduped. */
const ALL_PERMISSION_TOKENS: readonly PermissionToken[] = Array.from(
  new Set<PermissionToken>(
    Object.values(ROLE_DEFAULTS).flatMap((tokens) => tokens),
  ),
)

/**
 * Group → tokens map computed once at module scope. The lookup is
 * allocation-free during render so toggling a switch never re-walks the
 * full token list. Tokens land in `settings` whenever their prefix has no
 * dedicated section (defensive — keeps the component robust against
 * future tokens added to `ROLE_DEFAULTS` before this map is updated).
 */
const TOKENS_BY_GROUP: Readonly<Record<PermissionGroupKey, PermissionToken[]>> =
  (() => {
    const map: Record<PermissionGroupKey, PermissionToken[]> = {
      orders: [],
      products: [],
      financials: [],
      transactions: [],
      settings: [],
    }
    for (const token of ALL_PERMISSION_TOKENS) {
      const dot = token.indexOf(".")
      const prefix = dot > 0 ? token.slice(0, dot) : token
      const group =
        PERMISSION_GROUPS.find((g) => g.prefixes.includes(prefix))?.key ??
        "settings"
      map[group].push(token)
    }
    for (const k of Object.keys(map) as PermissionGroupKey[]) {
      map[k].sort()
    }
    return map
  })()

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionGroupTogglesProps {
  /** Currently selected permission tokens. */
  value: PermissionToken[]
  /**
   * Called with the next token list whenever the operator toggles a
   * switch. The callback always receives a fresh array — never the same
   * reference — so RHF detects the change.
   */
  onChange: (next: PermissionToken[]) => void
}

/**
 * Five-section accordion editor for `PermissionToken[]`. See module
 * docstring for grouping rules and accessibility notes.
 */
export function PermissionGroupToggles({
  value,
  onChange,
}: PermissionGroupTogglesProps) {
  // Memoised set view of `value` so the per-token "is checked?" lookup is
  // O(1) regardless of how many tokens the role grants.
  const valueSet = useMemo(() => new Set(value), [value])

  /** Add or remove a single token, preserving the rest of `value`. */
  const toggleToken = (token: PermissionToken, on: boolean) => {
    if (on) {
      if (valueSet.has(token)) return
      onChange([...value, token])
    } else {
      onChange(value.filter((tk) => tk !== token))
    }
  }

  /**
   * Master toggle: turn every token in the group on or off in a single
   * `onChange` call. Done as a set union/diff so the relative order of
   * other groups' tokens is preserved.
   */
  const toggleGroup = (tokens: readonly PermissionToken[], on: boolean) => {
    if (on) {
      const next = new Set(value)
      for (const tk of tokens) next.add(tk)
      onChange(Array.from(next))
    } else {
      const drop = new Set(tokens)
      onChange(value.filter((tk) => !drop.has(tk)))
    }
  }

  return (
    <div className="space-y-2">
      <Label>{t("shopStaff.invite.permissions.label")}</Label>
      <div className="rounded-md border">
        {PERMISSION_GROUPS.map((group, idx) => {
          const tokens = TOKENS_BY_GROUP[group.key]
          if (tokens.length === 0) return null

          const checkedCount = tokens.reduce(
            (n, tk) => n + (valueSet.has(tk) ? 1 : 0),
            0,
          )
          const allOn = checkedCount === tokens.length
          const someOn = checkedCount > 0 && !allOn

          const label = t(group.labelKey)

          return (
            <details
              key={group.key}
              className={cn("group", idx > 0 && "border-t")}
              // Open the first non-empty section by default so the
              // permission UI is visible without an extra click on small
              // viewports.
              open={idx === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <ChevronsUpDown
                    className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                  {label}
                  <span className="text-xs text-muted-foreground">
                    ({checkedCount}/{tokens.length})
                  </span>
                </span>
                {/*
                  Master toggle. Wrapped in a span that stops the
                  click/keydown from bubbling up to the <summary>, otherwise
                  flipping the switch would also collapse/expand the
                  accordion (the native <details> toggles on any click in
                  the summary).
                */}
                <span
                  className="flex items-center gap-2"
                  onClick={(e) => e.preventDefault()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-muted-foreground">
                    {someOn ? "Mixed" : allOn ? "On" : "Off"}
                  </span>
                  <Switch
                    checked={allOn}
                    onCheckedChange={(on) => toggleGroup(tokens, on)}
                    aria-label={`${label} group master toggle`}
                    data-testid={`perm-master-${group.key}`}
                  />
                </span>
              </summary>
              <ul className="border-t bg-muted/30 px-3 py-2">
                {tokens.map((token) => {
                  const checked = valueSet.has(token)
                  return (
                    <li
                      key={token}
                      className="flex items-center justify-between gap-3 py-1"
                    >
                      <span className="font-mono text-xs">{token}</span>
                      <Switch
                        checked={checked}
                        onCheckedChange={(on) => toggleToken(token, on)}
                        aria-label={`Toggle ${token}`}
                        data-testid={`perm-token-${token}`}
                      />
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })}
      </div>
    </div>
  )
}

export default PermissionGroupToggles
