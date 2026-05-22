"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { SectionManifest, SectionType } from "@/types/theme.types"
import SectionTypeCard from "./SectionTypeCard"
import { sectionTypesMeta } from "./sectionTypesMeta"
import { useStoreContext } from "@/contexts/StoreContext"

interface SectionLibraryProps {
  sections: SectionManifest[]
  onAdd: (sectionType: SectionType, defaultConfig: Record<string, unknown>) => void
}

const MAX_SECTIONS_PER_TAB = 15

export default function SectionLibrary({
  sections,
  onAdd,
}: SectionLibraryProps) {
  const { activeStoreKey } = useStoreContext()
  const [query, setQuery] = useState("")

  const totalSections = sections.length
  const normalizedQuery = query.trim().toLowerCase()

  const currentCounts = useMemo(() => {
    return sections.reduce<Partial<Record<SectionType, number>>>((acc, section) => {
      acc[section.section_type] = (acc[section.section_type] ?? 0) + 1
      return acc
    }, {})
  }, [sections])

  const addedCount = useMemo(() => {
    return new Set(sections.map((s) => s.section_type)).size
  }, [sections])

  const filteredTypes = useMemo(() => {
    let types = sectionTypesMeta

    // Store scope filter — only show types available in the active store
    types = types.filter((meta) => {
      if (!meta.storeKeys) return true
      return meta.storeKeys.includes(activeStoreKey)
    })

    // Search filter
    if (normalizedQuery) {
      types = types.filter((meta) => {
        const haystack = `${meta.label} ${meta.type} ${meta.description}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    }

    return types
  }, [activeStoreKey, normalizedQuery])

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
          placeholder="Search sections…"
          className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm"
        />
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
              key={meta.type}
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
          No section types match &ldquo;{query}&rdquo;.
        </div>
      ) : null}
    </section>
  )
}
