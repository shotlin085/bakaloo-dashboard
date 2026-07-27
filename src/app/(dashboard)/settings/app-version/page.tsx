"use client"

/**
 * App Version Control — the force/soft-update thresholds the customer app
 * checks on every launch (GET /api/v1/app/version-check, no auth). Raising
 * "Min Supported Build" for a platform here is the entire mechanism for
 * forcing every install below it to update the next time it opens — no new
 * backend deploy or app-store review needed for that specific action.
 *
 * Build number (not a version string like "1.0.3") is the comparison key —
 * it's the Flutter pubspec `+N` suffix, which only ever goes up by exactly
 * 1 per release, so there's no ambiguity about which build is newer.
 */

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, Smartphone, Apple } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
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
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { appVersionService } from "@/services/app-version.service"
import { usePermissions } from "@/hooks/usePermissions"
import type { AppPlatform, AppVersionConfig } from "@/types/app-version.types"

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const resp = (error as { response?: { data?: { message?: string } } }).response
    if (resp?.data?.message) return resp.data.message
  }
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

function intOrZero(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

interface DraftState {
  minSupportedBuild: string
  latestBuild: string
  latestVersionName: string
  updateMessage: string
  storeUrl: string
}

function toDraft(config: AppVersionConfig): DraftState {
  return {
    minSupportedBuild: String(config.minSupportedBuild),
    latestBuild: String(config.latestBuild),
    latestVersionName: config.latestVersionName,
    updateMessage: config.updateMessage ?? "",
    storeUrl: config.storeUrl ?? "",
  }
}

function PlatformCard({
  platform,
  config,
  canManage,
}: {
  platform: AppPlatform
  config: AppVersionConfig
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<DraftState>(() => toDraft(config))

  useEffect(() => {
    setDraft(toDraft(config))
  }, [config])

  const updateMutation = useMutation({
    mutationFn: () =>
      appVersionService.update(platform, {
        minSupportedBuild: intOrZero(draft.minSupportedBuild),
        latestBuild: intOrZero(draft.latestBuild),
        latestVersionName: draft.latestVersionName.trim(),
        updateMessage: draft.updateMessage.trim() || null,
        storeUrl: draft.storeUrl.trim() || null,
      }),
    onSuccess: () => {
      toast.success(
        `${platform === "android" ? "Android" : "iOS"} version config saved`,
      )
      queryClient.invalidateQueries({ queryKey: ["admin", "app-versions"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const minBuild = intOrZero(draft.minSupportedBuild)
  const latestBuild = intOrZero(draft.latestBuild)
  const validationError =
    draft.latestVersionName.trim().length === 0
      ? "Latest version name cannot be empty"
      : minBuild <= 0
        ? "Min supported build must be a positive number"
        : latestBuild < minBuild
          ? "Latest build cannot be lower than min supported build"
          : null

  function handleSave() {
    if (validationError) {
      toast.error(validationError)
      return
    }
    updateMutation.mutate()
  }

  const Icon = platform === "android" ? Smartphone : Apple
  const label = platform === "android" ? "Android" : "iOS"

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">{label}</CardTitle>
            <CardDescription>
              Installs on a build below &ldquo;Min Supported Build&rdquo; are forced
              to update before they can use the app again.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${platform}-min-build`}>Min supported build</Label>
            <Input
              id={`${platform}-min-build`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              disabled={!canManage}
              value={draft.minSupportedBuild}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, minSupportedBuild: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Raise this to force-update everyone below it.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${platform}-latest-build`}>Latest build</Label>
            <Input
              id={`${platform}-latest-build`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              disabled={!canManage}
              value={draft.latestBuild}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, latestBuild: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Below this (but above min) shows a dismissible &ldquo;update
              available&rdquo; prompt instead.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${platform}-version-name`}>Latest version name</Label>
          <Input
            id={`${platform}-version-name`}
            type="text"
            maxLength={20}
            placeholder="e.g. 1.0.3"
            disabled={!canManage}
            value={draft.latestVersionName}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, latestVersionName: e.target.value }))
            }
            className="max-w-[200px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${platform}-store-url`}>Store listing URL</Label>
          <Input
            id={`${platform}-store-url`}
            type="url"
            placeholder={
              platform === "android"
                ? "https://play.google.com/store/apps/details?id=..."
                : "https://apps.apple.com/app/id..."
            }
            disabled={!canManage}
            value={draft.storeUrl}
            onChange={(e) => setDraft((prev) => ({ ...prev, storeUrl: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            The Update button on the app&apos;s force/soft-update screen opens this link.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${platform}-message`}>Update message shown to customers</Label>
          <Textarea
            id={`${platform}-message`}
            rows={2}
            maxLength={500}
            placeholder="A new version of Bakaloo is available. Please update to continue."
            disabled={!canManage}
            value={draft.updateMessage}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, updateMessage: e.target.value }))
            }
          />
        </div>

        {validationError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {validationError}
          </div>
        ) : null}

        {canManage && (
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save {label} config
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function AppVersionPage() {
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  const { data: configs, isLoading } = useQuery({
    queryKey: ["admin", "app-versions"],
    queryFn: appVersionService.list,
    staleTime: 30_000,
  })

  if (isLoading || !configs) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="App Version Control"
          subtitle="Force or nudge customers on older app builds to update."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <Card key={i} className="max-w-xl">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const android = configs.find((c) => c.platform === "android")
  const ios = configs.find((c) => c.platform === "ios")

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Version Control"
        subtitle="Force or nudge customers on older app builds to update."
      />

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        This only affects installs that already have this check built in — i.e. any
        version from today&apos;s upload onward. It can&apos;t retroactively force an
        update on an install that predates this feature; those customers still get
        the normal Play Store / App Store update notice.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {android && <PlatformCard platform="android" config={android} canManage={canManage} />}
        {ios && <PlatformCard platform="ios" config={ios} canManage={canManage} />}
      </div>
    </div>
  )
}
