"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getThemeTabs } from "@/services/theme-tabs.service"
import type { ThemeStoreKey } from "@/types/theme.types"

export interface StoreConfig {
  /** Display label for the store (shown in tooltips, toolbar) */
  label: string
  /** Path to PNG chip image in /public/preview-assets/ */
  chipImage: string
  /** Primary background color (hex) — from Flutter store_model.dart */
  bg: string
  /** Active chip background color (hex) */
  chipActive: string
  /** Text color on store backgrounds (hex) */
  text: string
  /** 3-stop gradient for preview header [top, mid, bottom] */
  gradient: [string, string, string]
  /** Bottom nav items matching Flutter app */
  bottomNav: [string, string, string, string]
  /** Category tab labels for this store */
  categories: string[]
  /** Category tab emoji icons (fallback when no API icon) */
  categoryIcons: string[]
}

export type StoreTransitionStatus = "idle" | "switching" | "loading"

export interface StoreContextValue {
  /** Currently active store key */
  activeStoreKey: ThemeStoreKey
  /** Setter — triggers state machine transition */
  setActiveStoreKey: (key: ThemeStoreKey) => void
  /** Resolved config for the active store (memoized, stable reference) */
  storeConfig: StoreConfig
  /** Current transition state — use for CSS crossfade */
  transitionStatus: StoreTransitionStatus
  /** Whether the store is in the middle of switching */
  isSwitching: boolean
}

export const ALL_STORE_KEYS: ThemeStoreKey[] = ["zepto", "off_zone", "super_mall", "cafe"]

export const STORE_CONFIGS: Record<ThemeStoreKey, StoreConfig> = {
  zepto: {
    label: "Bakaloo",
    chipImage: "/preview-assets/Bakaloo.png",
    bg: "#88D4FE",          // Flutter: Color(0xFF88D4FE)
    chipActive: "#B1EAFF",
    text: "#111827",        // Dark text on light blue bg
    gradient: ["#88D4FE", "#B1EAFF", "#FFFFFF"],
    bottomNav: ["Home", "Cart", "Categories", "Profile"],
    categories: ["All", "Navratri", "Fresh", "Fashion", "Electronics"],
    categoryIcons: ["🛒", "🪔", "🥤", "👗", "🎧"],
  },
  off_zone: {
    label: "50% OFF Zone",
    chipImage: "/preview-assets/50%_OFF_zone.png",
    bg: "#FF6B35",          // Flutter: Color(0xFFFF6B35)
    chipActive: "#FFD4B8",
    text: "#FFFFFF",        // White text on orange bg
    gradient: ["#4338CA", "#6366F1", "#E0E7FF"],
    bottomNav: ["Home", "Categories", "Buy Again", "Cafe"],
    categories: ["Flash Sale", "Combos", "Clearance", "Buy 1 Get 1", "Bulk Buy"],
    categoryIcons: ["⚡", "🎯", "🏷️", "🎁", "📦"],
  },
  super_mall: {
    label: "Super Mall",
    chipImage: "/preview-assets/Super_mall.png",
    bg: "#7C3AED",          // Flutter: Color(0xFF7C3AED)
    chipActive: "#5B21B6",  // Flutter: Color(0xFF5B21B6)
    text: "#FFFFFF",
    gradient: ["#7C3AED", "#A78BFA", "#EDE9FE"],
    bottomNav: ["Home", "Categories", "Buy Again", "Cafe"],
    categories: ["Mall", "Beauty", "Deal Store", "Electronics", "Fashion"],
    categoryIcons: ["🏠", "💄", "🏷️", "🎧", "👗"],
  },
  cafe: {
    label: "Cafe",
    chipImage: "/preview-assets/Cafe.png",
    bg: "#92400E",          // Flutter: Color(0xFF92400E)
    chipActive: "#6B2E00",  // Flutter: Color(0xFF6B2E00)
    text: "#FFFFFF",
    gradient: ["#92400E", "#B45309", "#FEF3C7"],
    bottomNav: ["Home", "Categories", "Buy Again", "Cafe"],
    categories: ["Coffee", "Tea", "Snacks", "Meals", "Desserts"],
    categoryIcons: ["☕", "🍵", "🍿", "🍱", "🍰"],
  },
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({
  children,
  defaultStoreKey = "zepto",
}: {
  children: ReactNode
  defaultStoreKey?: ThemeStoreKey
}) {
  const [activeStoreKey, setActiveStoreKeyRaw] = useState<ThemeStoreKey>(defaultStoreKey)
  const [transitionStatus, setTransitionStatus] = useState<StoreTransitionStatus>("idle")
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const queryClient = useQueryClient()

  // Prefetch all stores' tabs on mount so store switches are instant from cache
  useEffect(() => {
    ALL_STORE_KEYS.forEach(storeKey => {
      queryClient.prefetchQuery({
        queryKey: ["theme-tabs", { store_key: storeKey, status: "active" }],
        queryFn: () => getThemeTabs({ store_key: storeKey, status: "active" }),
        staleTime: 120_000,
      })
    })
  }, [queryClient])

  const setActiveStoreKey = useCallback((key: ThemeStoreKey) => {
    if (key === activeStoreKey) return

    // Clear any pending transition
    if (transitionTimer.current) clearTimeout(transitionTimer.current)

    // Enter switching state (triggers CSS crossfade)
    setTransitionStatus("switching")

    // After 200ms transition, commit the switch
    transitionTimer.current = setTimeout(() => {
      setActiveStoreKeyRaw(key)
      setTransitionStatus("idle")
    }, 200)
  }, [activeStoreKey])

  const storeConfig = useMemo(() => STORE_CONFIGS[activeStoreKey], [activeStoreKey])

  const value = useMemo<StoreContextValue>(() => ({
    activeStoreKey,
    setActiveStoreKey,
    storeConfig,
    transitionStatus,
    isSwitching: transitionStatus === "switching",
  }), [activeStoreKey, setActiveStoreKey, storeConfig, transitionStatus])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStoreContext(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error("useStoreContext must be used within <StoreProvider>")
  }
  return ctx
}
