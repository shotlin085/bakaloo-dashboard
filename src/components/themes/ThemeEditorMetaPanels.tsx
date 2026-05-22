"use client"

import Link from "next/link"
import { Clock, XCircle } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  ThemeEditorRenderProps,
} from "@/components/themes/ThemeEditorForm"
import type {
  ThemeStoreKey,
  ThemeTab,
  ThemeVersion,
} from "@/types/theme.types"

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

const STORE_LABELS: Record<ThemeStoreKey, string> = {
  zepto: "Zepto",
  off_zone: "50% OFF ZONE",
  super_mall: "Super Mall",
  cafe: "Cafe",
}

interface TabSettingsCardProps extends ThemeEditorRenderProps {
  themeTabs?: ThemeTab[]
  isLoadingTabs?: boolean
}

export function TabSettingsCard({
  formData,
  updateField,
  themeTabs,
  isLoadingTabs,
}: TabSettingsCardProps) {
  const filteredTabs = (themeTabs ?? [])
    .filter((tab) => tab.store_key === formData.store_key)
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
  const selectedTab =
    filteredTabs.find((tab) => tab.id === formData.tab_id) ??
    (themeTabs ?? []).find((tab) => tab.id === formData.tab_id) ??
    null

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Tab Settings</CardTitle>
        <CardDescription>
          Link this theme to a managed Quick Link tab
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Store</Label>
          <Select
            value={formData.store_key}
            onValueChange={(value) => {
              updateField("store_key", value as ThemeStoreKey)
              const belongsToStore = (themeTabs ?? []).some(
                (tab) => tab.id === formData.tab_id && tab.store_key === value
              )
              if (!belongsToStore) {
                updateField("tab_id", null)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select store" />
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
          <Label>Managed Tab</Label>
          <Select
            value={formData.tab_id ?? "none"}
            onValueChange={(value) =>
              updateField("tab_id", value === "none" ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isLoadingTabs ? "Loading tabs..." : "Select a managed tab"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unlinked draft theme</SelectItem>
              {filteredTabs.map((tab) => (
                <SelectItem key={tab.id} value={tab.id}>
                  {tab.label} ({tab.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Linked Tab Summary</Label>
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-4">
            {selectedTab ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{selectedTab.store_key}</Badge>
                <Badge variant="secondary">{selectedTab.key}</Badge>
                <span className="font-medium">{selectedTab.label}</span>
                <span className="text-muted-foreground">
                  Order {selectedTab.sort_order}
                </span>
                <span className="text-muted-foreground">
                  Status: {selectedTab.status}
                </span>
                {selectedTab.image_url ? (
                  <span className="truncate text-muted-foreground">
                    Icon uploaded
                  </span>
                ) : (
                  <span className="text-muted-foreground">No icon yet</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a managed tab from the Theme Tabs dashboard, or leave this
                theme unlinked while drafting.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              The selected tab controls key, label, order, icon, and store.
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/theme-tabs">Manage Theme Tabs</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SchedulingCardProps extends ThemeEditorRenderProps {
  isScheduling: boolean
  isCancelling: boolean
  onSchedule: () => void
  onCancel: () => void
}

export function SchedulingCard({
  formData,
  updateField,
  isScheduling,
  isCancelling,
  onSchedule,
  onCancel,
}: SchedulingCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Scheduling</CardTitle>
        <CardDescription>
          Auto-activate this theme at a specific date and time
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Activate At</Label>
          <Input
            type="datetime-local"
            value={toLocalDateTimeInput(formData.scheduled_at)}
            onChange={(event) =>
              updateField(
                "scheduled_at",
                event.target.value
                  ? new Date(event.target.value).toISOString()
                  : null
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Expires At (optional)</Label>
          <Input
            type="datetime-local"
            value={toLocalDateTimeInput(formData.expires_at)}
            onChange={(event) =>
              updateField(
                "expires_at",
                event.target.value
                  ? new Date(event.target.value).toISOString()
                  : null
              )
            }
          />
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        {formData.status !== "scheduled" && formData.scheduled_at && (
          <Button
            variant="outline"
            onClick={onSchedule}
            disabled={isScheduling}
          >
            <Clock className="mr-2 h-4 w-4" />
            Schedule Activation
          </Button>
        )}

        {formData.status === "scheduled" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Schedule
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export function ABTestingCard({
  formData,
  updateField,
}: ThemeEditorRenderProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">A/B Testing</CardTitle>
        <CardDescription>
          Create a variant to test different designs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>Current Variant</Label>
            <p className="text-sm text-muted-foreground">
              This theme is Variant {formData.ab_variant}
            </p>
          </div>
          <Badge
            variant={formData.ab_variant === "B" ? "secondary" : "default"}
          >
            Variant {formData.ab_variant}
          </Badge>
        </div>

        <div className="space-y-2">
          <Label>
            Traffic Split ({formData.ab_split_percent}% see this variant)
          </Label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={formData.ab_split_percent}
            onChange={(event) =>
              updateField("ab_split_percent", Number(event.target.value))
            }
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface VersionHistorySidebarProps {
  currentVersion: number
  versions?: ThemeVersion[]
  isRestoring: boolean
  onRestore: (versionId: string) => void
}

export function VersionHistorySidebar({
  currentVersion,
  versions,
  isRestoring,
  onRestore,
}: VersionHistorySidebarProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm">Version History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Current: v{currentVersion}
        </p>
        <Separator />

        {versions?.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between gap-3 py-2"
          >
            <div>
              <span className="text-sm font-mono">v{version.version}</span>
              <p className="text-xs text-muted-foreground">
                {new Date(version.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRestore(version.id)}
              disabled={isRestoring}
            >
              Restore
            </Button>
          </div>
        ))}

        {(!versions || versions.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No version history yet. Versions are created automatically when you
            save changes.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
