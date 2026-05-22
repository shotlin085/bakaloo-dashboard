"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { ALL_STORE_KEYS, STORE_CONFIGS, useStoreContext } from "@/contexts/StoreContext"
import type { ThemeStoreKey } from "@/types/theme.types"

interface StoreSwitcherProps {
  /** Optional callback when store changes (fires in addition to context update) */
  onStoreChange?: (from: ThemeStoreKey, to: ThemeStoreKey) => void
  /** Disable all interaction (e.g. during page load) */
  disabled?: boolean
}

export function StoreSwitcher({ onStoreChange, disabled }: StoreSwitcherProps) {
  const { activeStoreKey, setActiveStoreKey, storeConfig } = useStoreContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Map<ThemeStoreKey, HTMLButtonElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Recalculate sliding indicator from the active chip's DOM rect
  const updateIndicator = useCallback(() => {
    const activeChip = chipRefs.current.get(activeStoreKey)
    const container = containerRef.current
    if (!activeChip || !container) return

    const chipRect = activeChip.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    setIndicatorStyle({
      left: chipRect.left - containerRect.left,
      width: chipRect.width,
    })
  }, [activeStoreKey])

  // Recalculate on active store change and window resize
  useEffect(() => {
    // Small delay to let layout settle (e.g. after scale transition)
    const id = requestAnimationFrame(updateIndicator)
    window.addEventListener("resize", updateIndicator)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("resize", updateIndicator)
    }
  }, [updateIndicator])

  const handleSelect = useCallback(
    (key: ThemeStoreKey) => {
      if (key === activeStoreKey || disabled) return
      onStoreChange?.(activeStoreKey, key)
      setActiveStoreKey(key)
    },
    [activeStoreKey, disabled, onStoreChange, setActiveStoreKey]
  )

  // WAI-ARIA Tabs Pattern keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % ALL_STORE_KEYS.length
    else if (e.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + ALL_STORE_KEYS.length) % ALL_STORE_KEYS.length
    else if (e.key === "Home") nextIndex = 0
    else if (e.key === "End") nextIndex = ALL_STORE_KEYS.length - 1
    else return

    e.preventDefault()
    const nextKey = ALL_STORE_KEYS[nextIndex]
    handleSelect(nextKey)
    chipRefs.current.get(nextKey)?.focus()
  }

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Store selector"
      className="relative flex items-center gap-2 border-b border-slate-200/80 px-4 py-2"
      style={{
        background: `linear-gradient(135deg, ${storeConfig.bg}14, transparent 60%)`,
        transition: "background 200ms ease",
      }}
    >
      {ALL_STORE_KEYS.map((key, index) => {
        const config = STORE_CONFIGS[key]
        const isActive = key === activeStoreKey

        return (
          <button
            key={key}
            ref={(el) => {
              if (el) chipRefs.current.set(key, el)
              else chipRefs.current.delete(key)
            }}
            role="tab"
            aria-selected={isActive}
            aria-label={config.label}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => handleSelect(key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="relative flex h-11 items-center rounded-[14px] border px-3.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            style={
              isActive
                ? {
                    background: `${config.chipActive}40`,
                    borderColor: `${config.bg}80`,
                    transform: "scale(1.05)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    opacity: 1,
                  }
                : {
                    background: "white",
                    borderColor: "transparent",
                    transform: "scale(1)",
                    boxShadow: "none",
                    opacity: 0.85,
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                const el = e.currentTarget
                el.style.opacity = "1"
                el.style.transform = "scale(1.02)"
                el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"
                el.style.background = "hsl(var(--muted, 241 245 249))"
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                const el = e.currentTarget
                el.style.opacity = "0.85"
                el.style.transform = "scale(1)"
                el.style.boxShadow = "none"
                el.style.background = "white"
              }
            }}
          >
            <Image
              src={config.chipImage}
              alt={config.label}
              width={112}
              height={28}
              loading="eager"
              onError={(e) => {
                // Fallback to text label if PNG fails to load
                const img = e.currentTarget
                img.style.display = "none"
                const fallback = img.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = "block"
              }}
              style={{ objectFit: "contain", height: 28, width: "auto" }}
            />
            {/* Text fallback shown only when image fails */}
            <span
              className="hidden text-xs font-semibold text-slate-700"
              aria-hidden="true"
            >
              {config.label}
            </span>
          </button>
        )
      })}

      {/* Morphing sliding pill indicator */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 h-[3px] rounded-sm"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          background: storeConfig.bg,
          transition:
            "left 300ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms ease, background 200ms ease",
        }}
      />
    </div>
  )
}
