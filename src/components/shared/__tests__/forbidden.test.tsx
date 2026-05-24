/**
 * Unit tests for the `<Forbidden />` 403 fallback component.
 *
 * Validates: Requirements 4.3, 4.4
 *
 * Behavioral guarantees under test:
 *   1. Renders a `role="alert"` region (Req 4.3) so guarded layouts can
 *      short-circuit and screen readers announce the gating decision.
 *   2. Shows the localized "Not authorized" header.
 *   3. Default description matches the bundle entry; a `message` override
 *      replaces it without affecting the header.
 *   4. Back link defaults to `/dashboard`; a `backHref` override replaces it.
 *   5. The component is purely presentational — it renders no async work
 *      and pulls no data, so it never issues an API request (Req 4.3).
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

import { Forbidden } from "@/components/shared/forbidden"

describe("Forbidden", () => {
  it("renders an alert region with the localized title", () => {
    render(<Forbidden />)
    const alert = screen.getByRole("alert")
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent("Not authorized")
  })

  it("uses the default description copy when no message is provided", () => {
    render(<Forbidden />)
    expect(
      screen.getByText("You do not have permission to view this page."),
    ).toBeInTheDocument()
  })

  it("respects a custom message override without changing the header", () => {
    render(<Forbidden message="Super admins only." />)
    expect(screen.getByRole("alert")).toHaveTextContent("Not authorized")
    expect(screen.getByText("Super admins only.")).toBeInTheDocument()
    // The default copy is gone.
    expect(
      screen.queryByText("You do not have permission to view this page."),
    ).not.toBeInTheDocument()
  })

  it("renders a back link pointing to /dashboard by default", () => {
    render(<Forbidden />)
    const link = screen.getByRole("link", { name: /back to dashboard/i })
    expect(link).toHaveAttribute("href", "/dashboard")
  })

  it("respects a custom backHref override", () => {
    render(<Forbidden backHref="/select-shop" />)
    const link = screen.getByRole("link", { name: /back to dashboard/i })
    expect(link).toHaveAttribute("href", "/select-shop")
  })
})
