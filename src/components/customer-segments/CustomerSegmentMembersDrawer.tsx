"use client"

import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  UserPlus,
  X,
  Loader2,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/EmptyState"
import { useDebounce } from "@/hooks/useDebounce"
import {
  useSegmentMembers,
  useAddSegmentMembers,
  useRemoveSegmentMember,
  useDownloadSegmentImportTemplate,
  useImportSegmentMembers,
} from "@/hooks/useCustomerSegments"
import { searchSegmentCandidates } from "@/services/customer-segments.service"
import type { CustomerSegment } from "@/types/customer-segment.types"

interface CustomerSegmentMembersDrawerProps {
  segment: CustomerSegment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function initials(name: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function CustomerSegmentMembersDrawer({
  segment,
  open,
  onOpenChange,
}: CustomerSegmentMembersDrawerProps) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useSegmentMembers(segment?.id ?? null)
  const addMutation = useAddSegmentMembers(segment?.id ?? "")
  const removeMutation = useRemoveSegmentMember(segment?.id ?? "")

  const { data: candidates, isFetching: isSearching } = useQuery({
    queryKey: ["customer-segments", segment?.id, "search-candidates", debouncedSearch],
    queryFn: () => searchSegmentCandidates(segment!.id, debouncedSearch),
    enabled: !!segment && debouncedSearch.length >= 2,
  })

  const memberIds = new Set((data?.members ?? []).map((m) => m.id))
  const results = (candidates ?? []).filter((c) => !memberIds.has(c.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{segment?.name ?? "Segment"} members</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="search" className="border-b">
          <div className="px-4 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1">Search &amp; add</TabsTrigger>
              <TabsTrigger value="import" className="flex-1">Import from Excel</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="mt-0 p-4 pt-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name or phone..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {debouncedSearch.length >= 2 && (
              <div className="rounded-md border bg-card max-h-56 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
                  </div>
                ) : results.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No matching customers</p>
                ) : (
                  results.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name ?? "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0"
                        disabled={addMutation.isPending}
                        onClick={() => addMutation.mutate([c.id])}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="mt-0 p-4 pt-3">
            <ImportMembersPanel segmentId={segment?.id ?? null} />
          </TabsContent>
        </Tabs>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {data ? `${data.pagination.total} member${data.pagination.total === 1 ? "" : "s"}` : "Members"}
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !data || data.members.length === 0 ? (
              <EmptyState
                icon={<UserPlus className="h-6 w-6 text-muted-foreground" />}
                title="No members yet"
                description="Search above or import an Excel file to add customers to this segment"
              />
            ) : (
              <div className="space-y-1">
                {data.members.map((m, idx) => (
                  <div key={m.id}>
                    <div className="flex items-center justify-between gap-2 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.name ?? "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.phone}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(m.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {idx < data.members.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function ImportMembersPanel({ segmentId }: { segmentId: string | null }) {
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = useDownloadSegmentImportTemplate()
  const importMutation = useImportSegmentMembers(segmentId ?? "")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const handleImport = () => {
    if (!file || !segmentId) return
    importMutation.mutate(file, {
      onSuccess: () => {
        setFile(null)
        if (fileRef.current) fileRef.current.value = ""
      },
    })
  }

  const handleReset = () => {
    setFile(null)
    importMutation.reset()
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg text-sm">
        <FileSpreadsheet className="h-5 w-5 text-brand-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-brand-700">Download the template</p>
          <p className="text-xs text-brand-600">
            Fill in Customer Number — that&apos;s the only column we match on
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplate.mutate()}
          disabled={downloadTemplate.isPending}
        >
          {downloadTemplate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Download className="h-3.5 w-3.5 mr-1" />
              Template
            </>
          )}
        </Button>
      </div>

      {!file ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
        >
          <Upload className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Click to upload the filled file</p>
          <p className="text-xs text-muted-foreground mt-1">.xlsx or .csv — max 5MB</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-green-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {importMutation.isSuccess && importMutation.data && (
            <div className="space-y-2 p-3 bg-green-50 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-700">
                    {importMutation.data.addedCount} customer
                    {importMutation.data.addedCount === 1 ? "" : "s"} added
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {importMutation.data.totalRows} row{importMutation.data.totalRows === 1 ? "" : "s"} read
                    {importMutation.data.alreadyMemberCount > 0 &&
                      ` · ${importMutation.data.alreadyMemberCount} already in this segment`}
                    {importMutation.data.notFoundCount > 0 &&
                      ` · ${importMutation.data.notFoundCount} number${importMutation.data.notFoundCount === 1 ? "" : "s"} not found`}
                  </p>
                </div>
              </div>
              {importMutation.data.notFoundCount > 0 && (
                <div className="flex items-start gap-2 pt-2 border-t border-green-200">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Not on the platform yet: {importMutation.data.notFoundSample.join(", ")}
                    {importMutation.data.notFoundCount > importMutation.data.notFoundSample.length &&
                      ` and ${importMutation.data.notFoundCount - importMutation.data.notFoundSample.length} more`}
                  </p>
                </div>
              )}
            </div>
          )}

          {importMutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {(importMutation.error as Error)?.message || "Import failed"}
            </div>
          )}

          {!importMutation.isSuccess && (
            <Button
              className="w-full"
              onClick={handleImport}
              disabled={importMutation.isPending}
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
          )}
        </div>
      )}
    </div>
  )
}
