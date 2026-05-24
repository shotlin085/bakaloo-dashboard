/**
 * Unit tests for the Bank tab — focused on the `maskAccountNumber` helper,
 * which is the only piece of non-trivial pure logic in the tab.
 *
 * Validates that account numbers are surfaced with at most their last four
 * digits visible, and that the masked-portion length is bounded so very
 * long inputs don't accidentally leak account-number length through bullet
 * counts.
 */

import { describe, expect, it } from "vitest"

import { maskAccountNumber } from "../bank-tab"

describe("maskAccountNumber", () => {
  it("returns an em-dash for empty / nullish inputs", () => {
    expect(maskAccountNumber(null)).toBe("—")
    expect(maskAccountNumber(undefined)).toBe("—")
    expect(maskAccountNumber("")).toBe("—")
    expect(maskAccountNumber("   ")).toBe("—")
  })

  it("returns bullets only for short inputs (<=4 chars)", () => {
    expect(maskAccountNumber("1")).toBe("•")
    expect(maskAccountNumber("12")).toBe("••")
    expect(maskAccountNumber("123")).toBe("•••")
    expect(maskAccountNumber("1234")).toBe("••••")
  })

  it("masks all but the last four digits for typical inputs", () => {
    expect(maskAccountNumber("12345")).toBe("• 2345")
    expect(maskAccountNumber("123456789")).toBe("••••• 6789")
    expect(maskAccountNumber("12345678")).toBe("•••• 5678")
  })

  it("caps the bullet count at 8 to avoid leaking length on very long inputs", () => {
    // 16-char input → leading 12 chars masked, but bullet count capped at 8.
    expect(maskAccountNumber("1234567890123456")).toBe("•••••••• 3456")
    // 24-char input → still capped at 8 dots.
    expect(maskAccountNumber("123456789012345678901234")).toBe(
      "•••••••• 1234",
    )
  })

  it("trims surrounding whitespace before masking", () => {
    expect(maskAccountNumber("  12345  ")).toBe("• 2345")
  })
})
