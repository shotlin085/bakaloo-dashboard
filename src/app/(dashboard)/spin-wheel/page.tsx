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

import { SpinPrizeDialog, SPIN_PRIZE_TYPE_LABELS } from "@/components/spin-wheel/SpinPrizeDialog"
import { SpinMilestoneRuleDialog } from "@/components/spin-wheel/SpinMilestoneRuleDialog"
import { GrantSpinsDialog } from "@/components/spin-wheel/GrantSpinsDialog"

import {
  useSpinPrizes,
  useDeleteSpinPrize,
  useReorderSpinPrizes,
  useSpinMilestoneRules,
  useDeleteSpinMilestoneRule,
  useSpinWheelSettings,
  useUpdateSpinWheelSettings,
  useSpinHistory,
} from "@/hooks/useSpinWheel"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatINR } from "@/lib/utils"
import type {
  SpinPrize,
  SpinMilestoneRule,
  SpinTriggerMode,
} from "@/types/spin-wheel.types"

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
  prize: SpinPrize
  canManage: boolean
  onEdit: (p: SpinPrize) => void
  onDelete: (p: SpinPrize) => void
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
      <TableCell className="text-sm text-muted-foreground">{SPIN_PRIZE_TYPE_LABELS[prize.type]}</TableCell>
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
  const { data: prizes, isLoading } = useSpinPrizes()
  const deleteMutation = useDeleteSpinPrize()
  const reorderMutation = useReorderSpinPrizes()
  const { can } = usePermissions()
  const canManage = can("spin-wheel.manage")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrize, setEditingPrize] = useState<SpinPrize | null>(null)

  const sorted = useMemo(
    () => [...(prizes ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [prizes]
  )
  const activePrizes = sorted.filter((p) => p.isActive)
  const totalProbability = Math.round(activePrizes.reduce((sum, p) => sum + p.winProbability, 0) * 100) / 100
  const isValidTotal = Math.abs(totalProbability - 100) < 0.01
  const isValidCount = activePrizes.length >= 2 && activePrizes.length <= 8
  const isWheelReady = isValidTotal && isValidCount

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
  const openEdit = (p: SpinPrize) => {
    setEditingPrize(p)
    setDialogOpen(true)
  }
  const handleDelete = (p: SpinPrize) => {
    if (confirm(`Delete "${p.label}"?`)) deleteMutation.mutate(p.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm flex items-center gap-2 flex-wrap",
            isWheelReady
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          <span className="font-medium">
            {activePrizes.length} active prize{activePrizes.length === 1 ? "" : "s"}
          </span>
          <span>·</span>
          <span className="font-medium">Total probability: {totalProbability}%</span>
          {!isValidTotal && <span>— must equal exactly 100% for the wheel to spin</span>}
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

      <SpinPrizeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} prize={editingPrize} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Milestones tab
// ═══════════════════════════════════════════════════════════════════════

function MilestonesTab() {
  const { data: rules, isLoading } = useSpinMilestoneRules()
  const deleteMutation = useDeleteSpinMilestoneRule()
  const { can } = usePermissions()
  const canManage = can("spin-wheel.manage")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<SpinMilestoneRule | null>(null)

  const openCreate = () => {
    setEditingRule(null)
    setDialogOpen(true)
  }
  const openEdit = (r: SpinMilestoneRule) => {
    setEditingRule(r)
    setDialogOpen(true)
  }
  const handleDelete = (r: SpinMilestoneRule) => {
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
                    description="e.g. every 5th delivered order grants 1 bonus spin"
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
                    {rule.bonusSpins} spin{rule.bonusSpins === 1 ? "" : "s"}
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

      <SpinMilestoneRuleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} rule={editingRule} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Settings tab
// ═══════════════════════════════════════════════════════════════════════

function SettingsTab() {
  const { data: settings, isLoading } = useSpinWheelSettings()
  const updateMutation = useUpdateSpinWheelSettings()
  const { can } = usePermissions()
  const canManage = can("spin-wheel.manage")

  const [draft, setDraft] = useState<{ dailyFreeSpins: number; triggerMode: SpinTriggerMode }>({
    dailyFreeSpins: 1,
    triggerMode: "ALWAYS_ON_LOGIN",
  })
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!settings) return
    setDraft({ dailyFreeSpins: settings.dailyFreeSpins, triggerMode: settings.triggerMode })
    setIsDirty(false)
  }, [settings])

  const handleSave = () => {
    updateMutation.mutate(draft, { onSuccess: () => setIsDirty(false) })
  }

  if (isLoading || !settings) {
    return <LoadingSkeleton variant="table" />
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Wheel Settings</CardTitle>
        <CardDescription>
          How many spins customers get automatically, and where the popup shows itself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="sw-daily">Daily Free Spins per User</Label>
          <Input
            id="sw-daily"
            type="number"
            min={0}
            value={draft.dailyFreeSpins}
            onChange={(e) => {
              setDraft((d) => ({ ...d, dailyFreeSpins: parseInt(e.target.value) || 0 }))
              setIsDirty(true)
            }}
          />
          <p className="text-xs text-muted-foreground">
            Granted automatically the first time each customer opens the wheel each day. Set to 0
            to rely entirely on milestone/manual grants. Unused spins roll over — they don&apos;t
            expire at midnight, and stack with milestone or manually-granted spins.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Popup Trigger</Label>
          <Select
            value={draft.triggerMode}
            onValueChange={(v) => {
              setDraft((d) => ({ ...d, triggerMode: v as SpinTriggerMode }))
              setIsDirty(true)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALWAYS_ON_LOGIN">Always — once per session for every logged-in user</SelectItem>
              <SelectItem value="MILESTONE_ONLY">Only when a spin is actually available</SelectItem>
              <SelectItem value="MANUAL_ONLY">Never — Profile menu only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The &quot;Spin &amp; Win&quot; tile in the customer&apos;s Profile always opens the wheel
            on demand regardless of this setting — this only controls the automatic popup.
          </p>
        </div>

        {canManage && (
          <div className="flex justify-end pt-2 border-t">
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
      </CardContent>
    </Card>
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
  const { data, isLoading } = useSpinHistory({ limit: 50 })

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
                  title="No spins yet"
                  description="Every spin a customer takes shows up here."
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
                  <TableCell className="text-sm">{entry.prizeLabel}</TableCell>
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
                    {new Date(entry.spunAt).toLocaleString()}
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

function SpinWheelContent() {
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  const { can } = usePermissions()
  const canManage = can("spin-wheel.manage")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spin & Win"
        subtitle="The prize wheel customers see in the app — its prizes, odds, spin credits, and where the popup appears"
      >
        {canManage && (
          <Button variant="outline" onClick={() => setGrantDialogOpen(true)} size="sm">
            <Gift className="h-4 w-4 mr-1.5" /> Grant Spins
          </Button>
        )}
      </PageHeader>

      <Tabs defaultValue="prizes">
        <TabsList>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
          <TabsTrigger value="milestones">Milestone Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="prizes" className="mt-4">
          <PrizesTab />
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

      <GrantSpinsDialog open={grantDialogOpen} onClose={() => setGrantDialogOpen(false)} />
    </div>
  )
}

export default function SpinWheelPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <SpinWheelContent />
    </Suspense>
  )
}
