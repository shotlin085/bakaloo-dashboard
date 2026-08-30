import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getBranding, updateBranding } from "@/services/branding.service"
import type { UpdateBrandingPayload } from "@/types/branding.types"

export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: getBranding,
    staleTime: 30_000,
  })
}

export function useUpdateBranding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateBrandingPayload) => updateBranding(payload),
    onSuccess: () => {
      toast.success("Branding updated")
      qc.invalidateQueries({ queryKey: ["branding"] })
    },
    onError: () => toast.error("Failed to update branding"),
  })
}
