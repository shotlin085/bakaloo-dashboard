import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type { CategorySuggestionRule } from "@/types/product-suggestions.types"

/**
 * Product Suggestions service — talks to
 * `/api/v1/admin/product-suggestions` (the category-to-category "Pair
 * With" mapping that products.repository.js's findPairWith() consults).
 */
export const productSuggestionsService = {
  /** All active categories with their currently configured target categories. */
  async getRules(): Promise<CategorySuggestionRule[]> {
    const { data } = await api.get<ApiResponse<{ rules: CategorySuggestionRule[] }>>(
      "/admin/product-suggestions/rules",
    )
    return data.data.rules
  },

  /** Replace the full target-category list for one source category. */
  async replaceRules(sourceCategoryId: string, targetCategoryIds: string[]): Promise<string[]> {
    const { data } = await api.put<ApiResponse<{ targetCategoryIds: string[] }>>(
      `/admin/product-suggestions/rules/${sourceCategoryId}`,
      { targetCategoryIds },
    )
    return data.data.targetCategoryIds
  },
}
