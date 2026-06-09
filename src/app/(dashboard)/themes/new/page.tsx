"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Layers3, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { DEFAULT_THEME_DATA, cloneThemeData } from "@/components/themes/ThemeEditorForm"
import { useThemeTabs } from "@/hooks/useThemeTabs"
import { useCreateTheme } from "@/hooks/useThemes"
import type { ABVariant, ThemeStoreKey, ThemeTab } from "@/types/theme.types"
import { PageHeader } from "@/components/shared/PageHeader"

const STORE_LABELS: Record<ThemeStoreKey, string> = {
  zepto: "Zepto",
  off_zone: "50% OFF ZONE",
  super_mall: "Super Mall",
  cafe: "Cafe",
}

export default function NewThemePage() {
  const router = useRouter()
  const createThemeMutation = useCreateTheme()
  const { data: themeTabs = [], isLoading: isLoadingTabs } = useThemeTabs()

  const [name, setName] = useState("")
  const [storeKey, setStoreKey] = useState<ThemeStoreKey>("zepto")
  const [tabId, setTabId] = useState<string | null>(null)
  const [abVariant, setAbVariant] = useState<ABVariant>("A")
  const [abSplitPercent, setAbSplitPercent] = useState(100)

  const filteredTabs = useMemo(
    () =>
      (themeTabs ?? [])
        .filter((tab: ThemeTab) => tab.store_key === storeKey)
        .sort(
          (a: ThemeTab, b: ThemeTab) =>
            a.sort_order - b.sort_order ||
            a.label.localeCompare(b.label)
        ),
    [themeTabs, storeKey]
  )

  const selectedTab = filteredTabs.find((tab: ThemeTab) => tab.id === tabId) ?? null

  const handleCreate = () => {
    if (!name.trim()) return

    const defaultThemeData = cloneThemeData(DEFAULT_THEME_DATA)

    createThemeMutation.mutate(
      {
        name: name.trim(),
        theme_data: defaultThemeData,
        tab_id: tabId,
        status: "draft",
        ab_variant: abVariant,
        ab_split_percent: abSplitPercent,
      },
      {
        onSuccess: (created) => {
          // Redirect to section builder with the new theme's tab context
          const tabKey = created.tab_key ?? selectedTab?.key ?? "all"
          router.push(`/themes/builder?tab=${tabKey}`)
        },
      }
    )
  }

  const isValid = name.trim().length > 0

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <PageHeader
        title="New Theme"
        subtitle="Set up your theme identity, then design it in the Section Builder."
      />

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        {/* Identity Card */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Theme Identity</CardTitle>
                <CardDescription className="text-xs">
                  Give your theme a name so you can find it later
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">
                Theme Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="theme-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer 2026, Diwali Special"
                autoFocus
              />
            </div>
          </CardContent>
        </Card>

        {/* Tab Assignment Card */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Layers3 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Tab Assignment</CardTitle>
                <CardDescription className="text-xs">
                  Link this theme to a store tab — or leave unlinked while
                  drafting
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Store</Label>
              <Select
                value={storeKey}
                onValueChange={(value) => {
                  setStoreKey(value as ThemeStoreKey)
                  setTabId(null)
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
              <Label>Tab (optional)</Label>
              <Select
                value={tabId ?? "none"}
                onValueChange={(value) =>
                  setTabId(value === "none" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingTabs
                        ? "Loading tabs…"
                        : "Unlinked draft theme"
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

            <p className="text-xs text-muted-foreground md:col-span-2">
              You can change the tab assignment later in{" "}
              <Link
                href="/theme-tabs"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Theme Tabs
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* A/B Testing Card */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">A/B Testing</CardTitle>
            <CardDescription>
              Assign this theme to a variant slot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant={abVariant === "A" ? "default" : "outline"}
                onClick={() => setAbVariant("A")}
              >
                Variant A
              </Button>
              <Button
                type="button"
                size="sm"
                variant={abVariant === "B" ? "default" : "outline"}
                onClick={() => setAbVariant("B")}
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
                onChange={(e) => setAbSplitPercent(Number(e.target.value))}
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

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200/70 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            After creating, you&apos;ll be taken to the{" "}
            <strong>Section Builder</strong> to design the visual layout —
            colors, banners, mosaic tiles, and more.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pb-8">
          <Button variant="ghost" asChild>
            <Link href="/themes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Link>
          </Button>

          <Button
            onClick={handleCreate}
            disabled={!isValid || createThemeMutation.isPending}
          >
            {createThemeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create &amp; Open Builder
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
