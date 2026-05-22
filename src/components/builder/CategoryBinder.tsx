"use client"

import { useEffect, useMemo, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCategories } from "@/hooks/useCategories"
import { useUpdateSectionMerch } from "@/hooks/useSections"
import type {
  MerchBinding,
  SectionManifest,
  UpdateSectionMerchPayload,
} from "@/types/theme.types"
import CategoryTree from "./CategoryTree"
import ProductSourceConfig from "./ProductSourceConfig"

interface CategoryBinderProps {
  section: SectionManifest
  onMerchBindingChange: (binding: UpdateSectionMerchPayload) => void
  persistOnChange?: boolean
}

function normalizeMerchBinding(binding: MerchBinding | null): MerchBinding {
  return {
    source: binding?.source ?? "category",
    category_ids: binding?.category_ids ?? [],
    product_ids: binding?.product_ids ?? [],
    tags: binding?.tags ?? [],
    limit: binding?.limit ?? 12,
  }
}

export default function CategoryBinder({
  section,
  onMerchBindingChange,
  persistOnChange = true,
}: CategoryBinderProps) {
  const { data: categories } = useCategories()
  const updateMerch = useUpdateSectionMerch()
  const [localBinding, setLocalBinding] = useState<MerchBinding>(
    normalizeMerchBinding(section.merch_binding)
  )
  const [treeModalOpen, setTreeModalOpen] = useState(false)

  useEffect(() => {
    setLocalBinding(normalizeMerchBinding(section.merch_binding))
  }, [section.id, section.updated_at, section.merch_binding])

  const categoryMap = useMemo(() => {
    return new Map((categories ?? []).map((category) => [category.id, category.name]))
  }, [categories])

  const debouncedSave = useDebouncedCallback((binding: MerchBinding) => {
    if (!persistOnChange) return
    updateMerch.mutate({
      id: section.id,
      payload: {
        category_ids: binding.category_ids,
        product_ids: binding.product_ids,
        tags: binding.tags,
        limit: binding.limit,
        source: binding.source,
      },
    })
  }, 500)

  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  const applyBinding = (patch: UpdateSectionMerchPayload) => {
    const nextBinding: MerchBinding = {
      source: (patch.source ?? localBinding.source) as MerchBinding["source"],
      category_ids: patch.category_ids ?? localBinding.category_ids,
      product_ids: patch.product_ids ?? localBinding.product_ids,
      tags: patch.tags ?? localBinding.tags,
      limit: patch.limit ?? localBinding.limit,
    }

    setLocalBinding(nextBinding)
    onMerchBindingChange({
      category_ids: nextBinding.category_ids,
      product_ids: nextBinding.product_ids,
      tags: nextBinding.tags,
      limit: nextBinding.limit,
      source: nextBinding.source,
    })
    if (persistOnChange) {
      debouncedSave(nextBinding)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Bound Categories
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Categories act as the default fill source for section products.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTreeModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {localBinding.category_ids.length ? (
            localBinding.category_ids.map((categoryId) => (
              <Badge key={categoryId} variant="secondary" className="gap-2">
                {categoryMap.get(categoryId) ?? categoryId}
                <button
                  type="button"
                  onClick={() =>
                    applyBinding({
                      category_ids: localBinding.category_ids.filter(
                        (value) => value !== categoryId
                      ),
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
              No categories bound yet.
            </div>
          )}
        </div>
      </div>

      <ProductSourceConfig
        merchBinding={localBinding}
        onBindingChange={applyBinding}
      />

      <Dialog open={treeModalOpen} onOpenChange={setTreeModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Categories</DialogTitle>
            <DialogDescription>
              Expand categories and choose one or more fill sources for this
              section.
            </DialogDescription>
          </DialogHeader>

          <CategoryTree
            selectedIds={localBinding.category_ids}
            onSelect={(categoryId) =>
              applyBinding({
                category_ids: localBinding.category_ids.includes(categoryId)
                  ? localBinding.category_ids.filter((id) => id !== categoryId)
                  : [...localBinding.category_ids, categoryId],
              })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
