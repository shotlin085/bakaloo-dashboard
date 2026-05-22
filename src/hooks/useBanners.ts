import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from "@/services/banners.service"
import type { CreateBannerPayload, UpdateBannerPayload } from "@/types/banner.types"

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: getBanners,
    staleTime: 30_000,
  })
}

export function useCreateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBannerPayload) => createBanner(payload),
    onSuccess: () => {
      toast.success("Banner created successfully")
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create banner")
    },
  })
}

export function useUpdateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBannerPayload }) =>
      updateBanner(id, payload),
    onSuccess: () => {
      toast.success("Banner updated successfully")
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update banner")
    },
  })
}

export function useDeleteBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => {
      toast.success("Banner deleted")
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete banner")
    },
  })
}

export function useReorderBanners() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderBanners(orderedIds),
    onSuccess: () => {
      toast.success("Banners reordered")
      qc.invalidateQueries({ queryKey: ["banners"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reorder banners")
    },
  })
}
