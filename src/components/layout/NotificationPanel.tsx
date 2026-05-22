"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useNotificationStore } from "@/store/notifications.store"
import { formatRelativeTime } from "@/lib/utils"

const TYPE_ICONS: Record<string, string> = {
  ORDER: "🛒",
  STOCK: "⚠️",
  PAYMENT: "💰",
  DELIVERY: "🚴",
  SYSTEM: "ℹ️",
}

export function NotificationPanel({ children }: { children: React.ReactNode }) {
  const { notifications, unreadCount, markAllRead } = useNotificationStore()

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold text-sm text-foreground">
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-500 hover:text-brand-600 h-7"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 border-b border-border hover:bg-muted transition-colors ${
                  !n.read ? "bg-brand-50/30" : ""
                }`}
              >
                <span className="text-lg shrink-0 mt-0.5">
                  {TYPE_ICONS[n.type] || "📌"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
