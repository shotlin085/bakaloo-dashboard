"use client"

import { memo, useState } from "react"
import { Clock } from "lucide-react"

interface VersionDot {
  id: string
  version: number
  status: "applied" | "scheduled" | "expired"
  scheduledAt?: string
  createdAt: string
}

interface TimelineBarProps {
  versions: VersionDot[]
  currentVersion: number
  isLoading: boolean
  onRollback?: (versionId: string) => void
  onSelectVersion?: (versionId: string) => void
}

export const TimelineBar = memo(function TimelineBar({
  versions,
  currentVersion,
  isLoading,
  onRollback,
  onSelectVersion,
}: TimelineBarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-400">
        <Clock size={14} />
        <span>Loading versions…</span>
      </div>
    )
  }

  if (!versions.length) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-400">
        <Clock size={14} />
        <span>No versions yet</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto px-4 py-2 scrollbar-hide"
      role="navigation"
      aria-label="Version timeline"
    >
      {versions.map((v, i) => {
        const isCurrent = v.version === currentVersion
        const dotColor =
          v.status === "applied"
            ? "var(--store-accent, #3B82F6)"
            : v.status === "scheduled"
              ? "var(--store-accent, #F59E0B)"
              : "#94A3B8"

        return (
          <div key={v.id} className="flex items-center">
            {i > 0 && <div className="h-px w-4 bg-slate-200" />}
            <div className="relative">
              <button
                onClick={() => onSelectVersion?.(v.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (confirm(`Rollback to v${v.version}?`)) onRollback?.(v.id)
                }}
                onMouseEnter={() => setHoveredId(v.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative h-3.5 w-3.5 rounded-full border-2 transition-transform duration-150"
                style={{
                  borderColor: dotColor,
                  backgroundColor: v.status === "applied" ? dotColor : "transparent",
                  transform: isCurrent ? "scale(1.4)" : "scale(1)",
                  boxShadow: isCurrent ? `0 0 8px ${dotColor}60` : "none",
                  animation: v.status === "scheduled" ? "pulse-dot 2s infinite" : "none",
                }}
                aria-label={`Version ${v.version} - ${v.status}`}
              />
              {hoveredId === v.id && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-white px-2.5 py-1.5 text-[10px] shadow-lg z-50">
                  <div className="font-semibold">v{v.version}</div>
                  <div className="text-slate-400">
                    {v.status} · {new Date(v.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
      <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
})
