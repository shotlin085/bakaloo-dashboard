import type { AbandonedCartStatus } from "@/types/abandoned-cart.types"

export const STATUS_CONFIG: Record<AbandonedCartStatus, { label: string; bg: string; text: string }> = {
  OPEN: { label: "Open", bg: "#FEF3C7", text: "#92400E" },
  RECOVERED: { label: "Recovered", bg: "#D1FAE5", text: "#065F46" },
  CONVERTED: { label: "Converted", bg: "#DBEAFE", text: "#1E40AF" },
  EXPIRED: { label: "Expired", bg: "#F3F4F6", text: "#6B7280" },
}

/** High(>=70)/Medium(40-69)/Low(<40) priority band, per the Smart Recovery Priority Score spec. */
export function priorityBand(score: number): { label: string; bg: string; text: string } {
  if (score >= 70) return { label: "High", bg: "#FEE2E2", text: "#991B1B" }
  if (score >= 40) return { label: "Medium", bg: "#FEF3C7", text: "#92400E" }
  return { label: "Low", bg: "#F3F4F6", text: "#6B7280" }
}
