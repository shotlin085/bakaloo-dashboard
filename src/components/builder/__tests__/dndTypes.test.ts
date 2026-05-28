import { describe, expect, it } from "vitest"
import {
  canAcceptSectionType,
  insertAt,
  isExistingSectionDrag,
  isInsertSlotDrop,
  isLibrarySectionDrag,
  moveItem,
  DRAG_KIND,
} from "../dndTypes"
import type { SectionManifest } from "@/types/theme.types"

const makeSection = (
  id: string,
  type: SectionManifest["section_type"] = "spacer",
  sortOrder = 0
): SectionManifest => ({
  id,
  tab_id: "tab-1",
  section_type: type,
  sort_order: sortOrder,
  visible: true,
  config: {},
  merch_binding: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
})

describe("dndTypes pure helpers", () => {
  describe("insertAt", () => {
    it("inserts at the start", () => {
      expect(insertAt([1, 2, 3], 0, 9)).toEqual([9, 1, 2, 3])
    })
    it("inserts at the middle", () => {
      expect(insertAt([1, 2, 3], 2, 9)).toEqual([1, 2, 9, 3])
    })
    it("clamps an out-of-range index to end", () => {
      expect(insertAt([1, 2, 3], 99, 9)).toEqual([1, 2, 3, 9])
    })
    it("clamps a negative index to start", () => {
      expect(insertAt([1, 2, 3], -5, 9)).toEqual([9, 1, 2, 3])
    })
  })

  describe("moveItem", () => {
    it("moves down", () => {
      expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"])
    })
    it("moves up", () => {
      expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"])
    })
    it("returns shallow copy when from === to", () => {
      const src = ["a", "b"]
      const next = moveItem(src, 0, 0)
      expect(next).toEqual(["a", "b"])
      expect(next).not.toBe(src)
    })
    it("returns shallow copy when from is out of range", () => {
      expect(moveItem(["a"], 99, 0)).toEqual(["a"])
    })
  })

  describe("canAcceptSectionType", () => {
    const opts = { maxPerTab: 2, globalLimit: 5 }
    it("accepts when under both caps", () => {
      const result = canAcceptSectionType(
        [makeSection("1", "spacer")],
        "spacer",
        opts
      )
      expect(result.allowed).toBe(true)
    })
    it("rejects when section_type at maxPerTab", () => {
      const sections = [
        makeSection("1", "spacer"),
        makeSection("2", "spacer"),
      ]
      const result = canAcceptSectionType(sections, "spacer", opts)
      expect(result.allowed).toBe(false)
      expect(result.reason).toMatch(/Maximum/i)
    })
    it("rejects when global cap reached", () => {
      const sections = Array.from({ length: 5 }, (_, i) =>
        makeSection(String(i + 1), "spacer")
      )
      const result = canAcceptSectionType(sections, "spacer", opts)
      expect(result.allowed).toBe(false)
      expect(result.reason).toMatch(/Tab section limit/i)
    })
  })

  describe("type guards", () => {
    it("detects library drag", () => {
      expect(
        isLibrarySectionDrag({
          kind: DRAG_KIND.LIBRARY_SECTION,
          sectionType: "spacer",
          defaultConfig: {},
          source: "library",
        })
      ).toBe(true)
      expect(isLibrarySectionDrag({ kind: "other" })).toBe(false)
      expect(isLibrarySectionDrag(null)).toBe(false)
    })
    it("detects existing section drag (stack + preview)", () => {
      expect(
        isExistingSectionDrag({
          kind: DRAG_KIND.EXISTING_SECTION_STACK,
          sectionId: "x",
          sectionType: "spacer",
          source: "stack",
        })
      ).toBe(true)
      expect(
        isExistingSectionDrag({
          kind: DRAG_KIND.EXISTING_SECTION_PREVIEW,
          sectionId: "x",
          sectionType: "spacer",
          source: "preview",
        })
      ).toBe(true)
      expect(isExistingSectionDrag({ kind: "library_section" })).toBe(false)
    })
    it("detects insert slot drop", () => {
      expect(
        isInsertSlotDrop({ kind: DRAG_KIND.PREVIEW_INSERT_SLOT, index: 2 })
      ).toBe(true)
      expect(isInsertSlotDrop({ kind: "library_section" })).toBe(false)
    })
  })
})
