"use client"

import { useState, useRef, useCallback } from "react"
import {
  Upload,
  FileSpreadsheet,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useBulkImportProducts } from "@/hooks/useUploads"

interface BulkImportDialogProps {
  open: boolean
  onClose: () => void
}

const CSV_TEMPLATE = `name,price,stock_quantity,unit,category_id,description,images,is_featured
"Fresh Tomato",45,100,kg,CATEGORY_ID_HERE,"Fresh organic tomatoes","https://example.com/tomato.jpg",false
"Amul Milk 500ml",30,200,piece,CATEGORY_ID_HERE,"Fresh toned milk","",false`

export function BulkImportDialog({ open, onClose }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const importMutation = useBulkImportProducts()

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (!selected) return
      setFile(selected)

      // Preview first 5 rows
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const lines = text.split("\n").filter((l) => l.trim())
        if (lines.length > 0) {
          setHeaders(parseCSVRow(lines[0]))
          setPreviewRows(lines.slice(1, 6).map(parseCSVRow))
        }
      }
      reader.readAsText(selected)
    },
    []
  )

  const handleImport = () => {
    if (!file) return
    importMutation.mutate(file, {
      onSuccess: () => {
        setTimeout(() => {
          handleReset()
          onClose()
        }, 1500)
      },
    })
  }

  const handleReset = () => {
    setFile(null)
    setPreviewRows([])
    setHeaders([])
    importMutation.reset()
    if (fileRef.current) fileRef.current.value = ""
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "product-import-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-sm">
            <FileSpreadsheet className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-700">Download CSV Template</p>
              <p className="text-xs text-blue-600">
                Use this template format for your import file
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Template
            </Button>
          </div>

          {/* File upload */}
          {!file ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload CSV</p>
              <p className="text-xs text-muted-foreground mt-1">
                .csv files only, max 5MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Selected file */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · {previewRows.length} rows
                    previewed
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Preview */}
              {previewRows.length > 0 && (
                <ScrollArea className="max-h-[200px] rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted border-b">
                        {headers.map((h, i) => (
                          <th
                            key={i}
                            className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri} className="border-b last:border-0">
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="p-2 whitespace-nowrap max-w-[150px] truncate"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}

              {/* Import progress / result */}
              {importMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                    Importing...
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
              )}

              {importMutation.isSuccess && importMutation.data && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700">Import Complete</p>
                    <p className="text-green-600 text-xs mt-1">
                      {importMutation.data.imported} imported
                      {importMutation.data.skipped > 0 &&
                        `, ${importMutation.data.skipped} skipped`}
                    </p>
                    {importMutation.data.errors?.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {importMutation.data.errors.map((err, i) => (
                          <p key={i} className="text-red-500 text-xs">
                            {err}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {importMutation.isError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {(importMutation.error as Error)?.message || "Import failed"}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importMutation.isPending || importMutation.isSuccess}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Parse a single CSV row handling quoted values */
function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}
