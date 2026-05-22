"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ABTestingCard,
  TabSettingsCard,
} from "@/components/themes/ThemeEditorMetaPanels"
import {
  DEFAULT_THEME_DATA,
  ThemeEditorForm,
  cloneThemeData,
  type ThemeEditorMetaFields,
} from "@/components/themes/ThemeEditorForm"
import { useThemeTabs } from "@/hooks/useThemeTabs"
import { useCreateTheme } from "@/hooks/useThemes"

export default function NewThemePage() {
  const router = useRouter()
  const createThemeMutation = useCreateTheme()
  const { data: themeTabs, isLoading: isLoadingThemeTabs } = useThemeTabs()

  const initialData = useMemo(() => cloneThemeData(DEFAULT_THEME_DATA), [])
  const initialMeta = useMemo<ThemeEditorMetaFields>(
    () => ({
      tab_id: null,
      store_key: "zepto",
      status: "draft",
      scheduled_at: null,
      expires_at: null,
      ab_variant: "A",
      ab_split_percent: 100,
    }),
    []
  )

  return (
    <ThemeEditorForm
      mode="create"
      initialName=""
      initialData={initialData}
      initialMeta={initialMeta}
      isSaving={createThemeMutation.isPending}
      renderBeforeSections={({ formData, updateField }) => (
        <div className="space-y-6">
          <TabSettingsCard
            formData={formData}
            updateField={updateField}
            themeTabs={themeTabs}
            isLoadingTabs={isLoadingThemeTabs}
          />
          <ABTestingCard formData={formData} updateField={updateField} />
        </div>
      )}
      onSave={(payload) => {
        createThemeMutation.mutate(
          {
            name: payload.name,
            theme_data: payload.theme_data,
            tab_id: payload.tab_id,
            status: payload.status,
            ab_variant: payload.ab_variant,
            ab_split_percent: payload.ab_split_percent,
          },
          {
            onSuccess: () => router.push("/themes"),
          }
        )
      }}
    />
  )
}
