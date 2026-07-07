/** One target category an admin has allowed into a source category's "Pair With" carousel. */
export interface SuggestionTargetCategory {
  categoryId: string
  categoryName: string
}

/** A source category and everything it's currently configured to suggest. Empty targetCategories means "no rule — falls back to any other category". */
export interface CategorySuggestionRule {
  sourceCategoryId: string
  sourceCategoryName: string
  targetCategories: SuggestionTargetCategory[]
}
