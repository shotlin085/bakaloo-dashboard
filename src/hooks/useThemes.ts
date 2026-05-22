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
import type {
  CreateThemePayload,
  RollbackPayload,
  ScheduleThemePayload,
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
