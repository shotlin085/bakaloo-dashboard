import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  addSection,
  cancelSectionSchedule,
  copySectionsToB2B,
  deleteSection,
  duplicateSection,
  getSectionVersions,
  getSections,
  rollbackSectionVersion,
  reorderSections,
  scheduleSectionLayout,
  updateSection,
  updateSectionMerch,
} from "@/services/sections.service"
import type {
  CreateSectionPayload,
  ReorderSectionsPayload,
  RollbackPayload,
  ScheduleSectionLayoutPayload,
  ThemeAudience,
  UpdateSectionMerchPayload,
  UpdateSectionPayload,
} from "@/types/theme.types"

export function useSections(tabId: string | null, audience: ThemeAudience = "B2C") {
  return useQuery({
    queryKey: ["sections", tabId, audience],
    queryFn: () => getSections(tabId!, audience),
    enabled: !!tabId,
    staleTime: 30_000,
  })
}

export function useSectionVersions(tabId: string | null, audience: ThemeAudience = "B2C") {
  return useQuery({
    queryKey: ["sections", tabId, audience, "versions"],
    queryFn: () => getSectionVersions(tabId!, audience),
    enabled: !!tabId,
    staleTime: 30_000,
  })
}

export function useAddSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tabId,
      payload,
    }: {
      tabId: string
      payload: CreateSectionPayload
    }) => addSection(tabId, payload),
    onSuccess: () => {
      toast.success("Section created")
      qc.invalidateQueries({ queryKey: ["sections"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create section"),
  })
}

export function useUpdateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSectionPayload }) =>
      updateSection(id, payload),
    onSuccess: () => {
      toast.success("Section updated")
      qc.invalidateQueries({ queryKey: ["sections"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update section"),
  })
}

export function useUpdateSectionMerch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateSectionMerchPayload
    }) => updateSectionMerch(id, payload),
    onSuccess: () => {
      toast.success("Section merch updated")
      qc.invalidateQueries({ queryKey: ["sections"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update section merch"),
  })
}

export function useDeleteSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: () => {
      toast.success("Section deleted")
      qc.invalidateQueries({ queryKey: ["sections"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete section"),
  })
}

export function useReorderSections() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tabId,
      payload,
      audience = "B2C",
    }: {
      tabId: string
      payload: ReorderSectionsPayload
      audience?: ThemeAudience
    }) => reorderSections(tabId, payload, audience),
    onSuccess: () => {
      toast.success("Sections reordered")
      qc.invalidateQueries({ queryKey: ["sections"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to reorder sections"),
  })
}

export function useDuplicateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicateSection(id),
    onSuccess: () => {
      toast.success("Section duplicated")
      qc.invalidateQueries({ queryKey: ["sections"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to duplicate section"),
  })
}

export function useRollbackSectionVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tabId,
      payload,
    }: {
      tabId: string
      payload: RollbackPayload
    }) => rollbackSectionVersion(tabId, payload),
    onSuccess: (_, { tabId }) => {
      toast.success("Section layout rolled back")
      qc.invalidateQueries({ queryKey: ["sections", tabId] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to rollback section layout"),
  })
}

export function useScheduleSectionLayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tabId,
      payload,
      audience = "B2C",
    }: {
      tabId: string
      payload: ScheduleSectionLayoutPayload
      audience?: ThemeAudience
    }) => scheduleSectionLayout(tabId, payload, audience),
    onSuccess: (_, { tabId }) => {
      toast.success("Section layout scheduled")
      qc.invalidateQueries({ queryKey: ["sections", tabId] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to schedule section layout"),
  })
}

export function useCancelSectionSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tabId,
      audience = "B2C",
    }: {
      tabId: string
      audience?: ThemeAudience
    }) => cancelSectionSchedule(tabId, audience),
    onSuccess: (_, { tabId }) => {
      toast.success("Section schedule cancelled")
      qc.invalidateQueries({ queryKey: ["sections", tabId] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to cancel section schedule"),
  })
}

/**
 * "Copy B2C to B2B" — bootstraps a tab's B2B section list from its
 * current B2C one. Backend refuses if B2B sections already exist.
 */
export function useCopySectionsToB2B() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tabId: string) => copySectionsToB2B(tabId),
    onSuccess: (_, tabId) => {
      toast.success("Sections copied to B2B")
      qc.invalidateQueries({ queryKey: ["sections", tabId] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to copy sections to B2B"),
  })
}
