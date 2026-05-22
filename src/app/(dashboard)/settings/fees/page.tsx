"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  feesService,
  type FeeConfig,
  type UpdateFeePayload,
} from "@/services/fees.service"

type FeeDraft = {
  amount: string
  freeThreshold: string
  isActive: boolean
  description: string
  startHour: string
  endHour: string
}

const FEE_ORDER = [
  "delivery_fee",
  "handling_fee",
  "late_night_fee",
  "delivery_estimate_minutes",
] as const

const FEE_META: Record<string, { title: string; subtitle: string }> = {
  delivery_fee: {
    title: "Delivery Fee",
    subtitle: "Base delivery charge and free-delivery threshold.",
  },
  handling_fee: {
    title: "Handling Fee",
    subtitle: "Packaging and handling fee shown in cart and orders.",
  },
  late_night_fee: {
    title: "Late Night Fee",
    subtitle: "Surcharge window for late-night ordering hours.",
  },
  delivery_estimate_minutes: {
    title: "Delivery Estimate",
    subtitle: "Default delivery estimate used in the cart summary.",
  },
}

function toDraft(fee: FeeConfig): FeeDraft {
  return {
    amount: String(fee.amount ?? 0),
    freeThreshold:
      fee.free_threshold === null ? "" : String(fee.free_threshold),
    isActive: fee.is_active,
    description: fee.description ?? "",
    startHour: fee.start_hour === null ? "" : String(fee.start_hour),
    endHour: fee.end_hour === null ? "" : String(fee.end_hour),
  }
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message
  }

  if (error instanceof Error) return error.message
  return "Something went wrong"
}

export default function FeeConfigurationPage() {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, FeeDraft>>({})

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ["admin", "fees"],
    queryFn: feesService.getAll,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!fees.length) return
    setDrafts(
      fees.reduce<Record<string, FeeDraft>>((acc, fee) => {
        acc[fee.fee_type] = toDraft(fee)
        return acc
      }, {})
    )
  }, [fees])

  const orderedFees = useMemo(() => {
    return [...fees].sort(
      (left, right) =>
        FEE_ORDER.indexOf(left.fee_type as (typeof FEE_ORDER)[number]) -
        FEE_ORDER.indexOf(right.fee_type as (typeof FEE_ORDER)[number])
    )
  }, [fees])

  const updateMutation = useMutation({
    mutationFn: ({
      feeType,
      payload,
    }: {
      feeType: string
      payload: UpdateFeePayload
    }) => feesService.update(feeType, payload),
    onSuccess: (_, variables) => {
      toast.success(`${FEE_META[variables.feeType]?.title ?? "Fee"} saved`)
      queryClient.invalidateQueries({ queryKey: ["admin", "fees"] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleDraftChange = (
    feeType: string,
    key: keyof FeeDraft,
    value: string | boolean
  ) => {
    setDrafts((current) => ({
      ...current,
      [feeType]: {
        ...current[feeType],
        [key]: value,
      },
    }))
  }

  const handleSave = (feeType: string) => {
    const draft = drafts[feeType]
    if (!draft) return

    const payload: UpdateFeePayload = {
      amount: Number(draft.amount || 0),
      free_threshold: parseOptionalNumber(draft.freeThreshold),
      is_active: draft.isActive,
      description: draft.description.trim(),
      start_hour: parseOptionalNumber(draft.startHour),
      end_hour: parseOptionalNumber(draft.endHour),
    }

    updateMutation.mutate({ feeType, payload })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Configuration"
        subtitle="Manage cart-side delivery, handling, late-night, and ETA settings."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 4 }).map((__, rowIndex) => (
                    <Skeleton key={rowIndex} className="h-10 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))
          : orderedFees.map((fee) => {
              const draft = drafts[fee.fee_type] ?? toDraft(fee)
              const isLateNight = fee.fee_type === "late_night_fee"
              const isDeliveryFee = fee.fee_type === "delivery_fee"
              const isSaving =
                updateMutation.isPending &&
                updateMutation.variables?.feeType === fee.fee_type

              return (
                <Card key={fee.id} className="border-border/80 shadow-sm">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {FEE_META[fee.fee_type]?.title ?? fee.fee_type}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {FEE_META[fee.fee_type]?.subtitle ?? fee.description}
                        </p>
                      </div>
                      <Badge variant={draft.isActive ? "default" : "secondary"}>
                        {draft.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${fee.fee_type}-amount`}>Amount</Label>
                        <Input
                          id={`${fee.fee_type}-amount`}
                          type="number"
                          min={0}
                          max={10000}
                          value={draft.amount}
                          onChange={(event) =>
                            handleDraftChange(
                              fee.fee_type,
                              "amount",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${fee.fee_type}-threshold`}>
                          Free Threshold
                        </Label>
                        <Input
                          id={`${fee.fee_type}-threshold`}
                          type="number"
                          min={0}
                          placeholder={isDeliveryFee ? "499" : "Not used"}
                          value={draft.freeThreshold}
                          disabled={!isDeliveryFee}
                          onChange={(event) =>
                            handleDraftChange(
                              fee.fee_type,
                              "freeThreshold",
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    {isLateNight && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`${fee.fee_type}-start`}>
                            Start Hour
                          </Label>
                          <Input
                            id={`${fee.fee_type}-start`}
                            type="number"
                            min={0}
                            max={23}
                            placeholder="23"
                            value={draft.startHour}
                            onChange={(event) =>
                              handleDraftChange(
                                fee.fee_type,
                                "startHour",
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${fee.fee_type}-end`}>End Hour</Label>
                          <Input
                            id={`${fee.fee_type}-end`}
                            type="number"
                            min={0}
                            max={23}
                            placeholder="6"
                            value={draft.endHour}
                            onChange={(event) =>
                              handleDraftChange(
                                fee.fee_type,
                                "endHour",
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor={`${fee.fee_type}-description`}>
                        Description
                      </Label>
                      <Textarea
                        id={`${fee.fee_type}-description`}
                        rows={3}
                        value={draft.description}
                        onChange={(event) =>
                          handleDraftChange(
                            fee.fee_type,
                            "description",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={draft.isActive}
                          onCheckedChange={(checked) =>
                            handleDraftChange(fee.fee_type, "isActive", checked)
                          }
                        />
                        <div>
                          <p className="text-sm font-medium">Active</p>
                          <p className="text-xs text-muted-foreground">
                            Toggle whether this config is used in cart calculations.
                          </p>
                        </div>
                      </div>

                      <Button onClick={() => handleSave(fee.fee_type)} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>
    </div>
  )
}
