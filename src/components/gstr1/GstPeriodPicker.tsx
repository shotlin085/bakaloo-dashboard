"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Gstr1PeriodParams, Gstr1PeriodType } from "@/types/gstr1.types"

interface GstPeriodPickerProps {
  value: Gstr1PeriodParams
  onChange: (params: Gstr1PeriodParams) => void
}

/** Indian FY runs Apr -> Mar. Returns the FY start year for `date`. */
function currentFyStartYear(date = new Date()): number {
  const month = date.getMonth() + 1 // 1-12
  return month >= 4 ? date.getFullYear() : date.getFullYear() - 1
}

const FY_OPTIONS = (() => {
  const current = currentFyStartYear()
  // Current FY plus the 3 preceding ones — plenty for filing/back-filing.
  return Array.from({ length: 4 }, (_, i) => current - i)
})()

// Ordered Apr(0)..Mar(11) within a financial year, with the real calendar
// month/year offset from the FY start year — mirrors the backend's
// QUARTER_MONTHS mapping in gstr1DueDate.js.
const FY_MONTHS = [
  { label: "Apr", month: 4, yearOffset: 0 },
  { label: "May", month: 5, yearOffset: 0 },
  { label: "Jun", month: 6, yearOffset: 0 },
  { label: "Jul", month: 7, yearOffset: 0 },
  { label: "Aug", month: 8, yearOffset: 0 },
  { label: "Sep", month: 9, yearOffset: 0 },
  { label: "Oct", month: 10, yearOffset: 0 },
  { label: "Nov", month: 11, yearOffset: 0 },
  { label: "Dec", month: 12, yearOffset: 0 },
  { label: "Jan", month: 1, yearOffset: 1 },
  { label: "Feb", month: 2, yearOffset: 1 },
  { label: "Mar", month: 3, yearOffset: 1 },
]

const QUARTERS = [
  { quarter: 1, label: "Q1 (Apr - Jun)" },
  { quarter: 2, label: "Q2 (Jul - Sep)" },
  { quarter: 3, label: "Q3 (Oct - Dec)" },
  { quarter: 4, label: "Q4 (Jan - Mar)" },
]

/** The FY start year the picker shows the FY select as — derived from the
 * current value so MONTH's calendar year maps back to the right FY. */
function fyStartYearFromValue(value: Gstr1PeriodParams): number {
  if (value.periodType === "QUARTER") return value.year
  // MONTH: year is the calendar year of `month`. Jan-Mar belong to the
  // previous FY start year.
  if (value.month && value.month <= 3) return value.year - 1
  return value.year
}

export function GstPeriodPicker({ value, onChange }: GstPeriodPickerProps) {
  const fyStartYear = fyStartYearFromValue(value)

  function setPeriodType(next: Gstr1PeriodType) {
    if (next === value.periodType) return
    if (next === "MONTH") {
      const fyMonth = FY_MONTHS[0] // default to Apr of the current FY selection
      onChange({ periodType: "MONTH", year: fyStartYear + fyMonth.yearOffset, month: fyMonth.month })
    } else {
      onChange({ periodType: "QUARTER", year: fyStartYear, quarter: 1 })
    }
  }

  function setFyStartYear(nextFy: number) {
    if (value.periodType === "QUARTER") {
      onChange({ periodType: "QUARTER", year: nextFy, quarter: value.quarter ?? 1 })
      return
    }
    const currentFyMonth = FY_MONTHS.find((m) => m.month === value.month) ?? FY_MONTHS[0]
    onChange({ periodType: "MONTH", year: nextFy + currentFyMonth.yearOffset, month: currentFyMonth.month })
  }

  function setMonth(monthStr: string) {
    const fyMonth = FY_MONTHS.find((m) => String(m.month) === monthStr)
    if (!fyMonth) return
    onChange({ periodType: "MONTH", year: fyStartYear + fyMonth.yearOffset, month: fyMonth.month })
  }

  function setQuarter(quarterStr: string) {
    onChange({ periodType: "QUARTER", year: fyStartYear, quarter: Number(quarterStr) })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs value={value.periodType} onValueChange={(v) => setPeriodType(v as Gstr1PeriodType)}>
        <TabsList>
          <TabsTrigger value="MONTH">Monthly</TabsTrigger>
          <TabsTrigger value="QUARTER">Quarterly</TabsTrigger>
        </TabsList>
      </Tabs>

      <Select value={String(fyStartYear)} onValueChange={(v) => setFyStartYear(Number(v))}>
        <SelectTrigger className="h-9 w-[130px]" aria-label="Financial year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FY_OPTIONS.map((fy) => (
            <SelectItem key={fy} value={String(fy)}>
              FY {fy}-{String(fy + 1).slice(-2)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.periodType === "MONTH" ? (
        <Select value={String(value.month ?? "")} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Month">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {FY_MONTHS.map((m) => (
              <SelectItem key={m.month} value={String(m.month)}>
                {m.label} {fyStartYear + m.yearOffset}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Select value={String(value.quarter ?? "")} onValueChange={setQuarter}>
          <SelectTrigger className="h-9 w-[170px]" aria-label="Quarter">
            <SelectValue placeholder="Select quarter" />
          </SelectTrigger>
          <SelectContent>
            {QUARTERS.map((q) => (
              <SelectItem key={q.quarter} value={String(q.quarter)}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

/** Default value: the current month, in its FY. Exported for the page to seed initial state. */
export function defaultGstr1Period(): Gstr1PeriodParams {
  const now = new Date()
  return { periodType: "MONTH", year: now.getFullYear(), month: now.getMonth() + 1 }
}
