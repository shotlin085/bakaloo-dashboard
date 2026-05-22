import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  addSection,
  cancelSectionSchedule,
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
  UpdateSectionMerchPayload,
  UpdateSectionPayload,
} from "@/types/theme.types"

export function useSections(tabId: string | null) {
  return useQuery({
    queryKey: ["sections", tabId],
    queryFn: () => getSections(tabId!),
    enabled: !!tabId,
    staleTime: 30_000,
  })
}

export function useSectionVersions(tabId: string | null) {
  return useQuery({
    queryKey: ["sections", tabId, "versions"],
    queryFn: () => getSectionVersions(tabId!),
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
    }: {
      tabId: string
      payload: ReorderSectionsPayload
    }) => reorderSections(tabId, payload),
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
      qc.invalidateQueries({ queryKey: ["sections", tabId, "versions"] })
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
    }: {
      tabId: string
      payload: ScheduleSectionLayoutPayload
    }) => scheduleSectionLayout(tabId, payload),
    onSuccess: (_, { tabId }) => {
      toast.success("Section layout scheduled")
      qc.invalidateQueries({ queryKey: ["sections", tabId, "versions"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to schedule section layout"),
  })
}

export function useCancelSectionSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tabId: string) => cancelSectionSchedule(tabId),
    onSuccess: (_, tabId) => {
      toast.success("Section schedule cancelled")
      qc.invalidateQueries({ queryKey: ["sections", tabId, "versions"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to cancel section schedule"),
  })
}
