import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  duplicateProduct,
  exportProductsCsv,
  bulkUpdateProducts,
  type BulkUpdateProductItem,
} from "@/services/products.service"
import type { ProductFilters, ProductPayload } from "@/types"
import { toast } from "sonner"

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => getProducts(filters),
    staleTime: 30 * 1000,
  })
}

export function useProductDetail(productId: string | null) {
  return useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: () => getProductDetail(productId!),
    enabled: !!productId,
    staleTime: 30 * 1000,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductPayload) => createProduct(payload),
    onSuccess: () => {
      toast.success("Product created")
      qc.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create product"),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductPayload }) =>
      updateProduct(id, payload),
    onSuccess: () => {
      toast.success("Product updated")
      qc.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update product"),
  })
}

export function useUpdateStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      updateProductStock(id, stock),
    onSuccess: () => {
      toast.success("Stock updated")
      qc.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update stock"),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: (_data, id) => {
      toast.success("Product deleted")
      // Delete is a soft-delete on the backend (marks the product
      // Inactive rather than removing the row, so order history that
      // references it stays intact). Strip it from the cached list
      // immediately so it actually disappears from view instead of
      // reappearing under "All Status" after the refetch below.
      qc.setQueriesData<{ products: { id: string }[]; pagination: unknown } | undefined>(
        {
          // Only the list query ["products", filters] has this
          // { products, pagination } shape — exclude
          // ["products", "detail", productId] which holds a single
          // ProductDetail object.
          predicate: (query) => query.queryKey[1] !== "detail",
          queryKey: ["products"],
        },
        (data) =>
          data
            ? { ...data, products: data.products.filter((p) => p.id !== id) }
            : data
      )
      qc.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete product"),
  })
}

export function useDuplicateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicateProduct(id),
    onSuccess: () => {
      toast.success("Product duplicated")
      qc.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e: Error) => toast.error(e.message || "Failed to duplicate product"),
  })
}

export function useExportProducts() {
  return useMutation({
    mutationFn: (format: "csv" | "xlsx" = "csv") => exportProductsCsv(format),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Products exported!")
    },
    onError: () => toast.error("Failed to export products"),
  })
}

export function useBulkUpdateProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      products,
      propagateToShops,
    }: {
      products: BulkUpdateProductItem[]
      propagateToShops?: boolean
    }) => bulkUpdateProducts(products, propagateToShops),
    onSuccess: (data) => {
      const shopCount = data.shop_products_updated ?? 0
      toast.success(
        shopCount > 0
          ? `${data.updated?.length ?? 0} products updated (${shopCount} shop listings synced)`
          : `${data.updated?.length ?? 0} products updated`
      )
      qc.invalidateQueries({ queryKey: ["products"] })
      // Propagation writes shop_products.price directly — drop every
      // shop-products cache entry so an open Shop Products page reflects
      // the new price without a manual refresh.
      if (shopCount > 0) {
        qc.invalidateQueries({ queryKey: ["shop-products"] })
      }
    },
    onError: (e: Error) => toast.error(e.message || "Bulk update failed"),
  })
}
