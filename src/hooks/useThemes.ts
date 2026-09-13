import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  activateTheme,
  cancelSchedule,
  createTheme,
  deleteTheme,
  getTheme,
  getTabThemes,
  getThemeVersions,
  getThemes,
  rollbackThemeVersion,
  scheduleTheme,
  updateTheme,
} from "@/services/themes.service"
import { getThemeTabs } from "@/services/theme-tabs.service"
import type {
  CreateThemePayload,
  RollbackPayload,
  ScheduleThemePayload,
  Theme,
  ThemeTab,
  UpdateThemePayload,
} from "@/types/theme.types"

export function useThemes() {
  return useQuery({
    queryKey: ["themes"],
    queryFn: getThemes,
    staleTime: 30_000,
  })
}

export function useTheme(id: string | null) {
  return useQuery({
    queryKey: ["themes", id],
    queryFn: () => getTheme(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateThemePayload) => createTheme(payload),
    onSuccess: () => {
      toast.success("Theme created")
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: () => toast.error("Failed to create theme"),
  })
}

export function useUpdateTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateThemePayload }) =>
      updateTheme(id, payload),
    onSuccess: (_, { id }) => {
      toast.success("Theme updated")
      qc.invalidateQueries({ queryKey: ["themes"] })
      qc.invalidateQueries({ queryKey: ["themes", id] })
    },
    onError: () => toast.error("Failed to update theme"),
  })
}

export function useActivateTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activateTheme(id),
    onSuccess: () => {
      toast.success("Theme activated")
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: () => toast.error("Failed to activate theme"),
  })
}

export interface CopyB2CToB2BResult {
  copied: number
  failed: Array<{ name: string; error: string }>
}

/**
 * Copies a caller-supplied set of currently-active B2C themes into new,
 * immediately-active B2B themes for the same tab/variant — so a B2B
 * viewer sees the equivalent layout instead of the fallback/blank state,
 * and the admin can then tweak it from there. Runs sequentially (not
 * Promise.all) so each theme's create+activate pair completes before the
 * next starts, avoiding any transient overlap with the activate
 * endpoint's own sibling-deactivation logic. Calls the raw service
 * functions directly (not useCreateTheme/useActivateTheme) so a bulk copy
 * doesn't fire a toast per theme — just one summary at the end.
 *
 * B2C and B2B tabs are independent rows sharing only (store_key, key) —
 * see backend migration 126 — so the new theme can't just reuse the
 * source's tab_id; it has to be re-resolved against the B2B tab list. A
 * theme whose tab has no B2B counterpart yet is reported as failed rather
 * than silently created unlinked.
 */
export function useCopyB2CToB2B() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sourceThemes: Theme[]): Promise<CopyB2CToB2BResult> => {
      const result: CopyB2CToB2BResult = { copied: 0, failed: [] }
      const b2bTabsByStore = new Map<string, Promise<ThemeTab[]>>()

      const getB2BTabs = (storeKey: string) => {
        if (!b2bTabsByStore.has(storeKey)) {
          b2bTabsByStore.set(
            storeKey,
            getThemeTabs({ store_key: storeKey as ThemeTab["store_key"], audience: "B2B" })
          )
        }
        return b2bTabsByStore.get(storeKey)!
      }

      for (const theme of sourceThemes) {
        try {
          let b2bTabId: string | undefined

          if (theme.tab_id) {
            if (!theme.store_key || !theme.tab_key) {
              throw new Error("Theme is missing its store/tab key — re-link it before copying")
            }
            const b2bTabs = await getB2BTabs(theme.store_key)
            const matchedTab = b2bTabs.find((tab) => tab.key === theme.tab_key)
            if (!matchedTab) {
              throw new Error(
                `No B2B tab exists yet for "${theme.tab_key}" — create it in Theme Tabs first`
              )
            }
            b2bTabId = matchedTab.id
          }

          const created = await createTheme({
            name: `${theme.name} (B2B)`,
            theme_data: theme.theme_data,
            tab_id: b2bTabId,
            status: "active",
            ab_variant: theme.ab_variant,
            ab_split_percent: theme.ab_split_percent,
            audience: "B2B",
          })
          await activateTheme(created.id)
          result.copied += 1
        } catch (err) {
          result.failed.push({
            name: theme.name,
            error: err instanceof Error ? err.message : "Unknown error",
          })
        }
      }
      return result
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["themes"] })
      if (result.failed.length === 0) {
        toast.success(
          `Copied ${result.copied} theme${result.copied === 1 ? "" : "s"} to B2B`
        )
      } else {
        toast.error(
          `Copied ${result.copied}, ${result.failed.length} failed (${result.failed.map((f) => f.name).join(", ")})`
        )
      }
    },
    onError: () => toast.error("Failed to copy themes to B2B"),
  })
}

export function useDeleteTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTheme(id),
    onSuccess: () => {
      toast.success("Theme deleted")
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: () => toast.error("Failed to delete theme"),
  })
}

export function useTabThemes() {
  return useQuery({
    queryKey: ["themes", "tabs"],
    queryFn: getTabThemes,
    staleTime: 30_000,
  })
}

export function useScheduleTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ScheduleThemePayload }) =>
      scheduleTheme(id, payload),
    onSuccess: () => {
      toast.success("Theme scheduled")
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: () => toast.error("Failed to schedule theme"),
  })
}

export function useCancelSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelSchedule(id),
    onSuccess: () => {
      toast.success("Schedule cancelled")
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: () => toast.error("Failed to cancel schedule"),
  })
}

export function useThemeVersions(themeId: string | null) {
  return useQuery({
    queryKey: ["themes", themeId, "versions"],
    queryFn: () => getThemeVersions(themeId!),
    enabled: !!themeId,
    staleTime: 30_000,
  })
}

export function useRollbackVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ themeId, payload }: { themeId: string; payload: RollbackPayload }) =>
      rollbackThemeVersion(themeId, payload),
    onSuccess: (_, { themeId }) => {
      toast.success("Theme rolled back to previous version")
      qc.invalidateQueries({ queryKey: ["themes"] })
      qc.invalidateQueries({ queryKey: ["themes", themeId] })
    },
    onError: () => toast.error("Failed to rollback theme"),
  })
}
