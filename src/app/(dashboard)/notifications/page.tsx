"use client"

import { Suspense, useState } from "react"
import {
  Bell,
  Plus,
  Send,
  CalendarClock,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Megaphone,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { TemplateDialog } from "@/components/notifications/TemplateDialog"
import { CampaignDialog } from "@/components/notifications/CampaignDialog"
import {
  useTemplates,
  useDeleteTemplate,
  useCampaigns,
} from "@/hooks/useNotifications"
import type { NotificationTemplate } from "@/types/notification.types"
import { usePermissions } from "@/hooks/usePermissions"

type ActiveTab = "templates" | "campaigns"

const STATUS_COLOR: Record<string, string> = {
  QUEUED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  SENDING: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  SENT: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  SCHEDULED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  CANCELLED: "bg-muted text-muted-foreground",
}

const TYPE_COLOR: Record<string, string> = {
  PUSH: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  SMS: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  EMAIL: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  IN_APP: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
}

function NotificationsContent() {
  const [tab, setTab] = useState<ActiveTab>("templates")
  const [templateOpen, setTemplateOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<NotificationTemplate | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [campaignPage, setCampaignPage] = useState(1)

  const { data: templates, isLoading: templatesLoading } = useTemplates()
  const { data: campaignData, isLoading: campaignsLoading } = useCampaigns(campaignPage)
  const deleteMutation = useDeleteTemplate()
  const { can } = usePermissions()
  const canManage = can("notifications.manage")

  const campaigns = campaignData?.campaigns ?? []
  const totalCampaigns = campaignData?.total ?? 0
  const totalCampaignPages = Math.ceil(totalCampaigns / 20) || 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Manage templates, send push notifications, and schedule campaigns"
      >
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              {tab === "templates" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditTemplate(null)
                    setTemplateOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> New Template
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setScheduleOpen(true)}>
                    <CalendarClock className="h-4 w-4 mr-1.5" /> Schedule
                  </Button>
                  <Button size="sm" onClick={() => setSendOpen(true)}>
                    <Send className="h-4 w-4 mr-1.5" /> Send Now
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </PageHeader>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ActiveTab)}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Templates Tab */}
      {tab === "templates" && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Title</TableHead>
                <TableHead className="hidden lg:table-cell">Variables</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templatesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !templates?.length ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                      title="No templates"
                      description="Create your first notification template to get started."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => {
                  let vars: string[] = []
                  try {
                    vars = JSON.parse(t.variables || "[]")
                  } catch {
                    /* empty */
                  }
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={TYPE_COLOR[t.type] ?? ""}
                        >
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {t.title}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {vars.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {vars.map((v) => (
                              <Badge key={v} variant="outline" className="text-xs font-mono">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditTemplate(t)
                                setTemplateOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteMutation.mutate(t.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Campaigns Tab */}
      {tab === "campaigns" && (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Sent</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Opened</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState
                        icon={<Bell className="h-6 w-6 text-muted-foreground" />}
                        title="No campaigns"
                        description="Send your first bulk notification or schedule a campaign."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{c.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {c.body}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {(c.target_type || c.segment || "all").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={STATUS_COLOR[c.status] ?? ""}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono text-sm">
                        {(c.sent_count ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right font-mono text-sm">
                        {(c.opened_count ?? 0).toLocaleString()}
                        {(c.sent_count ?? 0) > 0 && (c.opened_count ?? 0) > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(((c.opened_count ?? 0) / (c.sent_count ?? 1)) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {c.status === "SCHEDULED" && c.scheduled_at
                          ? new Date(c.scheduled_at).toLocaleDateString()
                          : new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalCampaignPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {campaignPage} of {totalCampaignPages} ({totalCampaigns} campaigns)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={campaignPage <= 1}
                  onClick={() => setCampaignPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={campaignPage >= totalCampaignPages}
                  onClick={() => setCampaignPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <TemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        template={editTemplate}
      />
      <CampaignDialog open={sendOpen} onOpenChange={setSendOpen} mode="send" />
      <CampaignDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        mode="schedule"
      />
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <NotificationsContent />
    </Suspense>
  )
}
