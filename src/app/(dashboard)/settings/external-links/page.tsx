"use client"

/**
 * External Links — the destination URLs behind two buttons in the customer
 * app: Profile → Account Settings → "Business Transaction", and Profile →
 * Payments → "Games". Both open in the app's existing in-app WebView (the
 * same one the 5th nav button uses) with a short-lived signed identity
 * token appended, so the destination site can identify the viewer without
 * the customer having to log in again — see bakaloo-backend's
 * nav-buttons.routes.js POST /webview-token and webview.routes.js GET
 * /session for that handoff. This page only owns the two target URLs.
 *
 * Leaving a field blank hides that button in the app entirely.
 */

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink, Gamepad2, Loader2, Save, Briefcase } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { externalLinksService } from "@/services/external-links.service"
import type { ExternalLinksSettings } from "@/types/external-links.types"
import { usePermissions } from "@/hooks/usePermissions"

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

function isValidHttpUrl(value: string): boolean {
  if (value.trim() === "") return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function UrlField({
  id,
  icon: Icon,
  title,
  description,
  value,
  onChange,
  disabled,
}: {
  id: string
  icon: React.ElementType
  title: string
  description: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const invalid = !isValidHttpUrl(value)

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <Label htmlFor={id}>Destination URL</Label>
        <Input
          id={id}
          type="url"
          placeholder="https://example.com/portal"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {invalid ? (
          <p className="text-xs text-destructive">Must be a valid http(s) URL, or left blank.</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Leave blank to hide this button in the app.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ExternalLinksSettingsPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  const [draft, setDraft] = useState<ExternalLinksSettings | null>(null)

  const { data: config, isLoading } = useQuery({
    queryKey: ["external-links"],
    queryFn: externalLinksService.get,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

  const updateMutation = useMutation({
    mutationFn: externalLinksService.update,
    onSuccess: () => {
      toast.success("External links saved")
      queryClient.invalidateQueries({ queryKey: ["external-links"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function set<K extends keyof ExternalLinksSettings>(key: K, value: ExternalLinksSettings[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }

  function handleSave() {
    if (!draft) return
    if (!isValidHttpUrl(draft.businessTransactionUrl) || !isValidHttpUrl(draft.gamesUrl)) {
      toast.error("Fix the invalid URL(s) before saving")
      return
    }
    updateMutation.mutate(draft)
  }

  if (isLoading || !draft) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="External Links"
          subtitle="Destination URLs opened by the app's Business Transaction and Games buttons."
        />
        <Card className="max-w-2xl">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="External Links"
        subtitle="Destination URLs opened by the app's Business Transaction and Games buttons — change these any time without an app update."
      >
        {canManage && (
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        )}
      </PageHeader>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2 max-w-2xl">
        <ExternalLink className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Both buttons open their URL inside the app (not a browser). The app
          appends a short-lived signed token identifying the viewer as a
          query parameter (<code className="text-xs">?bakaloo_token=…</code>) —
          your destination site can call{" "}
          <code className="text-xs">GET /api/v1/webview/session?token=…</code>{" "}
          on this backend to resolve it back into the customer&apos;s user
          id/name, instead of asking them to log in again. If your site
          doesn&apos;t implement that, the page still opens fine — the
          visitor just isn&apos;t auto-identified.
        </p>
      </div>

      <UrlField
        id="businessTransactionUrl"
        icon={Briefcase}
        title="Business Transaction Portal"
        description='Profile → Account Settings → "Business Transaction" button.'
        value={draft.businessTransactionUrl}
        onChange={(v) => set("businessTransactionUrl", v)}
        disabled={!canManage}
      />

      <UrlField
        id="gamesUrl"
        icon={Gamepad2}
        title="Games Hub"
        description='Profile → Payments → "Games" button.'
        value={draft.gamesUrl}
        onChange={(v) => set("gamesUrl", v)}
        disabled={!canManage}
      />
    </div>
  )
}
