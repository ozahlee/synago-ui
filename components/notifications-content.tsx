"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Plus, CheckCheck } from "lucide-react"
import { NotificationsList } from "@/components/notifications-list"
import { NotificationFormDialog } from "@/components/notification-form-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { runAction } from "@/components/form"
import { post } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Page, PageHeader } from "@/components/page"

export const refreshNotifications = () => mutate((key) => typeof key === "string" && key.startsWith("/notifications"))

export function NotificationsContent() {
  const { can } = useAuth()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  return (
    <Page className="max-w-4xl">
      <PageHeader
        eyebrow="Office"
        title="Notifications"
        description="Announcements and alerts for the church staff."
        actions={
        <>
          <Button
            variant="outline"
            onClick={async () => {
              if (await runAction(() => post("/notifications/read-all"), "All marked as read")) refreshNotifications()
            }}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
          {can("alerts.manage") && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="size-4" />
              New notification
            </Button>
          )}
        </>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="important">Important</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <NotificationsList filter={activeTab} />
        </TabsContent>
      </Tabs>

      <NotificationFormDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </Page>
  )
}
