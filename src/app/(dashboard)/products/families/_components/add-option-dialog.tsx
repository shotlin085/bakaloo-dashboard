"use client"

/**
 * AddOptionDialog — Modal for adding options to a product family.
 * 
 * Two modes:
 * 1. Add existing product (default) - search and attach existing products
 * 2. Create new product - redirect to product form
 */

import { useState } from "react"
import Link from "next/link"
import { Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AttachExistingProductForm } from "./attach-existing-product-form"

interface AddOptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  familyName: string
  onProductAttached?: () => void
}

export function AddOptionDialog({
  open,
  onOpenChange,
  familyId,
  familyName,
  onProductAttached,
}: AddOptionDialogProps) {
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing")

  const createNewHref = `/products/new?familyId=${familyId}&familyName=${encodeURIComponent(familyName)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add option to {familyName}</DialogTitle>
          <DialogDescription>
            Choose an existing product or create a new one
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "existing" | "new")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="gap-2">
              <Search className="h-4 w-4" />
              Add existing product
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              <Plus className="h-4 w-4" />
              Create new option
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex-1 overflow-hidden mt-4">
            <AttachExistingProductForm
              familyId={familyId}
              familyName={familyName}
              onAttached={() => {
                onProductAttached?.()
                onOpenChange(false)
              }}
            />
          </TabsContent>

          <TabsContent value="new" className="flex-1 overflow-auto mt-4">
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                You will be redirected to the product creation form with this family pre-selected.
              </p>
              <Link href={createNewHref}>
                <Button onClick={() => onOpenChange(false)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Go to product form
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
