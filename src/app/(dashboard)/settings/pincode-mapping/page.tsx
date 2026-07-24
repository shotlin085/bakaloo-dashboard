"use client"

/**
 * Pincode Mapping — the "ultimate mapping" reference table an admin uses to
 * correct wrong reverse-geocode results for specific pincodes (e.g. a
 * Gujarat pincode resolving to the wrong city from the public geocoder).
 * Each row maps one PIN code to its real city/area/state; the `Active`
 * toggle controls whether that override is actually applied. The customer
 * app's /addresses/validate-pincode call picks up an ACTIVE match and
 * auto-fills City on the address form instead of trusting the geocoder for
 * that pincode (bakaloo-backend migration 089).
 */

import { useMemo, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePermissions } from "@/hooks/usePermissions"
import {
  pincodeMappingService,
  type CreatePincodeMappingPayload,
  type PincodeMapping,
  type UpdatePincodeMappingPayload,
} from "@/services/pincode-mapping.service"

type MappingForm = {
  pincode: string
  city: string
  area: string
  state: string
  isActive: boolean
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

function createInitialForm(mapping?: PincodeMapping | null): MappingForm {
  return {
    pincode: mapping?.pincode ?? "",
    city: mapping?.city ?? "",
    area: mapping?.area ?? "",
    state: mapping?.state ?? "",
    isActive: mapping?.isActive ?? true,
  }
}

const PINCODE_PATTERN = /^[1-9][0-9]{5}$/

export default function PincodeMappingPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canManage = can("settings.manage")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<PincodeMapping | null>(null)
  const [deleteMapping, setDeleteMapping] = useState<PincodeMapping | null>(null)
  const [form, setForm] = useState<MappingForm>(createInitialForm())

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ["admin", "pincode-mappings"],
    queryFn: pincodeMappingService.getAll,
    staleTime: 30_000,
  })

  const orderedMappings = useMemo(
    () => [...mappings].sort((left, right) => left.pincode.localeCompare(right.pincode)),
    [mappings]
  )

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "pincode-mappings"] })

  const createMutation = useMutation({
    mutationFn: (payload: CreatePincodeMappingPayload) =>
      pincodeMappingService.create(payload),
    onSuccess: () => {
      toast.success("Pincode mapping created")
      setDialogOpen(false)
      setEditingMapping(null)
      setForm(createInitialForm())
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdatePincodeMappingPayload
    }) => pincodeMappingService.update(id, payload),
    onSuccess: () => {
      toast.success("Pincode mapping updated")
      setDialogOpen(false)
      setEditingMapping(null)
      setForm(createInitialForm())
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pincodeMappingService.delete(id),
    onSuccess: () => {
      toast.success("Pincode mapping deleted")
      setDeleteMapping(null)
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const openCreateDialog = () => {
    setEditingMapping(null)
    setForm(createInitialForm())
    setDialogOpen(true)
  }

  const openEditDialog = (mapping: PincodeMapping) => {
    setEditingMapping(mapping)
    setForm(createInitialForm(mapping))
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    const pincode = form.pincode.trim()
    const city = form.city.trim()
    const state = form.state.trim()
    const area = form.area.trim()

    if (!PINCODE_PATTERN.test(pincode)) {
      toast.error("Enter a valid 6-digit PIN code")
      return
    }
    if (!city) {
      toast.error("City is required")
      return
    }
    if (!state) {
      toast.error("State is required")
      return
    }

    if (editingMapping) {
      updateMutation.mutate({
        id: editingMapping.id,
        payload: {
          pincode,
          city,
          area: area || null,
          state,
          isActive: form.isActive,
        },
      })
      return
    }

    createMutation.mutate({
      pincode,
      city,
      area: area || undefined,
      state,
      isActive: form.isActive,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pincode Mapping"
        subtitle="Correct pincode -> city/area/state for areas where the map's auto-detected city is wrong. An active mapping overrides the detected city when a customer enters that pincode."
      >
        {canManage && (
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Mapping
          </Button>
        )}
      </PageHeader>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          Every allowed pincode and the city/area/state it should resolve to
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pincode</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((__, cell) => (
                    <TableCell key={cell}>
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : orderedMappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="No pincode mappings yet"
                    description="Add a pincode to override its detected city, area, and state."
                  />
                </TableCell>
              </TableRow>
            ) : (
              orderedMappings.map((mapping) => {
                const isUpdating =
                  updateMutation.isPending &&
                  updateMutation.variables?.id === mapping.id

                return (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium font-mono">
                      {mapping.pincode}
                    </TableCell>
                    <TableCell>{mapping.city}</TableCell>
                    <TableCell>{mapping.area || "—"}</TableCell>
                    <TableCell>{mapping.state}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={mapping.isActive}
                          disabled={isUpdating || !canManage}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({
                              id: mapping.id,
                              payload: { isActive: checked },
                            })
                          }
                        />
                        <Badge variant={mapping.isActive ? "default" : "secondary"}>
                          {mapping.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(mapping)}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteMapping(mapping)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingMapping(null)
            setForm(createInitialForm())
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? "Edit Pincode Mapping" : "Add Pincode Mapping"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mapping-pincode">Pincode</Label>
              <Input
                id="mapping-pincode"
                inputMode="numeric"
                maxLength={6}
                placeholder="743287"
                value={form.pincode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pincode: event.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mapping-city">City</Label>
                <Input
                  id="mapping-city"
                  placeholder="Surat"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mapping-state">State</Label>
                <Input
                  id="mapping-state"
                  placeholder="Gujarat"
                  value={form.state}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, state: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapping-area">Area (optional)</Label>
              <Input
                id="mapping-area"
                placeholder="Chandpara"
                value={form.area}
                onChange={(event) =>
                  setForm((current) => ({ ...current, area: event.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Only active mappings override the detected city for customers.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setEditingMapping(null)
                setForm(createInitialForm())
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingMapping ? "Save Changes" : "Create Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteMapping}
        onOpenChange={(open) => !open && setDeleteMapping(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this pincode mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              Customers entering pincode {deleteMapping?.pincode} will fall back to the
              auto-detected city again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteMapping) return
                deleteMutation.mutate(deleteMapping.id)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
