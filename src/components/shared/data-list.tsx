"use client"

/**
 * Responsive table↔card shell — encapsulates the table-to-stacked-card
 * transformation called for in design §13.
 *
 * Renders a semantic `<table>` at md and above, and a list of stacked
 * `<li>` cards below md. Every defined column is rendered as a label/value
 * pair on each card, so the row→card bijection asserted by Property 14
 * holds (every row produces exactly one card containing every column value).
 *
 * Requirements: 12.3, 15.1
 */

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface DataListColumn<T> {
  /** Stable id used as React key inside cards and headers. */
  id: string
  /** Human-readable column header. */
  header: string
  /** Cell renderer for a given row. */
  cell: (row: T) => ReactNode
}

export interface DataListProps<T> {
  columns: DataListColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Message rendered when `rows.length === 0`. */
  emptyMessage?: string
  className?: string
}

export function DataList<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
  className,
}: DataListProps<T>) {
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed py-10 text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyMessage ?? "No items"}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* md+ — semantic table */}
      <table className="hidden w-full caption-bottom text-sm md:table">
        <thead className="border-b">
          <tr className="text-left">
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="h-10 px-3 font-medium text-muted-foreground"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b transition-colors hover:bg-muted/40"
            >
              {columns.map((c) => (
                <td key={c.id} className="px-3 py-2 align-middle">
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* below md — stacked cards (one card per row, all columns rendered) */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-lg border p-3">
            {columns.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 py-1 text-sm"
              >
                <span className="text-muted-foreground">{c.header}</span>
                <span className="text-right">{c.cell(row)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
