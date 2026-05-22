import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/services/categories.service"
import type { Category, CategoryTree } from "@/types"
import { toast } from "sonner"

/** Build tree from flat list using parent_id */
function buildTree(categories: Category[]): CategoryTree[] {
  const map = new Map<string | null, CategoryTree[]>()

  // Initialize
  categories.forEach((c) => {
    if (!map.has(c.parent_id)) map.set(c.parent_id, [])
  })

  categories.forEach((c) => {
    const parent = c.parent_id
    const list = map.get(parent) ?? []
    list.push({ ...c, children: [] })
    map.set(parent, list)
  })

  function attach(nodes: CategoryTree[]): CategoryTree[] {
    return nodes
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((node) => ({
        ...node,
        children: attach(map.get(node.id) ?? []),
      }))
  }

  return attach(map.get(null) ?? [])
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 60 * 1000,
  })
}

export function useCategoryTree() {
  return useQuery({
    queryKey: ["categories", "tree"],
    queryFn: async () => {
      const flat = await getCategories()
      return buildTree(flat)
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof createCategory>[0]) =>
      createCategory(payload),
    onSuccess: () => {
      toast.success("Category created")
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create category"),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCategory>[1] }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      toast.success("Category updated")
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update category"),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted")
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete category"),
  })
}
