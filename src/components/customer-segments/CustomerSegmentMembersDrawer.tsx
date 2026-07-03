"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, UserPlus, X, Loader2 } from "lucide-react"
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
import { EmptyState } from "@/components/shared/EmptyState"
import { useDebounce } from "@/hooks/useDebounce"
import {
  useSegmentMembers,
  useAddSegmentMembers,
  useRemoveSegmentMember,
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

        <div className="p-4 space-y-3 border-b">
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
        </div>

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
                description="Search above to add customers to this segment"
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
