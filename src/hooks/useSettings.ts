import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getSettings, updateSettings } from "@/services/settings.service"
import type { UpdateSettingsPayload } from "@/types/settings.types"

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    staleTime: 30_000,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => updateSettings(payload),
    onSuccess: () => {
      toast.success("Settings saved")
      qc.invalidateQueries({ queryKey: ["settings"] })
    },
    onError: () => toast.error("Failed to save settings"),
  })
}
