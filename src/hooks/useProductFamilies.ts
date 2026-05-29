/**
 * React Query hooks for product family management.
 * Wraps `services/product-families.service.ts`.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  createProductFamily,
  deactivateProductFamily,
  getProductFamily,
  getProductOptions,
  listProductFamilies,
  updateProductFamily,
} from "@/services/product-families.service"
import type {
  Paginated,
  ProductFamily,
  ProductFamilyCreatePayload,
  ProductFamilyListParams,
  ProductFamilyUpdatePayload,
  ProductOptionsResponse,
} from "@/types"

const KEY_BASE = ["product-families"] as const

export const productFamilyKeys = {
  all: KEY_BASE,
  lists: () => [...KEY_BASE, "list"] as const,
  list: (params: ProductFamilyListParams) =>
    [...productFamilyKeys.lists(), params] as const,
  details: () => [...KEY_BASE, "detail"] as const,
  detail: (id: string) => [...productFamilyKeys.details(), id] as const,
  options: (productId: string) =>
    ["product-options", productId] as const,
}

export function useProductFamiliesList(
  params: ProductFamilyListParams = {},
  options?: Omit<
    UseQueryOptions<Paginated<ProductFamily>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<Paginated<ProductFamily>>({
    queryKey: productFamilyKeys.list(params),
    queryFn: () => listProductFamilies(params),
    staleTime: 60_000,
    ...options,
  })
}

export function useProductFamily(
  id: string | undefined,
  options?: Omit<
    UseQueryOptions<ProductFamily>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  return useQuery<ProductFamily>({
    queryKey: productFamilyKeys.detail(id ?? ""),
    queryFn: () => getProductFamily(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
    ...options,
  })
}

export function useCreateProductFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductFamilyCreatePayload) =>
      createProductFamily(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productFamilyKeys.lists() })
      toast.success("Product family created")
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create product family")
    },
  })
}

export function useUpdateProductFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: ProductFamilyUpdatePayload
    }) => updateProductFamily(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: productFamilyKeys.lists() })
      qc.invalidateQueries({ queryKey: productFamilyKeys.detail(data.id) })
      toast.success("Product family updated")
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update product family")
    },
  })
}

export function useDeactivateProductFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateProductFamily(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productFamilyKeys.lists() })
      toast.success("Product family deactivated")
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to deactivate product family")
    },
  })
}

export function useProductOptions(
  productId: string | undefined,
  options?: Omit<
    UseQueryOptions<ProductOptionsResponse | null>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  return useQuery<ProductOptionsResponse | null>({
    queryKey: productFamilyKeys.options(productId ?? ""),
    queryFn: () => getProductOptions(productId as string),
    enabled: Boolean(productId),
    staleTime: 30_000,
    ...options,
  })
}
