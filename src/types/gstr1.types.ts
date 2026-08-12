export type Gstr1PeriodType = "MONTH" | "QUARTER"

/**
 * Params sent to every GSTR-1 endpoint. `year` means different things
 * depending on periodType (matches the backend's gstr1DueDate util):
 *   - MONTH:   the calendar year of `month` (1-12).
 *   - QUARTER: the Indian financial-year START year (e.g. 2025 = FY2025-26),
 *              regardless of which quarter — Q4 (Jan-Mar) falls in year+1.
 */
export interface Gstr1PeriodParams {
  periodType: Gstr1PeriodType
  year: number
  month?: number
  quarter?: number
}

export interface Gstr1Period {
  startDate: string
  endDate: string
  dueDate: string
  filingFrequency: "MONTHLY" | "QUARTERLY"
}

export interface B2CSRow {
  placeOfSupply: string
  rate: number
  taxableValue: number
}

export interface ExcludedB2CLRow {
  orderId: string
  orderNumber: string
  taxableValue: number
  placeOfSupply: string
}

export interface Gstr1B2CSResponse {
  rows: B2CSRow[]
  excludedB2CL: ExcludedB2CLRow[]
}

export interface HsnSummaryRow {
  hsn: string
  description: string
  uqc: string
  quantity: number
  rate: number
  taxableValue: number
  totalValue: number
  cgst: number
  sgst: number
  igst: number
}
