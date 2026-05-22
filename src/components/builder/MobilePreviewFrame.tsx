"use client"

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import {
  House,
  ShoppingCart,
  Grid2x2,
  UserRound,
  Coffee,
  RotateCcw,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SectionManifest, ThemeData } from "@/types/theme.types"
import {
  usePreviewData,
  resolveProductsForSection,
} from "@/hooks/usePreviewData"
import { FixedHeaderPreview } from "./FixedHeaderPreview"
import { useStoreContext } from "@/contexts/StoreContext"
import { previewRegistry } from "./previews"
import { QuickActionsToolbar } from "./QuickActionsToolbar"
import { BuilderErrorBoundary } from "./BuilderErrorBoundary"
import styles from "./MobilePreviewFrame.module.css"

interface MobilePreviewFrameProps {
  sections: SectionManifest[]
  selectedSectionId: string | null
  hoveredSectionId?: string | null
  onSectionClick: (sectionId: string) => void
  themeData: ThemeData | null
  activeTabKey: string
  scale?: number
  onMoveUp?: (sectionId: string) => void
  onMoveDown?: (sectionId: string) => void
  onToggleVisibility?: (sectionId: string, visible: boolean) => void
  onDuplicate?: (sectionId: string) => void
  onDelete?: (sectionId: string) => void
}

const PHONE_WIDTH = 430
const PHONE_HEIGHT = 932
const FIT_STAGE_GUTTER = 12

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  Home: House,
  Cart: ShoppingCart,
  Categories: Grid2x2,
  Profile: UserRound,
  "Buy Again": RotateCcw,
  Cafe: Coffee,
}

export function MobilePreviewFrame({
  sections,
  selectedSectionId,
  hoveredSectionId,
  onSectionClick,
  themeData,
  activeTabKey,
  scale = 0.92,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDuplicate,
  onDelete,
}: MobilePreviewFrameProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [availableSize, setAvailableSize] = useState({
    width: PHONE_WIDTH * scale,
    height: PHONE_HEIGHT * scale,
  })

  const { categories, products } = usePreviewData()
  const { activeStoreKey, storeConfig } = useStoreContext()

  const deferredSections = useDeferredValue(sections)
  const isStale = deferredSections !== sections

  const orderedSections = [...deferredSections].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  useEffect(() => {
    const node = frameRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      setAvailableSize({
        width: rect.width,
        height: rect.height,
      })
    }

    updateSize()

    const observer = new ResizeObserver(() => {
      updateSize()
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!selectedSectionId) return
    const timer = setTimeout(() => {
      const el = sectionRefs.current.get(selectedSectionId)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedSectionId])

  useEffect(() => {
    if (!hoveredSectionId) return
    const el = sectionRefs.current.get(hoveredSectionId)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [hoveredSectionId])

  const widthScale =
    (availableSize.width - FIT_STAGE_GUTTER * 2) / PHONE_WIDTH
  const heightScale =
    (availableSize.height - FIT_STAGE_GUTTER * 2) / PHONE_HEIGHT
  const fittedScale = Math.min(scale, widthScale, heightScale)
  const resolvedScale =
    Number.isFinite(fittedScale) && fittedScale > 0
      ? Math.min(scale, fittedScale)
      : scale

  const frameStyle = {
    "--preview-scale": resolvedScale,
  } as CSSProperties

  return (
    <div ref={frameRef} className={styles.previewStage}>
      <div
        className={styles.previewSizer}
        style={{
          width: PHONE_WIDTH * resolvedScale,
          height: PHONE_HEIGHT * resolvedScale,
        }}
      >
        <div className={styles.phoneContainer} style={frameStyle}>
          <div className={styles.phoneViewport}>
            <div className={styles.notch}>
              <span className={styles.notchSpeaker} />
              <span className={styles.notchCamera} />
            </div>

            <div className={styles.fixedHeader}>
              <FixedHeaderPreview
                themeData={themeData}
                activeTabKey={activeTabKey}
                storeKey={activeStoreKey}
              />
            </div>

            <div
              className={styles.scrollableContent}
              style={{ opacity: isStale ? 0.97 : 1, transition: "opacity 100ms ease" }}
            >
              {orderedSections.map((section, index) => {
                const PreviewComponent = previewRegistry[section.section_type]
                const sectionProducts = resolveProductsForSection(products, section)
                return (
                  <div
                    key={section.id}
                    id={`preview-section-${section.id}`}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(section.id, el)
                      else sectionRefs.current.delete(section.id)
                    }}
                    style={{
                      contain: "content",
                      border: selectedSectionId === section.id
                        ? "2px solid var(--store-accent, #3B82F6)"
                        : "2px solid transparent",
                      borderRadius: 8,
                      transition: "border-color 200ms ease",
                      cursor: "pointer",
                    }}
                  >
                    <BuilderErrorBoundary
                      sectionType={section.section_type}
                      sectionId={section.id}
                    >
                      <PreviewComponent
                        section={section}
                        isSelected={selectedSectionId === section.id}
                        onClick={() => onSectionClick(section.id)}
                        categories={categories}
                        products={sectionProducts}
                      />
                    </BuilderErrorBoundary>
                    {selectedSectionId === section.id && (
                      <div className="flex justify-center py-1">
                        <QuickActionsToolbar
                          sectionId={section.id}
                          sectionIndex={index}
                          totalSections={orderedSections.length}
                          isVisible={section.visible}
                          onMoveUp={() => onMoveUp?.(section.id)}
                          onMoveDown={() => onMoveDown?.(section.id)}
                          onToggleVisibility={() => onToggleVisibility?.(section.id, !section.visible)}
                          onDuplicate={() => onDuplicate?.(section.id)}
                          onDelete={() => onDelete?.(section.id)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className={styles.bottomNav}>
              <div className={styles.bottomNavDock}>
                {storeConfig.bottomNav.map((label, index) => {
                  const Icon = NAV_ICON_MAP[label] ?? Grid2x2
                  const isActive = index === 0
                  return (
                    <div
                      key={label}
                      className={cn(styles.navItem, isActive && styles.navItemActive)}
                      style={{ color: isActive ? storeConfig.bg : "#9CA3AF", transition: "color 200ms ease" }}
                      aria-label={label}
                    >
                      <Icon className={styles.navIcon} strokeWidth={2.2} />
                      <span>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
