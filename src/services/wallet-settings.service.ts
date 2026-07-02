import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type {
  WalletSettings,
  UpdateWalletSettingsPayload,
} from "@/types/wallet-settings.types"

/**
 * Wallet Settings service — talks to `/api/v1/admin/wallet-settings`
 * (max wallet balance + transfer amount limits).
 */
export const walletSettingsService = {
  /** Fetch the effective wallet balance/transfer limits. */
  async get(): Promise<WalletSettings> {
    const { data } = await api.get<ApiResponse<WalletSettings>>("/admin/wallet-settings")
    return data.data
  },

  /** Update the global wallet balance/transfer limits. */
  async update(payload: UpdateWalletSettingsPayload): Promise<WalletSettings> {
    const { data } = await api.put<ApiResponse<WalletSettings>>(
      "/admin/wallet-settings",
      payload,
    )
    return data.data
  },
}
