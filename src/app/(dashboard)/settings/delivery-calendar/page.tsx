"use client"

/**
 * Delivery Calendar — the real, admin-managed replacement for the old
 * hardcoded 7-day/fixed-window slot generator (bakaloo-backend migration
 * 072). Two tiers: a recurring weekly template (edited rarely) generates
 * materialized concrete days/slots forward, which can also be overridden
 * for a single date (holiday closures, one-off extra slots) without
 * touching the template.
 */

import { useMemo, useState } from "react"
import { CalendarDays, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useDeliveryCalendarDays,
  useDeliveryCalendarTemplate,
  useGenerateDeliveryCalendar,
  useSetDeliveryCalendarDayOverride,
  useUpdateDeliveryCalendarTemplate,
} from "@/hooks/useDeliveryCalendar"
import type { WeeklyTemplateRow } from "@/types/delivery-calendar.types"

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function emptyRow(weekday: number): WeeklyTemplateRow {
  return { weekday, is_available: true, start_time: "09:00", end_time: "21:00", label: "9 AM – 9 PM" }
}

function groupByWeekday(rows: WeeklyTemplateRow[]): Record<number, WeeklyTemplateRow[]> {
  const grouped: Record<number, WeeklyTemplateRow[]> = {}
  for (let day = 0; day < 7; day++) grouped[day] = []
  for (const row of rows) {
    grouped[row.weekday] = [...(grouped[row.weekday] || []), row]
  }
  return grouped
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function DeliveryCalendarPage() {
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Calendar"
        subtitle="Set the recurring weekly delivery schedule, and override specific dates."
      />
      <Tabs defaultValue="template">
        <TabsList>
          <TabsTrigger value="template">Weekly Template</TabsTrigger>
          <TabsTrigger value="override">Calendar Override</TabsTrigger>
        </TabsList>
        <TabsContent value="template" className="mt-4">
          <WeeklyTemplateTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="override" className="mt-4">
          <CalendarOverrideTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function WeeklyTemplateTab({ canManage }: { canManage: boolean }) {
  const { data, isLoading } = useDeliveryCalendarTemplate()
  const updateMutation = useUpdateDeliveryCalendarTemplate()
  const [draft, setDraft] = useState<Record<number, WeeklyTemplateRow[]> | null>(null)

  const grouped = draft ?? (data ? groupByWeekday(data) : null)

  if (isLoading || !grouped) {
    return (
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  function ensureDraft() {
    if (!draft) setDraft(grouped!)
    return draft ?? grouped!
  }

  function updateDayRows(weekday: number, rows: WeeklyTemplateRow[]) {
    const current = ensureDraft()
    setDraft({ ...current, [weekday]: rows })
  }

  function addSlot(weekday: number) {
    const current = ensureDraft()
    updateDayRows(weekday, [...(current[weekday] || []), emptyRow(weekday)])
  }

  function removeSlot(weekday: number, index: number) {
    const current = ensureDraft()
    updateDayRows(weekday, current[weekday].filter((_, i) => i !== index))
  }

  function updateSlot(weekday: number, index: number, patch: Partial<WeeklyTemplateRow>) {
    const current = ensureDraft()
    updateDayRows(
      weekday,
      current[weekday].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function toggleDayAvailable(weekday: number, isAvailable: boolean) {
    const current = ensureDraft()
    updateDayRows(
      weekday,
      current[weekday].map((row) => ({ ...row, is_available: isAvailable })),
    )
  }

  function handleSave() {
    if (!grouped) return
    const rows = Object.values(grouped).flat()
    updateMutation.mutate(rows)
    setDraft(null)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending || !draft}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      )}
      {WEEKDAY_LABELS.map((label, weekday) => {
        const rows = grouped[weekday] || []
        const dayAvailable = rows.length === 0 || rows.some((r) => r.is_available)
        return (
          <Card key={weekday}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{label}</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Available</Label>
                <Switch
                  checked={dayAvailable}
                  disabled={!canManage}
                  onCheckedChange={(checked) => toggleDayAvailable(weekday, checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No delivery windows configured.</p>
              ) : (
                rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-32"
                      disabled={!canManage}
                      value={row.start_time}
                      onChange={(e) => updateSlot(weekday, index, { start_time: e.target.value })}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      className="w-32"
                      disabled={!canManage}
                      value={row.end_time}
                      onChange={(e) => updateSlot(weekday, index, { end_time: e.target.value })}
                    />
                    <Input
                      className="flex-1"
                      placeholder="Label (e.g. 9 AM – 11 AM)"
                      disabled={!canManage}
                      value={row.label}
                      onChange={(e) => updateSlot(weekday, index, { label: e.target.value })}
                    />
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlot(weekday, index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              )}
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => addSlot(weekday)}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add window
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function CalendarOverrideTab({ canManage }: { canManage: boolean }) {
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const rangeStart = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month])
  const rangeEnd = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month])
  const { data: days } = useDeliveryCalendarDays(formatDate(rangeStart), formatDate(rangeEnd))
  const setOverrideMutation = useSetDeliveryCalendarDayOverride()
  const generateMutation = useGenerateDeliveryCalendar()

  const closedDates = useMemo(
    () => (days || []).filter((d) => !d.is_available).map((d) => new Date(`${d.calendar_date}T00:00:00`)),
    [days],
  )

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : null
  const selectedDay = (days || []).find((d) => d.calendar_date === selectedDateStr)

  const [isAvailable, setIsAvailable] = useState(true)
  const [note, setNote] = useState("")

  function handleSelectDate(date: Date | undefined) {
    setSelectedDate(date)
    if (date) {
      const dateStr = formatDate(date)
      const day = (days || []).find((d) => d.calendar_date === dateStr)
      setIsAvailable(day ? day.is_available : true)
      setNote(day?.note || "")
    }
  }

  function handleSaveOverride() {
    if (!selectedDateStr) return
    setOverrideMutation.mutate({
      date: selectedDateStr,
      payload: { is_available: isAvailable, note: note.trim() || undefined },
    })
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <Card className="w-fit">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Calendar</CardTitle>
            <CardDescription>Red dates are marked unavailable.</CardDescription>
          </div>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate(30)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Generate 30 days
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ closed: closedDates }}
            modifiersClassNames={{ closed: "bg-destructive/15 text-destructive" }}
          />
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {selectedDate ? selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "Select a date"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground">
              Click a date on the calendar to view or override its availability.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <Label>Available for delivery</Label>
                <Switch checked={isAvailable} disabled={!canManage} onCheckedChange={setIsAvailable} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="day-note">Note (optional)</Label>
                <Textarea
                  id="day-note"
                  maxLength={500}
                  disabled={!canManage}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Public holiday"
                />
              </div>
              {selectedDay && selectedDay.slots.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Slots on this date</Label>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedDay.slots.map((slot) => (
                      <li key={slot.id}>{slot.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              {canManage && (
                <Button onClick={handleSaveOverride} disabled={setOverrideMutation.isPending}>
                  {setOverrideMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save override
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
