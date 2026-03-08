"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, MoreHorizontal, Trash2, Users, Shield, UserCog, User, Search } from "lucide-react"
import { createUser, deleteUser, fetchUsers, formatDateTime, updateUser } from "@/lib/aetherscan-client"

type SystemUser = Awaited<ReturnType<typeof fetchUsers>>[number]
type UserRole = "admin" | "engineer" | "technician"

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  admin: { label: "Administrator", color: "bg-red-100 text-red-700 border-red-200", icon: Shield },
  engineer: { label: "Network Engineer", color: "bg-blue-100 text-blue-700 border-blue-200", icon: UserCog },
  technician: { label: "Technician/Intern", color: "bg-green-100 text-green-700 border-green-200", icon: User },
}

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", email: "", role: "technician", password: "", department: "" })

  const loadUsers = async () => {
    try {
      setUsers(await fetchUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  }), [users, searchTerm, roleFilter])

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and access permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Add User</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Create New User</DialogTitle><DialogDescription>Add a new user to the AetherScan system</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="department">Department</Label><Input id="department" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} /></div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="engineer">Network Engineer</SelectItem>
                    <SelectItem value="technician">Technician/Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="password">Temporary Password</Label><Input id="password" type="password" value={form.password} placeholder="Set initial password" onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button disabled={!form.password} onClick={async () => {
                await createUser(form)
                setIsDialogOpen(false)
                setForm({ name: "", email: "", role: "technician", password: "", department: "" })
                await loadUsers()
              }}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle><Users className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{users.length}</div><p className="text-xs text-muted-foreground">Registered accounts</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Administrators</CardTitle><Shield className="size-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</div><p className="text-xs text-muted-foreground">Full access</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Engineers</CardTitle><UserCog className="size-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{users.filter((u) => u.role === "engineer").length}</div><p className="text-xs text-muted-foreground">Scan management</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Technicians</CardTitle><User className="size-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{users.filter((u) => u.role === "technician").length}</div><p className="text-xs text-muted-foreground">View & remediate</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
            <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by role" /></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem><SelectItem value="admin">Administrator</SelectItem><SelectItem value="engineer">Network Engineer</SelectItem><SelectItem value="technician">Technician/Intern</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Users</CardTitle><CardDescription>{filteredUsers.length} user{filteredUsers.length !== 1 && "s"} found</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Department</TableHead><TableHead>Last Login</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const config = roleConfig[user.role as UserRole]
                const RoleIcon = config.icon
                return (
                  <TableRow key={user.id}>
                    <TableCell><div className="flex items-center gap-3"><Avatar><AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(user.name)}</AvatarFallback></Avatar><div><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div></div></TableCell>
                    <TableCell><Badge variant="outline" className={config.color}><RoleIcon className="mr-1 size-3" />{config.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={user.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}>{user.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{user.department || "N/A"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(user.lastLoginAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /><span className="sr-only">Actions</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={async () => { await updateUser(user.id, { status: user.status === "active" ? "inactive" : "active" }); await loadUsers() }}>{user.status === "active" ? "Deactivate" : "Activate"}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={async () => { await deleteUser(user.id); await loadUsers() }}><Trash2 className="mr-2 size-4" />Delete User</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
