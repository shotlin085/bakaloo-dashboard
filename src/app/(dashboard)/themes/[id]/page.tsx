"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  FlaskConical,
  History,
  Layers3,
  Loader2,
  Settings2,
  Sparkles,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { useThemeTabs } from "@/hooks/useThemeTabs"
import {
  useCancelSchedule,
  useRollbackVersion,
  useScheduleTheme,
  useTheme,
  useThemeVersions,
  useUpdateTheme,
} from "@/hooks/useThemes"
import type {
  ABVariant,
  ThemeStatus,
  ThemeStoreKey,
  ThemeTab,
  UpdateThemePayload,
} from "@/types/theme.types"

const STORE_LABELS: Record<ThemeStoreKey, string> = {
  zepto: "Zepto",
  off_zone: "50% OFF ZONE",
  super_mall: "Super Mall",
  cafe: "Cafe",
}

const STATUS_LABELS: Record<ThemeStatus, string> = {
  draft: "Draft",
  active: "Active",
  scheduled: "Scheduled",
  archived: "Archived",
}

const STATUS_VARIANTS: Record<
  ThemeStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  active: "default",
  scheduled: "outline",
  archived: "destructive",
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function EditThemePageContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams<{ id: string }>()
  const themeId = typeof params.id === "string" ? params.id : null

  const { data: theme, isLoading } = useTheme(themeId)
  const { data: themeTabs = [], isLoading: isLoadingTabs } = useThemeTabs()
  const { data: versions } = useThemeVersions(themeId)
  const updateThemeMutation = useUpdateTheme()
  const scheduleThemeMutation = useScheduleTheme()
  const cancelScheduleMutation = useCancelSchedule()
  const rollbackMutation = useRollbackVersion()

  // Local form state
  const [name, setName] = useState("")
  const [storeKey, setStoreKey] = useState<ThemeStoreKey>("zepto")
  const [tabId, setTabId] = useState<string | null>(null)
  const [status, setStatus] = useState<ThemeStatus>("draft")
  const [abVariant, setAbVariant] = useState<ABVariant>("A")
  const [abSplitPercent, setAbSplitPercent] = useState(100)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Sync from server data
  useEffect(() => {
    if (!theme) return
    setName(theme.name)
    setStoreKey(theme.store_key ?? "zepto")
    setTabId(theme.tab_id)
    setStatus(theme.status)
    setAbVariant(theme.ab_variant)
    setAbSplitPercent(theme.ab_split_percent)
    setScheduledAt(theme.scheduled_at)
    setExpiresAt(theme.expires_at)
    setIsDirty(false)
  }, [theme])

  const filteredTabs = (themeTabs ?? [])
    .filter((tab: ThemeTab) => tab.store_key === storeKey)
    .sort(
      (a: ThemeTab, b: ThemeTab) =>
        a.sort_order - b.sort_order || a.label.localeCompare(b.label)
    )

  const selectedTab =
    filteredTabs.find((tab: ThemeTab) => tab.id === tabId) ??
    (themeTabs ?? []).find((tab: ThemeTab) => tab.id === tabId) ??
    null

  const refreshEditorState = () => {
    if (!themeId) return
    queryClient.invalidateQueries({ queryKey: ["themes"] })
    queryClient.invalidateQueries({ queryKey: ["themes", themeId] })
    queryClient.invalidateQueries({ queryKey: ["themes", themeId, "versions"] })
  }

  const handleSave = () => {
    if (!themeId) return
    const payload: UpdateThemePayload = {
      name: name.trim(),
      tab_id: tabId,
      status,
      scheduled_at: scheduledAt,
      expires_at: expiresAt,
      ab_variant: abVariant,
      ab_split_percent: abSplitPercent,
    }
    updateThemeMutation.mutate(
      { id: themeId, payload },
      {
        onSuccess: () => {
          setIsDirty(false)
          refreshEditorState()
        },
      }
    )
  }

  const markDirty = () => setIsDirty(true)

  if (isLoading) {
    return <LoadingSkeleton variant="table" count={8} />
  }

  if (!themeId || !theme) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
          <p className="text-lg font-semibold">Theme not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The requested theme could not be loaded.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/themes">Back to Themes</Link>
          </Button>
        </div>
      </div>
    )
  }

  const builderTabKey = selectedTab?.key ?? theme.tab_key ?? "all"

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <PageHeader
        title={theme.name}
        subtitle="Edit theme metadata and settings. To change visual layout, open the Section Builder."
      />

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        {/* Open Builder CTA */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-violet-700">
            <Layers3 className="h-4 w-4 shrink-0" />
            <p>
              Visual design — colors, sections, mosaic tiles — is managed in
              the <strong>Section Builder</strong>.
            </p>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href={`/themes/builder?tab=${builderTabKey}`}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Open Builder
            </Link>
          </Button>
        </div>

        {/* Identity */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <Settings2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Theme Details</CardTitle>
                <CardDescription className="text-xs">
                  Name, status and tab assignment
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="theme-name">Theme Name</Label>
              <Input
                id="theme-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  markDirty()
                }}
                placeholder="e.g. Summer 2026"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANTS[status]}>
                  {STATUS_LABELS[status]}
                </Badge>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value as ThemeStatus)
                    markDirty()
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(STATUS_LABELS) as ThemeStatus[]
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <Label>Version</Label>
              <p className="text-muted-foreground">v{theme.version ?? 1}</p>
            </div>

            <div className="space-y-2">
              <Label>Store</Label>
              <Select
                value={storeKey}
                onValueChange={(value) => {
                  setStoreKey(value as ThemeStoreKey)
                  setTabId(null)
                  markDirty()
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STORE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tab</Label>
              <Select
                value={tabId ?? "none"}
                onValueChange={(value) => {
                  setTabId(value === "none" ? null : value)
                  markDirty()
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingTabs ? "Loading…" : "Unlinked draft theme"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unlinked draft theme</SelectItem>
                  {filteredTabs.map((tab: ThemeTab) => (
                    <SelectItem key={tab.id} value={tab.id}>
                      {tab.label} ({tab.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTab && (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-3 md:col-span-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{selectedTab.store_key}</Badge>
                  <Badge variant="secondary">{selectedTab.key}</Badge>
                  <span className="font-medium">{selectedTab.label}</span>
                  <span className="text-muted-foreground">
                    Order {selectedTab.sort_order}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Scheduling</CardTitle>
                <CardDescription className="text-xs">
                  Auto-activate this theme at a specific date and time
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Activate At</Label>
              <Input
                type="datetime-local"
                value={toLocalDateTimeInput(scheduledAt)}
                onChange={(e) => {
                  setScheduledAt(
                    e.target.value ? new Date(e.target.value).toISOString() : null
                  )
                  markDirty()
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={toLocalDateTimeInput(expiresAt)}
                onChange={(e) => {
                  setExpiresAt(
                    e.target.value ? new Date(e.target.value).toISOString() : null
                  )
                  markDirty()
                }}
              />
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            {status !== "scheduled" && scheduledAt && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  scheduleThemeMutation.mutate(
                    { id: themeId, payload: { scheduled_at: scheduledAt } },
                    { onSuccess: refreshEditorState }
                  )
                }
                disabled={scheduleThemeMutation.isPending}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Activation
              </Button>
            )}
            {status === "scheduled" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  cancelScheduleMutation.mutate(themeId, {
                    onSuccess: refreshEditorState,
                  })
                }
                disabled={cancelScheduleMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Schedule
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* A/B Testing */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">A/B Testing</CardTitle>
                <CardDescription className="text-xs">
                  Control which variant this theme belongs to
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant={abVariant === "A" ? "default" : "outline"}
                onClick={() => {
                  setAbVariant("A")
                  markDirty()
                }}
              >
                Variant A
              </Button>
              <Button
                type="button"
                size="sm"
                variant={abVariant === "B" ? "default" : "outline"}
                onClick={() => {
                  setAbVariant("B")
                  markDirty()
                }}
              >
                Variant B
              </Button>
            </div>
            <div className="space-y-2">
              <Label>
                Traffic Split ({abSplitPercent}% see this variant)
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={abSplitPercent}
                onChange={(e) => {
                  setAbSplitPercent(Number(e.target.value))
                  markDirty()
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Version History */}
        {versions && versions.length > 0 && (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Version History</CardTitle>
                  <CardDescription className="text-xs">
                    Current: v{theme.version ?? 1}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {versions.map((version, index) => (
                <div key={version.id}>
                  {index > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <span className="font-mono text-sm">
                        v{version.version}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        rollbackMutation.mutate(
                          {
                            themeId,
                            payload: { version_id: version.id },
                          },
                          { onSuccess: refreshEditorState }
                        )
                      }
                      disabled={rollbackMutation.isPending}
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pb-8">
          <Button variant="ghost" asChild>
            <Link href="/themes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/themes/builder?tab=${builderTabKey}`}>
                <Layers3 className="mr-2 h-4 w-4" />
                Open Builder
              </Link>
            </Button>

            <Button
              onClick={handleSave}
              disabled={!isDirty || updateThemeMutation.isPending}
            >
              {updateThemeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditThemePage() {
  return <EditThemePageContent />
}
