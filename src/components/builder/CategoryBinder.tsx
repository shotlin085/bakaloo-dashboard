"use client"

import { useEffect, useMemo, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { FolderOpen, Plus, X } from "lucide-react"
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
  }, [section.id, section.updated_at])

  const categoryMap = useMemo(() => {
    return new Map((categories ?? []).map((c) => [c.id, c.name]))
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

  const boundCategories = localBinding.category_ids

  return (
    <div className="space-y-4">
      {/* ── Bound categories panel ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">
              Bound Categories
            </span>
            {boundCategories.length > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full px-1.5 py-0 text-[10px] font-semibold"
              >
                {boundCategories.length}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-lg px-2 text-xs"
            onClick={() => setTreeModalOpen(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>

        {boundCategories.length > 0 ? (
          <div className="mt-2.5 flex max-h-[100px] flex-wrap gap-1.5 overflow-y-auto">
            {boundCategories.map((categoryId) => (
              <Badge
                key={categoryId}
                variant="secondary"
                className="gap-1 rounded-full pl-2 pr-1 text-[11px]"
              >
                <span className="max-w-[100px] truncate">
                  {categoryMap.get(categoryId) ?? categoryId}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    applyBinding({
                      category_ids: boundCategories.filter(
                        (id) => id !== categoryId
                      ),
                    })
                  }
                  aria-label={`Remove category ${categoryMap.get(categoryId) ?? categoryId}`}
                >
                  <X className="h-2.5 w-2.5 shrink-0" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-slate-400">
            No categories bound yet. Sections will use fallback product data.
          </p>
        )}
      </div>

      {/* ── Product source + limit ── */}
      <ProductSourceConfig
        merchBinding={localBinding}
        onBindingChange={applyBinding}
      />

      {/* ── Category tree modal ── */}
      <Dialog open={treeModalOpen} onOpenChange={setTreeModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Categories</DialogTitle>
            <DialogDescription>
              Choose one or more categories to use as the fill source for this
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

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => setTreeModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
