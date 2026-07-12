"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getTutorials,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  reorderTutorials,
} from "@/services/tutorials.service"
import { qk } from "@/lib/query-keys"
import type { CreateTutorialPayload, UpdateTutorialPayload } from "@/types/tutorial.types"

export function useTutorials() {
  return useQuery({
    queryKey: qk.tutorials(),
    queryFn: getTutorials,
    staleTime: 30_000,
  })
}

export function useCreateTutorial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTutorialPayload) => createTutorial(payload),
    onSuccess: () => {
      toast.success("Tutorial added")
      qc.invalidateQueries({ queryKey: qk.tutorials() })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add tutorial")
    },
  })
}

export function useUpdateTutorial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTutorialPayload }) =>
      updateTutorial(id, payload),
    onSuccess: () => {
      toast.success("Tutorial updated")
      qc.invalidateQueries({ queryKey: qk.tutorials() })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update tutorial")
    },
  })
}

export function useDeleteTutorial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTutorial(id),
    onSuccess: () => {
      toast.success("Tutorial deleted")
      qc.invalidateQueries({ queryKey: qk.tutorials() })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete tutorial")
    },
  })
}

export function useReorderTutorials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderTutorials(orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tutorials() })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reorder tutorials")
    },
  })
}
