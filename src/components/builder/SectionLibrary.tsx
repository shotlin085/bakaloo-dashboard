"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { SectionManifest, SectionType } from "@/types/theme.types"
import { useStoreContext } from "@/contexts/StoreContext"
import SectionTypeCard from "./SectionTypeCard"
import {
  QUICK_TAGS,
  SECTION_GROUP_META,
  sectionTypesMeta,
  type QuickTag,
  type SectionTemplateGroup,
} from "./sectionTypesMeta"

interface SectionLibraryProps {
  sections: SectionManifest[]
  onAdd: (sectionType: SectionType, defaultConfig: Record<string, unknown>) => void
}

const MAX_SECTIONS_PER_TAB = 40
type GroupFilter = "all" | SectionTemplateGroup

const GROUP_OPTIONS: Array<{ value: GroupFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "header", label: SECTION_GROUP_META.header.label },
  { value: "hero", label: SECTION_GROUP_META.hero.label },
  { value: "offers", label: SECTION_GROUP_META.offers.label },
  { value: "products", label: SECTION_GROUP_META.products.label },
  { value: "categories", label: SECTION_GROUP_META.categories.label },
  { value: "content", label: SECTION_GROUP_META.content.label },
  { value: "seasonal", label: SECTION_GROUP_META.seasonal.label },
]

export default function SectionLibrary({
  sections,
  onAdd,
}: SectionLibraryProps) {
  const { activeStoreKey } = useStoreContext()
  const [query, setQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all")
  const [activeTags, setActiveTags] = useState<QuickTag[]>([])

  const totalSections = sections.length
  const normalizedQuery = query.trim().toLowerCase()

  const currentCounts = useMemo(() => {
    return sections.reduce<Partial<Record<SectionType, number>>>(
      (acc, section) => {
        acc[section.section_type] = (acc[section.section_type] ?? 0) + 1
        return acc
      },
      {}
    )
  }, [sections])

  const addedCount = useMemo(() => {
    return new Set(sections.map((s) => s.section_type)).size
  }, [sections])

  const filteredTypes = useMemo(() => {
    let types = sectionTypesMeta

    types = types.filter((meta) => {
      if (!meta.storeKeys) return true
      return meta.storeKeys.includes(activeStoreKey)
    })

    if (groupFilter !== "all") {
      types = types.filter((meta) => meta.group === groupFilter)
    }

    if (activeTags.length > 0) {
      types = types.filter((meta) =>
        activeTags.every((tag) => meta.tags?.includes(tag))
      )
    }

    if (normalizedQuery) {
      types = types.filter((meta) => {
        const haystack = `${meta.label} ${meta.type} ${meta.description} ${
          meta.useCase ?? ""
        } ${(meta.tags ?? []).join(" ")}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    }

    return types
  }, [activeStoreKey, normalizedQuery, groupFilter, activeTags])

  const toggleTag = (tag: QuickTag) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )

  return (
    <section className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm"
          >
            {totalSections}/{MAX_SECTIONS_PER_TAB} slots
          </Badge>
          <span className="text-[11px] text-slate-400">•</span>
          <span className="text-[11px] font-medium text-slate-500">
            {addedCount} types used
          </span>
        </div>
        {totalSections >= MAX_SECTIONS_PER_TAB ? (
          <Badge className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
            Tab Full
          </Badge>
        ) : null}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sections, tags, use case…"
          className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm"
        />
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-1.5">
        {GROUP_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={groupFilter === opt.value ? "default" : "outline"}
            className="h-7 rounded-full border-slate-200 px-3 text-[11px]"
            onClick={() => setGroupFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Quick-tag chips */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_TAGS.map((tag) => {
          const active = activeTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
                active
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              {tag}
            </button>
          )
        })}
        {activeTags.length > 0 ? (
          <button
            type="button"
            onClick={() => setActiveTags([])}
            className="rounded-full border border-transparent px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 hover:text-slate-700"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-3">
        {filteredTypes.map((meta) => {
          const currentCount = currentCounts[meta.type] ?? 0
          const typeLimitReached = currentCount >= meta.maxPerTab
          const tabLimitReached = totalSections >= MAX_SECTIONS_PER_TAB
          const isDisabled = typeLimitReached || tabLimitReached
          const disabledReason = typeLimitReached
            ? "Maximum reached"
            : "Tab limit reached"

          return (
            <SectionTypeCard
              key={meta.id}
              meta={meta}
              currentCount={currentCount}
              isDisabled={isDisabled}
              disabledReason={disabledReason}
              onAdd={onAdd}
            />
          )
        })}
      </div>

      {filteredTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
          No section templates match your filters.
        </div>
      ) : null}
    </section>
  )
}
