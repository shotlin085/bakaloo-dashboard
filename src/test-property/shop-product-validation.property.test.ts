/**
 * Property test for the shop-product Zod validation domain.
 *
 * Feature: multi-vendor-dashboard-ui, Property 7: Shop-product validation domain
 * Validates: Requirements 7.5
 *
 * Property:
 *   For any tuple `(price, sale_price, stock_quantity, max_order_qty)`,
 *   `shopProductSchema.safeParse({ ...validStubs, price, sale_price,
 *   stock_quantity, max_order_qty }).success === IS_VALID(tuple)`,
 *
 *   where IS_VALID(tuple) is the conjunction of the constraints stated in
 *   Requirement 7.5 (and enforced by `shopProductSchema` in
 *   `src/lib/shop-validations.ts`):
 *
 *     • price > 0                                            (schema rule)
 *     • sale_price === null
 *         OR (sale_price > 0 AND sale_price < price)         (Req 7.5 + schema)
 *     • stock_quantity >= 0 AND Number.isInteger(stock_quantity)
 *                                                            (Req 7.5)
 *     • Number.isInteger(max_order_qty)
 *         AND 1 <= max_order_qty <= 10000                    (Req 7.5)
 *
 * Other required fields (`product_id`, `cost_price`, `low_stock_threshold`,
 * `is_available`, `is_featured`) are stubbed with valid constants so the
 * property isolates the four numeric fields under test. `low_stock_threshold`,
 * `is_available`, and `is_featured` have schema defaults but we still pass
 * explicit valid values to keep the input fully deterministic and avoid
 * conflating default-application with validation.
 *
 * Rationale: Requirement 7.5 says the add and edit forms SHALL enforce
 * client-side that `sale_price < price`, `stock_quantity >= 0`, and
 * `max_order_qty` is between 1 and 10000. The Zod schema is the single
 * source of truth for those rules in the dashboard, so we exercise it with
 * fast-check across the cross-product of in-bounds and out-of-bounds inputs
 * for all four fields.
 */

import { describe, it, expect } from "vitest"
import fc from "fast-check"

import { shopProductSchema } from "@/lib/shop-validations"

// ─────────────────────────────────────────────────────────────────────────────
// Stubs for non-tested required fields. These are picked to be unconditionally
// valid so the only thing that can flip `safeParse(...).success` between
// iterations is the numeric tuple under test.
// ─────────────────────────────────────────────────────────────────────────────

/** Any RFC-4122 v4 UUID; must satisfy `z.string().uuid()`. */
const STUB_PRODUCT_ID = "11111111-1111-4111-8111-111111111111"

/** Constant valid stub for the rest of the form payload. */
const STUB_REST = {
  product_id: STUB_PRODUCT_ID,
  // `cost_price` is `.nullable()` (must be present; null is the easy "absent"
  // value), so set it to `null` to keep it out of the property.
  cost_price: null as number | null,
  low_stock_threshold: 5,
  is_available: true,
  is_featured: false,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Generators (per task spec)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `price`: any 32-bit float in [0, 10000]. The lower bound includes 0 so
 * the property exercises the `price > 0` failure branch as well.
 */
const priceArb = fc.float({ min: 0, max: 10000, noNaN: true })

/**
 * `sale_price`: either `null` (the explicit "no sale" value) or a 32-bit
 * float in [0, 10000]. `fc.option(arb)` returns `null` ~50% of the time by
 * default, which gives the schema's `sale_price === null` short-circuit
 * adequate coverage.
 */
const salePriceArb = fc.option(
  fc.float({ min: 0, max: 10000, noNaN: true }),
)

/**
 * `stock_quantity`: integers spanning the boundary. Negative values must
 * fail (`stock_quantity >= 0`); zero and positives must pass on this axis.
 */
const stockQuantityArb = fc.integer({ min: -100, max: 1000 })

/**
 * `max_order_qty`: integers spanning both boundaries. Values outside
 * [1, 10000] must fail; values inside (with the other axes valid) must pass.
 */
const maxOrderQtyArb = fc.integer({ min: -10, max: 20000 })

// ─────────────────────────────────────────────────────────────────────────────
// Predicate: the IFF condition the schema is supposed to enforce.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns `true` iff every schema-enforced rule on the four numeric fields
 * holds. The integer checks are redundant for `stockQuantityArb` /
 * `maxOrderQtyArb` (already integers) but make the predicate self-contained
 * and robust to future generator changes.
 */
function isValidTuple(
  price: number,
  salePrice: number | null,
  stockQuantity: number,
  maxOrderQty: number,
): boolean {
  if (!(price > 0)) return false
  if (salePrice !== null) {
    if (!(salePrice > 0)) return false
    if (!(salePrice < price)) return false
  }
  if (!Number.isInteger(stockQuantity)) return false
  if (stockQuantity < 0) return false
  if (!Number.isInteger(maxOrderQty)) return false
  if (maxOrderQty < 1 || maxOrderQty > 10000) return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("shopProductSchema — Property 7: validation domain", () => {
  it("∀ (price, sale_price, stock_quantity, max_order_qty): safeParse.success iff schema-enforced constraints hold", () => {
    fc.assert(
      fc.property(
        priceArb,
        salePriceArb,
        stockQuantityArb,
        maxOrderQtyArb,
        (price, sale_price, stock_quantity, max_order_qty) => {
          const result = shopProductSchema.safeParse({
            ...STUB_REST,
            price,
            sale_price,
            stock_quantity,
            max_order_qty,
          })

          const expected = isValidTuple(
            price,
            sale_price,
            stock_quantity,
            max_order_qty,
          )

          // Use a strict equality on the boolean so fast-check shrinks to
          // the smallest counterexample if the schema and predicate disagree.
          expect(result.success).toBe(expected)
        },
      ),
      { numRuns: 200 },
    )
  })
})
