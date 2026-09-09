"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, X, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useDebounce } from "@/hooks/useDebounce"
import { getCustomers } from "@/services/customers.service"
import { useGrantSpins } from "@/hooks/useSpinWheel"

interface GrantSpinsDialogProps {
  open: boolean
  onClose: () => void
}

type PickedCustomer = { id: string; name: string | null; phone: string }

/** Single-select variant of CouponDialog's CustomerTargetPicker (same debounced-search-and-pick shell — this codebase has no shared combobox primitive, every picker is hand-rolled per feature). */
function CustomerPicker({
  selected,
  onSelect,
}: {
  selected: PickedCustomer | null
  onSelect: (customer: PickedCustomer | null) => void
}) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 400)

  const { data, isFetching } = useQuery({
    queryKey: ["spin-grant-customer-search", debouncedSearch],
    queryFn: () => getCustomers({ search: debouncedSearch, limit: 10 }),
    enabled: debouncedSearch.length >= 2 && !selected,
  })

  const results = data?.customers ?? []

  if (selected) {
    return (
      <Badge variant="secondary" className="gap-1 pr-1 text-sm">
        {selected.name ?? "Unnamed"} · {selected.phone}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="ml-1 rounded-full hover:bg-muted-foreground/20"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {debouncedSearch.length >= 2 && (
        <div className="rounded-md border bg-card max-h-40 overflow-y-auto">
          {isFetching ? (
            <div className="p-2.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
            </div>
          ) : results.length === 0 ? (
            <p className="p-2.5 text-sm text-muted-foreground">No matching customers</p>
          ) : (
            results.map((c) => (
              <button
                type="button"
                key={c.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                onClick={() => {
                  onSelect({ id: c.id, name: c.name, phone: c.phone })
                  setSearch("")
                }}
              >
                <span>{c.name ?? "Unnamed"}</span>
                <span className="text-xs text-muted-foreground">{c.phone}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function GrantSpinsDialog({ open, onClose }: GrantSpinsDialogProps) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null)
  const [amount, setAmount] = useState(1)
  const grantMutation = useGrantSpins()

  const handleClose = () => {
    setCustomer(null)
    setAmount(1)
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    grantMutation.mutate(
      { userId: customer.id, amount },
      { onSuccess: handleClose }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Grant Bonus Spins</DialogTitle>
          <DialogDescription>
            Manually credit spin(s) to one specific customer — on top of their daily and
            milestone-earned spins.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <CustomerPicker selected={customer} onSelect={setCustomer} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gs-amount">Number of Spins *</Label>
            <Input
              id="gs-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!customer || grantMutation.isPending}>
              {grantMutation.isPending ? "Granting..." : "Grant Spins"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
