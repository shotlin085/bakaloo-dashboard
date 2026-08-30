"use client"

/**
 * App Branding — the splash screen image and header logo shown by the
 * Flutter customer app, editable here without an app release. Backed by
 * the `app_branding` singleton row (GET/PUT /admin/branding). Leaving a
 * field empty (or clicking Remove on the uploader) clears it, and the app
 * falls back to its bundled default PNG for that slot.
 */

import { useEffect, useState } from "react"
import { Image as ImageIcon, Loader2, Save, Sparkles } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import { usePermissions } from "@/hooks/usePermissions"
import { useBranding, useUpdateBranding } from "@/hooks/useBranding"
import type { BrandingConfig } from "@/types/branding.types"

function toDraft(config: BrandingConfig): BrandingConfig {
  return {
    splashImageUrl: config.splashImageUrl,
    logoImageUrl: config.logoImageUrl,
  }
}

export default function AppBrandingPage() {
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  const { data: branding, isLoading } = useBranding()
  const updateMutation = useUpdateBranding()

  const [draft, setDraft] = useState<BrandingConfig>({
    splashImageUrl: null,
    logoImageUrl: null,
  })
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!branding) return
    setDraft(toDraft(branding))
    setIsDirty(false)
  }, [branding])

  const handleSave = () => {
    updateMutation.mutate(draft, {
      onSuccess: () => setIsDirty(false),
    })
  }

  if (isLoading || !branding) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="App Branding"
          subtitle="Splash screen image and header logo shown in the customer app."
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Branding"
        subtitle="Splash screen image and header logo shown in the customer app."
      />

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Changes to the logo apply to open apps within moments. Splash screen
        changes take effect the next time a customer opens the app — that&apos;s
        the first thing shown, before the app has fetched anything. Leave a
        field empty (or click Remove) to fall back to the app&apos;s built-in
        default image.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Splash Screen Image</CardTitle>
                <CardDescription className="text-xs">
                  Full-screen image shown right after the app icon is tapped.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ThemeImageUploader
              label="Splash Screen Image"
              value={draft.splashImageUrl}
              onChange={(splashImageUrl) => {
                setDraft((current) => ({ ...current, splashImageUrl }))
                setIsDirty(true)
              }}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Leave empty to use the app&apos;s built-in default splash.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">App Logo</CardTitle>
                <CardDescription className="text-xs">
                  Shown at the top of the home screen header.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ThemeImageUploader
              label="App Logo"
              value={draft.logoImageUrl}
              onChange={(logoImageUrl) => {
                setDraft((current) => ({ ...current, logoImageUrl }))
                setIsDirty(true)
              }}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Use a transparent PNG. Leave empty to use the app&apos;s built-in
              default logo.
            </p>
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <div className="flex justify-end border-t pt-6">
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className="sm:min-w-[160px]"
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Branding
          </Button>
        </div>
      )}
    </div>
  )
}
