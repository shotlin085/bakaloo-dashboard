"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  value: { from?: Date; to?: Date }
  onChange: (range: { from?: Date; to?: Date }) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const range: DateRange = { from: value.from, to: value.to }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start text-left font-normal",
            !value.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {value.from ? (
            value.to ? (
              <span className="text-xs">
                {format(value.from, "dd MMM")} – {format(value.to, "dd MMM yyyy")}
              </span>
            ) : (
              <span className="text-xs">{format(value.from, "dd MMM yyyy")}</span>
            )
          ) : (
            <span className="text-xs">Date Range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => {
            onChange({ from: r?.from, to: r?.to })
            if (r?.from && r?.to) setOpen(false)
          }}
          numberOfMonths={2}
          initialFocus
        />
        {(value.from || value.to) && (
          <div className="p-2 border-t flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                onChange({ from: undefined, to: undefined })
                setOpen(false)
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
