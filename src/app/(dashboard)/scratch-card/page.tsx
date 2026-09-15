"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical, Gift, Save, Loader2, Users2, History as HistoryIcon } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ScratchPrizeDialog, SCRATCH_PRIZE_TYPE_LABELS } from "@/components/scratch-card/ScratchPrizeDialog"
import {
  ScratchFirstTimePrizeDialog,
  SCRATCH_FIRST_TIME_PRIZE_TYPE_LABELS,
} from "@/components/scratch-card/ScratchFirstTimePrizeDialog"
import { ScratchMilestoneRuleDialog } from "@/components/scratch-card/ScratchMilestoneRuleDialog"
import { GrantScratchesDialog } from "@/components/scratch-card/GrantScratchesDialog"
import { ScratchAppearanceCard, type ScratchAppearanceDraft } from "@/components/scratch-card/ScratchAppearanceCard"

import {
  useScratchPrizes,
  useDeleteScratchPrize,
  useReorderScratchPrizes,
  useScratchFirstTimePrizes,
  useDeleteScratchFirstTimePrize,
  useReorderScratchFirstTimePrizes,
  useScratchMilestoneRules,
  useDeleteScratchMilestoneRule,
  useScratchCardSettings,
  useUpdateScratchCardSettings,
  useScratchHistory,
} from "@/hooks/useScratchCard"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatINR } from "@/lib/utils"
import type {
  ScratchPrize,
  ScratchFirstTimePrize,
  ScratchMilestoneRule,
  ScratchTriggerMode,
} from "@/types/scratch-card.types"

// ═══════════════════════════════════════════════════════════════════════
// Prizes tab
// ═══════════════════════════════════════════════════════════════════════

const MILESTONE_TYPE_LABELS: Record<string, string> = {
  ORDER_COUNT: "Delivered orders",
  TOTAL_SPEND: "Total spend",
}

