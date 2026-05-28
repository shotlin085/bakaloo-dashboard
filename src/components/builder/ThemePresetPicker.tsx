"use client"

import { useState } from "react"
import { Loader2, Palette } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  PAGE_THEME_PRESETS,
  type PageThemePreset,
} from "./pagePresets"

interface ThemePresetPickerProps {
  isDirty: boolean
  isBusy?: boolean
  onApplyStyleOnly: (preset: PageThemePreset) => Promise<void> | void
  onReplaceLayout: (preset: PageThemePreset) => Promise<void> | void
}

export default function ThemePresetPicker({
  isDirty,
  isBusy = false,
  onApplyStyleOnly,
  onReplaceLayout,
}: ThemePresetPickerProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<PageThemePreset | null>(null)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)

  const handleApplyStyle = async (preset: PageThemePreset) => {
    await onApplyStyleOnly(preset)
    setOpen(false)
  }

  const requestReplace = (preset: PageThemePreset) => {
    setSelected(preset)
    setReplaceConfirmOpen(true)
  }

  const confirmReplace = async () => {
    if (!selected) return
    await onReplaceLayout(selected)
    setReplaceConfirmOpen(false)
    setSelected(null)
    setOpen(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-3 text-xs"
            disabled={isBusy}
          >
            <Palette className="mr-1.5 h-3.5 w-3.5" />
            Theme presets
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Full-page theme presets</DialogTitle>
            <DialogDescription>
              Apply curated styles to the page chrome, or replace the layout
              with a recommended starter stack.
            </DialogDescription>
          </DialogHeader>

          {isDirty ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              You have unsaved changes. Applying a preset will modify your draft
              but will not Push Live.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PAGE_THEME_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {preset.label}
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500"
                  >
                    {preset.recommendedSections.length} blocks
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {preset.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => handleApplyStyle(preset)}
                    className="h-8 rounded-lg px-3 text-xs"
                  >
                    {isBusy ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Apply Style Only
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => requestReplace(preset)}
                    className="h-8 rounded-lg px-3 text-xs"
                  >
                    Replace Layout With Preset
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Replace the current layout with “{selected?.label}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All current sections in this tab will be replaced with the
              recommended starter stack ({selected?.recommendedSections.length}{" "}
              sections). This affects only the local draft — Save Draft / Push
              Live still control persistence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplace}>
              Replace Layout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
