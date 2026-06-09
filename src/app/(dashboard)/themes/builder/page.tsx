"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import {
  DndContext,
  DragOverlay as DndDragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  BadgePlus,
  ChevronsLeft,
  ChevronsRight,
  Layers3,
  Loader2,
  Sparkles,
} from "lucide-react"
import {
  usePathname,
  useSearchParams,
} from "next/navigation"
import { toast } from "sonner"
import BuilderToolbar from "@/components/builder/BuilderToolbar"
import BuilderDragOverlay from "@/components/builder/DragOverlay"
import TabManagerPanel from "@/components/builder/TabManagerPanel"
import NewTabDialog from "@/components/builder/NewTabDialog"
import { TimelineBar } from "@/components/builder/TimelineBar"
import { MobilePreviewFrame } from "@/components/builder/MobilePreviewFrame"
import RightPanel from "@/components/builder/RightPanel"
import SortableSectionList from "@/components/builder/SortableSectionList"
import TabNavbar from "@/components/builder/TabNavbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  isExistingSectionDrag,
  isInsertSlotDrop,
  isLibrarySectionDrag,
  canAcceptSectionType,
  type BuilderDragData,
} from "@/components/builder/dndTypes"
import { getSectionTypeMeta } from "@/components/builder/sectionTypesMeta"
import {
  applyPagePresetStyle,
  type PageThemePreset,
} from "@/components/builder/pagePresets"
import { runPublishChecklist } from "@/components/builder/publishChecklist"
import ThemePresetPicker from "@/components/builder/ThemePresetPicker"
import { useUpdateTheme } from "@/hooks/useThemes"
import {
  useAddSection,
  useDeleteSection,
  useDuplicateSection,
  useReorderSections,
  useScheduleSectionLayout,
  useSections,
  useSectionVersions,
  useUpdateSection,
  useUpdateSectionMerch,
} from "@/hooks/useSections"
import { useBuilderHistory } from "@/hooks/useBuilderHistory"
import {
  clearAutosaveDraft,
  readAutosaveDraft,
  useBuilderAutosave,
} from "@/hooks/useBuilderAutosave"
import { useTabThemes } from "@/hooks/useThemes"
import { useArchiveThemeTab, useCreateThemeTab, useThemeTabs, useUpdateThemeTab } from "@/hooks/useThemeTabs"
import { useStoreContext } from "@/contexts/StoreContext"
import { getSections, getSectionVersions } from "@/services/sections.service"
import type {
  MerchBinding,
  ScheduleSectionLayoutPayload,
  SectionManifest,
  SectionType,
  Theme,
  ThemeData,
  ThemeTab,
  UpdateSectionMerchPayload,
} from "@/types/theme.types"
import type { ChromeRegion } from "@/components/builder/chromeRegions"

type BuilderStatus = "Draft" | "Live" | "Scheduled"

type BuilderSection = SectionManifest & {
  __builder?: {
    duplicateSourceId?: string | null
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createTempId() {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `temp-section-${randomId}`
}

function isTempId(id: string) {
  return id.startsWith("temp-section-")
}

function normalizeMerchBinding(binding: MerchBinding | null) {
  if (!binding) return null
  return {
    ...binding,
    category_ids: [...(binding.category_ids ?? [])],
    product_ids: [...(binding.product_ids ?? [])],
    tags: [...(binding.tags ?? [])],
  }
}

function cloneBuilderSection(section: SectionManifest): BuilderSection {
  return {
    ...section,
    config: deepClone(section.config ?? {}),
    merch_binding: normalizeMerchBinding(section.merch_binding),
  }
}

function normalizeBuilderSections(sections: SectionManifest[]): BuilderSection[] {
  return [...sections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section, index) => ({
      ...cloneBuilderSection(section),
      sort_order: index,
    }))
}

function sectionsBelongToTab(
  sections: SectionManifest[] | undefined,
  tabId: string | null
) {
  if (!tabId || !sections?.length) return true
  return sections.every((section) => section.tab_id === tabId)
}

function reindexSections(sections: BuilderSection[]) {
  return sections.map((section, index) => ({
    ...section,
    sort_order: index,
  }))
}

function serializeComparable(value: unknown) {
  return JSON.stringify(value ?? null)
}

function createEmptyMerchPayload(): UpdateSectionMerchPayload {
  return {
    category_ids: [],
    product_ids: [],
    tags: [],
    limit: 12,
    source: "category",
  }
}

function toMerchPayload(binding: MerchBinding | null): UpdateSectionMerchPayload {
  if (!binding) {
    return createEmptyMerchPayload()
  }

  return {
    category_ids: [...(binding.category_ids ?? [])],
    product_ids: [...(binding.product_ids ?? [])],
    tags: [...(binding.tags ?? [])],
    limit: binding.limit,
    source: binding.source,
  }
}

function derivePersistedStatus(
  latestVersion: { status: "applied" | "scheduled" | "expired" } | null
): BuilderStatus {
  return latestVersion?.status === "scheduled" ? "Scheduled" : "Live"
}

function slugifyTabKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function makeUniqueTabKey(label: string, tabs: ThemeTab[]) {
  const baseKey = slugifyTabKey(label) || "new_tab"
  let key = baseKey
  let counter = 2

  while (tabs.some((tab) => tab.key === key)) {
    key = `${baseKey}_${counter}`
    counter += 1
  }

  return key
}

export default function ThemeBuilderPage() {
  return (
    <Suspense fallback={<BuilderLoadingState />}>
      <ThemeBuilderPageContent />
    </Suspense>
  )
}

function BuilderLoadingState() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        <span className="text-sm text-slate-600">Loading section builder…</span>
      </div>
    </div>
  )
}

