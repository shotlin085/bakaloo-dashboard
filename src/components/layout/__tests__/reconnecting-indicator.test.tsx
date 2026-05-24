/**
 * Unit tests for `<ReconnectingIndicator />`.
 *
 * Validates:
 *   - Requirement 11.6 — the indicator surfaces the reconnect state when the
 *     socket is between connections.
 *   - Requirement 15.6 — the indicator is non-blocking: the pill is hidden
 *     when the connection is healthy, and the live-region announces status
 *     changes politely (never assertively) so it doesn't interrupt users.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// ─────────────────────────────────────────────────────────────────────────────
// Mock the connection-status hook so each test drives the rendered state
// without spinning up a Socket.IO transport.
// ─────────────────────────────────────────────────────────────────────────────

const mockState = {
  current: { isConnected: true, isReconnecting: false } as {
    isConnected: boolean
    isReconnecting: boolean
  },
}

vi.mock("@/hooks/useConnectionStatus", () => ({
  useConnectionStatus: () => mockState.current,
}))

// ─────────────────────────────────────────────────────────────────────────────

import { ReconnectingIndicator } from "@/components/layout/reconnecting-indicator"

beforeEach(() => {
  mockState.current = { isConnected: true, isReconnecting: false }
})

afterEach(() => {
  mockState.current = { isConnected: true, isReconnecting: false }
})

describe("ReconnectingIndicator", () => {
  it("renders an empty live region when the socket is connected", () => {
    mockState.current = { isConnected: true, isReconnecting: false }

    render(<ReconnectingIndicator />)

    // The wrapper is always present so screen readers can detect the
    // future addition, but it must contain no visible pill in the happy
    // path — that's the "non-blocking" half of Req 15.6.
    expect(screen.queryByText(/Reconnecting/i)).toBeNull()
    const region = screen.getByTestId("reconnecting-indicator")
    expect(region).toHaveAttribute("aria-live", "polite")
    expect(region).toHaveAttribute("role", "status")
  })

  it("renders the pill when the socket is disconnected and reconnecting", () => {
    mockState.current = { isConnected: false, isReconnecting: true }

    render(<ReconnectingIndicator />)

    const pill = screen.getByText(/Reconnecting/i)
    expect(pill).toBeInTheDocument()
    // The pill carries an `aria-label` mirroring the visible text so
    // screen readers announce it on focus.
    expect(pill.closest("[aria-label]")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Reconnecting"),
    )
  })

  it("stays idle when disconnected without an active reconnect attempt", () => {
    // Edge case: socket dropped but we haven't received a `reconnect_attempt`
    // event yet (e.g. server took us down for maintenance). The component
    // intentionally requires *both* `!isConnected` and `isReconnecting` so
    // it never spins indefinitely on a permanent failure.
    mockState.current = { isConnected: false, isReconnecting: false }

    render(<ReconnectingIndicator />)

    expect(screen.queryByText(/Reconnecting/i)).toBeNull()
  })

  it("forwards a className onto the live region wrapper", () => {
    mockState.current = { isConnected: true, isReconnecting: false }

    render(<ReconnectingIndicator className="ml-2" />)

    expect(screen.getByTestId("reconnecting-indicator")).toHaveClass("ml-2")
  })
})
