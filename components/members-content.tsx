"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, Search } from "lucide-react"
import { MembersTable } from "@/components/members-table"
import { MemberFormDialog } from "@/components/member-form-dialog"
import { Page, PageHeader } from "@/components/page"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"

/** Matches the backend's engagement segments (MemberEngagement::SEGMENTS). */
export const ENGAGEMENT = [
  { key: "new", label: "New", hint: "new (joined in the last 3 months)" },
  { key: "regular", label: "Regular", hint: "regular (seen in the last 4 weeks)" },
  { key: "occasional", label: "Occasional", hint: "occasional (last seen 4 to 8 weeks ago)" },
  { key: "drifting", label: "Drifting", hint: "drifting away (last seen 8 weeks to 6 months ago)" },
  { key: "lost", label: "Gone quiet", hint: "gone quiet (nothing for over 6 months)" },
  { key: "unknown", label: "No record", hint: "never recorded by name" },
] as const

export function MembersContent() {
  const { can } = useAuth()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterGender, setFilterGender] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [engagement, setEngagement] = useState("all")
  useUrlParam("engagement", (e) => ENGAGEMENT.some((x) => x.key === e) && setEngagement(e))

  useUrlParam("q", (q) => {
    setSearchInput(q)
    setFilterStatus("all")
    setFilterGender("all")
  })

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const toolbar = (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="relative sm:w-72">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Name, phone or pledge no…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 pl-9"
          aria-label="Search members"
        />
      </div>
      <div className="flex gap-2">
        <Select value={filterGender} onValueChange={setFilterGender}>
          <SelectTrigger size="sm" className="h-9 flex-1 sm:w-32" aria-label="Gender">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="male">Men</SelectItem>
            <SelectItem value="female">Women</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger size="sm" className="h-9 flex-1 sm:w-32" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={engagement} onValueChange={(v) => v && setEngagement(v)}>
          <SelectTrigger size="sm" className="h-9 flex-1 sm:w-40" aria-label="Engagement">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any engagement</SelectItem>
            {ENGAGEMENT.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Members"
        description="Everyone in the church family: contact details, ministries and where they live."
        actions={
          can("members.manage") && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="size-4" />
              Add member
            </Button>
          )
        }
      />

      {engagement !== "all" && (
        <p className="-mb-2 text-sm text-muted-foreground">
          Showing active members who are <b className="text-foreground">{ENGAGEMENT.find((e) => e.key === engagement)?.hint}</b>, going by giving, contributions and Sunday school recorded by name.{" "}
          <button type="button" className="text-primary hover:underline" onClick={() => setEngagement("all")}>Show everyone</button>
        </p>
      )}
      <MembersTable searchQuery={searchQuery} filterGender={filterGender} filterStatus={filterStatus} engagement={engagement} toolbar={toolbar} />

      <MemberFormDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </Page>
  )
}
