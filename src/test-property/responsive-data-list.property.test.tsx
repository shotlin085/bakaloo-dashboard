/**
 * Property test for the responsive table↔card bijection.
 *
 * Feature: multi-vendor-dashboard-ui, Property 14: Responsive table↔card bijection
 * Validates: Requirement 12.3
 *
 * Property statement (design.md §Property 14):
 *   For any list of rows and any non-empty subset of the configured
 *   columns, rendering <DataList /> below the md breakpoint produces
 *   exactly one card per row, and every card carries the textual value
 *   of every selected column.
 *
 * Test strategy:
 *   We exercise the real <DataList /> under jsdom and force the
 *   environment to "below md":
 *
 *     1. `window.innerWidth` is set to 375 px and a `resize` event is
 *        dispatched, so any consumer that watches viewport at runtime
 *        sees the mobile path.
 *     2. `window.matchMedia` is shimmed so any `(min-width: 768px)` (or
 *        wider) media query reports `matches: false`, again pinning the
 *        mobile path for runtime branchers.
 *
 *   Note on Tailwind + jsdom: the component switches presentations via
 *   `hidden md:table` (desktop table) and `md:hidden` (mobile cards).
 *   These are CSS-only toggles — jsdom doesn't evaluate media queries,
 *   so both branches sit in the DOM at every viewport. We follow the
 *   convention used in
 *   `src/components/shared/__tests__/data-list.test.tsx` and assert
 *   STRUCTURALLY:
 *
 *     - The `<ul>` (mobile cards) renders exactly `rows.length`
 *       `<li>` cards.
 *     - Every card's `textContent` contains the stringified output of
 *       `column.cell(row)` for every selected column.
 *     - The desktop `<table>` carries the Tailwind `hidden` utility,
 *       which proves it is dropped out at < md (the viewport-driven
 *       visibility flip is exercised by the Playwright suite at a real
 *       viewport in §15 of the spec).
 *
 *   `numRuns: 50` — rendering React per case is moderately expensive,
 *   so we keep the run count modest while still sweeping a meaningful
 *   space of (rows × column-subset) pairs.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import fc from "fast-check"

import { DataList, type DataListColumn } from "@/components/shared/data-list"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

interface Row {
  id: string
  name: string
  sku: string
  price: number
}

type ColumnId = "name" | "sku" | "price"

const COLUMN_DEFS: Record<ColumnId, DataListColumn<Row>> = {
  name: { id: "name", header: "Name", cell: (r) => r.name },
  sku: { id: "sku", header: "SKU", cell: (r) => r.sku },
  price: { id: "price", header: "Price", cell: (r) => r.price },
}

const ALL_COLUMN_IDS: ColumnId[] = ["name", "sku", "price"]

// ─────────────────────────────────────────────────────────────────────────────
// jsdom viewport setup — pin to < 768 px before any render runs.
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(() => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: 375,
  })
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: 667,
  })

  // matchMedia shim: report `matches: false` for any min-width query at
  // 768 px or above so any future runtime viewport branching picks the
  // mobile path during the property run.
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const minWidthMatch = query.match(/min-width:\s*(\d+)px/)
      const minWidth = minWidthMatch ? Number(minWidthMatch[1]) : 0
      return {
        matches: minWidth > 0 ? window.innerWidth >= minWidth : false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }
    },
  })

  window.dispatchEvent(new Event("resize"))
})

afterEach(() => {
  cleanup()
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 14: responsive table↔card bijection (< 768 px)", () => {
  it("renders one card per row, each containing every selected column's textual value", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Rows — uniqued by `id` so React keys remain stable across the
        // map in <DataList />. `minLength: 0` lets us also exercise the
        // empty-state branch under the same property.
        fc.uniqueArray(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            name: fc.string({ minLength: 1, maxLength: 30 }),
            sku: fc.string({ minLength: 1, maxLength: 12 }),
            price: fc.integer({ min: 1, max: 10_000 }),
          }),
          {
            minLength: 0,
            maxLength: 12,
            selector: (r) => r.id,
          },
        ),
        // Column subset — at least one column so there is something to
        // assert per card. `fc.subarray` preserves the input ordering,
        // which keeps `<li>`-cell ordering stable per shrink.
        fc.subarray(ALL_COLUMN_IDS, { minLength: 1 }),
        (rows, columnIds) => {
          const columns = columnIds.map((id) => COLUMN_DEFS[id])

          const { container } = render(
            <DataList<Row>
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
            />,
          )

          try {
            if (rows.length === 0) {
              // Empty state: neither branch renders — only the
              // placeholder div. Card count (0) trivially equals row
              // count (0).
              expect(container.querySelector("ul")).toBeNull()
              expect(container.querySelector("table")).toBeNull()
              return
            }

            // Desktop table is in the DOM (CSS-only toggle), but the
            // Tailwind `hidden` utility drops it out at < md.
            const table = container.querySelector("table")
            expect(table).not.toBeNull()
            expect(table?.classList.contains("hidden")).toBe(true)

            // Mobile card list — the visible representation at < 768 px.
            const list = container.querySelector("ul") as HTMLElement | null
            expect(list).not.toBeNull()

            // Property 14 — card count == row count.
            const cards = within(list as HTMLElement).queryAllByRole(
              "listitem",
            )
            expect(cards).toHaveLength(rows.length)

            // Property 14 — every card contains every selected column's
            // textual value. We compare via `textContent.includes(value)`
            // (rather than `getByText`) because cards render the value
            // inside a sibling `<span>` of the header label, and we want
            // the assertion to hold for any cell-renderer output that
            // produces matching characters in the DOM.
            for (let i = 0; i < rows.length; i += 1) {
              const card = cards[i]
              const row = rows[i]
              const cardText = card.textContent ?? ""
              for (const col of columns) {
                const value = String(col.cell(row))
                expect(cardText).toContain(value)
              }
            }
          } finally {
            // fast-check runs the property body many times inside a
            // single Vitest test — we must unmount between runs to keep
            // jsdom from accumulating fifty trees.
            cleanup()
          }
        },
      ),
      { numRuns: 50 },
    )
  })
})
