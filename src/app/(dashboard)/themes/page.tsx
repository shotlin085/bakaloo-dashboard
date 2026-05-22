"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  Clock,
  Copy,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Palette,
  Pencil,
  Play,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useActivateTheme,
  useCancelSchedule,
  useCreateTheme,
  useDeleteTheme,
  useScheduleTheme,
  useThemes,
  useUpdateTheme,
} from "@/hooks/useThemes"
import { useThemeTabs } from "@/hooks/useThemeTabs"
import { formatDateTime, formatRelativeTime } from "@/lib/utils"
import type {
  Theme,
  ThemeStatus,
  ThemeStoreKey,
} from "@/types/theme.types"

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const

const statusStyles: Record<ThemeStatus, string> = {
  active: "border-emerald-200 bg-emerald-500/15 text-emerald-700",
  scheduled: "border-amber-200 bg-amber-500/15 text-amber-700",
  draft: "border-slate-200 bg-slate-500/15 text-slate-700",
  archived: "border-red-200 bg-red-500/15 text-red-700",
}

const storeOptions: Array<{ value: "all" | ThemeStoreKey; label: string }> = [
  { value: "all", label: "All stores" },
  { value: "zepto", label: "Zepto" },
  { value: "off_zone", label: "50% OFF Zone" },
  { value: "super_mall", label: "Super Mall" },
  { value: "cafe", label: "Cafe" },
]

const storeOrder: Array<ThemeStoreKey> = [
  "zepto",
  "off_zone",
  "super_mall",
  "cafe",
]

const storeLabelMap: Record<ThemeStoreKey, string> = {
  zepto: "Zepto",
  off_zone: "50% OFF Zone",
  super_mall: "Super Mall",
  cafe: "Cafe",
}

