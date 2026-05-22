"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import {
  ABTestingCard,
  SchedulingCard,
  TabSettingsCard,
  VersionHistorySidebar,
} from "@/components/themes/ThemeEditorMetaPanels"
import {
  ThemeEditorForm,
  type ThemeEditorMetaFields,
} from "@/components/themes/ThemeEditorForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useThemeTabs } from "@/hooks/useThemeTabs"
import {
  useCancelSchedule,
  useRollbackVersion,
  useScheduleTheme,
  useTheme,
  useThemeVersions,
  useUpdateTheme,
} from "@/hooks/useThemes"
import type { UpdateThemePayload } from "@/types/theme.types"

function EditThemePageContent() {
  const queryClient = useQueryClient()
  const params = useParams<{ id: string }>()
  const themeId = typeof params.id === "string" ? params.id : null
  const { data: theme, isLoading } = useTheme(themeId)
  const { data: themeTabs, isLoading: isLoadingThemeTabs } = useThemeTabs()
  const { data: versions } = useThemeVersions(themeId)
  const updateThemeMutation = useUpdateTheme()
  const scheduleThemeMutation = useScheduleTheme()
  const cancelScheduleMutation = useCancelSchedule()
  const rollbackMutation = useRollbackVersion()

  const initialMeta = useMemo<ThemeEditorMetaFields | undefined>(() => {
    if (!theme) return undefined

    return {
      tab_id: theme.tab_id,
      store_key: theme.store_key ?? "zepto",
      status: theme.status,
      scheduled_at: theme.scheduled_at,
      expires_at: theme.expires_at,
      ab_variant: theme.ab_variant,
      ab_split_percent: theme.ab_split_percent,
    }
  }, [theme])

  const refreshEditorState = () => {
    if (!themeId) return
    queryClient.invalidateQueries({ queryKey: ["themes"] })
    queryClient.invalidateQueries({ queryKey: ["themes", themeId] })
    queryClient.invalidateQueries({ queryKey: ["themes", themeId, "versions"] })
  }

  if (isLoading) {
    return <LoadingSkeleton variant="table" count={8} />
  }

  if (!themeId || !theme || !initialMeta) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 p-8">
          <p className="text-lg font-semibold">Theme not found</p>
          <p className="text-sm text-muted-foreground">
            The requested theme could not be loaded.
          </p>
          <Button asChild variant="outline">
            <Link href="/themes">Back to Themes</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <ThemeEditorForm
      mode="edit"
      initialName={theme.name}
      initialData={theme.theme_data}
      initialMeta={initialMeta}
      isSaving={updateThemeMutation.isPending}
      renderBeforeSections={({ formData, updateField }) => (
        <div className="space-y-6">
          <TabSettingsCard
            formData={formData}
            updateField={updateField}
            themeTabs={themeTabs}
            isLoadingTabs={isLoadingThemeTabs}
          />
          <SchedulingCard
            formData={formData}
            updateField={updateField}
            isScheduling={scheduleThemeMutation.isPending}
            isCancelling={cancelScheduleMutation.isPending}
            onSchedule={() =>
              scheduleThemeMutation.mutate(
                {
                  id: themeId,
                  payload: { scheduled_at: formData.scheduled_at! },
                },
                {
                  onSuccess: refreshEditorState,
                }
              )
            }
            onCancel={() =>
              cancelScheduleMutation.mutate(themeId, {
                onSuccess: refreshEditorState,
              })
            }
          />
          <ABTestingCard formData={formData} updateField={updateField} />
        </div>
      )}
      renderSidebar={() => (
        <VersionHistorySidebar
          currentVersion={theme.version || 1}
          versions={versions}
          isRestoring={rollbackMutation.isPending}
          onRestore={(versionId) =>
            rollbackMutation.mutate(
              {
                themeId,
                payload: { version_id: versionId },
              },
              {
                onSuccess: refreshEditorState,
              }
            )
          }
        />
      )}
      onSave={(payload) => {
        const updatePayload: UpdateThemePayload = {
          name: payload.name,
          theme_data: payload.theme_data,
          tab_id: payload.tab_id,
          status: payload.status,
          scheduled_at: payload.scheduled_at,
          expires_at: payload.expires_at,
          ab_variant: payload.ab_variant,
          ab_split_percent: payload.ab_split_percent,
        }

        updateThemeMutation.mutate(
          { id: theme.id, payload: updatePayload },
          {
            onSuccess: refreshEditorState,
          }
        )
      }}
    />
  )
}

export default function EditThemePage() {
  return <EditThemePageContent />
}
