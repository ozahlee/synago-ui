"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Building2, Plus, MoreHorizontal, Pencil, Trash2, Phone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, TableCard, TableSkeleton } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { del, patch, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { humanize, money } from "@/lib/format"
import { ORGANISATION_TYPES, type Organisation } from "@/lib/types"

const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/organisations"))
const TYPE_LABEL: Record<Organisation["type"], string> = { company: "Company", ngo: "NGO", church: "Church / diocese", government: "Government", school: "School", other: "Other" }

export function OrganisationsContent() {
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const { data: rows = [], isLoading } = useApi<Organisation[]>("/organisations")
  const [editing, setEditing] = useState<Organisation | "new" | null>(null)
  const [removing, setRemoving] = useState<Organisation | null>(null)
  const total = rows.reduce((s, r) => s + r.given, 0)

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Organisations"
        description="Companies, NGOs, sister churches, schools and others who give toward church projects."
        actions={canManage && <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New organisation</Button>}
      />
      <TableCard title="Partners & donors" count={rows.length} actions={rows.length > 0 && <span className="text-sm text-muted-foreground">Given in total: <b className="text-foreground tabular">{money(total)}</b></span>}>
        {isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Building2} title="No organisations yet" description="Add one to record its contributions to a project." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Organisation</TableHead><TableHead className="hidden md:table-cell">Contact</TableHead><TableHead className="text-right">Gifts</TableHead><TableHead className="text-right">Given</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-4" /></span>
                      <div><div className="font-medium">{o.name}</div><Badge variant="outline" className="mt-0.5">{TYPE_LABEL[o.type]}</Badge></div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {o.contactName && <div>{o.contactName}</div>}
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {o.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{o.phone}</span>}
                      {o.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" />{o.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular">{o.contributions}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{money(o.given)}</TableCell>
                  <TableCell>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(o)}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" disabled={o.contributions > 0} onClick={() => setRemoving(o)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
      {editing && <OrganisationForm record={editing === "new" ? undefined : editing} open onOpenChange={(o) => !o && setEditing(null)} />}
      {removing && (
        <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Delete ${removing.name}?`} description="Only organisations without contributions can be deleted."
          onConfirm={async () => { const ok = await runAction(() => del(`/organisations/${removing.id}`), "Organisation deleted"); if (ok) refresh(); return ok }} />
      )}
    </Page>
  )
}

function OrganisationForm({ record, open, onOpenChange }: { record?: Organisation; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [type, setType] = useState<Organisation["type"]>(record?.type ?? "company")
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = { name: str(fd, "name"), type, contactName: str(fd, "contactName"), phone: str(fd, "phone"), email: str(fd, "email"), notes: str(fd, "notes") }
    if (record) await patch(`/organisations/${record.id}`, body)
    else await post("/organisations", body)
    refresh()
    onOpenChange(false)
  }, record ? "Organisation updated" : "Organisation added")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.name}` : "New organisation"}</DialogTitle><DialogDescription>Its contact person receives the thank-you SMS.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="og-n">Name</Label><Input id="og-n" name="name" defaultValue={record?.name} required /><FieldError error={error} name="name" /></div>
          <div className="space-y-2">
            <Label htmlFor="og-t">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as Organisation["type"])}>
              <SelectTrigger id="og-t" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{ORGANISATION_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t] ?? humanize(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="og-c">Contact person</Label><Input id="og-c" name="contactName" defaultValue={record?.contactName ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="og-p">Phone</Label><Input id="og-p" name="phone" type="tel" defaultValue={record?.phone ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="og-e">Email</Label><Input id="og-e" name="email" type="email" defaultValue={record?.email ?? ""} /><FieldError error={error} name="email" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="og-no">Notes</Label><Textarea id="og-no" name="notes" rows={2} defaultValue={record?.notes ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
