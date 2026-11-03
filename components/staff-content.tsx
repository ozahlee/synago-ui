"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Check, MoreHorizontal, Plus, Pencil, Power, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { del, patch, post, put, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { PERMISSION_LABELS, ROLE_BLURB } from "@/lib/permissions"
import type { Role, User } from "@/lib/types"

const BUILT_IN = ["admin", "pastor", "secretary", "treasurer", "leader"]

const refreshStaff = () => mutate((key) => typeof key === "string" && (key.startsWith("/users") || key === "/roles"))

export function StaffContent() {
  const { user: me } = useAuth()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<User | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "delete" | null>(null)
  const { rows, meta, isLoading } = usePaginated<User>(qs("/users", { page, perPage: 20 }))
  const { data: roles = [] } = useApi<Role[]>("/roles")

  const [roleDialog, setRoleDialog] = useState(false)
  const togglePermission = async (r: Role, perm: string, on: boolean) => {
    const permissions = on ? [...r.permissions, perm] : r.permissions.filter((x) => x !== perm)
    mutate("/roles", (cur?: { data: Role[] }) => cur && { data: cur.data.map((x) => (x.name === r.name ? { ...x, permissions } : x)) }, false)
    if (!(await runAction(() => put(`/roles/${encodeURIComponent(r.name)}`, { permissions }), `${r.name}: ${on ? "allowed" : "removed"}`))) refreshStaff()
  }

  const toggleActive = async (u: User) => {
    if (await runAction(() => patch(`/users/${u.id}`, { isActive: !u.isActive }), u.isActive ? `${u.name} can no longer sign in` : `${u.name} can sign in again`))
      refreshStaff()
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Administration"
        title="Staff & access"
        description="Who can sign in to the church office, and what each role is allowed to do."
        actions={
          <Button onClick={() => setDialog("new")}>
            <UserPlus className="size-4" /> Add staff
          </Button>
        }
      />

      <TableCard title="Staff accounts" count={meta?.total} footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}>
        {isLoading && !meta ? (
          <TableSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No staff accounts" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sign-in</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id} className={u.isActive ? "" : "opacity-60"}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={u.name} />
                      <div>
                        <p className="font-semibold">
                          {u.name} {u.id === me?.id && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{u.phone ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length ? (
                        u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "gold" : "outline"} className="capitalize">
                            {r}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No role</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Disabled</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => (setSelected(u), setDialog("edit"))}>
                          <Pencil className="size-4" /> Edit & roles
                        </DropdownMenuItem>
                        {u.id !== me?.id && (
                          <>
                            <DropdownMenuItem onClick={() => toggleActive(u)}>
                              <Power className="size-4" /> {u.isActive ? "Disable sign-in" : "Enable sign-in"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => (setSelected(u), setDialog("delete"))}>
                              <Trash2 className="size-4" /> Delete account
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> What each role can do
          </CardTitle>
          <CardDescription>Tick to change what a role can do; changes apply immediately. Admin always has everything. Give someone several roles if they need more.</CardDescription>
          <Button size="sm" variant="outline" className="mt-2 w-fit" onClick={() => setRoleDialog(true)}><Plus className="size-4" /> New role</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                {roles.map((r) => (
                  <TableHead key={r.name} className="text-center capitalize">
                    {r.name}
                    <span className="block text-[10px] font-normal normal-case tracking-normal">{r.users} {r.users === 1 ? "person" : "people"}</span>
                    {!BUILT_IN.includes(r.name) && r.users === 0 && (
                      <button type="button" className="text-[10px] font-normal normal-case tracking-normal text-destructive hover:underline"
                        onClick={async () => { if (await runAction(() => del(`/roles/${encodeURIComponent(r.name)}`), `Role “${r.name}” deleted`)) refreshStaff() }}>
                        delete
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(PERMISSION_LABELS).map(([key, p]) => (
                <TableRow key={key}>
                  <TableCell>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.area}</p>
                  </TableCell>
                  {roles.map((r) => (
                    <TableCell key={r.name} className="text-center">
                      {r.name === "admin" ? (
                        <Check className="mx-auto size-4 text-success" aria-label="Allowed (admin)" />
                      ) : (
                        <Checkbox
                          checked={r.permissions.includes(key)}
                          aria-label={`${r.name}: ${p.label}`}
                          onCheckedChange={(c) => togglePermission(r, key, c === true)}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StaffDialog key="new" roles={roles} open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      <NewRoleDialog open={roleDialog} onOpenChange={setRoleDialog} />
      {selected && (
        <>
          <StaffDialog key={`edit-${selected.id}`} user={selected} roles={roles} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete staff account"
            description={
              <>
                Delete <span className="font-semibold">{selected.name}</span>&apos;s account? They are signed out immediately. Records
                they created are kept. To pause access instead, disable sign-in.
              </>
            }
            onConfirm={async () => {
              const ok = await runAction(() => del(`/users/${selected.id}`), "Account deleted")
              if (ok) refreshStaff()
              return ok
            }}
          />
        </>
      )}
    </Page>
  )
}

function StaffDialog({ user, roles, open, onOpenChange }: { user?: User; roles: Role[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const isEdit = !!user
  const [picked, setPicked] = useState<string[]>(user?.roles ?? [])

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const password = str(fd, "password")
    const body = {
      name: str(fd, "name"),
      email: str(fd, "email"),
      phone: str(fd, "phone"),
      roles: picked,
      ...(password ? { password } : {}),
    }
    if (isEdit) await patch(`/users/${user.id}`, body)
    else await post("/users", body)
    refreshStaff()
    onOpenChange(false)
  }, isEdit ? "Staff account updated" : "Staff account created")

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${user.name}` : "Add a staff member"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Change their details or roles. Leave the password blank to keep it." : "They sign in with this email and password. Share the password with them privately."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="s-name">Full name</Label>
              <Input id="s-name" name="name" defaultValue={user?.name} required />
              <FieldError error={error} name="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" name="email" type="email" defaultValue={user?.email} required />
              <FieldError error={error} name="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">Phone</Label>
              <Input id="s-phone" name="phone" type="tel" defaultValue={user?.phone ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="s-pass">{isEdit ? "New password (optional)" : "Password"}</Label>
              <Input id="s-pass" name="password" type="password" autoComplete="new-password" minLength={8} required={!isEdit} />
              <FieldError error={error} name="password" />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Roles</legend>
            {roles.map((r) => (
              <label key={r.name} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/5">
                <Checkbox
                  checked={picked.includes(r.name)}
                  onCheckedChange={(c) => setPicked((p) => (c ? [...p, r.name] : p.filter((x) => x !== r.name)))}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-semibold capitalize">{r.name}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE_BLURB[r.name] ?? `${r.permissions.length} permissions`}</span>
                </span>
              </label>
            ))}
            <FieldError error={error} name="roles" />
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [picked, setPicked] = useState<string[]>(["members.view"])
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    await post("/roles", { name: str(fd, "name")?.toLowerCase(), permissions: picked })
    refreshStaff()
    onOpenChange(false)
  }, "Role created")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>New role</DialogTitle><DialogDescription>e.g. “sunday school coordinator” or “auditor”. Choose what it may do.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="r-name">Name</Label><Input id="r-name" name="name" required placeholder="sunday school coordinator" /><FieldError error={error} name="name" /></div>
          <div className="grid gap-2">
            {Object.entries(PERMISSION_LABELS).map(([key, p]) => (
              <label key={key} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/5">
                <Checkbox checked={picked.includes(key)} onCheckedChange={(c) => setPicked((x) => (c ? [...x, key] : x.filter((y) => y !== key)))} />
                <span className="flex-1">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.area}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create role"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
