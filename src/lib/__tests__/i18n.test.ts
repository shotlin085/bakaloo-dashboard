/**
 * Unit tests for the i18n helper.
 *
 * Validates: Requirements 16.1 (translation key lookup with interpolation
 * and pluralization) and 16.2 (locale-aware currency / date formatting).
 */

import { beforeEach, describe, it, expect } from "vitest"

import { t, formatCurrency, formatDate, setLocale } from "@/lib/i18n"

// All tests assume the default `"en"` locale. Reset before each describe so a
// future locale-switching test cannot leak state across this file.
beforeEach(() => setLocale("en"))

describe("formatCurrency", () => {
  it("formats INR with the rupee symbol and two decimals", () => {
    const out = formatCurrency(1234.5, "INR")
    // Some Node ICU builds insert a non-breaking space between symbol and
    // number, so we assert on substrings rather than full equality.
    expect(out).toContain("₹")
    expect(out).toContain("1,234.50")
  })

  it("formats EUR with the euro symbol or the 'EUR' code, plus two decimals", () => {
    const out = formatCurrency(1234.5, "EUR")
    // Some locales render the ISO code instead of the symbol; accept either.
    expect(out.includes("€") || out.includes("EUR")).toBe(true)
    expect(out).toContain("1,234.50")
  })

  it("defaults to INR when no currency is provided", () => {
    expect(formatCurrency(10)).toContain("₹")
  })
})

describe("formatDate", () => {
  const ISO = "2024-12-25T09:30:00Z"

  it("returns a non-empty string for the short format", () => {
    const out = formatDate(ISO, "short")
    expect(out).toBeTruthy()
    expect(typeof out).toBe("string")
  })

  it("returns a non-empty string for the long format", () => {
    const out = formatDate(ISO, "long")
    expect(out).toBeTruthy()
    expect(typeof out).toBe("string")
  })

  it("produces different output for short vs long", () => {
    const short = formatDate(ISO, "short")
    const long = formatDate(ISO, "long")
    expect(short).not.toEqual(long)
    // Long includes the year as 4 digits; short typically uses 2.
    expect(long).toContain("2024")
  })
})

describe("t — flat lookup", () => {
  it("returns the seeded value for emptyShop.title", () => {
    expect(t("emptyShop.title")).toBe("Select a shop")
  })

  it("returns the missing key itself as a loud dev fallback", () => {
    expect(t("does.not.exist")).toBe("does.not.exist")
  })
})

describe("t — interpolation", () => {
  it("interpolates the {name} and {qty} params for shopProducts.toast.lowStock", () => {
    expect(
      t("shopProducts.toast.lowStock", { name: "Apples", qty: 3 }),
    ).toBe("Low stock: Apples (3 left)")
  })

  it("interpolates the {name} param for shopProducts.toast.soldOut", () => {
    expect(t("shopProducts.toast.soldOut", { name: "Bananas" })).toBe(
      "Out of stock: Bananas",
    )
  })

  it("interpolates the {name} param for shopScope.badge", () => {
    expect(t("shopScope.badge", { name: "Shop A" })).toBe("Shop: Shop A")
  })
})

describe("t — pluralization", () => {
  it("returns the singular form when count === 1", () => {
    expect(t("shops.list.count", { count: 1 })).toBe("1 shop")
  })

  it("returns the plural form with interpolated count when count !== 1", () => {
    expect(t("shops.list.count", { count: 5 })).toBe("5 shops")
  })

  it("returns the plural form when count === 0", () => {
    expect(t("shops.list.count", { count: 0 })).toBe("0 shops")
  })

  it("plural support also works for shopStaff.list.count", () => {
    expect(t("shopStaff.list.count", { count: 1 })).toBe("1 member")
    expect(t("shopStaff.list.count", { count: 7 })).toBe("7 members")
  })
})
