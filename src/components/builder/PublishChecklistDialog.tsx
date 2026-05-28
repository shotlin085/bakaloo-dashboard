"use client"

import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, Send } from "lucide-react"
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
import { cn } from "@/lib/utils"
import type { PublishChecklistResult, PublishIssue } from "./publishChecklist"

interface PublishChecklistDialogProps {
  result: PublishChecklistResult
  isBusy?: boolean
  onConfirm: () => Promise<void> | void
}

const ICONS: Record<PublishIssue["level"], typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const TONE: Record<PublishIssue["level"], string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-slate-200 bg-slate-50 text-slate-600",
}

export default function PublishChecklistDialog({
  result,
  isBusy,
  onConfirm,
}: PublishChecklistDialogProps) {
  const errorCount = result.issues.filter((i) => i.level === "error").length
  const warningCount = result.issues.filter((i) => i.level === "warning").length
  const infoCount = result.issues.filter((i) => i.level === "info").length

  return (
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
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Publish checklist</AlertDialogTitle>
          <AlertDialogDescription>
            Review issues before going live. Errors must be fixed; warnings and
            info items can be published.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
              errorCount > 0
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            {errorCount} error{errorCount === 1 ? "" : "s"}
          </Badge>
          <Badge
            variant="secondary"
            className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700"
          >
            {warningCount} warning{warningCount === 1 ? "" : "s"}
          </Badge>
          <Badge
            variant="secondary"
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            {infoCount} info
          </Badge>
        </div>

        <div className="max-h-[40vh] space-y-2 overflow-y-auto">
          {result.issues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              All checks passed. Ready to publish.
            </div>
          ) : (
            result.issues.map((issue, idx) => {
              const Icon = ICONS[issue.level]
              return (
                <div
                  key={`${issue.code}-${issue.sectionId ?? "global"}-${idx}`}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                    TONE[issue.level]
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{issue.message}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] opacity-70">
                      {issue.level} · {issue.code}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirm-push"
            disabled={!result.canPublish || isBusy}
            onClick={onConfirm}
          >
            {result.canPublish ? "Push Live" : "Resolve errors first"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
