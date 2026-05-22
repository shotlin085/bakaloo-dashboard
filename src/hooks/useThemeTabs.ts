import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  archiveThemeTab,
  createThemeTab,
  getThemeTab,
  getThemeTabs,
  restoreThemeTab,
  updateThemeTab,
} from "@/services/theme-tabs.service"
import type {
  CreateThemeTabPayload,
  ThemeTabFilters,
  UpdateThemeTabPayload,
} from "@/types/theme.types"

export function useThemeTabs(filters: ThemeTabFilters = {}) {
  return useQuery({
    queryKey: ["theme-tabs", filters],
    queryFn: () => getThemeTabs(filters),
    staleTime: 30_000,
  })
}

export function useThemeTab(id: string | null) {
  return useQuery({
    queryKey: ["theme-tabs", id],
    queryFn: () => getThemeTab(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateThemeTab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateThemeTabPayload) => createThemeTab(payload),
    onSuccess: () => {
      toast.success("Theme tab created")
      qc.invalidateQueries({ queryKey: ["theme-tabs"] })
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create theme tab"),
  })
}

export function useUpdateThemeTab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateThemeTabPayload }) =>
      updateThemeTab(id, payload),
    onSuccess: (_, { id }) => {
      toast.success("Theme tab updated")
      qc.invalidateQueries({ queryKey: ["theme-tabs"] })
      qc.invalidateQueries({ queryKey: ["theme-tabs", id] })
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update theme tab"),
  })
}

export function useArchiveThemeTab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveThemeTab(id),
    onSuccess: () => {
      toast.success("Theme tab archived")
      qc.invalidateQueries({ queryKey: ["theme-tabs"] })
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to archive theme tab"),
  })
}

export function useRestoreThemeTab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restoreThemeTab(id),
    onSuccess: () => {
      toast.success("Theme tab restored")
      qc.invalidateQueries({ queryKey: ["theme-tabs"] })
      qc.invalidateQueries({ queryKey: ["themes"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to restore theme tab"),
  })
}
