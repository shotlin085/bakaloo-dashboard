import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponAnalytics,
} from "@/services/coupons.service"
import type { CouponFilters, CreateCouponPayload, UpdateCouponPayload } from "@/types/coupon.types"

export function useCoupons(filters: CouponFilters = {}) {
  return useQuery({
    queryKey: ["coupons", filters],
    queryFn: () => getCoupons(filters),
    staleTime: 30_000,
  })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCouponPayload) => createCoupon(payload),
    onSuccess: () => {
      toast.success("Coupon created successfully")
      qc.invalidateQueries({ queryKey: ["coupons"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create coupon")
    },
  })
}

export function useUpdateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCouponPayload }) =>
      updateCoupon(id, payload),
    onSuccess: () => {
      toast.success("Coupon updated successfully")
      qc.invalidateQueries({ queryKey: ["coupons"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update coupon")
    },
  })
}

export function useDeleteCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      toast.success("Coupon deleted")
      qc.invalidateQueries({ queryKey: ["coupons"] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete coupon")
    },
  })
}

export function useCouponAnalytics(couponId: string | null) {
  return useQuery({
    queryKey: ["coupon-analytics", couponId],
    queryFn: () => getCouponAnalytics(couponId!),
    enabled: !!couponId,
    staleTime: 60_000,
  })
}