function SortablePrizeRow({
  prize,
  canManage,
  onEdit,
  onDelete,
}: {
  prize: ScratchPrize
  canManage: boolean
  onEdit: (p: ScratchPrize) => void
  onDelete: (p: ScratchPrize) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prize.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{prize.label}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{SCRATCH_PRIZE_TYPE_LABELS[prize.type]}</TableCell>
      <TableCell className="text-sm">
        {prize.value == null
          ? "—"
          : prize.type === "PERCENTAGE_OFF"
            ? `${prize.value}%`
            : formatINR(prize.value)}
      </TableCell>
      <TableCell className="text-sm font-medium">{prize.winProbability}%</TableCell>
      <TableCell>
        <Badge variant={prize.isActive ? "default" : "outline"}>
          {prize.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(prize)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(prize)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}

function PrizesTab() {
  const { data: prizes, isLoading } = useScratchPrizes()
  const deleteMutation = useDeleteScratchPrize()
  const reorderMutation = useReorderScratchPrizes()
  const { can } = usePermissions()
  const canManage = can("scratch-card.manage")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<ScratchPrize | null>(null)

  const sorted = useMemo(
    () => [...(prizes ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [prizes]
  )
  const activePrizes = sorted.filter((p) => p.isActive)
  const totalProbability = Math.round(activePrizes.reduce((sum, p) => sum + p.winProbability, 0) * 100) / 100
  const isValidTotal = Math.abs(totalProbability - 100) < 0.01
  const isValidCount = activePrizes.length >= 2 && activePrizes.length <= 8
  const isCardReady = isValidTotal && isValidCount

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sorted.findIndex((p) => p.id === active.id)
      const newIndex = sorted.findIndex((p) => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      reorderMutation.mutate(arrayMove(sorted.map((p) => p.id), oldIndex, newIndex))
    },
    [sorted, reorderMutation]
  )

  const openCreate = () => {
    setEditingPrize(null)
    setDialogOpen(true)
  }
  const openEdit = (p: ScratchPrize) => {
    setEditingPrize(p)
    setDialogOpen(true)
  }
  const handleDelete = (p: ScratchPrize) => {
    if (confirm(`Delete "${p.label}"?`)) deleteMutation.mutate(p.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm flex items-center gap-2 flex-wrap",
            isCardReady
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          <span className="font-medium">
            {activePrizes.length} active prize{activePrizes.length === 1 ? "" : "s"}
          </span>
          <span>·</span>
          <span className="font-medium">Total probability: {totalProbability}%</span>
          {!isValidTotal && <span>— must equal exactly 100% for the card to resolve</span>}
          {isValidTotal && !isValidCount && <span>— need between 2 and 8 active prizes</span>}
        </div>
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> New Prize
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Win %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<Gift className="h-6 w-6 text-muted-foreground" />}
                    title="No prizes yet"
                    description="Add 2 to 8 prizes and set each one's win probability."
                  />
                </TableCell>
              </TableRow>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sorted.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  {sorted.map((prize) => (
                    <SortablePrizeRow
                      key={prize.id}
                      prize={prize}
                      canManage={canManage}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </TableBody>
        </Table>
      </div>

      <ScratchPrizeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} prize={editingPrize} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// First-Time Reward tab
// ═══════════════════════════════════════════════════════════════════════

function SortableFirstTimePrizeRow({
  prize,
  canManage,
  onEdit,
  onDelete,
}: {
  prize: ScratchFirstTimePrize
  canManage: boolean
  onEdit: (p: ScratchFirstTimePrize) => void
  onDelete: (p: ScratchFirstTimePrize) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prize.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{prize.label}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{SCRATCH_FIRST_TIME_PRIZE_TYPE_LABELS[prize.type]}</TableCell>
      <TableCell className="text-sm">
        {prize.value == null
          ? "—"
          : prize.type === "PERCENTAGE_OFF"
            ? `${prize.value}%`
            : formatINR(prize.value)}
      </TableCell>
      <TableCell className="text-sm font-medium">{prize.winProbability}%</TableCell>
      <TableCell>
        <Badge variant={prize.isActive ? "default" : "outline"}>
          {prize.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(prize)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(prize)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}

function FirstTimeTab() {
  const { data: prizes, isLoading } = useScratchFirstTimePrizes()
  const deleteMutation = useDeleteScratchFirstTimePrize()
  const reorderMutation = useReorderScratchFirstTimePrizes()
  const { can } = usePermissions()
  const canManage = can("scratch-card.manage")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<ScratchFirstTimePrize | null>(null)

  const sorted = useMemo(
    () => [...(prizes ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [prizes]
  )
  const activePrizes = sorted.filter((p) => p.isActive)
  const totalProbability = Math.round(activePrizes.reduce((sum, p) => sum + p.winProbability, 0) * 100) / 100
  const isValidTotal = Math.abs(totalProbability - 100) < 0.01
  const isValidCount = activePrizes.length >= 1 && activePrizes.length <= 8
  const isPoolReady = isValidTotal && isValidCount

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sorted.findIndex((p) => p.id === active.id)
      const newIndex = sorted.findIndex((p) => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      reorderMutation.mutate(arrayMove(sorted.map((p) => p.id), oldIndex, newIndex))
    },
    [sorted, reorderMutation]
  )

  const openCreate = () => {
    setEditingPrize(null)
    setDialogOpen(true)
  }
  const openEdit = (p: ScratchFirstTimePrize) => {
    setEditingPrize(p)
    setDialogOpen(true)
  }
  const handleDelete = (p: ScratchFirstTimePrize) => {
    if (confirm(`Delete "${p.label}"?`)) deleteMutation.mutate(p.id)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        A brand-new customer&apos;s very first scratch ever always lands on one of these prizes
        instead of the normal odds — never &quot;Better luck next time&quot;. Every scratch after that
        first one uses the regular Prizes tab, regardless of whether the customer has placed an
        order. Turn the whole mechanic on or off from the Settings tab.
      </p>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm flex items-center gap-2 flex-wrap",
            isPoolReady
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          <span className="font-medium">
            {activePrizes.length} active first-time prize{activePrizes.length === 1 ? "" : "s"}
          </span>
          <span>·</span>
          <span className="font-medium">Total probability: {totalProbability}%</span>
          {!isValidTotal && <span>— must equal exactly 100%</span>}
          {isValidTotal && !isValidCount && <span>— need between 1 and 8 active prizes</span>}
        </div>
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> New First-Time Prize
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Win %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={<Gift className="h-6 w-6 text-muted-foreground" />}
                    title="No first-time prizes yet"
                    description="Add at least 1 prize — every brand-new customer's first scratch lands on it."
                  />
                </TableCell>
              </TableRow>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sorted.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  {sorted.map((prize) => (
                    <SortableFirstTimePrizeRow
                      key={prize.id}
                      prize={prize}
                      canManage={canManage}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </TableBody>
        </Table>
      </div>

      <ScratchFirstTimePrizeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} prize={editingPrize} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Milestones tab
// ═══════════════════════════════════════════════════════════════════════

function MilestonesTab() {
  const { data: rules, isLoading } = useScratchMilestoneRules()
  const deleteMutation = useDeleteScratchMilestoneRule()
  const { can } = usePermissions()
  const canManage = can("scratch-card.manage")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScratchMilestoneRule | null>(null)

  const openCreate = () => {
    setEditingRule(null)
    setDialogOpen(true)
  }
  const openEdit = (r: ScratchMilestoneRule) => {
    setEditingRule(r)
    setDialogOpen(true)
  }
  const handleDelete = (r: ScratchMilestoneRule) => {
    if (confirm("Delete this milestone rule?")) deleteMutation.mutate(r.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> New Rule
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trigger</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Grants</TableHead>
              <TableHead>Repeats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !rules || rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={<Users2 className="h-6 w-6 text-muted-foreground" />}
                    title="No milestone rules yet"
                    description="e.g. every 5th delivered order grants 1 bonus scratch card"
                  />
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{MILESTONE_TYPE_LABELS[rule.milestoneType]}</TableCell>
                  <TableCell>
                    {rule.milestoneType === "TOTAL_SPEND" ? formatINR(rule.threshold) : rule.threshold}
                  </TableCell>
                  <TableCell>
                    {rule.bonusScratches} card{rule.bonusScratches === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.isRepeating ? "secondary" : "outline"} className="text-[10px]">
                      {rule.isRepeating ? "Every time" : "Once"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? "default" : "outline"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(rule)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(rule)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ScratchMilestoneRuleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} rule={editingRule} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Settings tab
// ═══════════════════════════════════════════════════════════════════════

interface SettingsDraft extends ScratchAppearanceDraft {
  dailyFreeScratches: number
  triggerMode: ScratchTriggerMode
  firstTimeRewardEnabled: boolean
}

const DEFAULT_SETTINGS_DRAFT: SettingsDraft = {
  dailyFreeScratches: 1,
  triggerMode: "ALWAYS_ON_LOGIN",
  firstTimeRewardEnabled: true,
  coverImageUrl: null,
  coverImagePublicId: null,
}

function SettingsTab() {
  const { data: settings, isLoading } = useScratchCardSettings()
  const updateMutation = useUpdateScratchCardSettings()
  const { can } = usePermissions()
  const canManage = can("scratch-card.manage")

  const [draft, setDraft] = useState<SettingsDraft>(DEFAULT_SETTINGS_DRAFT)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!settings) return
    setDraft({
      dailyFreeScratches: settings.dailyFreeScratches,
      triggerMode: settings.triggerMode,
      firstTimeRewardEnabled: settings.firstTimeRewardEnabled,
      coverImageUrl: settings.coverImageUrl,
      coverImagePublicId: settings.coverImagePublicId,
    })
    setIsDirty(false)
  }, [settings])

  const patchDraft = (patch: Partial<SettingsDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setIsDirty(true)
  }

  const handleSave = () => {
    updateMutation.mutate(draft, { onSuccess: () => setIsDirty(false) })
  }

  if (isLoading || !settings) {
    return <LoadingSkeleton variant="table" />
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Card Settings</CardTitle>
          <CardDescription>
            How many scratch cards customers get automatically, and where the popup shows itself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="sc-daily">Daily Free Scratch Cards per User</Label>
            <Input
              id="sc-daily"
              type="number"
              min={0}
              value={draft.dailyFreeScratches}
              onChange={(e) => patchDraft({ dailyFreeScratches: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Granted automatically the first time each customer opens a card each day. Set to 0
              to rely entirely on milestone/manual grants. Unused cards roll over — they don&apos;t
              expire at midnight, and stack with milestone or manually-granted cards.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Popup Trigger</Label>
            <Select
              value={draft.triggerMode}
              onValueChange={(v) => patchDraft({ triggerMode: v as ScratchTriggerMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALWAYS_ON_LOGIN">Always — once per session for every logged-in user</SelectItem>
                <SelectItem value="MILESTONE_ONLY">Only when a scratch card is actually available</SelectItem>
                <SelectItem value="MANUAL_ONLY">Never — Profile menu only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The &quot;Scratch Card&quot; tile in the customer&apos;s Profile always opens it on demand
              regardless of this setting — this only controls the automatic popup.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Guaranteed First-Time Reward</Label>
              <p className="text-xs text-muted-foreground max-w-md">
                A brand-new customer&apos;s very first scratch ever always wins a real prize from the
                First-Time Reward tab instead of the normal odds. Off falls back to normal odds for
                every scratch, first-ever or not.
              </p>
            </div>
            <Switch
              checked={draft.firstTimeRewardEnabled}
              onCheckedChange={(v) => patchDraft({ firstTimeRewardEnabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Card Appearance</CardTitle>
          <CardDescription>
            The foil image customers scratch away to reveal their prize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScratchAppearanceCard draft={draft} onChange={patchDraft} canManage={canManage} />
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!isDirty || updateMutation.isPending} className="min-w-[140px]">
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// History tab
// ═══════════════════════════════════════════════════════════════════════

const REWARD_STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ISSUED: { label: "Issued", variant: "default" },
  FAILED: { label: "Failed — needs manual fix", variant: "destructive" },
  N_A: { label: "—", variant: "outline" },
}

function HistoryTab() {
  const { data, isLoading } = useScratchHistory({ limit: 50 })

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Prize</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Reward</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : !data || data.entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <EmptyState
                  icon={<HistoryIcon className="h-6 w-6 text-muted-foreground" />}
                  title="No scratches yet"
                  description="Every scratch card a customer opens shows up here."
                />
              </TableCell>
            </TableRow>
          ) : (
            data.entries.map((entry) => {
              const badge = REWARD_STATUS_BADGE[entry.rewardStatus] ?? REWARD_STATUS_BADGE.N_A
              return (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {entry.userName ?? "Unnamed"}
                    <div className="text-xs text-muted-foreground">{entry.userPhone}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.prizeLabel}
                    {entry.isFirstTimeReward && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        First-time
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.isWin ? "secondary" : "outline"} className="text-[10px]">
                      {entry.isWin ? "Won" : "Better luck"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant} className="text-[10px]">
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(entry.scratchedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════

function ScratchCardContent() {
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  const { can } = usePermissions()
  const canManage = can("scratch-card.manage")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scratch Card"
        subtitle="The GPay/PhonePe-style scratch-to-reveal card customers see in the app — its prizes, odds, scratch credits, and where the popup appears"
      >
        {canManage && (
          <Button variant="outline" onClick={() => setGrantDialogOpen(true)} size="sm">
            <Gift className="h-4 w-4 mr-1.5" /> Grant Scratch Cards
          </Button>
        )}
      </PageHeader>

      <Tabs defaultValue="prizes">
        <TabsList>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
          <TabsTrigger value="first-time">First-Time Reward</TabsTrigger>
          <TabsTrigger value="milestones">Milestone Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="prizes" className="mt-4">
          <PrizesTab />
        </TabsContent>
        <TabsContent value="first-time" className="mt-4">
          <FirstTimeTab />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <MilestonesTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>
      </Tabs>

      <GrantScratchesDialog open={grantDialogOpen} onClose={() => setGrantDialogOpen(false)} />
    </div>
  )
}

export default function ScratchCardPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <ScratchCardContent />
    </Suspense>
  )
}
