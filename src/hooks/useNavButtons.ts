"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  getNavButtons,
  createNavButton,
  updateNavButton,
  deleteNavButton,
  reorderNavButtons,
} from "@/services/nav-buttons.service"
import type { CreateNavButtonPayload, UpdateNavButtonPayload } from "@/types/nav-button.types"

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

export function useNavButtons() {
  return useQuery({
    queryKey: ["nav-buttons"],
    queryFn: getNavButtons,
  })
}

export function useCreateNavButton() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateNavButtonPayload) => createNavButton(payload),
    onSuccess: () => {
      toast.success("Nav button created")
      qc.invalidateQueries({ queryKey: ["nav-buttons"] })
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err) || "Failed to create nav button")
    },
  })
}

export function useUpdateNavButton() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateNavButtonPayload }) =>
      updateNavButton(id, payload),
    onSuccess: () => {
      toast.success("Nav button updated")
      qc.invalidateQueries({ queryKey: ["nav-buttons"] })
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err) || "Failed to update nav button")
    },
  })
}

export function useDeleteNavButton() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNavButton(id),
    onSuccess: () => {
      toast.success("Nav button deleted")
      qc.invalidateQueries({ queryKey: ["nav-buttons"] })
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err) || "Failed to delete nav button")
    },
  })
}

export function useReorderNavButtons() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderNavButtons(orderedIds),
    onSuccess: () => {
      toast.success("Nav buttons reordered")
      qc.invalidateQueries({ queryKey: ["nav-buttons"] })
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err) || "Failed to reorder nav buttons")
    },
  })
}
