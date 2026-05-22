import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getProductReviews, replyToReview, moderateReview, deleteReview } from "@/services/reviews.service"
import type { ReviewFilters } from "@/types/review.types"
import { toast } from "sonner"

export function useProductReviews(
  productId: string | null,
  filters: ReviewFilters = {}
) {
  return useQuery({
    queryKey: ["reviews", productId, filters],
    queryFn: () => getProductReviews(productId!, filters),
    enabled: !!productId,
    staleTime: 30_000,
  })
}

export function useReplyReview(productId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      replyToReview(reviewId, reply),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", productId] })
      toast.success("Reply posted")
    },
    onError: () => toast.error("Failed to post reply"),
  })
}

export function useModerateReview(productId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      reviewId,
      status,
    }: {
      reviewId: string
      status: "approved" | "hidden" | "spam"
    }) => moderateReview(reviewId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", productId] })
      toast.success("Review status updated")
    },
    onError: () => toast.error("Failed to moderate review"),
  })
}

export function useDeleteReview(productId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", productId] })
      toast.success("Review deleted")
    },
    onError: () => toast.error("Failed to delete review"),
  })
}
