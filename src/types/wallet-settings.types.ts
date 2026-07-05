/** Global wallet balance + transfer limits, admin-configurable. */
export interface WalletSettings {
  maxWalletBalance: number
  maxTransferAmount: number
  minTransferAmount: number
  transfersEnabled: boolean
}

export type UpdateWalletSettingsPayload = Partial<WalletSettings>
