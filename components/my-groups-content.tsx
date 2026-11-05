"use client"

import { LayoutGrid, Phone, School, UsersRound, Home, CalendarDays, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState, Page, PageHeader, PersonAvatar } from "@/components/page"
import { ClassRegister } from "@/components/class-register"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { MyGroup } from "@/lib/types"

const ICON = { sunday_school_class: School, ministry: UsersRound, cell_group: Home } as const
const KIND = { sunday_school_class: "Sunday school class", ministry: "Ministry", cell_group: "Cell group" } as const

export function MyGroupsContent() {
  const { user } = useAuth()
  const { data, isLoading } = useApi<{ groups: MyGroup[]; linked: boolean }>("/me/groups")

  return (
    <Page className="max-w-5xl">
      <PageHeader
        eyebrow="Leading"
        title="My groups"
        description={`The class, ministry or cell you lead${user ? `, ${user.name.split(" ")[0]}` : ""}: your people, their contacts and the register.`}
      />

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      ) : !data?.linked ? (
        <Card className="py-0">
          <EmptyState icon={Info} title="Your login isn't linked to a member" description="Ask the church office to give you a login from your position (Positions → Give login)." />
        </Card>
      ) : data.groups.length === 0 ? (
        <Card className="py-0">
          <EmptyState icon={LayoutGrid} title="You don't lead a group right now" description="When the office records you as a teacher, chairperson or cell leader, it appears here." />
        </Card>
      ) : (
        <Tabs defaultValue={`${data.groups[0].type}-${data.groups[0].id}`} className="gap-5">
          {data.groups.length > 1 && (
            <TabsList className="max-w-full overflow-x-auto">
              {data.groups.map((g) => (
                <TabsTrigger key={`${g.type}-${g.id}`} value={`${g.type}-${g.id}`}>{g.name}</TabsTrigger>
              ))}
            </TabsList>
          )}
          {data.groups.map((g) => {
            const Icon = ICON[g.type]
            return (
              <TabsContent key={`${g.type}-${g.id}`} value={`${g.type}-${g.id}`} className="space-y-5">
                <Card className="flex-row items-center gap-4 p-5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold">{g.name}</h2>
                    <p className="text-sm text-muted-foreground">{[KIND[g.type], g.subtitle].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Badge variant="gold">{g.positionTitle}</Badge>
                </Card>

                {g.type === "sunday_school_class" && (
                  <Card>
                    <CardHeader><CardTitle>Register</CardTitle><CardDescription>Tick the children who came, then save.</CardDescription></CardHeader>
                    <CardContent><ClassRegister classId={g.id} pupils={g.people.map((p) => ({ id: p.id, name: p.name, age: p.age, parent: p.parent, gender: (p as { gender?: string }).gender }))} canEdit /></CardContent>
                  </Card>
                )}

                {g.activities && g.activities.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Activities</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {g.activities.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                          <CalendarDays className="size-4 text-muted-foreground" />
                          <span className="flex-1 font-medium">{a.title}</span>
                          <span className="text-muted-foreground">{a.scheduledAt ? new Date(a.scheduledAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Not scheduled"}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card className="gap-0 py-0">
                  <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="text-lg font-semibold">{g.type === "sunday_school_class" ? "Children & parents" : "Members"}</h3>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold tabular">{g.people.length}</span>
                  </div>
                  <ul className="divide-y">
                    {g.people.map((p) => {
                      const phone = g.type === "sunday_school_class" ? p.parentPhone : p.phone
                      return (
                        <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                          <PersonAvatar name={p.name} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {g.type === "sunday_school_class"
                                ? [p.age !== null ? `${p.age} yrs` : null, p.parent ? `Parent: ${p.parent}` : null].filter(Boolean).join(" · ")
                                : [p.pledgeNumber, p.phone].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          {phone && <Button variant="outline" size="sm" asChild><a href={`tel:${phone}`}><Phone className="size-4" /> Call</a></Button>}
                        </li>
                      )
                    })}
                    {g.people.length === 0 && <li className="px-6 py-6 text-sm text-muted-foreground">Nobody here yet.</li>}
                  </ul>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </Page>
  )
}
