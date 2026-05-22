"use client"

import { ChevronDown, Plus, Settings2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ThemeTab } from "@/types/theme.types"

interface TabNavbarProps {
  tabs: ThemeTab[]
  activeTabId: string | null
  onTabChange: (tabId: string) => void
  onCreateTab: () => void
  onOpenTabManager?: () => void
}

function formatStoreKey(storeKey: ThemeTab["store_key"]) {
  switch (storeKey) {
    case "off_zone":
      return "50% OFF"
    case "super_mall":
      return "Super"
    case "cafe":
      return "Cafe"
    case "zepto":
    default:
      return "Zepto"
  }
}

export default function TabNavbar({
  tabs,
  activeTabId,
  onTabChange,
  onCreateTab,
  onOpenTabManager,
}: TabNavbarProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-9 min-w-0 flex-1 justify-between gap-2 rounded-xl border-slate-200 bg-white px-3 text-left shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: 'var(--store-accent)' }}
              />
              <span className="truncate text-sm font-semibold text-slate-900">
                {activeTab?.label ?? "Select tab"}
              </span>
              {activeTab ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0 text-[10px] font-medium text-slate-500"
                >
                  {formatStoreKey(activeTab.store_key)}
                </Badge>
              ) : null}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[260px]">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId
            return (
              <DropdownMenuItem
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5",
                  isActive && "bg-slate-50"
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={cn("h-2 w-2 shrink-0 rounded-full", !isActive && "bg-slate-200")}
                    style={isActive ? { backgroundColor: 'var(--store-accent)' } : undefined}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {tab.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {formatStoreKey(tab.store_key)} · {tab.key}
                    </div>
                  </div>
                </div>
                {isActive ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600"
                  >
                    Active
                  </Badge>
                ) : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 shrink-0 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
        onClick={onCreateTab}
        aria-label="Create tab"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 shrink-0 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
        onClick={onOpenTabManager}
        aria-label="Manage tabs"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
