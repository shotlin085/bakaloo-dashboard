"use client"

/**
 * Maps settings — the Ola Maps (https://maps.olakrutrim.com) integration
 * key, paste/test/save from the dashboard (bakaloo-backend
 * /api/v1/admin/ola-maps-settings). Saving a changed key re-tests it live
 * server-side before enabling it, so a broken key can never reach the
 * mobile app. Nothing here is stored in an app build or env var — the key
 * can be rotated any time with no redeploy, and the mobile app picks it up
 * on its next request (cache invalidates immediately on save).
 *
 * This is a Beta/test module, run alongside the app's existing free
 * OSM/Nominatim setup while accuracy is evaluated.
 */

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Loader2, Map, Save, XCircle } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { usePermissions } from "@/hooks/usePermissions"
import { olaMapsSettingsService } from "@/services/ola-maps-settings.service"
import type { OlaMapsTestResult } from "@/types/ola-maps-settings.types"

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

function formatTimestamp(value: string | null): string {
  if (!value) return "Never"
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function MapsSettingsPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  const [apiKeyDraft, setApiKeyDraft] = useState("")
  const [isEnabledDraft, setIsEnabledDraft] = useState(true)
  const [testResult, setTestResult] = useState<OlaMapsTestResult | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "ola-maps-settings"],
    queryFn: olaMapsSettingsService.get,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (settings) {
      setIsEnabledDraft(settings.isEnabled)
    }
  }, [settings])

  const testMutation = useMutation({
    mutationFn: (apiKey: string) => olaMapsSettingsService.test(apiKey),
    onSuccess: (result) => {
      setTestResult(result)
      if (result.success) {
        toast.success(`Connected (HTTP ${result.statusCode})`)
      } else {
        toast.error(result.message)
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const saveMutation = useMutation({
    mutationFn: olaMapsSettingsService.save,
    onSuccess: (result) => {
      queryClient.setQueryData(["admin", "ola-maps-settings"], result.settings)
      if (result.test) {
        setTestResult(result.test)
      }
      if (result.test && !result.test.success) {
        toast.error("Saved, but the key failed its connection test — Ola Maps stays disabled.")
      } else {
        toast.success("Ola Maps settings saved")
      }
      setApiKeyDraft("")
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const trimmedDraft = apiKeyDraft.trim()
  const isChangingKey = trimmedDraft.length > 0

  const handleTest = () => {
    if (!trimmedDraft) {
      toast.error("Paste an API key first")
      return
    }
    setTestResult(null)
    testMutation.mutate(trimmedDraft)
  }

  const handleSave = () => {
    saveMutation.mutate({
      apiKey: isChangingKey ? trimmedDraft : undefined,
      isEnabled: isEnabledDraft,
    })
  }

  const handleToggleEnabled = (checked: boolean) => {
    setIsEnabledDraft(checked)
    // A pure enable/disable flip (no key change) takes effect immediately —
    // there's nothing to test, and making the admin hit a separate Save
    // for a single toggle would be a needless extra step.
    if (!isChangingKey) {
      saveMutation.mutate({ isEnabled: checked })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Maps" subtitle="Ola Maps integration (Beta)" />
        <Skeleton className="h-64 w-full max-w-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Maps" subtitle="Ola Maps integration (Beta)" />

      <Card className="max-w-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="h-4 w-4 text-muted-foreground" />
            Ola Maps
          </CardTitle>
          <CardDescription>
            Vector map + geocoding provider being evaluated alongside the app&apos;s
            existing free OpenStreetMap setup. The key lives here only — it never
            ships inside the mobile app build, so rotating it takes effect
            immediately, with no app release.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Enabled</Label>
              <p className="text-xs text-muted-foreground">
                {settings?.configured
                  ? "Serves the mobile app's Ola Maps test screen when on."
                  : "No key saved yet — nothing to enable."}
              </p>
            </div>
            <Switch
              checked={isEnabledDraft}
              onCheckedChange={handleToggleEnabled}
              disabled={!canManage || !settings?.configured || saveMutation.isPending}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Current key:</span>
            <span className="font-mono">{settings?.maskedKey ?? "Not set"}</span>
            {settings?.lastTestStatus && (
              <Badge
                variant={settings.lastTestStatus === "SUCCESS" ? "default" : "destructive"}
                className="text-[10px]"
              >
                {settings.lastTestStatus === "SUCCESS" ? "Last test passed" : "Last test failed"}
              </Badge>
            )}
          </div>
          {settings?.lastTestedAt && (
            <p className="text-xs text-muted-foreground -mt-3">
              Last tested {formatTimestamp(settings.lastTestedAt)}
              {settings.lastTestMessage ? ` — ${settings.lastTestMessage}` : ""}
            </p>
          )}

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-sm">API key</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={settings?.configured ? "Enter a new key to replace it" : "Paste your Ola Maps API key"}
              value={apiKeyDraft}
              onChange={(e) => {
                setApiKeyDraft(e.target.value)
                setTestResult(null)
              }}
              disabled={!canManage}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank and hit Save to change only the toggle above; type a new
              key to replace and re-test it.
            </p>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                testResult.success
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>
                {testResult.message}
                {testResult.statusCode ? ` (HTTP ${testResult.statusCode})` : ""}
              </span>
            </div>
          )}

          {canManage && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={!isChangingKey || testMutation.isPending}
              >
                {testMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Test Connection
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending || (!isChangingKey && isEnabledDraft === settings?.isEnabled)}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
