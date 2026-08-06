"use client"

import { useEffect, useState } from "react"
import { Truck, Phone, MapPinned, Bell, QrCode, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRiders } from "@/hooks/useRiders"
import { useAssignRider } from "@/hooks/useOrders"
import { formatDateTime } from "@/lib/utils"
import type { OrderDetail } from "@/types"

const ASSIGNMENT_METHOD_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  AREA_SEGMENT: "Area Segment",
  AUTO: "Automatic",
}

const PICKUP_TOKEN_LABEL: Record<string, string> = {
  ACTIVE: "Ready to scan",
  VERIFIED: "Scanned",
  CONSUMED: "Picked up",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
}

/**
 * Rider Assignment section for the order-detail drawer — only rendered once
 * an order reaches PACKED (see OrderDetailDrawer). Pre-fills the dropdown
 * with the order's current rider, or failing that, the rider previously
 * assigned to this same customer + saved address (`order.suggested_rider`,
 * a suggestion only — never auto-confirmed, per the sticky-address rider
 * feature). The admin always has to press Assign to commit a change.
 */
export function RiderAssignmentSection({ order }: { order: OrderDetail }) {
  const { data: ridersData } = useRiders()
  const assignRider = useAssignRider()

  const isSuggestionOnly = !order.rider_id && !!order.suggested_rider
  const [selectedRiderId, setSelectedRiderId] = useState(
    order.rider_id ?? order.suggested_rider?.id ?? ""
  )

  // Re-sync if the order underneath changes (e.g. drawer reopened on a
  // different order, or a refetch lands a freshly-assigned rider).
  useEffect(() => {
    setSelectedRiderId(order.rider_id ?? order.suggested_rider?.id ?? "")
  }, [order.id, order.rider_id, order.suggested_rider?.id])

  const riders = ridersData?.riders ?? []
  const hasChanged = selectedRiderId !== "" && selectedRiderId !== order.rider_id
  const isSuggestedStillSelected =
    isSuggestionOnly && selectedRiderId === order.suggested_rider?.id

  return (
    <div className="mt-3 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="h-4 w-4 text-brand-500" />
        <span className="text-sm font-medium">Rider Assignment</span>
      </div>

      {isSuggestedStillSelected && (
        <Badge variant="secondary" className="mb-2 font-normal">
          Suggested — assigned to this address last time
        </Badge>
      )}

      {order.rider_id && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {order.assignment_method && (
            <Badge variant="outline" className="font-normal">
              {ASSIGNMENT_METHOD_LABEL[order.assignment_method] ?? order.assignment_method}
            </Badge>
          )}
          {order.assignment_method === "AREA_SEGMENT" && order.area_segment_name && (
            <Badge variant="outline" className="font-normal">
              <MapPinned className="h-3 w-3 mr-1" />
              {order.area_segment_name}
            </Badge>
          )}
          {order.pickup_status && (
            <Badge variant="outline" className="font-normal">
              {order.pickup_status.replaceAll("_", " ")}
            </Badge>
          )}
          {order.pickup_token_status && (
            <Badge variant="outline" className="font-normal">
              <QrCode className="h-3 w-3 mr-1" />
              {PICKUP_TOKEN_LABEL[order.pickup_token_status] ?? order.pickup_token_status}
            </Badge>
          )}
          <Badge variant="outline" className="font-normal">
            <Bell className="h-3 w-3 mr-1" />
            {order.notification_sent_at ? "Rider notified" : "Not yet notified"}
          </Badge>
        </div>
      )}

      {order.assigned_at && (
        <p className="text-xs text-muted-foreground mb-2">
          Assigned {formatDateTime(order.assigned_at)}
        </p>
      )}

      {order.rider_name && (
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <span>Currently:</span>
          <span className="font-medium text-foreground">{order.rider_name}</span>
          {order.rider_phone && (
            <span className="text-xs">
              <Phone className="h-3 w-3 inline mr-0.5" />
              {order.rider_phone}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder="Choose a rider..." />
          </SelectTrigger>
          <SelectContent>
            {riders.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} — {r.phone}
                {r.id === order.suggested_rider?.id ? " (suggested)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!hasChanged || assignRider.isPending}
          onClick={() =>
            assignRider.mutate({ orderId: order.id, payload: { riderId: selectedRiderId } })
          }
        >
          {assignRider.isPending ? "Assigning..." : order.rider_id ? "Change Rider" : "Assign"}
        </Button>
      </div>

      {order.assignment_history && order.assignment_history.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 select-none">
            <History className="h-3 w-3" />
            Assignment history ({order.assignment_history.length})
          </summary>
          <ul className="mt-1.5 space-y-1 border-l pl-3">
            {order.assignment_history.map((entry) => (
              <li key={entry.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {ASSIGNMENT_METHOD_LABEL[entry.method] ?? entry.method}
                </span>
                {entry.rider_name && <> — {entry.rider_name}</>}
                <span className="block">{entry.reason}</span>
                <span className="text-[11px]">{formatDateTime(entry.decided_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