function BuilderTabSkeletonState() {
  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-[linear-gradient(180deg,#f5f7fb_0%,#edf2f7_100%)]">
      <div className="flex flex-1 gap-4 px-4 pb-4 pt-4">
        <div className="flex w-[300px] flex-col gap-0">
          {/* Header skeleton */}
          <div className="rounded-t-[24px] border border-b-0 border-slate-200/80 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-3 w-28 animate-pulse rounded-full bg-slate-100" />
            </div>
            {/* Store chip skeletons */}
            <div className="mt-3 flex gap-2 border-b border-slate-200/80 pb-2">
              {[72, 88, 64, 56].map((w, i) => (
                <div key={i} className="h-10 animate-pulse rounded-[14px] bg-slate-100" style={{ width: w }} />
              ))}
            </div>
            {/* Tab dropdown skeleton */}
            <div className="mt-2 flex gap-2">
              <div className="h-9 flex-1 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
          {/* Section card skeletons */}
          <div className="flex flex-1 flex-col gap-2 rounded-b-[24px] border border-slate-200/80 bg-white p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ThemeBuilderPageContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [requestedTabKey, setRequestedTabKey] = useState<string | null>(() =>
    searchParams.get("tab")
  )

  const { activeStoreKey, setActiveStoreKey, storeConfig } = useStoreContext()
  const { data: themeTabs = [], isLoading: isLoadingTabs } = useThemeTabs({
    store_key: activeStoreKey,
    status: "active",
  })
  const { data: tabThemes = [] } = useTabThemes()

  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [selectedChromeRegion, setSelectedChromeRegion] =
    useState<ChromeRegion | null>(null)
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)
  const sectionsHistory = useBuilderHistory<BuilderSection[]>([])
  const localSections = sectionsHistory.present
  // Adapter that matches React.useState API but routes through history.
  const setLocalSections = (
    next: BuilderSection[] | ((prev: BuilderSection[]) => BuilderSection[])
  ) => {
    if (typeof next === "function") {
      sectionsHistory.update(
        next as (prev: BuilderSection[]) => BuilderSection[]
      )
    } else {
      sectionsHistory.set(next)
    }
  }
  // Resets history (used after server fetch, tab switch, discard, save).
  const resetLocalSections = (next: BuilderSection[]) => {
    sectionsHistory.reset(next)
  }
  const [activeDragData, setActiveDragData] =
    useState<BuilderDragData | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [persistedStatus, setPersistedStatus] = useState<BuilderStatus>("Live")
  const [versionNumber, setVersionNumber] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTabSwitching, setIsTabSwitching] = useState(false)
  const [tabManagerOpen, setTabManagerOpen] = useState(false)
  const [newTabOpen, setNewTabOpen] = useState(false)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)

  // Reset tab/section/dirty state when the active store changes
  const prevStoreRef = useRef(activeStoreKey)
  useEffect(() => {
    if (prevStoreRef.current !== activeStoreKey) {
      setActiveTabId(null)
      setSelectedSectionId(null)
      setIsDirty(false)
      prevStoreRef.current = activeStoreKey
    }
  }, [activeStoreKey])

  const sectionsQuery = useSections(activeTabId)
  const versionsQuery = useSectionVersions(activeTabId)

  const addSectionMutation = useAddSection()
  const deleteSectionMutation = useDeleteSection()
  const reorderSectionsMutation = useReorderSections()
  const updateSectionMutation = useUpdateSection()
  const updateSectionMerchMutation = useUpdateSectionMerch()
  const duplicateSectionMutation = useDuplicateSection()
  const scheduleSectionLayoutMutation = useScheduleSectionLayout()
  const createThemeTabMutation = useCreateThemeTab()
  const updateThemeTabMutation = useUpdateThemeTab()
  const archiveThemeTabMutation = useArchiveThemeTab()

  const activeTab =
    themeTabs.find((tab) => tab.id === activeTabId) ??
    (requestedTabKey
      ? themeTabs.find((tab) => tab.key === requestedTabKey) ?? null
      : null)

  const activeThemeData: ThemeData | null =
    tabThemes.find(
      (theme) => theme.tab_id === activeTab?.id && theme.status === "active"
    )?.theme_data ??
    tabThemes.find(
      (theme) => theme.tab_key === activeTab?.key && theme.status === "active"
    )?.theme_data ??
    tabThemes.find((theme) => theme.tab_key === "all" && theme.status === "active")
      ?.theme_data ??
    null

  // The full Theme object backing activeThemeData — needed for chrome region editing.
  const activeTheme: Theme | null =
    tabThemes.find(
      (theme) => theme.tab_id === activeTab?.id && theme.status === "active"
    ) ??
    tabThemes.find(
      (theme) => theme.tab_key === activeTab?.key && theme.status === "active"
    ) ??
    tabThemes.find((theme) => theme.tab_key === "all" && theme.status === "active") ??
    null

  const selectedSection =
    localSections.find((section) => section.id === selectedSectionId) ?? null

  const latestVersion = versionsQuery.data?.[0] ?? null

  useEffect(() => {
    if (!themeTabs.length) return

    const tabFromUrl = requestedTabKey
      ? themeTabs.find((tab) => tab.key === requestedTabKey)
      : null
    const activeTabStillExists = activeTabId
      ? themeTabs.some((tab) => tab.id === activeTabId)
      : false

    if (tabFromUrl && tabFromUrl.id !== activeTabId) {
      setActiveTabId(tabFromUrl.id)
      return
    }

    if (!activeTabStillExists) {
      setActiveTabId(themeTabs[0].id)
    }
  }, [activeTabId, requestedTabKey, themeTabs])

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncRequestedTabKeyFromHistory = () => {
      const params = new URLSearchParams(window.location.search)
      setRequestedTabKey(params.get("tab"))
    }

    window.addEventListener("popstate", syncRequestedTabKeyFromHistory)
    return () => {
      window.removeEventListener("popstate", syncRequestedTabKeyFromHistory)
    }
  }, [])

  useEffect(() => {
    if (!activeTab) return
    if (requestedTabKey === activeTab.key) return

    const params = new URLSearchParams(window.location.search)
    params.set("tab", activeTab.key)
    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    window.history.replaceState(window.history.state, "", nextUrl)
    setRequestedTabKey(activeTab.key)
  }, [activeTab, pathname, requestedTabKey])

  useEffect(() => {
    if (isDirty) return
    if (!sectionsBelongToTab(sectionsQuery.data, activeTabId)) return
    resetLocalSections(normalizeBuilderSections(sectionsQuery.data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, sectionsQuery.data, activeTabId])

  useEffect(() => {
    if (!selectedSectionId) return
    if (localSections.some((section) => section.id === selectedSectionId)) return
    setSelectedSectionId(null)
  }, [localSections, selectedSectionId])

  useEffect(() => {
    setPersistedStatus(derivePersistedStatus(latestVersion))
    setVersionNumber(Math.max(1, latestVersion?.version ?? 1))
  }, [activeTabId, latestVersion])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!isDirty) {
      window.onbeforeunload = null
      return
    }

    window.onbeforeunload = () => ""

    return () => {
      window.onbeforeunload = null
    }
  }, [isDirty])

  // Auto-bind store key to the active tab's store_key.
  // The store switcher UI is hidden — only one default mobile home layout is needed
  // for the current mobile experience. Underlying store data is preserved for the API.
  useEffect(() => {
    if (activeTab && activeTab.store_key !== activeStoreKey) {
      setActiveStoreKey(activeTab.store_key)
    }
  }, [activeTab, activeStoreKey, setActiveStoreKey])

  // On mobile/tablet, scroll to the editor panel when a section is selected
  useEffect(() => {
    if (!selectedSectionId) return
    if (typeof window === "undefined") return

    // Only auto-scroll on narrow screens (below xl breakpoint)
    const isNarrow = window.innerWidth < 1280
    if (!isNarrow) return

    const timer = setTimeout(() => {
      const panel = document.getElementById("right-panel-editor")
      if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [selectedSectionId])

  const displayStatus: BuilderStatus = isDirty ? "Draft" : persistedStatus
  const displayVersion = isDirty ? versionNumber + 1 : versionNumber

  const markDirty = () => {
    setIsDirty(true)
  }

  const handleTabChange = async (tabId: string) => {
    if (tabId === activeTabId || isTabSwitching) return

    if (
      isDirty &&
      !window.confirm("Discard unsaved builder changes and switch tabs?")
    ) {
      return
    }

    setIsTabSwitching(true)

    try {
      const nextTab = themeTabs.find((tab) => tab.id === tabId) ?? null
      const [nextSections, nextVersions] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: ["sections", tabId],
          queryFn: () => getSections(tabId),
          staleTime: 30_000,
        }),
        queryClient.fetchQuery({
          queryKey: ["sections", tabId, "versions"],
          queryFn: () => getSectionVersions(tabId),
          staleTime: 30_000,
        }),
      ])

      if (nextTab) {
        setRequestedTabKey(nextTab.key)
      }
      setActiveTabId(tabId)
      resetLocalSections(normalizeBuilderSections(nextSections))
      setSelectedSectionId(null)
      setIsDirty(false)
      setPersistedStatus(derivePersistedStatus(nextVersions[0] ?? null))
      setVersionNumber(Math.max(1, nextVersions[0]?.version ?? 1))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to switch tabs"
      )
    } finally {
      setIsTabSwitching(false)
    }
  }

  const handleCreateTab = () => {
    setNewTabOpen(true)
  }

  const handleNewTabCreate = (params: {
    label: string
    key: string
    store_key: import("@/types/theme.types").ThemeStoreKey
  }) => {
    createThemeTabMutation.mutate(
      {
        store_key: params.store_key,
        key: params.key,
        label: params.label,
        sort_order: themeTabs.length,
        status: "active",
      },
      {
        onSuccess: (createdTab) => {
          setNewTabOpen(false)
          setIsDirty(false)
          setSelectedSectionId(null)
          setRequestedTabKey(createdTab.key)
          setActiveTabId(createdTab.id)
        },
      }
    )
  }

  const handleTabUpdate = (tabId: string, label: string) => {
    updateThemeTabMutation.mutate({ id: tabId, payload: { label } })
  }

  const handleTabArchive = (tabId: string) => {
    if (!window.confirm("Archive this tab? It will be hidden from the builder.")) return
    archiveThemeTabMutation.mutate(tabId)
  }

  const handleAddSection = (
    sectionType: SectionType,
    defaultConfig: Record<string, unknown>
  ) => {
    if (!activeTab) {
      toast.error("Select a tab before adding a section")
      return
    }

    const now = new Date().toISOString()
    const nextSection: BuilderSection = {
      id: createTempId(),
      tab_id: activeTab.id,
      tab_key: activeTab.key,
      store_key: activeTab.store_key,
      section_type: sectionType,
      sort_order: localSections.length,
      visible: true,
      config: deepClone(defaultConfig),
      merch_binding: null,
      created_at: now,
      updated_at: now,
    }

    setLocalSections((current) => reindexSections([...current, nextSection]))
    setSelectedSectionId(nextSection.id)
    markDirty()
  }

  /**
   * Insert a brand-new section at a specific index. Used by drag-from-library
   * drop handler. Reuses the same defaults that the click-Add button uses.
   * Returns true on success so the caller can decide on UX feedback.
   */
  const handleInsertSection = (
    sectionType: SectionType,
    defaultConfig: Record<string, unknown>,
    index: number
  ): boolean => {
    if (!activeTab) {
      toast.error("Select a tab before adding a section")
      return false
    }

    const meta = getSectionTypeMeta(sectionType)
    const acceptance = canAcceptSectionType(localSections, sectionType, {
      maxPerTab: meta.maxPerTab,
      globalLimit: 15,
    })
    if (!acceptance.allowed) {
      toast.error(acceptance.reason ?? "Section cannot be added")
      return false
    }

    const now = new Date().toISOString()
    const nextSection: BuilderSection = {
      id: createTempId(),
      tab_id: activeTab.id,
      tab_key: activeTab.key,
      store_key: activeTab.store_key,
      section_type: sectionType,
      sort_order: 0,
      visible: true,
      config: deepClone(defaultConfig),
      merch_binding: null,
      created_at: now,
      updated_at: now,
    }

    setLocalSections((current) => {
      const copy = current.slice()
      const safeIndex = Math.max(0, Math.min(index, copy.length))
      copy.splice(safeIndex, 0, nextSection)
      return reindexSections(copy)
    })
    setSelectedSectionId(nextSection.id)
    setSelectedChromeRegion(null)
    markDirty()
    return true
  }

  const handleRemoveSection = (id: string) => {
    setLocalSections((current) =>
      reindexSections(current.filter((section) => section.id !== id))
    )
    if (selectedSectionId === id) {
      setSelectedSectionId(null)
    }
    markDirty()
  }

  const handleToggleVisibility = (id: string, visible: boolean) => {
    setLocalSections((current) =>
      current.map((section) =>
        section.id === id
          ? {
              ...section,
              visible,
              updated_at: new Date().toISOString(),
            }
          : section
      )
    )
    markDirty()
  }

  const handleDuplicateSection = (id: string) => {
    const source = localSections.find((section) => section.id === id)
    if (!source || !activeTab) return

    const now = new Date().toISOString()
    const duplicated: BuilderSection = {
      ...deepClone(source),
      id: createTempId(),
      tab_id: activeTab.id,
      tab_key: activeTab.key,
      store_key: activeTab.store_key,
      created_at: now,
      updated_at: now,
      __builder: {
        duplicateSourceId: isTempId(source.id)
          ? source.__builder?.duplicateSourceId ?? null
          : source.id,
      },
    }

    setLocalSections((current) => reindexSections([...current, duplicated]))
    setSelectedSectionId(duplicated.id)
    markDirty()
  }

  const handleMoveSectionUp = (id: string) => {
    setLocalSections((current) => {
      const idx = current.findIndex((s) => s.id === id)
      if (idx <= 0) return current
      const next = [...current]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return reindexSections(next)
    })
    markDirty()
  }

  const handleMoveSectionDown = (id: string) => {
    setLocalSections((current) => {
      const idx = current.findIndex((s) => s.id === id)
      if (idx < 0 || idx >= current.length - 1) return current
      const next = [...current]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return reindexSections(next)
    })
    markDirty()
  }

  const handleReorderSections = (newOrder: string[]) => {
    setLocalSections((current) => {
      const lookup = new Map(current.map((section) => [section.id, section]))
      const reordered = newOrder
        .map((id) => lookup.get(id))
        .filter((section): section is BuilderSection => Boolean(section))
      return reindexSections(reordered)
    })
    markDirty()
  }
  // Suppress lint warning — kept for callers that may rely on explicit string-id reorder
  // (e.g. external hooks or tests). The shared DnD pipeline calls setLocalSections directly.
  void handleReorderSections

  const handleConfigChange = (config: Record<string, unknown>) => {
    if (!selectedSectionId) return

    setLocalSections((current) =>
      current.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              config: deepClone(config),
              updated_at: new Date().toISOString(),
            }
          : section
      )
    )
    markDirty()
  }

  const handleMerchBindingChange = (binding: UpdateSectionMerchPayload) => {
    if (!selectedSectionId) return

    setLocalSections((current) =>
      current.map((section) => {
        if (section.id !== selectedSectionId) {
          return section
        }

        const nextBinding: MerchBinding = {
          source: binding.source ?? section.merch_binding?.source ?? "category",
          category_ids:
            binding.category_ids ?? section.merch_binding?.category_ids ?? [],
          product_ids:
            binding.product_ids ?? section.merch_binding?.product_ids ?? [],
          tags: binding.tags ?? section.merch_binding?.tags ?? [],
          limit: binding.limit ?? section.merch_binding?.limit ?? 12,
        }

        return {
          ...section,
          merch_binding: nextBinding,
          updated_at: new Date().toISOString(),
        }
      })
    )
    markDirty()
  }

  const handleDiscard = () => {
    resetLocalSections(normalizeBuilderSections(sectionsQuery.data ?? []))
    setSelectedSectionId(null)
    setIsDirty(false)
    clearAutosaveDraft(activeTabId)
  }

  const persistLayout = async (targetStatus: Exclude<BuilderStatus, "Scheduled">) => {
    if (!activeTabId) return false

    if (!isDirty) {
      setPersistedStatus(targetStatus)
      return true
    }

    setIsProcessing(true)

    const snapshot = [...localSections]
    const snapshotSelectedId = selectedSectionId

    try {
      const originalSections = normalizeBuilderSections(sectionsQuery.data ?? [])
      const draftSections = reindexSections([...localSections])
      const draftIds = new Set(draftSections.filter((section) => !isTempId(section.id)).map((section) => section.id))
      const originalById = new Map(originalSections.map((section) => [section.id, section]))
      const selectedIdMap = new Map<string, string>()
      const materializedSections: BuilderSection[] = []

      for (const serverSection of originalSections) {
        if (!draftIds.has(serverSection.id)) {
          await deleteSectionMutation.mutateAsync(serverSection.id)
        }
      }

      for (const draftSection of draftSections) {
        const localConfig = deepClone(draftSection.config)
        const localMerchBinding = normalizeMerchBinding(draftSection.merch_binding)

        if (isTempId(draftSection.id)) {
          const duplicateSourceId = draftSection.__builder?.duplicateSourceId ?? null

          let createdSection =
            duplicateSourceId && !isTempId(duplicateSourceId)
              ? await duplicateSectionMutation.mutateAsync(duplicateSourceId)
              : await addSectionMutation.mutateAsync({
                  tabId: activeTabId,
                  payload: {
                    section_type: draftSection.section_type,
                    config: localConfig,
                    visible: draftSection.visible,
                    ...(localMerchBinding
                      ? { merch_binding: localMerchBinding }
                      : {}),
                  },
                })

          if (
            createdSection.visible !== draftSection.visible ||
            serializeComparable(createdSection.config) !==
              serializeComparable(localConfig)
          ) {
            createdSection = await updateSectionMutation.mutateAsync({
              id: createdSection.id,
              payload: {
                config: localConfig,
                visible: draftSection.visible,
              },
            })
          }

          if (
            serializeComparable(createdSection.merch_binding) !==
            serializeComparable(localMerchBinding)
          ) {
            createdSection = await updateSectionMerchMutation.mutateAsync({
              id: createdSection.id,
              payload: toMerchPayload(localMerchBinding),
            })
          }

          selectedIdMap.set(draftSection.id, createdSection.id)
          materializedSections.push({
            ...cloneBuilderSection(createdSection),
            sort_order: draftSection.sort_order,
          })
          continue
        }

        const serverSection = originalById.get(draftSection.id)
        let resolvedSection = serverSection
          ? cloneBuilderSection(serverSection)
          : cloneBuilderSection(draftSection)

        if (
          !serverSection ||
          serverSection.visible !== draftSection.visible ||
          serializeComparable(serverSection.config) !==
            serializeComparable(localConfig)
        ) {
          resolvedSection = cloneBuilderSection(
            await updateSectionMutation.mutateAsync({
              id: draftSection.id,
              payload: {
                config: localConfig,
                visible: draftSection.visible,
              },
            })
          )
        }

        if (
          serializeComparable(serverSection?.merch_binding ?? null) !==
          serializeComparable(localMerchBinding)
        ) {
          resolvedSection = cloneBuilderSection(
            await updateSectionMerchMutation.mutateAsync({
              id: draftSection.id,
              payload: toMerchPayload(localMerchBinding),
            })
          )
        }

        materializedSections.push({
          ...resolvedSection,
          sort_order: draftSection.sort_order,
        })
      }

      const finalOrder = materializedSections.map((section) => section.id)
      const originalOrder = originalSections.map((section) => section.id)

      if (serializeComparable(finalOrder) !== serializeComparable(originalOrder)) {
        await reorderSectionsMutation.mutateAsync({
          tabId: activeTabId,
          payload: { order: finalOrder },
        })
      }

      const freshSections = await sectionsQuery.refetch()
      const normalizedFreshSections = normalizeBuilderSections(
        freshSections.data ?? []
      )

      resetLocalSections(normalizedFreshSections)
      clearAutosaveDraft(activeTabId)
      setSelectedSectionId((currentSelectedId) => {
        if (!currentSelectedId) return null
        const persistedId = selectedIdMap.get(currentSelectedId) ?? currentSelectedId
        return normalizedFreshSections.some(
          (section) => section.id === persistedId
        )
          ? persistedId
          : null
      })
      setIsDirty(false)
      setPersistedStatus(targetStatus)
      setVersionNumber((current) => current + 1)

      return true
    } catch (error) {
      setLocalSections(snapshot)
      setSelectedSectionId(snapshotSelectedId)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed — changes rolled back"
      )
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveDraft = async () => {
    await persistLayout("Draft")
  }

  const handlePushLive = async () => {
    await persistLayout("Live")
  }

  const handleSchedule = async (scheduledAt: string) => {
    if (!activeTabId) return

    const didPersist = await persistLayout("Draft")
    if (!didPersist) return

    setIsProcessing(true)

    try {
      const payload: ScheduleSectionLayoutPayload = {
        scheduled_at: scheduledAt,
      }
      const scheduledVersion = await scheduleSectionLayoutMutation.mutateAsync({
        tabId: activeTabId,
        payload,
      })
      await versionsQuery.refetch()
      setPersistedStatus("Scheduled")
      setVersionNumber(Math.max(versionNumber + 1, scheduledVersion.version))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to schedule section layout"
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // ─── Phase 3: page-level theme preset handlers ────────────────────────────
  const updateThemeMutation = useUpdateTheme()

  const handleApplyPagePresetStyle = async (preset: PageThemePreset) => {
    if (!activeTheme) {
      toast.error("This tab has no active theme to update.")
      return
    }
    const next = applyPagePresetStyle(activeTheme.theme_data, preset)
    await updateThemeMutation.mutateAsync({
      id: activeTheme.id,
      payload: { theme_data: next },
    })
  }

  const handleReplaceLayoutWithPreset = (preset: PageThemePreset) => {
    if (!activeTab) {
      toast.error("Select a tab before applying a preset.")
      return
    }
    const now = new Date().toISOString()
    const next: BuilderSection[] = preset.recommendedSections.map(
      (entry, index) => {
        const meta = getSectionTypeMeta(entry.section_type)
        const baseConfig = JSON.parse(JSON.stringify(meta.defaultConfig)) as Record<
          string,
          unknown
        >
        return {
          id: createTempId(),
          tab_id: activeTab.id,
          tab_key: activeTab.key,
          store_key: activeTab.store_key,
          section_type: entry.section_type,
          sort_order: index,
          visible: true,
          config: { ...baseConfig, ...(entry.config ?? {}) },
          merch_binding: null,
          created_at: now,
          updated_at: now,
        }
      }
    )
    setLocalSections(next)
    setSelectedSectionId(null)
    setSelectedChromeRegion(null)
    markDirty()
    toast.success(`Layout replaced with “${preset.label}”. Save Draft to persist.`)
  }

  // ─── Phase 3: publish checklist (recomputed on every render) ───────────────
  const publishChecklist = useMemo(
    () => runPublishChecklist(localSections),
    [localSections]
  )

  // ─── Phase 2: shared DnD sensors + handlers ────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as BuilderDragData | undefined
    if (data) setActiveDragData(data)
  }

  const handleDragCancel = () => setActiveDragData(null)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragData(null)

    if (!over) return
    const activeData = active.data.current as BuilderDragData | undefined
    const overData = over.data.current as BuilderDragData | undefined

    // 1) Library card → preview insertion slot.
    if (activeData && isLibrarySectionDrag(activeData) && overData && isInsertSlotDrop(overData)) {
      handleInsertSection(
        activeData.sectionType,
        activeData.defaultConfig,
        overData.index
      )
      return
    }

    // 2) Library card dropped on an existing section → insert just before it.
    if (
      activeData &&
      isLibrarySectionDrag(activeData) &&
      typeof over.id === "string" &&
      !String(over.id).startsWith("preview-slot:")
    ) {
      const targetIndex = localSections.findIndex((s) => s.id === over.id)
      if (targetIndex >= 0) {
        handleInsertSection(
          activeData.sectionType,
          activeData.defaultConfig,
          targetIndex
        )
      }
      return
    }

    // 3) Existing section reorder (stack OR preview source — both share local state).
    if (activeData && isExistingSectionDrag(activeData)) {
      // Drop on insertion slot → place at slot index (clamped).
      if (overData && isInsertSlotDrop(overData)) {
        const fromIdx = localSections.findIndex((s) => s.id === activeData.sectionId)
        if (fromIdx < 0) return
        // Account for shift when moving downward across the source position.
        const insertIdx = overData.index > fromIdx ? overData.index - 1 : overData.index
        if (insertIdx === fromIdx) return
        setLocalSections((current) => {
          const ordered = arrayMove(current, fromIdx, insertIdx)
          return reindexSections(ordered)
        })
        markDirty()
        return
      }
      // Drop on another section → swap order.
      if (active.id !== over.id) {
        const fromIdx = localSections.findIndex((s) => s.id === active.id)
        const toIdx = localSections.findIndex((s) => s.id === over.id)
        if (fromIdx >= 0 && toIdx >= 0) {
          setLocalSections((current) => {
            const ordered = arrayMove(current, fromIdx, toIdx)
            return reindexSections(ordered)
          })
          markDirty()
        }
      }
    }
  }

  // ─── Phase 2: autosave to localStorage (debounced, per-tab) ────────────────
  useBuilderAutosave(activeTabId, localSections, isDirty, {
    enabled: !isProcessing,
  })

  // ─── Phase 2: restore prompt on tab activation (if a fresher draft exists) ─
  const restorePromptShownRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activeTabId || isDirty || isProcessing) return
    if (restorePromptShownRef.current === activeTabId) return
    const draft = readAutosaveDraft<BuilderSection[]>(activeTabId)
    if (!draft || !Array.isArray(draft.data) || draft.data.length === 0) return

    const serverSerialized = JSON.stringify(
      normalizeBuilderSections(sectionsQuery.data ?? [])
    )
    const draftSerialized = JSON.stringify(draft.data)
    if (serverSerialized === draftSerialized) {
      clearAutosaveDraft(activeTabId)
      return
    }

    restorePromptShownRef.current = activeTabId
    const ageMin = Math.max(
      1,
      Math.round((Date.now() - draft.timestamp) / 60_000)
    )
    if (
      window.confirm(
        `An unsaved draft from ~${ageMin} min ago was found for this tab. Restore it?`
      )
    ) {
      setLocalSections(reindexSections(draft.data))
      setIsDirty(true)
    } else {
      clearAutosaveDraft(activeTabId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, isDirty, isProcessing, sectionsQuery.data])

  // ─── Phase 2: undo / redo keyboard shortcuts ───────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key !== "z" && e.key !== "Z") return
      e.preventDefault()
      if (e.shiftKey) {
        if (sectionsHistory.canRedo) sectionsHistory.redo()
      } else {
        if (sectionsHistory.canUndo) sectionsHistory.undo()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [sectionsHistory])

  // dndOverlay: figure out what to render in the floating drag overlay.
  const dndOverlay = useMemo(() => {
    if (!activeDragData) return null
    if (isLibrarySectionDrag(activeDragData)) {
      return (
        <BuilderDragOverlay
          kind="library"
          sectionType={activeDragData.sectionType}
        />
      )
    }
    if (isExistingSectionDrag(activeDragData)) {
      const section = localSections.find(
        (s) => s.id === activeDragData.sectionId
      )
      if (!section) return null
      return <BuilderDragOverlay kind="existing" section={section} />
    }
    return null
  }, [activeDragData, localSections])

  if (isLoadingTabs) {
    return <BuilderTabSkeletonState />
  }

  if (!themeTabs.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
            <BadgePlus className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">
            No active tabs yet
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Create a theme tab first so the builder has a manifest target to edit.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/theme-tabs">
                <ArrowLeft className="h-4 w-4" />
                Manage Tabs
              </Link>
            </Button>
            <Button onClick={handleCreateTab}>Create First Tab</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[linear-gradient(180deg,#f5f7fb_0%,#edf2f7_100%)] xl:overflow-hidden"
        aria-busy={isTabSwitching}
        style={{
          '--store-accent': storeConfig.bg,
          '--store-bg': `${storeConfig.bg}15`,
          '--store-text': storeConfig.text,
        } as CSSProperties}
      >
      {isTabSwitching ? (
        <div className="absolute inset-0 z-30 bg-white/20 backdrop-blur-[1px]">
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            Switching tabs…
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-3 pb-3 pt-3 xl:flex-row xl:px-4 xl:pb-4 xl:pt-4">
        <aside className={`flex min-h-0 flex-col gap-0 transition-all duration-300 w-full ${leftPanelCollapsed ? "xl:w-10" : "xl:w-[300px]"}`}>
          {/* Compact header row — back + title + tab dropdown */}
          <div className="rounded-t-[20px] border border-b-0 border-slate-200/80 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:rounded-t-[24px] sm:px-4">
            <div className="flex items-center gap-2">
              <Button asChild size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-lg">
                <Link href="/themes">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              {!leftPanelCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Section Builder
                  </div>
                </div>
              )}
              {/* Collapse toggle — xl only */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="hidden h-8 w-8 shrink-0 rounded-lg text-slate-400 xl:flex"
                onClick={() => setLeftPanelCollapsed((v) => !v)}
                aria-label={leftPanelCollapsed ? "Expand panel" : "Collapse panel"}
                title={leftPanelCollapsed ? "Expand" : "Collapse"}
              >
                {leftPanelCollapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!leftPanelCollapsed && (
              <div className="mt-2">
                <TabNavbar
                  tabs={themeTabs}
                  activeTabId={activeTabId}
                  onTabChange={handleTabChange}
                  onCreateTab={handleCreateTab}
                  onOpenTabManager={() => setTabManagerOpen(true)}
                />
              </div>
            )}
          </div>

          {/* Section Stack — hidden when collapsed, gets all remaining height */}
          {!leftPanelCollapsed && (
          <section className="flex min-h-[280px] flex-1 flex-col rounded-b-[20px] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:rounded-b-[24px] xl:min-h-0">
            <div className="border-b border-slate-200/80 px-3 py-2.5 sm:px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  Sections
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
                    {localSections.filter((s) => s.visible).length}/{localSections.length}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2.5 pb-4 sm:p-3 xl:pb-28">
              {sectionsQuery.isLoading && !sectionsQuery.data ? (
                <div className="flex flex-col gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : localSections.length ? (
                <SortableSectionList
                  sections={localSections}
                  selectedSectionId={selectedSectionId}
                  onSelect={setSelectedSectionId}
                  onRemove={handleRemoveSection}
                  onToggleVisibility={handleToggleVisibility}
                  onDuplicate={handleDuplicateSection}
                  onHoverPreview={setHoveredSectionId}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  <p className="font-medium">Empty tab</p>
                  <p className="mt-1 text-xs">Add sections from the library →</p>
                </div>
              )}
            </div>
          </section>
          )}
          {/* Collapsed state — show a narrow icon strip */}
          {leftPanelCollapsed && (
            <div className="hidden rounded-b-[20px] border border-slate-200/80 bg-white xl:flex xl:flex-1 xl:flex-col xl:items-center xl:rounded-b-[24px] xl:py-4">
              <Layers3 className="h-5 w-5 text-slate-400" />
            </div>
          )}
        </aside>

        <main className="flex min-h-[720px] min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:min-h-[780px] sm:rounded-[32px] xl:min-h-0">
          <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-500"
                >
                  {activeTab?.store_key ?? "zepto"}
                </Badge>
                <Badge
                  variant="secondary"
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {activeTab?.key ?? "all"}
                </Badge>
                <div className="text-sm font-semibold text-slate-900">
                  {activeTab?.label ?? "Section Builder"}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                <Sparkles className="h-4 w-4 text-sky-500" />
                {selectedSection ? selectedSection.section_type : "Library mode"}
              </div>
              <ThemePresetPicker
                isDirty={isDirty}
                isBusy={updateThemeMutation.isPending}
                onApplyStyleOnly={handleApplyPagePresetStyle}
                onReplaceLayout={handleReplaceLayoutWithPreset}
              />
            </div>
          </div>

          <div className="relative flex min-h-[620px] flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] sm:min-h-[700px] xl:min-h-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/70 to-transparent" />
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 xl:top-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-2.5 py-1 text-[10px] font-medium text-slate-500 shadow-sm sm:px-3 sm:py-1.5 sm:text-[11px]">
                <Layers3 className="h-4 w-4" />
                {localSections.filter((s) => s.visible).length} visible · {localSections.length} total
              </div>
            </div>
            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center px-2 pb-4 pt-14 sm:px-3 xl:pb-2">
              <div className="h-full w-full xl:-translate-y-10">
                <MobilePreviewFrame
                  sections={localSections}
                  selectedSectionId={selectedSectionId}
                  hoveredSectionId={hoveredSectionId}
                  onSectionClick={(id) => {
                    setSelectedChromeRegion(null)
                    setSelectedSectionId(id)
                  }}
                  themeData={activeThemeData}
                  activeTabKey={activeTab?.key ?? "all"}
                  scale={0.98}
                  onMoveUp={handleMoveSectionUp}
                  onMoveDown={handleMoveSectionDown}
                  onToggleVisibility={handleToggleVisibility}
                  onDuplicate={handleDuplicateSection}
                  onDelete={handleRemoveSection}
                  onChromeRegionClick={(region) => {
                    setSelectedSectionId(null)
                    setSelectedChromeRegion(region)
                  }}
                  selectedChromeRegion={selectedChromeRegion}
                  onPreviewTabChange={(key) => {
                    const tab = themeTabs.find((t) => t.key === key)
                    if (tab && tab.id !== activeTabId) handleTabChange(tab.id)
                  }}
                  isDragActive={Boolean(activeDragData)}
                  themeTabs={themeTabs}
                />
              </div>
            </div>
          </div>
        </main>

        <aside id="right-panel-editor" className="flex w-full min-h-0 flex-col overflow-hidden xl:w-[340px]">
          <div className="min-h-0 flex-1 overflow-y-auto rounded-[20px] pb-4 sm:rounded-[24px] xl:pb-28">
            <RightPanel
              sections={localSections}
              selectedSection={selectedSection}
              onAdd={handleAddSection}
              onConfigChange={handleConfigChange}
              onMerchBindingChange={handleMerchBindingChange}
              onBack={() => setSelectedSectionId(null)}
              selectedChromeRegion={selectedChromeRegion}
              activeTheme={activeTheme}
              onCloseChromeEditor={() => setSelectedChromeRegion(null)}
            />
          </div>
        </aside>
      </div>

      <TabManagerPanel
        tabs={themeTabs}
        activeTabId={activeTabId}
        isOpen={tabManagerOpen}
        onClose={() => setTabManagerOpen(false)}
        onTabSelect={handleTabChange}
        onTabCreate={handleCreateTab}
        onTabUpdate={handleTabUpdate}
        onTabArchive={handleTabArchive}
      />

      <NewTabDialog
        open={newTabOpen}
        onClose={() => setNewTabOpen(false)}
        existingTabs={themeTabs}
        defaultStoreKey={activeStoreKey}
        isCreating={createThemeTabMutation.isPending}
        onCreate={handleNewTabCreate}
      />

      <div className="z-40 px-3 pb-3 xl:pointer-events-none xl:absolute xl:inset-x-0 xl:bottom-0 xl:px-4 xl:pb-2">
        <div className="xl:pointer-events-auto">
          <TimelineBar
            versions={(versionsQuery.data ?? []).map((v) => ({
              id: v.id,
              version: v.version,
              status: v.status,
              scheduledAt: v.scheduled_at ?? undefined,
              createdAt: v.created_at,
            }))}
            currentVersion={displayVersion}
            isLoading={versionsQuery.isLoading}
          />
          <BuilderToolbar
            isDirty={isDirty}
            onDiscard={handleDiscard}
            onSave={handleSaveDraft}
            onPushLive={handlePushLive}
            onSchedule={handleSchedule}
            version={displayVersion}
            status={displayStatus}
            onUndo={() => sectionsHistory.undo()}
            onRedo={() => sectionsHistory.redo()}
            canUndo={sectionsHistory.canUndo}
            canRedo={sectionsHistory.canRedo}
            publishChecklist={publishChecklist}
            isProcessing={
              isProcessing ||
              createThemeTabMutation.isPending ||
              addSectionMutation.isPending ||
              deleteSectionMutation.isPending ||
              reorderSectionsMutation.isPending ||
              updateSectionMutation.isPending ||
              updateSectionMerchMutation.isPending ||
              duplicateSectionMutation.isPending ||
              scheduleSectionLayoutMutation.isPending ||
              updateThemeMutation.isPending
            }
          />
        </div>
      </div>
      </div>
      <DndDragOverlay dropAnimation={null}>{dndOverlay}</DndDragOverlay>
    </DndContext>
  )
}
