"use client"

/**
 * Shop detail — Operating Hours tab.
 *
 * Renders a weekday table with each day's open / close times and a closed
 * pill when the shop does not operate that day.
 *
 * Pure presentation — receives a `Shop` prop. No mutations, no user input.
 *
 * Requirements: 5.7
 */

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Shop, Weekday } from "@/types"

export interface OperatingHoursTabProps {
  shop: Shop
}

/** Weekday order matches the shop create form (Mon → Sun). */
const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

export function OperatingHoursTab({ shop }: OperatingHoursTabProps) {
  const hours = shop.operating_hours ?? ({} as Shop["operating_hours"])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Operating hours</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Day</TableHead>
              <TableHead>Open</TableHead>
              <TableHead>Close</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {WEEKDAYS.map((day) => {
              const row = hours[day]
              const closed = !row || row.closed
              return (
                <TableRow key={day}>
                  <TableCell className="font-medium">
                    {WEEKDAY_LABEL[day]}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {closed ? "—" : (row?.open ?? "—")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {closed ? "—" : (row?.close ?? "—")}
                  </TableCell>
                  <TableCell className="text-right">
                    {closed ? (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        Closed
                      </Badge>
                    ) : (
                      <Badge variant="default">Open</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
