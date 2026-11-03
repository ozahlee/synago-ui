"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { MinistriesGrid } from "@/components/ministries-grid"
import { MinistryFormDialog } from "@/components/ministry-form-dialog"
import { useAuth } from "@/lib/auth"
import { Page, PageHeader } from "@/components/page"

export function MinistriesContent() {
  const { can } = useAuth()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Ministries"
        description="The groups that serve: choir, youth, mothers' union and more, with their leaders, members and gatherings."
        actions={
          can("ministries.manage") && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="size-4" />
              Add ministry
            </Button>
          )
        }
      />

      <MinistriesGrid />

      <MinistryFormDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </Page>
  )
}
