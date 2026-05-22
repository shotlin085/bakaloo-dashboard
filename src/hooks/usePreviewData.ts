import { useQuery } from "@tanstack/react-query"
import { getProducts } from "@/services/products.service"
import { getCategories } from "@/services/categories.service"
import type { Category, Product } from "@/types"

export interface PreviewData {
  categories: Category[]
  products: Product[]
  isLoading: boolean
}

export function usePreviewData(): PreviewData {
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 60_000,
  })

  const productsQuery = useQuery({
    queryKey: ["products", "preview"],
    queryFn: () => getProducts({ limit: 30, status: "active" }),
    staleTime: 60_000,
  })

  return {
    categories: categoriesQuery.data ?? [],
    products: productsQuery.data?.products ?? [],
    isLoading: categoriesQuery.isLoading || productsQuery.isLoading,
  }
}

/** Resolve products for a section based on its merch_binding category_ids */
export function resolveProductsForSection(
  allProducts: Product[],
  section: { merch_binding?: { category_ids?: string[]; product_ids?: string[] } | null },
  limit = 6
): Product[] {
  const binding = section.merch_binding
  if (!binding) return allProducts.slice(0, limit)

  // Manual product IDs
  if (binding.product_ids?.length) {
    const ids = new Set(binding.product_ids)
    const matched = allProducts.filter((p) => ids.has(p.id))
    if (matched.length) return matched.slice(0, limit)
  }

  // Category-scoped
  if (binding.category_ids?.length) {
    const ids = new Set(binding.category_ids)
    const scoped = allProducts.filter((p) => ids.has(p.category_id))
    if (scoped.length) return scoped.slice(0, limit)
  }

  return allProducts.slice(0, limit)
}

/** Resolve categories for a section's merch_binding */
export function resolveCategoriesForSection(
  allCategories: Category[],
  section: { merch_binding?: { category_ids?: string[] } | null },
  limit = 8
): Category[] {
  const binding = section.merch_binding
  const active = allCategories.filter((c) => c.is_active)

  if (binding?.category_ids?.length) {
    const ids = new Set(binding.category_ids)
    const matched = active.filter((c) => ids.has(c.id) || (c.parent_id && ids.has(c.parent_id)))
    if (matched.length) return matched.slice(0, limit)
  }

  // Fallback: top-level categories
  const parents = active.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
  return (parents.length ? parents : active).slice(0, limit)
}
