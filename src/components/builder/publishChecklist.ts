import type { SectionManifest } from "@/types/theme.types"
import { getSectionTypeMeta } from "./sectionTypesMeta"

export type PublishIssueLevel = "error" | "warning" | "info"

export interface PublishIssue {
  /** Level: error → must fix; warning → may publish; info → suggestion. */
  level: PublishIssueLevel
  /** Optional section id this issue maps to. */
  sectionId?: string
  /** Stable issue code, useful for filtering or analytics. */
  code: string
  /** Human-readable message. */
  message: string
}

export interface PublishChecklistResult {
  issues: PublishIssue[]
  hasErrors: boolean
  hasWarnings: boolean
  /** True if Push Live is safe (no errors). */
  canPublish: boolean
}

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

const REQUIRED_TITLE_TYPES = new Set(["text_header"])

const REQUIRED_DATA_BINDING_TYPES = new Set([
  "category_product_grid",
  "product_carousel",
  "trending_products",
  "arched_product_showcase",
  "seasonal_mosaic",
])

const TAB_GLOBAL_LIMIT = 15

export function runPublishChecklist(
  sections: SectionManifest[]
): PublishChecklistResult {
  const issues: PublishIssue[] = []

  // Tab-level checks
  if (sections.length === 0) {
    issues.push({
      level: "warning",
      code: "tab.empty",
      message:
        "This tab has no sections. Customers will see an empty page on this tab.",
    })
  }
  if (sections.length > TAB_GLOBAL_LIMIT) {
    issues.push({
      level: "error",
      code: "tab.over_limit",
      message: `Tab has ${sections.length}/${TAB_GLOBAL_LIMIT} sections. Remove some before publishing.`,
    })
  }
  if (sections.length > 0 && sections.every((s) => !s.visible)) {
    issues.push({
      level: "error",
      code: "tab.all_hidden",
      message: "All sections are hidden — customers will see nothing.",
    })
  }

  // Per-section checks
  const seenSignatures = new Map<string, string>()
  for (const section of sections) {
    const meta = getSectionTypeMeta(section.section_type)
    const config = section.config ?? {}

    if (REQUIRED_TITLE_TYPES.has(section.section_type)) {
      const title = (config.text ?? config.title) as unknown
      if (typeof title !== "string" || title.trim() === "") {
        issues.push({
          level: "error",
          sectionId: section.id,
          code: "section.missing_title",
          message: `${meta.label}: title text is empty.`,
        })
      }
    }

    if (
      REQUIRED_DATA_BINDING_TYPES.has(section.section_type) &&
      section.visible
    ) {
      const binding = section.merch_binding
      const hasBinding =
        binding &&
        ((binding.category_ids?.length ?? 0) > 0 ||
          (binding.product_ids?.length ?? 0) > 0 ||
          (binding.tags?.length ?? 0) > 0)
      if (!hasBinding) {
        issues.push({
          level: "warning",
          sectionId: section.id,
          code: "section.no_binding",
          message: `${meta.label}: no products/categories bound — preview will use fallback data.`,
        })
      }
    }

    // Validate any string field that ends with `_color` or is `color` looks like a hex.
    for (const [k, v] of Object.entries(config)) {
      if (
        (k === "color" || k.endsWith("_color")) &&
        typeof v === "string" &&
        v.trim() !== "" &&
        !HEX_PATTERN.test(v.trim())
      ) {
        issues.push({
          level: "error",
          sectionId: section.id,
          code: "section.invalid_color",
          message: `${meta.label}: '${k}' is not a valid hex color (got "${v}").`,
        })
      }
    }

    // Image fields that look required (image_url for custom_banner) shouldn't be empty.
    if (section.section_type === "custom_banner" && section.visible) {
      const url = (config.image_url ?? null) as unknown
      if (typeof url !== "string" || url.trim() === "") {
        issues.push({
          level: "info",
          sectionId: section.id,
          code: "section.banner_no_image",
          message: `${meta.label}: image URL is empty (banner will fall back to gradient).`,
        })
      }
    }

    // Detect duplicate-by-shallow-config sections of the same type that look
    // like accidental copies (same title + same data binding).
    const sig = `${section.section_type}|${(config.title ?? config.text ?? "") as string}|${JSON.stringify(
      section.merch_binding ?? {}
    )}`
    const previous = seenSignatures.get(sig)
    if (previous && sig.split("|")[1]) {
      issues.push({
        level: "info",
        sectionId: section.id,
        code: "section.possible_duplicate",
        message: `${meta.label}: looks like a duplicate of section ${previous}.`,
      })
    } else {
      seenSignatures.set(sig, section.id)
    }
  }

  const hasErrors = issues.some((i) => i.level === "error")
  const hasWarnings = issues.some((i) => i.level === "warning")

  return {
    issues,
    hasErrors,
    hasWarnings,
    canPublish: !hasErrors,
  }
}
