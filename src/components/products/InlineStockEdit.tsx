"use client"

import { useState, useRef, useEffect } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useUpdateStock } from "@/hooks/useProducts"
import { cn } from "@/lib/utils"

interface InlineStockEditProps {
  productId: string
  currentStock: number
  lowStockThreshold: number
}

export function InlineStockEdit({
  productId,
  currentStock,
  lowStockThreshold,
}: InlineStockEditProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentStock.toString())
  const inputRef = useRef<HTMLInputElement>(null)
  const updateStock = useUpdateStock()

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    setValue(currentStock.toString())
  }, [currentStock])

  const handleSave = () => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 0) {
      setValue(currentStock.toString())
      setEditing(false)
      return
    }
    if (num === currentStock) {
      setEditing(false)
      return
    }
    updateStock.mutate(
      { id: productId, stock: num },
      {
        onSuccess: () => setEditing(false),
        onError: () => {
          setValue(currentStock.toString())
          setEditing(false)
        },
      }
    )
  }

  const handleCancel = () => {
    setValue(currentStock.toString())
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") handleCancel()
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn(
          "text-sm font-medium px-2 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer",
          currentStock === 0
            ? "text-red-600"
            : currentStock <= lowStockThreshold
            ? "text-amber-600"
            : "text-foreground"
        )}
        title="Click to edit stock"
      >
        {currentStock}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-7 w-20 text-sm text-center"
        disabled={updateStock.isPending}
      />
      {updateStock.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-green-600"
            onClick={handleSave}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={handleCancel}
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  )
}
