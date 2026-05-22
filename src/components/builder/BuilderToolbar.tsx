"use client"

import { useState } from "react"
import { CalendarClock, Loader2, RotateCcw, Save, Send } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
interface BuilderToolbarProps {
  isDirty: boolean
  onSave: () => Promise<void> | void
  onPushLive: () => Promise<void> | void
  onDiscard: () => void
  onSchedule?: (scheduledAt: string) => Promise<void> | void
  version: number
  status: "Draft" | "Live" | "Scheduled"
  isProcessing?: boolean
}

function formatLocalDateTimeValue(value?: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 30 * 60 * 1000)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  date.setSeconds(0, 0)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}


export default function BuilderToolbar({
  isDirty,
  onSave,
  onPushLive,
  onDiscard,
  onSchedule,
  version,
  status,
  isProcessing = false,
}: BuilderToolbarProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(() =>
    formatLocalDateTimeValue()
  )

  const isBusy = isProcessing

  const handleSchedule = async () => {
    if (!onSchedule || !scheduledAt) return
    await onSchedule(new Date(scheduledAt).toISOString())
    setScheduleOpen(false)
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] rounded-[24px] border border-slate-200/80 bg-white/92 px-3 py-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:px-4 sm:py-3.5 xl:rounded-[28px] xl:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Badge
            variant="outline"
            className="w-fit rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: 'var(--store-bg)',
              borderColor: 'var(--store-accent)',
              color: 'var(--store-accent)',
            }}
          >
            v{version} • {status}
          </Badge>
          <span className="text-xs text-slate-500 sm:text-sm">
            {isDirty
              ? "Unsaved draft changes are local to this browser."
              : "All builder changes are synced with the current layout state."}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={!isDirty || isBusy}
            onClick={onDiscard}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Discard Changes
          </Button>

          {onSchedule ? (
            <Popover open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  className="w-full sm:w-auto"
                >
                  <CalendarClock className="h-4 w-4" />
                  Schedule
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] space-y-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Schedule Layout Push
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Choose when this manifest should become active.
                  </div>
                </div>

                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setScheduleOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSchedule}
                    disabled={!scheduledAt || isBusy}
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarClock className="h-4 w-4" />
                    )}
                    Confirm
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}

          <Button
            type="button"
            variant="outline"
            data-testid="save-draft"
            disabled={isBusy}
            onClick={onSave}
            className="w-full sm:w-auto"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                data-testid="push-live"
                disabled={isBusy}
                className="w-full sm:w-auto"
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Push Live
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Push section layout live?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will persist the current draft and broadcast the refreshed
                  section manifest to live clients.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  data-testid="confirm-push"
                  onClick={onPushLive}
                >
                  Push Live
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
