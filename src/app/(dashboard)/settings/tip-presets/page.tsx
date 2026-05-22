"use client"

import { useMemo, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
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
import {
  tipPresetsService,
  type CreateTipPresetPayload,
  type TipPresetAdmin,
  type UpdateTipPresetPayload,
} from "@/services/tip-presets.service"

type TipPresetForm = {
  amount: string
  emoji: string
  sortOrder: string
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

function createInitialForm(preset?: TipPresetAdmin | null): TipPresetForm {
  return {
    amount: preset ? String(preset.amount) : "",
    emoji: preset?.emoji ?? "",
    sortOrder: preset ? String(preset.sort_order) : "0",
    isActive: preset?.is_active ?? true,
  }
}

export default function TipPresetsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<TipPresetAdmin | null>(null)
  const [deletePreset, setDeletePreset] = useState<TipPresetAdmin | null>(null)
  const [form, setForm] = useState<TipPresetForm>(createInitialForm())

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ["admin", "tip-presets"],
    queryFn: tipPresetsService.getAll,
    staleTime: 30_000,
  })

  const orderedPresets = useMemo(
    () => [...presets].sort((left, right) => left.sort_order - right.sort_order),
    [presets]
  )

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "tip-presets"] })

  const createMutation = useMutation({
    mutationFn: (payload: CreateTipPresetPayload) =>
      tipPresetsService.create(payload),
    onSuccess: () => {
      toast.success("Tip preset created")
      setDialogOpen(false)
      setEditingPreset(null)
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
      payload: UpdateTipPresetPayload
    }) => tipPresetsService.update(id, payload),
    onSuccess: () => {
      toast.success("Tip preset updated")
      setDialogOpen(false)
      setEditingPreset(null)
      setForm(createInitialForm())
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tipPresetsService.delete(id),
    onSuccess: () => {
      toast.success("Tip preset deleted")
      setDeletePreset(null)
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const openCreateDialog = () => {
    setEditingPreset(null)
    setForm(createInitialForm())
    setDialogOpen(true)
  }

  const openEditDialog = (preset: TipPresetAdmin) => {
    setEditingPreset(preset)
    setForm(createInitialForm(preset))
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    const amount = Number(form.amount)
    const sortOrder = Number(form.sortOrder)

    if (!Number.isFinite(amount) || amount < 1 || amount > 500) {
      toast.error("Amount must be between ₹1 and ₹500")
      return
    }

    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      toast.error("Sort order must be 0 or higher")
      return
    }

    if (editingPreset) {
      updateMutation.mutate({
        id: editingPreset.id,
        payload: {
          amount,
          emoji: form.emoji.trim() || undefined,
          sortOrder,
          isActive: form.isActive,
        },
      })
      return
    }

    createMutation.mutate({
      amount,
      emoji: form.emoji.trim() || undefined,
      sortOrder,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tip Presets"
        subtitle="Manage the preset tip chips shown in the cart tip selector."
      >
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Preset
        </Button>
      </PageHeader>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emoji</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 5 }).map((__, cell) => (
                    <TableCell key={cell}>
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : orderedPresets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title="No tip presets yet"
                    description="Create your first preset to populate the cart tip chips."
                  />
                </TableCell>
              </TableRow>
            ) : (
              orderedPresets.map((preset) => {
                const isUpdating =
                  updateMutation.isPending &&
                  updateMutation.variables?.id === preset.id

                return (
                  <TableRow key={preset.id}>
                    <TableCell className="text-2xl">
                      {preset.emoji || "—"}
                    </TableCell>
                    <TableCell className="font-medium">₹{preset.amount}</TableCell>
                    <TableCell>{preset.sort_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={preset.is_active}
                          disabled={isUpdating}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({
                              id: preset.id,
                              payload: { isActive: checked },
                            })
                          }
                        />
                        <Badge variant={preset.is_active ? "default" : "secondary"}>
                          {preset.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(preset)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeletePreset(preset)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
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
            setEditingPreset(null)
            setForm(createInitialForm())
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPreset ? "Edit Tip Preset" : "Add Tip Preset"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tip-amount">Amount</Label>
                <Input
                  id="tip-amount"
                  type="number"
                  min={1}
                  max={500}
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tip-emoji">Emoji</Label>
                <Input
                  id="tip-emoji"
                  placeholder="🍵"
                  value={form.emoji}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      emoji: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tip-sort-order">Sort Order</Label>
              <Input
                id="tip-sort-order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
              />
            </div>

            {editingPreset && (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Disable a preset without deleting it.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, isActive: checked }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setEditingPreset(null)
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
              {editingPreset ? "Save Changes" : "Create Preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletePreset}
        onOpenChange={(open) => !open && setDeletePreset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tip preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the preset from the cart tip selector immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletePreset) return
                deleteMutation.mutate(deletePreset.id)
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
