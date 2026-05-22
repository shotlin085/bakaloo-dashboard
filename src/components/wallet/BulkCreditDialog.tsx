"use client"

import { useState, useRef, useCallback } from "react"
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAdminCredit } from "@/hooks/useWallet"
import { formatINR } from "@/lib/utils"

interface BulkRow {
  userId: string
  amount: number
  description: string
  status: "pending" | "processing" | "success" | "error"
  error?: string
}

interface BulkCreditDialogProps {
  open: boolean
  onClose: () => void
}

function parseCSV(text: string): BulkRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  // Skip header if present
  const start = lines[0]?.toLowerCase().includes("userid") ||
    lines[0]?.toLowerCase().includes("user_id") ||
    lines[0]?.toLowerCase().includes("user id")
    ? 1
    : 0

  const rows: BulkRow[] = []
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    if (cols.length < 2) continue
    const userId = cols[0]
    const amount = parseFloat(cols[1])
    const description = cols[2] || "Bulk credit"
    if (!userId || isNaN(amount) || amount <= 0) continue
    rows.push({ userId, amount, description, status: "pending" })
  }
  return rows
}

export function BulkCreditDialog({ open, onClose }: BulkCreditDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<BulkRow[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [completed, setCompleted] = useState(0)
  const creditMutation = useAdminCredit()

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
      setCompleted(0)
    }
    reader.readAsText(file)
  }, [])

  const handleRun = async () => {
    if (rows.length === 0) return
    setIsRunning(true)
    setCompleted(0)

    for (let i = 0; i < rows.length; i++) {
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "processing" } : r))
      )
      try {
        await creditMutation.mutateAsync({
          userId: rows[i].userId,
          payload: {
            amount: rows[i].amount,
            description: rows[i].description,
          },
        })
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "success" } : r))
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed"
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "error", error: message } : r))
        )
      }
      setCompleted(i + 1)
    }
    setIsRunning(false)
  }

  const handleClose = () => {
    if (isRunning) return
    setRows([])
    setCompleted(0)
    onClose()
  }

  const downloadTemplate = () => {
    const csv = "userId,amount,description\n,100,Promotional credit\n"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bulk_credit_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const successCount = rows.filter((r) => r.status === "success").length
  const errorCount = rows.filter((r) => r.status === "error").length
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0)
  const progress = rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Wallet Credit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Upload Area */}
          {rows.length === 0 && (
            <div className="space-y-3">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drop a CSV file or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Format: userId, amount, description (optional)
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download Template CSV
              </Button>
            </div>
          )}

          {/* Preview / Progress */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{rows.length} rows</Badge>
                  <span className="text-sm text-muted-foreground">
                    Total: {formatINR(totalAmount)}
                  </span>
                </div>
                {completed > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600">{successCount} success</span>
                    {errorCount > 0 && (
                      <span className="text-red-600">{errorCount} failed</span>
                    )}
                  </div>
                )}
              </div>

              {isRunning && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Processing {completed}/{rows.length}...
                  </p>
                </div>
              )}

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.userId.length > 20
                            ? row.userId.slice(0, 8) + "..." + row.userId.slice(-6)
                            : row.userId}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatINR(row.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {row.description}
                        </TableCell>
                        <TableCell>
                          {row.status === "pending" && (
                            <Badge variant="outline" className="text-[10px]">
                              Pending
                            </Badge>
                          )}
                          {row.status === "processing" && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {row.status === "success" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {row.status === "error" && (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-4 w-4 text-red-500" />
                              {row.error && (
                                <span className="text-[10px] text-red-500 truncate max-w-[80px]">
                                  {row.error}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}

          {/* Warning */}
          {rows.length > 0 && completed === 0 && (
            <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                This will credit <strong>{formatINR(totalAmount)}</strong> across{" "}
                <strong>{rows.length}</strong> wallets. This action cannot be undone.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRunning}>
            {completed > 0 && !isRunning ? "Close" : "Cancel"}
          </Button>
          {rows.length > 0 && !isRunning && completed === 0 && (
            <Button onClick={handleRun}>
              Credit {rows.length} Wallets
            </Button>
          )}
          {rows.length > 0 && !isRunning && completed > 0 && completed < rows.length && (
            <Button onClick={handleRun}>
              Retry Remaining
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
