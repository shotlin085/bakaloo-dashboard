"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useCategories } from "@/hooks/useCategories"
import { cn } from "@/lib/utils"
import type { Category, CategoryTree as CategoryTreeNode } from "@/types"

interface CategoryTreeProps {
  onSelect: (categoryId: string) => void
  selectedIds: string[]
  searchQuery?: string
}

function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<string | null, CategoryTreeNode[]>()

  categories.forEach((category) => {
    if (!map.has(category.parent_id)) {
      map.set(category.parent_id, [])
    }
  })

  categories.forEach((category) => {
    const children = map.get(category.parent_id) ?? []
    children.push({ ...category, children: [] })
    map.set(category.parent_id, children)
  })

  function attach(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
    return nodes
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((node) => ({
        ...node,
        children: attach(map.get(node.id) ?? []),
      }))
  }

  return attach(map.get(null) ?? [])
}

function filterTree(
  nodes: CategoryTreeNode[],
  query: string
): CategoryTreeNode[] {
  if (!query) {
    return nodes
  }

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children, query)
      const matches = node.name.toLowerCase().includes(query)

      if (matches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        }
      }

      return null
    })
    .filter((node): node is CategoryTreeNode => node !== null)
}

function countNodes(nodes: CategoryTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0)
}

function getCategoryEmoji(node: CategoryTreeNode, depth: number) {
  if (depth === 0) return "🗂️"
  if (node.children.length > 0) return "📁"
  return "🍃"
}

export default function CategoryTree({
  onSelect,
  selectedIds,
  searchQuery,
}: CategoryTreeProps) {
  const { data: categories, isLoading } = useCategories()
  const [internalQuery, setInternalQuery] = useState(searchQuery ?? "")
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  useEffect(() => {
    if (searchQuery !== undefined) {
      setInternalQuery(searchQuery)
    }
  }, [searchQuery])

  const tree = useMemo(
    () => buildCategoryTree(categories ?? []),
    [categories]
  )
  const normalizedQuery = internalQuery.trim().toLowerCase()
  const filteredTree = useMemo(
    () => filterTree(tree, normalizedQuery),
    [tree, normalizedQuery]
  )

  useEffect(() => {
    if (!normalizedQuery) return

    const allVisibleIds: string[] = []
    const collect = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          allVisibleIds.push(node.id)
          collect(node.children)
        }
      })
    }
    collect(filteredTree)
    setExpandedIds((current) =>
      Array.from(new Set([...current, ...allVisibleIds]))
    )
  }, [filteredTree, normalizedQuery])

  const toggleExpanded = (categoryId: string) => {
    setExpandedIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={internalQuery}
            onChange={(event) => setInternalQuery(event.target.value)}
            placeholder="Search categories"
            className="pl-10"
          />
        </div>
        <Badge
          variant="secondary"
          className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
        >
          {selectedIds.length} categories selected
        </Badge>
      </div>

      <div className="max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-2">
        {isLoading ? (
          <div className="p-4 text-sm text-slate-500">Loading categories...</div>
        ) : filteredTree.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            {normalizedQuery
              ? "No categories matched this search."
              : "No categories found."}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTree.map((node) => (
              <CategoryNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                forceExpanded={Boolean(normalizedQuery)}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onToggleExpanded={toggleExpanded}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500">
        {countNodes(filteredTree)} categories visible
      </div>
    </div>
  )
}

function CategoryNode({
  node,
  depth,
  expandedIds,
  forceExpanded,
  selectedIds,
  onSelect,
  onToggleExpanded,
}: {
  node: CategoryTreeNode
  depth: number
  expandedIds: string[]
  forceExpanded: boolean
  selectedIds: string[]
  onSelect: (categoryId: string) => void
  onToggleExpanded: (categoryId: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = forceExpanded || expandedIds.includes(node.id)
  const isSelected = selectedIds.includes(node.id)

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-white",
          isSelected && "bg-white shadow-sm"
        )}
        style={{ paddingLeft: depth * 18 + 8 }}
      >
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
          onClick={() => hasChildren && onToggleExpanded(node.id)}
          disabled={!hasChildren}
          aria-label={hasChildren ? "Toggle category" : "Category"}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="text-xs">•</span>
          )}
        </button>

        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(node.id)}
          aria-label={`Select ${node.name}`}
        />

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(node.id)}
        >
          <span className="text-base">{getCategoryEmoji(node, depth)}</span>
          <span className="truncate text-sm font-medium text-slate-800">
            {node.name}
          </span>
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div className="space-y-1">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              forceExpanded={forceExpanded}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
