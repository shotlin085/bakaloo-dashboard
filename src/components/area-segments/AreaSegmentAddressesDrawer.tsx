"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, MapPin, X, Loader2, ChevronLeft, ListChecks } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { useDebounce } from "@/hooks/useDebounce"
import {
  useAreaSegmentAddresses,
  useAddAreaSegmentAddress,
  useRemoveAreaSegmentAddress,
  useAreaSegmentActiveOrders,
} from "@/hooks/useAreaSegments"
import { searchAreaSegmentCandidates, getCustomerAddressesForSegment } from "@/services/area-segments.service"
import type { AreaSegment, AreaSegmentCandidate } from "@/types/area-segment.types"

interface AreaSegmentAddressesDrawerProps {
  segment: AreaSegment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AreaSegmentAddressesDrawer({ segment, open, onOpenChange }: AreaSegmentAddressesDrawerProps) {
  const [search, setSearch] = useState("")
  const [selectedCandidate, setSelectedCandidate] = useState<AreaSegmentCandidate | null>(null)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useAreaSegmentAddresses(segment?.id ?? null)
  const { data: activeOrders } = useAreaSegmentActiveOrders(segment?.id ?? null)
  const addMutation = useAddAreaSegmentAddress(segment?.id ?? "")
  const removeMutation = useRemoveAreaSegmentAddress(segment?.id ?? "")

  const { data: candidates, isFetching: isSearching } = useQuery({
    queryKey: ["area-segments", "search-candidates", debouncedSearch],
    queryFn: () => searchAreaSegmentCandidates(debouncedSearch),
    enabled: !selectedCandidate && debouncedSearch.length >= 2,
  })

  const { data: candidateAddresses, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ["area-segments", "customer-addresses", selectedCandidate?.id],
    queryFn: () => getCustomerAddressesForSegment(selectedCandidate!.id),
    enabled: !!selectedCandidate,
  })

  const reset = () => {
    setSelectedCandidate(null)
    setSearch("")
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{segment?.name ?? "Segment"} addresses</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-3 border-b">
          {selectedCandidate ? (
            <div>
              <Button variant="ghost" size="sm" className="h-7 -ml-2 mb-2" onClick={() => setSelectedCandidate(null)}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back to search
              </Button>
              <p className="text-sm font-medium">{selectedCandidate.name ?? "Unnamed"}</p>
              <p className="text-xs text-muted-foreground mb-2">{selectedCandidate.phone}</p>
              <p className="text-xs text-muted-foreground mb-1.5">Pick the exact address to register:</p>
              {isLoadingAddresses ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading addresses...
                </div>
              ) : !candidateAddresses || candidateAddresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">This customer has no saved addresses.</p>
              ) : (
                <div className="rounded-md border bg-card max-h-56 overflow-y-auto">
                  {candidateAddresses.map((addr) => (
                    <div key={addr.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{addr.label || "Address"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[addr.address_line1, addr.city, addr.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0"
                        disabled={addMutation.isPending}
                        onClick={() =>
                          addMutation.mutate(
                            { userId: selectedCandidate.id, addressId: addr.id },
                            { onSuccess: () => setSelectedCandidate(null) }
                          )
                        }
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
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
                  ) : !candidates || candidates.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No matching customers</p>
                  ) : (
                    candidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50"
                        onClick={() => setSelectedCandidate(c)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name ?? "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                        </div>
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              {data ? `${data.pagination.total} address${data.pagination.total === 1 ? "" : "es"}` : "Addresses"}
              {activeOrders && activeOrders.length > 0 && (
                <Badge variant="outline" className="font-normal">
                  <ListChecks className="h-3 w-3 mr-1" />
                  {activeOrders.length} active order{activeOrders.length === 1 ? "" : "s"}
                </Badge>
              )}
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !data || data.addresses.length === 0 ? (
              <EmptyState
                icon={<MapPin className="h-6 w-6 text-muted-foreground" />}
                title="No addresses yet"
                description="Search above to register a customer's exact address in this segment"
              />
            ) : (
              <div className="space-y-1">
                {data.addresses.map((a, idx) => (
                  <div key={a.id}>
                    <div className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.customer_name ?? "Unnamed"} · {a.customer_phone}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.label ? `${a.label} — ` : ""}
                          {[a.address_line1, a.city, a.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(a.address_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {idx < data.addresses.length - 1 && <Separator />}
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
