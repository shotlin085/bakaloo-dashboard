"use client"

import { useState } from "react"
import { Star, CheckCircle, EyeOff, Flag, Trash2, MessageSquare, MoreHorizontal, Send } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Review } from "@/types/review.types"

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  hidden: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  spam: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
}

interface ReviewCardProps {
  review: Review
  onReply?: (reviewId: string, reply: string) => void
  onModerate?: (reviewId: string, status: "approved" | "hidden" | "spam") => void
  onDelete?: (reviewId: string) => void
  isReplying?: boolean
}

export function ReviewCard({ review, onReply, onModerate, onDelete, isReplying }: ReviewCardProps) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyText, setReplyText] = useState(review.admin_reply ?? "")
  const status = review.status ?? "approved"

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Stars rating={review.rating} />
              <Badge variant="outline" className={`text-[10px] border-0 ${STATUS_STYLES[status] ?? ""}`}>
                {status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {timeAgo(review.created_at)}
              </span>
            </div>
            {review.comment && (
              <p className="text-sm text-foreground leading-relaxed">
                {review.comment}
              </p>
            )}
            {/* Photo Gallery */}
            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-1">
                {review.images.map((img, idx) => (
                  <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="h-16 w-16 rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary/40 transition-all">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Review photo ${idx + 1}`} className="h-full w-full object-cover" />
                    </div>
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              by {review.user_name}
            </p>
          </div>

          {/* Actions dropdown */}
          {(onModerate || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onModerate && status !== "approved" && (
                  <DropdownMenuItem onClick={() => onModerate(review.id, "approved")}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Approve
                  </DropdownMenuItem>
                )}
                {onModerate && status !== "hidden" && (
                  <DropdownMenuItem onClick={() => onModerate(review.id, "hidden")}>
                    <EyeOff className="h-4 w-4 mr-2 text-red-500" /> Hide
                  </DropdownMenuItem>
                )}
                {onModerate && status !== "spam" && (
                  <DropdownMenuItem onClick={() => onModerate(review.id, "spam")}>
                    <Flag className="h-4 w-4 mr-2 text-orange-500" /> Mark Spam
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(review.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Existing admin reply */}
        {review.admin_reply && !showReplyBox && (
          <div className="ml-4 pl-3 border-l-2 border-primary/30 space-y-1">
            <p className="text-xs font-medium text-primary">Store Response</p>
            <p className="text-sm text-foreground">{review.admin_reply}</p>
            {review.replied_at && (
              <p className="text-[10px] text-muted-foreground">{timeAgo(review.replied_at)}</p>
            )}
          </div>
        )}

        {/* Reply section */}
        {onReply && (
          <>
            {!showReplyBox ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowReplyBox(true)}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                {review.admin_reply ? "Edit Reply" : "Reply"}
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply as store response..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="text-xs"
                    disabled={!replyText.trim() || isReplying}
                    onClick={() => {
                      onReply(review.id, replyText.trim())
                      setShowReplyBox(false)
                    }}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {isReplying ? "Sending..." : "Send Reply"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setShowReplyBox(false)
                      setReplyText(review.admin_reply ?? "")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
