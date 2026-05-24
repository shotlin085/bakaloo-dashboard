/**
 * Unit tests for the Stock_Badge component (task 8.4).
 *
 * Covers the three exhaustive states across `stock_quantity`:
 *   - sold-out (Req 7.7) — `Sold out` badge with muted styling and a
 *     tooltip that surfaces `sold_out_at` formatted via `formatDate`.
 *   - low-stock (Req 7.6) — `Low stock` badge whenever the quantity is
 *     greater than zero and at-or-below the threshold.
 *   - healthy — no badge.
 *
 * Validates: Requirements 7.6, 7.7, 13.6.
 */

import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { StockBadge } from "../stock-badge"

describe("StockBadge — sold-out state (Req 7.7)", () => {
  it("renders a Sold out badge with muted styling when stock is zero", () => {
    render(
      <StockBadge
        stockQuantity={0}
        lowStockThreshold={5}
        soldOutAt="2024-12-25T09:30:00.000Z"
      />,
    )

    const trigger = screen.getByTestId("stock-badge-sold-out")
    expect(trigger).toBeInTheDocument()
    // Literal text guarantees the state is perceivable without colour
    // (Req 13.6).
    expect(trigger).toHaveTextContent("Sold out")
    // Muted style per Req 7.7 — applied to the inner Badge node.
    const badge = trigger.querySelector("[class*='opacity-60']")
    expect(badge).not.toBeNull()
  })

  it("does not render the low-stock badge when stock is zero (sold-out wins)", () => {
    // 0 is also "at or below threshold", but Req 7.7 takes precedence.
    render(
      <StockBadge
        stockQuantity={0}
        lowStockThreshold={5}
        soldOutAt={null}
      />,
    )

    expect(screen.queryByTestId("stock-badge-low")).not.toBeInTheDocument()
    expect(screen.getByTestId("stock-badge-sold-out")).toBeInTheDocument()
  })

  it("falls back to the bare label when sold_out_at is null", () => {
    // Tooltip content is portalled and only mounts on hover, so we just
    // assert the trigger still renders the label as accessible text.
    render(
      <StockBadge
        stockQuantity={0}
        lowStockThreshold={5}
        soldOutAt={null}
      />,
    )

    const trigger = screen.getByTestId("stock-badge-sold-out")
    expect(trigger).toHaveTextContent("Sold out")
  })

  it("exposes the trigger to keyboard users via tabIndex={0}", () => {
    render(
      <StockBadge
        stockQuantity={0}
        lowStockThreshold={5}
        soldOutAt="2024-12-25T09:30:00.000Z"
      />,
    )

    expect(screen.getByTestId("stock-badge-sold-out")).toHaveAttribute(
      "tabindex",
      "0",
    )
  })
})

describe("StockBadge — low-stock state (Req 7.6)", () => {
  it("renders a Low stock badge when quantity equals threshold", () => {
    render(
      <StockBadge
        stockQuantity={5}
        lowStockThreshold={5}
        soldOutAt={null}
      />,
    )

    const badge = screen.getByTestId("stock-badge-low")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent("Low stock")
  })

  it("renders a Low stock badge when quantity is below threshold", () => {
    render(
      <StockBadge
        stockQuantity={2}
        lowStockThreshold={5}
        soldOutAt={null}
      />,
    )

    expect(screen.getByTestId("stock-badge-low")).toHaveTextContent(
      "Low stock",
    )
  })

  it("does not render any badge when quantity is above threshold", () => {
    const { container } = render(
      <StockBadge
        stockQuantity={10}
        lowStockThreshold={5}
        soldOutAt={null}
      />,
    )

    expect(screen.queryByTestId("stock-badge-low")).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("stock-badge-sold-out"),
    ).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})
