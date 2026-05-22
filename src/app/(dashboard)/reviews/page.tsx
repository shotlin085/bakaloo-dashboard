"use client"

import { Suspense, useState, useMemo } from "react"
import { Star, Search, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewCard } from "@/components/reviews/ReviewCard"
import { useProductReviews, useReplyReview, useModerateReview, useDeleteReview } from "@/hooks/useReviews"
import { useProducts } from "@/hooks/useProducts"
import { useDebounce } from "@/hooks/useDebounce"

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${cls} ${
            i < Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  )
}

function ReviewsContent() {
  const [search, setSearch] = useState("")
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 400)

  // Load products for the selector
  const { data: productsData, isLoading: productsLoading } = useProducts({
    page: 1,
    limit: 50,
    search: debouncedSearch || undefined,
  })

  const products = productsData?.products ?? []

  // Load reviews for selected product
  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(
    selectedProductId,
    { page, limit: 10 }
  )

  // Moderation hooks
  const replyMutation = useReplyReview(selectedProductId)
  const moderateMutation = useModerateReview(selectedProductId)
  const deleteMutation = useDeleteReview(selectedProductId)

  const reviews = useMemo(() => reviewsData?.reviews ?? [], [reviewsData?.reviews])
  const avgRating = reviewsData?.averageRating ?? 0
  const pagination = reviewsData?.pagination
  const totalPages = pagination?.totalPages ?? 1

  // Rating distribution for bar chart
  const ratingDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0] // index 0 → 1★, index 4 → 5★
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++
    })
    const total = reviews.length || 1
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star - 1],
      pct: Math.round((counts[star - 1] / total) * 100),
    }))
  }, [reviews])

  // Client-side rating filter
  const filteredReviews =
    ratingFilter === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(ratingFilter))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        subtitle="Browse and moderate customer reviews by product"
      />

      {/* Product Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select a Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search reviews"
              placeholder="Search products..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {productsLoading ? (
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-28 bg-muted animate-pulse rounded-full"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products found</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {products.slice(0, 20).map((p) => (
                <Button
                  key={p.id}
                  variant={selectedProductId === p.id ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSelectedProductId(p.id)
                    setPage(1)
                    setRatingFilter("all")
                  }}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews section */}
      {selectedProductId ? (
        <div className="space-y-4">
          {/* Average rating & filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Stars rating={avgRating} size="lg" />
                <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
              </div>
              <Badge variant="secondary">
                {pagination?.total ?? 0} reviews
              </Badge>
            </div>
            <Tabs
              value={ratingFilter}
              onValueChange={(v) => setRatingFilter(v)}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="5">5★</TabsTrigger>
                <TabsTrigger value="4">4★</TabsTrigger>
                <TabsTrigger value="3">3★</TabsTrigger>
                <TabsTrigger value="2">2★</TabsTrigger>
                <TabsTrigger value="1">1★</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Rating Distribution Chart */}
          {reviews.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-3 px-5">
                <p className="text-sm font-medium mb-3">Rating Distribution</p>
                <div className="space-y-2">
                  {ratingDistribution.map((row) => (
                    <div key={row.star} className="flex items-center gap-2 text-sm">
                      <span className="w-6 text-right text-muted-foreground">{row.star}★</span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-muted-foreground">
                        {row.count} ({row.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews list */}
          {reviewsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-6 w-6 text-muted-foreground" />}
              title="No reviews"
              description={
                ratingFilter !== "all"
                  ? `No ${ratingFilter}-star reviews for this product`
                  : "This product hasn't received any reviews yet"
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onReply={(id, reply) => replyMutation.mutate({ reviewId: id, reply })}
                  onModerate={(id, status) => moderateMutation.mutate({ reviewId: id, status })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isReplying={replyMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<Star className="h-6 w-6 text-muted-foreground" />}
          title="Select a product"
          description="Choose a product above to view its customer reviews"
        />
      )}
    </div>
  )
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <ReviewsContent />
    </Suspense>
  )
}
