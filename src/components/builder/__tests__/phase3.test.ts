import { describe, expect, it } from "vitest"
import { applyStylePreset, getStylePresets, SECTION_STYLE_PRESETS } from "../sectionStylePresets"
import { applyPagePresetStyle, getPagePresetById, PAGE_THEME_PRESETS, STARTER_TEMPLATES } from "../pagePresets"
import { runPublishChecklist } from "../publishChecklist"
import { sectionTypesMeta } from "../sectionTypesMeta"
import type { SectionManifest, ThemeData } from "@/types/theme.types"

const baseSection = (overrides: Partial<SectionManifest> = {}): SectionManifest => ({
  id: "s-1", tab_id: "tab-1", section_type: "spacer", sort_order: 0,
  visible: true, config: {}, merch_binding: null,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
})

const baseThemeData = (): ThemeData => ({
  sections: {
    topBar: { backgroundColor: "#FFFFFF", textColor: "#0F172A" },
    storeSelector: { backgroundColor: "#FFFFFF", activeChipColor: "#F1F5F9" },
    categoryTabs: { visible: true, textColor: "#111827", indicatorColor: "#111827" },
    searchZone: { backgroundColor: "#FFFFFF", waveColor: "#E2E8F0", searchHints: [], promoBoxImageUrl: null },
    bannerAnimation: { lottieUrl: null, backgroundGradient: ["#E8F5E9", "#C8E6C9"], containerColor: "#FFFFFF" },
    feeStrip: { imageUrl: null, visible: true },
    seasonalMosaic: { containerColor: "#FFF8E1", heroTile: { title: "Hero", gradient: ["#FFF8E1", "#FFE082"], badgeText: "", badgeGradient: ["#FFB300", "#F57C00"] }, miniTiles: [] },
    bankOffers: { visible: true, bannerImageUrls: [] },
  },
  meta: { seasonLabel: "default", statusBarBrightness: "dark" },
})

describe("Phase 3 — metadata", () => {
  it("every section type has a group", () => {
    for (const m of sectionTypesMeta) expect(m.group).toBeDefined()
  })
  it("every section type has dataSources", () => {
    for (const m of sectionTypesMeta) expect((m.dataSources?.length ?? 0) > 0).toBe(true)
  })
  it("style preset patches are non-empty", () => {
    for (const [, presets] of Object.entries(SECTION_STYLE_PRESETS)) {
      for (const p of presets ?? []) expect(Object.keys(p.patch).length).toBeGreaterThan(0)
    }
  })
})

describe("Phase 3 — applyStylePreset", () => {
  it("deep-merges without overwriting unrelated keys", () => {
    const c = { gradient: ["#000"], height: 200, banner: { enabled: true, height: 100 } }
    const n = applyStylePreset(c, { gradient: ["#FFF"], banner: { height: 120 } })
    expect(n.gradient).toEqual(["#FFF"])
    expect(n.height).toBe(200)
    expect(n.banner).toEqual({ enabled: true, height: 120 })
  })
  it("does not mutate input", () => {
    const c = { a: 1 }
    applyStylePreset(c, { a: 99 })
    expect(c.a).toBe(1)
  })
  it("returns [] for unknown section", () => {
    expect(getStylePresets("custom_banner")).toEqual([])
  })
})

describe("Phase 3 — page presets", () => {
  it("merges patch into theme_data.sections", () => {
    const t = baseThemeData()
    const p = getPagePresetById("blink-quick-commerce")!
    const n = applyPagePresetStyle(t, p)
    expect(n.sections.topBar.backgroundColor).toBe("#FFD400")
    expect(n.sections.bankOffers).toEqual(t.sections.bankOffers)
  })
  it("recommended sections reference valid types", () => {
    const valid = new Set(sectionTypesMeta.map((m) => m.type))
    for (const p of PAGE_THEME_PRESETS)
      for (const e of p.recommendedSections) expect(valid.has(e.section_type)).toBe(true)
  })
  it("starter templates reference valid preset ids", () => {
    const ids = new Set(PAGE_THEME_PRESETS.map((p) => p.id))
    for (const t of STARTER_TEMPLATES) expect(ids.has(t.presetId)).toBe(true)
  })
})

describe("Phase 3 — publish checklist", () => {
  it("empty tab = warning, can publish", () => {
    const r = runPublishChecklist([])
    expect(r.canPublish).toBe(true)
    expect(r.issues.find((i) => i.code === "tab.empty")?.level).toBe("warning")
  })
  it("missing title = error", () => {
    const r = runPublishChecklist([baseSection({ section_type: "text_header", config: { text: "" } })])
    expect(r.canPublish).toBe(false)
  })
  it("no binding = warning", () => {
    const r = runPublishChecklist([baseSection({ id: "p", section_type: "product_carousel" })])
    expect(r.issues.find((i) => i.code === "section.no_binding")?.level).toBe("warning")
    expect(r.canPublish).toBe(true)
  })
  it("invalid color = error", () => {
    const r = runPublishChecklist([baseSection({ section_type: "fee_strip", config: { container_color: "bad" } })])
    expect(r.canPublish).toBe(false)
  })
  it("all hidden = error", () => {
    const r = runPublishChecklist([baseSection({ id: "a", visible: false }), baseSection({ id: "b", visible: false })])
    expect(r.canPublish).toBe(false)
  })
  it("clean tab passes", () => {
    const r = runPublishChecklist([baseSection({ section_type: "fee_strip" })])
    expect(r.canPublish).toBe(true)
    expect(r.hasErrors).toBe(false)
  })
})