function formatDateTimeLocalValue(value: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 30 * 60 * 1000)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  date.setSeconds(0, 0)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function StatusBadge({
  status,
  scheduledAt,
}: {
  status: ThemeStatus
  scheduledAt: string | null
}) {
  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant="outline"
        className={`w-fit capitalize ${statusStyles[status] || statusStyles.draft}`}
      >
        {status}
      </Badge>
      {status === "scheduled" && scheduledAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(scheduledAt).toLocaleDateString()} at{" "}
          {new Date(scheduledAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  )
}

function ThemeListContent() {
  const router = useRouter()
  const { data: themes, isLoading } = useThemes()
  const { data: themeTabs } = useThemeTabs({ status: "active" })
  const activateThemeMutation = useActivateTheme()
  const createThemeMutation = useCreateTheme()
  const updateThemeMutation = useUpdateTheme()
  const scheduleThemeMutation = useScheduleTheme()
  const cancelScheduleMutation = useCancelSchedule()
  const deleteThemeMutation = useDeleteTheme()

  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null)
  const [scheduleDialogTheme, setScheduleDialogTheme] = useState<Theme | null>(
    null
  )
  const [scheduleAt, setScheduleAt] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState<"all" | ThemeStoreKey>("all")
  const [tabFilter, setTabFilter] = useState("all")

  const tabOptions = useMemo(() => {
    const visibleTabs = (themeTabs ?? [])
      .filter(
        (tab) => storeFilter === "all" || tab.store_key === storeFilter
      )
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))

    const dynamicOptions = visibleTabs.map((tab) => ({
      value: tab.id,
      label: `${tab.label} (${storeLabelMap[tab.store_key]})`,
    }))

    return [
      { value: "all", label: "All tabs" },
      ...dynamicOptions,
    ]
  }, [storeFilter, themeTabs])

  const filteredThemes = useMemo(() => {
    return [...(themes ?? [])]
      .filter((theme) => {
        if (storeFilter !== "all" && theme.store_key !== storeFilter) return false
        if (statusFilter !== "all" && theme.status !== statusFilter) return false
        if (tabFilter !== "all" && theme.tab_id !== tabFilter) return false
        return true
      })
      .sort((a, b) => {
        const aStoreIndex = a.store_key ? storeOrder.indexOf(a.store_key) : -1
        const bStoreIndex = b.store_key ? storeOrder.indexOf(b.store_key) : -1
        const aStore = aStoreIndex >= 0 ? aStoreIndex : 999
        const bStore = bStoreIndex >= 0 ? bStoreIndex : 999
        if (aStore !== bStore) return aStore - bStore

        const aOrder = a.tab_order ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.tab_order ?? Number.MAX_SAFE_INTEGER

        if (aOrder !== bOrder) return aOrder - bOrder

        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      })
  }, [storeFilter, statusFilter, tabFilter, themes])

  const hasFilters =
    statusFilter !== "all" || tabFilter !== "all" || storeFilter !== "all"

  const handleActivate = (theme: Theme) => {
    if (theme.is_active) return
    activateThemeMutation.mutate(theme.id)
  }

  const handleOpenScheduleDialog = (theme: Theme) => {
    setScheduleDialogTheme(theme)
    setScheduleAt(formatDateTimeLocalValue(theme.scheduled_at))
  }

  const handleScheduleTheme = () => {
    if (!scheduleDialogTheme || !scheduleAt) return

    scheduleThemeMutation.mutate(
      {
        id: scheduleDialogTheme.id,
        payload: {
          scheduled_at: new Date(scheduleAt).toISOString(),
        },
      },
      {
        onSuccess: () => {
          setScheduleDialogTheme(null)
          setScheduleAt("")
        },
      }
    )
  }

  const handleDuplicateAsVariantB = (theme: Theme) => {
    createThemeMutation.mutate(
      {
        name: `${theme.name} Variant B`,
        theme_data: theme.theme_data,
        tab_id: theme.tab_id ?? undefined,
        status: "draft",
        ab_variant: "B",
        ab_split_percent:
          theme.ab_split_percent >= 100 ? 50 : theme.ab_split_percent,
      },
      {
        onSuccess: (createdTheme) => router.push(`/themes/${createdTheme.id}`),
      }
    )
  }

  const handleArchiveTheme = (theme: Theme) => {
    if (theme.is_active || theme.status === "scheduled") return

    updateThemeMutation.mutate({
      id: theme.id,
      payload: { status: "archived" },
    })
  }

  const handleConfirmDelete = () => {
    if (!themeToDelete || themeToDelete.is_active) return
    deleteThemeMutation.mutate(themeToDelete.id, {
      onSettled: () => setThemeToDelete(null),
    })
  }

  const clearFilters = () => {
    setStatusFilter("all")
    setStoreFilter("all")
    setTabFilter("all")
  }

  const handleStoreFilterChange = (value: "all" | ThemeStoreKey) => {
    setStoreFilter(value)
    setTabFilter("all")
  }

  const renderThemeActions = (theme: Theme) => {
    const isActivating =
      activateThemeMutation.isPending &&
      activateThemeMutation.variables === theme.id
    const isCancellingSchedule =
      cancelScheduleMutation.isPending &&
      cancelScheduleMutation.variables === theme.id
    const isDeleting =
      deleteThemeMutation.isPending &&
      deleteThemeMutation.variables === theme.id
    const isArchiving =
      updateThemeMutation.isPending &&
      updateThemeMutation.variables?.id === theme.id &&
      updateThemeMutation.variables?.payload?.status === "archived"
    const isDuplicating =
      createThemeMutation.isPending &&
      createThemeMutation.variables?.tab_id === theme.tab_id &&
      createThemeMutation.variables?.ab_variant === "B"

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/themes/${theme.id}`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>

          {!theme.is_active && (
            <DropdownMenuItem
              disabled={activateThemeMutation.isPending}
              onClick={() => handleActivate(theme)}
            >
              {isActivating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Activate
            </DropdownMenuItem>
          )}

          {theme.status === "active" && (
            <DropdownMenuItem onClick={() => handleOpenScheduleDialog(theme)}>
              <Clock className="mr-2 h-4 w-4" />
              Schedule
            </DropdownMenuItem>
          )}

          {theme.status === "scheduled" && (
            <DropdownMenuItem
              disabled={cancelScheduleMutation.isPending}
              onClick={() => cancelScheduleMutation.mutate(theme.id)}
            >
              {isCancellingSchedule ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel Schedule
            </DropdownMenuItem>
          )}

          {theme.ab_variant !== "B" && (
            <DropdownMenuItem
              disabled={createThemeMutation.isPending}
              onClick={() => handleDuplicateAsVariantB(theme)}
            >
              {isDuplicating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Duplicate as Variant B
            </DropdownMenuItem>
          )}

          {theme.status !== "archived" && (
            <DropdownMenuItem
              disabled={theme.is_active || theme.status === "scheduled"}
              onClick={() => handleArchiveTheme(theme)}
            >
              {isArchiving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              Archive
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive"
            disabled={theme.is_active || deleteThemeMutation.isPending}
            onClick={() => setThemeToDelete(theme)}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Theme Modification"
        subtitle="Manage your app's visual appearance. Create seasonal themes and activate them to push changes to all users instantly."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/themes/builder")}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Section Builder
          </Button>
          <Button onClick={() => router.push("/themes/new")}>
            <Plus className="h-4 w-4" />
            Create New Theme
          </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <LoadingSkeleton variant="table" count={6} />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Theme Library</CardTitle>
            <CardDescription>
              Review tab themes, manage scheduling, and keep A/B variants ready
              for launch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(themes?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<Palette className="h-6 w-6 text-muted-foreground" />}
                title="No themes found"
                description="Create your first seasonal theme to start managing the app appearance."
                actionLabel="Create New Theme"
                onAction={() => router.push("/themes/new")}
                className="py-16"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex flex-wrap gap-2">
                    {storeOptions.map((option) => {
                      const active = storeFilter === option.value
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={active ? "default" : "outline"}
                          onClick={() => handleStoreFilterChange(option.value)}
                        >
                          {option.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Theme Tab</Label>
                  <Select value={tabFilter} onValueChange={setTabFilter}>
                    <SelectTrigger className="w-full sm:w-[320px]">
                      <SelectValue placeholder="All tabs" />
                    </SelectTrigger>
                    <SelectContent>
                      {tabOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredThemes.length === 0 ? (
                  <EmptyState
                    icon={<Palette className="h-6 w-6 text-muted-foreground" />}
                    title="No matching themes"
                    description="Try a different store, status, or tab filter to see more themes."
                    actionLabel={hasFilters ? "Clear Filters" : undefined}
                    onAction={hasFilters ? clearFilters : undefined}
                    className="rounded-lg border border-dashed py-14"
                  />
                ) : (
                  <>
                    <div className="hidden rounded-lg border bg-background md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Tab</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Version</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredThemes.map((theme) => (
                            <TableRow key={theme.id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">
                                      {theme.name}
                                    </span>
                                    {theme.ab_variant === "B" && (
                                      <Badge variant="secondary" className="text-xs">
                                        A/B
                                      </Badge>
                                    )}
                                    {theme.is_active && (
                                      <Badge
                                        variant="outline"
                                        className="border-sky-200 bg-sky-50 text-xs text-sky-700"
                                      >
                                        Live
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Updated {formatDateTime(theme.updated_at)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {theme.store_key ? (
                                  <Badge variant="secondary" className="capitalize">
                                    {storeLabelMap[theme.store_key]}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {theme.tab_key ? (
                                  <div className="space-y-1">
                                    <Badge variant="outline" className="capitalize">
                                      {theme.tab_label ?? theme.tab_key}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground">
                                      {theme.tab_key}
                                      {theme.tab_id ? ` • ${theme.tab_id.slice(0, 8)}...` : ""}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={theme.status}
                                  scheduledAt={theme.scheduled_at}
                                />
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm text-muted-foreground">
                                  v{theme.version}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end">
                                  {renderThemeActions(theme)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="grid gap-3 md:hidden">
                      {filteredThemes.map((theme) => (
                        <Card key={theme.id} className="border-border/70">
                          <CardContent className="space-y-4 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-foreground">
                                    {theme.name}
                                  </p>
                                  {theme.ab_variant === "B" && (
                                    <Badge variant="secondary" className="text-xs">
                                      A/B
                                    </Badge>
                                  )}
                                  {theme.is_active && (
                                    <Badge
                                      variant="outline"
                                      className="border-sky-200 bg-sky-50 text-xs text-sky-700"
                                    >
                                      Live
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatRelativeTime(theme.updated_at)}
                                </p>
                              </div>
                              {renderThemeActions(theme)}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {theme.store_key ? (
                                <Badge variant="secondary" className="capitalize">
                                  {storeLabelMap[theme.store_key]}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No store</Badge>
                              )}
                              {theme.tab_key ? (
                                <Badge variant="outline" className="capitalize">
                                  {theme.tab_label ?? theme.tab_key}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No tab</Badge>
                              )}
                              {theme.tab_id && (
                                <Badge variant="outline" className="font-mono">
                                  {theme.tab_id.slice(0, 8)}...
                                </Badge>
                              )}
                              <Badge variant="outline" className="font-mono">
                                v{theme.version}
                              </Badge>
                            </div>

                            <StatusBadge
                              status={theme.status}
                              scheduledAt={theme.scheduled_at}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!scheduleDialogTheme}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleDialogTheme(null)
            setScheduleAt("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule theme</DialogTitle>
            <DialogDescription>
              Choose when {scheduleDialogTheme?.name} should go live again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="theme-schedule-at">Activation time</Label>
            <Input
              id="theme-schedule-at"
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              min={formatDateTimeLocalValue(new Date().toISOString())}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setScheduleDialogTheme(null)
                setScheduleAt("")
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!scheduleDialogTheme || !scheduleAt || scheduleThemeMutation.isPending}
              onClick={handleScheduleTheme}
            >
              {scheduleThemeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!themeToDelete}
        onOpenChange={(open) => {
          if (!open) setThemeToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete theme?</DialogTitle>
            <DialogDescription>
              {themeToDelete?.is_active
                ? "Active themes cannot be deleted. Activate another theme first."
                : `This will permanently delete "${themeToDelete?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThemeToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                !themeToDelete ||
                themeToDelete.is_active ||
                deleteThemeMutation.isPending
              }
              onClick={handleConfirmDelete}
            >
              {deleteThemeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ThemesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" count={6} />}>
      <ThemeListContent />
    </Suspense>
  )
}
