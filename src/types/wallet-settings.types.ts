/** Global wallet balance + transfer limits, admin-configurable. */
export interface WalletSettings {
  maxWalletBalance: number
  maxTransferAmount: number
  minTransferAmount: number
  transfersEnabled: boolean
  /** Kill-switch for wallet top-up (e.g. during a Razorpay outage). When
   * off, the app shows "Wallet top-up is currently unavailable" instead
   * of opening the payment flow — existing balance and spend are unaffected. */
  topupEnabled: boolean
}

export type UpdateWalletSettingsPayload = Partial<WalletSettings>
