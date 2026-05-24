/**
 * Unit tests for the Shop_Selector `<ShopSearch />` subcomponent.
 *
 * Covers the controlled-input + 300ms debounce contract from
 * Req 2.6 / 14.3 and design.md §15:
 *   - Renders the placeholder
 *   - Updates the input immediately on keystrokes
 *   - Calls onChange exactly once after the debounce window
 *   - Re-syncs the internal value when the parent legitimately resets `value`
 *
 * Requirements: 2.6, 14.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"

import { ShopSearch } from "@/app/(auth)/select-shop/_components/shop-search"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("<ShopSearch />", () => {
  it("renders the default placeholder", () => {
    render(<ShopSearch value="" onChange={() => {}} />)
    expect(
      screen.getByPlaceholderText("Search by name or branch code"),
    ).toBeInTheDocument()
  })

  it("updates the input value immediately on keystrokes", () => {
    render(<ShopSearch value="" onChange={() => {}} />)
    const input = screen.getByRole("searchbox") as HTMLInputElement

    fireEvent.change(input, { target: { value: "ba" } })

    expect(input.value).toBe("ba")
  })

  it("debounces onChange by 300ms and emits exactly one settled value", () => {
    const onChange = vi.fn()
    render(<ShopSearch value="" onChange={onChange} />)
    const input = screen.getByRole("searchbox")

    fireEvent.change(input, { target: { value: "b" } })
    fireEvent.change(input, { target: { value: "ba" } })
    fireEvent.change(input, { target: { value: "ban" } })

    // Inside the debounce window — onChange should not have fired yet.
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(onChange).not.toHaveBeenCalled()

    // Cross the threshold — onChange fires once with the final value.
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("ban")
  })

  it("re-syncs the internal value when the parent resets the prop externally", () => {
    const { rerender } = render(<ShopSearch value="hello" onChange={() => {}} />)
    const input = screen.getByRole("searchbox") as HTMLInputElement
    expect(input.value).toBe("hello")

    rerender(<ShopSearch value="" onChange={() => {}} />)
    expect(input.value).toBe("")
  })
})
