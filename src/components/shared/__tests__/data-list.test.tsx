/**
 * Unit tests for the responsive `<DataList />` shell.
 *
 * Validates: Requirement 12.3 (responsive table↔card transformation) and
 * Property 14 (row→card bijection — every row produces exactly one card
 * containing every column value).
 *
 * Note on viewport-driven assertions: The desktop table uses
 * `hidden md:table` and the mobile card list uses `md:hidden`. These
 * Tailwind classes resolve through CSS media queries. jsdom does not
 * implement layout / media-query matching, so the visibility toggle
 * cannot be observed by `toBeVisible()` — both nodes are present in the
 * DOM at every viewport. Rather than simulating media queries (which the
 * runtime does not honor), we assert *structurally*:
 *
 *   1. The `<table>` exists, contains every column header, and a `<tr>`
 *      for every row whose cells render the configured `cell()` output.
 *   2. The `<ul>` exists, contains exactly `rows.length` `<li>` children,
 *      and each `<li>` contains the column header and cell value for
 *      every column.
 *
 * The CSS-only visibility toggle is exercised by the Playwright suite at
 * a real viewport in §12 of the spec.
 */

import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"

import { DataList, type DataListColumn } from "@/components/shared/data-list"

interface Row {
  id: string
  name: string
  city: string
}

const COLUMNS: DataListColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name },
  { id: "city", header: "City", cell: (r) => r.city },
]

const ROWS: Row[] = [
  { id: "1", name: "Alpha", city: "Mumbai" },
  { id: "2", name: "Bravo", city: "Pune" },
  { id: "3", name: "Charlie", city: "Delhi" },
]

describe("DataList — table view (md+)", () => {
  it("renders a single table with every column header", () => {
    render(
      <DataList<Row> columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />,
    )
    const table = screen.getByRole("table")
    expect(table).toBeInTheDocument()

    const headers = within(table).getAllByRole("columnheader")
    expect(headers.map((h) => h.textContent)).toEqual(["Name", "City"])
  })

  it("renders one body row per data row with all cell values", () => {
    render(
      <DataList<Row> columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />,
    )
    const table = screen.getByRole("table")
    const tbody = table.querySelector("tbody") as HTMLElement
    const rows = within(tbody).getAllByRole("row")
    expect(rows).toHaveLength(ROWS.length)
    for (let i = 0; i < ROWS.length; i += 1) {
      const cells = within(rows[i]).getAllByRole("cell")
      expect(cells).toHaveLength(COLUMNS.length)
      expect(cells[0]).toHaveTextContent(ROWS[i].name)
      expect(cells[1]).toHaveTextContent(ROWS[i].city)
    }
  })
})

describe("DataList — card view (below md)", () => {
  it("renders one <li> per row with every column rendered as a label/value pair", () => {
    const { container } = render(
      <DataList<Row> columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />,
    )
    const list = container.querySelector("ul") as HTMLElement
    expect(list).not.toBeNull()
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(ROWS.length)

    // Property 14: row→card bijection. Every <li> contains every column
    // header and cell value.
    for (let i = 0; i < ROWS.length; i += 1) {
      const card = items[i]
      for (const col of COLUMNS) {
        expect(card).toHaveTextContent(col.header)
      }
      expect(card).toHaveTextContent(ROWS[i].name)
      expect(card).toHaveTextContent(ROWS[i].city)
    }
  })
})

describe("DataList — empty state", () => {
  it("renders the placeholder message when rows is empty", () => {
    render(
      <DataList<Row>
        columns={COLUMNS}
        rows={[]}
        rowKey={(r) => r.id}
        emptyMessage="Nothing to show"
      />,
    )
    expect(screen.getByText("Nothing to show")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("falls back to the default message when no emptyMessage is provided", () => {
    render(
      <DataList<Row> columns={COLUMNS} rows={[]} rowKey={(r) => r.id} />,
    )
    expect(screen.getByText("No items")).toBeInTheDocument()
  })
})
