"use client"

/**
 * ProductFamilySelector — search-and-pick widget for assigning a Product
 * to a family. Supports clearing, inline create, and shows a preview line
 * confirming "This product will appear as an option under [Family Name]."
 *
 * Purely presentational: caller controls `value` and handles `onChange`.
 */

import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDebounce } from "@/hooks/useDebounce"
import {
  useCreateProductFamily,
  useProductFamiliesList,
  useProductFamily,
} from "@/hooks/useProductFamilies"
import { cn } from "@/lib/utils"

interface ProductFamilySelectorProps {
  value: string | null | undefined
  onChange: (familyId: string | null, familyName: string | null) => void
  categoryId?: string | null
  disabled?: boolean
  className?: string
}

export function ProductFamilySelector({
  value,
  onChange,
  categoryId,
  disabled,
  className,
}: ProductFamilySelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debounced = useDebounce(search, 250)
  const [createMode, setCreateMode] = useState(false)
  const [newName, setNewName] = useState("")

  const { data: currentFamily } = useProductFamily(value || undefined)
  const { data: list, isLoading } = useProductFamiliesList({
    search: debounced || undefined,
    is_active: "true",
    limit: 20,
  })
  const create = useCreateProductFamily()

  const items = useMemo(() => list?.items ?? [], [list])

  useEffect(() => {
    if (!open) {
      setSearch("")
      setCreateMode(false)
      setNewName("")
    }
  }, [open])

  function handlePick(id: string, name: string) {
    onChange(id, name)
    setOpen(false)
  }

  function handleClear() {
    onChange(null, null)
  }

  async function handleCreate() {
    const trimmed = newName.trim()
    if (trimmed.length < 1) return
    const created = await create.mutateAsync({
      name: trimmed,
      category_id: categoryId ?? null,
      is_active: true,
    })
    onChange(created.id, created.name)
    setOpen(false)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Product Family</Label>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="flex-1 justify-between font-normal"
            >
              <span className="truncate">
                {value && currentFamily
                  ? currentFamily.name
                  : "Select or create a family…"}
              </span>
              <Search className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="start">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="h-4 w-4 opacity-50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search families…"
                className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : items.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No families found
                </div>
              ) : (
                items.map((fam) => (
                  <button
                    key={fam.id}
                    type="button"
                    onClick={() => handlePick(fam.id, fam.name)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="truncate">{fam.name}</span>
                    {value === fam.id && (
                      <Check className="h-4 w-4 text-brand-600" />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="border-t p-2">
              {createMode ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New family name"
                    className="h-8"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreate}
                    disabled={create.isPending || !newName.trim()}
                  >
                    {create.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setCreateMode(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setCreateMode(true)}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" /> Create new family
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={disabled}
            title="Remove from family"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {value && currentFamily ? (
        <p className="text-xs text-muted-foreground">
          This product will appear as an option under{" "}
          <span className="font-medium text-foreground">
            {currentFamily.name}
          </span>
          .
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Leave empty for single-option products. Pick or create a family to
          group multiple options (e.g. 250g, 500g, 1kg).
        </p>
      )}
    </div>
  )
}
