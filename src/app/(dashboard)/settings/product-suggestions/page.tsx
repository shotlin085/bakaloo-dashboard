"use client"

/**
 * Product Suggestions — configures which categories appear in a product's
 * "Pair With" carousel (bakaloo-backend /api/v1/admin/product-suggestions).
 * Previously findPairWith() had no category-relevance concept at all: every
 * product showed the same global bestsellers from other categories. A
 * category left unconfigured here keeps that exact fallback behavior — only
 * categories an admin explicitly sets up here change anything.
 */

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save, Sparkles } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategories } from "@/hooks/useCategories"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useProductSuggestionRules,
  useReplaceProductSuggestionRules,
} from "@/hooks/useProductSuggestions"
import type { Category } from "@/types"
import type { CategorySuggestionRule } from "@/types/product-suggestions.types"

function RuleRow({
  category,
  allCategories,
  rule,
  canManage,
}: {
  category: Category
  allCategories: Category[]
  rule: CategorySuggestionRule | undefined
  canManage: boolean
}) {
  const initialTargetIds = useMemo(
    () => new Set(rule?.targetCategories.map((t) => t.categoryId) ?? []),
    [rule],
  )
  const [selected, setSelected] = useState<Set<string>>(initialTargetIds)

  useEffect(() => {
    setSelected(initialTargetIds)
  }, [initialTargetIds])

  const replaceMutation = useReplaceProductSuggestionRules()

  const dirty = useMemo(() => {
    if (selected.size !== initialTargetIds.size) return true
    return Array.from(selected).some((id) => !initialTargetIds.has(id))
  }, [selected, initialTargetIds])

  function toggle(categoryId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(categoryId)
      else next.delete(categoryId)
      return next
    })
  }

  function handleSave() {
    replaceMutation.mutate({
      sourceCategoryId: category.id,
      targetCategoryIds: Array.from(selected),
    })
  }

  function handleDiscard() {
    setSelected(initialTargetIds)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">{category.name}</CardTitle>
          <CardDescription>
            {selected.size === 0
              ? "No rule configured — falls back to showing any other category's bestsellers."
              : `Suggests products from ${selected.size} categor${selected.size === 1 ? "y" : "ies"}.`}
          </CardDescription>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            {dirty && (
              <Badge variant="secondary" className="text-xs">
                Unsaved
              </Badge>
            )}
            {dirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={replaceMutation.isPending}
              >
                Discard
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={!dirty || replaceMutation.isPending}>
              {replaceMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {allCategories.map((target) => (
            <label
              key={target.id}
              className="flex min-w-0 items-center gap-2.5 text-sm cursor-pointer"
            >
              <Checkbox
                checked={selected.has(target.id)}
                disabled={!canManage || replaceMutation.isPending}
                onCheckedChange={(checked) => toggle(target.id, checked === true)}
              />
              <span className="truncate">{target.name}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProductSuggestionsPage() {
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const { data: rules, isLoading: rulesLoading } = useProductSuggestionRules()

  const rulesByCategory = useMemo(() => {
    const map = new Map<string, CategorySuggestionRule>()
    for (const rule of rules ?? []) {
      map.set(rule.sourceCategoryId, rule)
    }
    return map
  }, [rules])

  const isLoading = categoriesLoading || rulesLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Product Suggestions"
          subtitle="Choose which categories to suggest when a customer views a product."
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Suggestions"
        subtitle="Choose which categories appear in the 'Pair With' carousel on a product's detail page — e.g. Dairy can suggest Dairy + Bakery, Vegetables can suggest Vegetables + Spices."
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          {categories?.length ?? 0} categories
        </div>
      </PageHeader>

      {!categories || categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No categories yet — create categories first, then configure suggestions here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <RuleRow
              key={category.id}
              category={category}
              allCategories={categories}
              rule={rulesByCategory.get(category.id)}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  )
}
