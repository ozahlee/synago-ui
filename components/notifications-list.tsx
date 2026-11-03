"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Bell, AlertCircle, Trash2, Archive, Star, Info, CheckCircle2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { refreshNotifications } from "@/components/notifications-content"
import { runAction } from "@/components/form"
import { del, patch, qs, usePaginated } from "@/lib/api"
import type { Notification } from "@/lib/types"

const FILTER_PARAMS: Record<string, Record<string, string>> = {
  all: {},
  unread: { read: "0" },
  important: { important: "1" },
  archived: { archived: "1" },
}

type NotificationsListProps = {
  filter: string
}

export function NotificationsList({ filter }: NotificationsListProps) {
  const { rows: filteredNotifications, isLoading } = usePaginated<Notification>(
    qs("/notifications", { ...FILTER_PARAMS[filter], perPage: 50 }),
  )

  const update = async (n: Notification, changes: Partial<Pick<Notification, "read" | "important" | "archived">>, msg: string) => {
    if (await runAction(() => patch(`/notifications/${n.id}`, changes), msg)) refreshNotifications()
  }

  const getIcon = (type: string) => {
    const icons = {
      info: <Info className="h-5 w-5" />,
      success: <CheckCircle2 className="h-5 w-5" />,
      warning: <AlertCircle className="h-5 w-5" />,
      error: <AlertCircle className="h-5 w-5" />,
    }
    return icons[type as keyof typeof icons] || <Bell className="h-5 w-5" />
  }

  const getTypeColor = (type: string) => {
    const colors = {
      info: "bg-info/10 text-info border-info/20",
      success: "bg-success/10 text-success border-success/20",
      warning: "bg-warning/12 text-warning border-warning/25",
      error: "bg-destructive/10 text-destructive border-destructive/20",
    }
    return colors[type as keyof typeof colors] || ""
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse flex gap-4">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        filteredNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`transition-colors ${!notification.read ? "bg-accent/5 border-accent/20 cursor-pointer" : ""}`}
            onClick={() => !notification.read && update(notification, { read: true }, "Marked as read")}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${getTypeColor(notification.type)}`}
                >
                  {getIcon(notification.type)}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{notification.title}</h4>
                        {notification.important && <Star className="h-4 w-4 text-gold fill-gold" />}
                        {!notification.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() =>
                            update(notification, { read: !notification.read }, notification.read ? "Marked unread" : "Marked as read")
                          }
                        >
                          <Bell className="mr-2 h-4 w-4" />
                          {notification.read ? "Mark Unread" : "Mark Read"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            update(notification, { archived: !notification.archived }, notification.archived ? "Restored" : "Archived")
                          }
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          {notification.archived ? "Unarchive" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            update(notification, { important: !notification.important }, notification.important ? "Unstarred" : "Marked important")
                          }
                        >
                          <Star className="mr-2 h-4 w-4" />
                          {notification.important ? "Remove Important" : "Mark Important"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={async () => {
                            if (await runAction(() => del(`/notifications/${notification.id}`), "Notification deleted")) refreshNotifications()
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {notification.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(notification.date)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
