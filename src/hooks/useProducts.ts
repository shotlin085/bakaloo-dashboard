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
    onSuccess: () => {
      toast.success("Product deleted")
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
    mutationFn: (
      products: { id: string; price?: number; sale_price?: number; category_id?: string; is_active?: boolean }[]
    ) => bulkUpdateProducts(products),
    onSuccess: (data) => {
      toast.success(`${data.updated?.length ?? 0} products updated`)
      qc.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e: Error) => toast.error(e.message || "Bulk update failed"),
  })
}
