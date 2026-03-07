import { useState } from 'react'
import { Plus, Trash2, Pencil, ShieldCheck, UserCog, ChevronDown, ChevronRight, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useProjectStore } from '@/store/projectStore'
import type { TeamMember, UserPermissions, Currency } from '@/types'
import { DEFAULT_PERMISSIONS } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PERMISSIONS_CONFIG: { key: keyof UserPermissions; label: string; description: string }[] = [
  { key: 'canEditTasks',      label: 'Edit tasks',  description: 'Add, change status, dates, description of tasks' },
  { key: 'canUpdateProgress', label: 'Progress %',  description: 'Update task progress slider' },
  { key: 'canEditMilestones', label: 'Milestones',  description: 'Add and edit milestones' },
  { key: 'canAddEvidence',    label: 'Evidence',    description: 'Delivery evidence for milestones' },
]

const STATUS_CLS: Record<string, string> = {
  TODO:        'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW:   'bg-amber-100 text-amber-700',
  DONE:        'bg-green-100 text-green-700',
  BLOCKED:     'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<string, string> = {
  TODO: 'To do', IN_PROGRESS: 'In progress', IN_REVIEW: 'In review', DONE: 'Done', BLOCKED: 'Blocked',
}

const emptyForm = {
  name: '',
  username: '',
  password: '',
  projectRole: '',
  weeklyHours: 40,
  hourlyRate: 0,
  hourlyRateCurrency: 'EUR' as Currency,
  contractorId: '' as string | undefined,
  isActive: true,
  permissions: { ...DEFAULT_PERMISSIONS },
}

export function UsersView() {
  const { members, addMember, updateMember, deleteMember, project, contractors, tasks } = useProjectStore()

  const [expandedTasksFor, setExpandedTasksFor] = useState<Set<string>>(new Set())
  const [open,           setOpen]           = useState(false)
  const [editId,         setEditId]         = useState<string | null>(null)
  const [form,           setForm]           = useState({ ...emptyForm, permissions: { ...DEFAULT_PERMISSIONS } })
  const [usernameError,  setUsernameError]  = useState('')

  const currencyLabel = project?.currency ?? 'EUR'

  // Leaf tasks only (skip containers)
  const containerIds = new Set(tasks.filter((t) => tasks.some((o) => o.parentId === t.id)).map((t) => t.id))
  const leafTasks    = tasks.filter((t) => !containerIds.has(t.id))

  const memberTasks = (memberId: string) =>
    leafTasks.filter((t) => t.assignments.some((a) => a.personId === memberId))

  const toggleTasksFor = (memberId: string) =>
    setExpandedTasksFor((prev) => {
      const next = new Set(prev)
      next.has(memberId) ? next.delete(memberId) : next.add(memberId)
      return next
    })

  const openAdd = () => {
    setEditId(null)
    setForm({ ...emptyForm, permissions: { ...DEFAULT_PERMISSIONS } })
    setUsernameError('')
    setOpen(true)
  }

  const openEdit = (m: TeamMember) => {
    setEditId(m.id)
    setForm({
      name: m.name,
      username: m.username,
      password: m.password,
      projectRole: m.projectRole,
      weeklyHours: m.weeklyHours,
      hourlyRate: m.hourlyRate,
      hourlyRateCurrency: m.hourlyRateCurrency ?? 'EUR',
      contractorId: m.contractorId ?? '',
      isActive: m.isActive,
      permissions: { ...m.permissions },
    })
    setUsernameError('')
    setOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return
    const duplicate = members.find(
      (m) => m.username.toLowerCase() === form.username.toLowerCase() && m.id !== editId
    )
    if (duplicate) { setUsernameError('This username is already taken.'); return }
    const memberData = { ...form, contractorId: form.contractorId || undefined }
    if (editId) { updateMember(editId, memberData) } else { addMember(memberData) }
    setOpen(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Team &amp; users
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {members.length} {members.length === 1 ? 'member' : 'members'} in project
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add user
        </Button>
      </div>

      {/* PM account */}
      <Card className="mb-4 border-primary/30 bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="font-medium">Project Manager</div>
              <div className="text-xs text-muted-foreground">
                login: <span className="font-mono">pm</span> · full access · password in server config
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No users.</p>
            <p className="text-sm text-muted-foreground">Click "Add user" to create the first account.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const contractor  = m.contractorId ? contractors.find((c) => c.id === m.contractorId) : null
            const mTasks      = memberTasks(m.id)
            const totalEst    = mTasks.reduce((s, t) => s + (t.assignments.find((a) => a.personId === m.id)?.estimatedHours ?? 0), 0)
            const totalAct    = mTasks.reduce((s, t) => s + (t.assignments.find((a) => a.personId === m.id)?.actualHours ?? 0), 0)
            const totalAvail  = totalEst - totalAct
            const isTasksOpen = expandedTasksFor.has(m.id)
            const perms       = m.permissions

            return (
              <Card key={m.id} className={!m.isActive ? 'opacity-50' : ''}>
                <CardContent className="py-3 space-y-3">
                  {/* Row 1: user data + actions */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{m.name}</span>
                        {contractor && (
                          <span className="text-[11px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            {contractor.name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.projectRole && <span>{m.projectRole} · </span>}
                        <span className="font-mono">{m.username}</span>
                        <span className="mx-1">·</span>
                        <span>{m.weeklyHours}h/wk · {m.hourlyRate} {m.hourlyRateCurrency ?? currencyLabel}/h</span>
                        {contractor && <span className="ml-1 text-blue-600 dark:text-blue-400">(company contract)</span>}
                        {!m.isActive && <span className="ml-1 text-destructive">(inactive)</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {/* Task list toggle */}
                      <button
                        onClick={() => toggleTasksFor(m.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
                        title="Show assigned tasks"
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        <span>{mTasks.length}</span>
                        {isTasksOpen
                          ? <ChevronDown  className="h-3 w-3" />
                          : <ChevronRight className="h-3 w-3" />
                        }
                      </button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete ${m.name}?`)) deleteMember(m.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Row 2: permissions (read-only summary) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PERMISSIONS_CONFIG.map(({ key, label }) => (
                      <span
                        key={key}
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          perms[key]
                            ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                            : 'bg-muted/40 border-border text-muted-foreground line-through'
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Task list (expanded) */}
                  {isTasksOpen && (
                    <div className="border-t pt-3">
                      {mTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No tasks assigned.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b">
                              <th className="text-left py-1 pr-3 font-medium">Task</th>
                              <th className="text-left py-1 pr-3 font-medium w-28">Status</th>
                              <th className="text-right py-1 pr-3 font-medium w-16">Planned</th>
                              <th className="text-right py-1 font-medium w-16">Available</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mTasks.map((t) => {
                              const a     = t.assignments.find((x) => x.personId === m.id)!
                              const avail = a.estimatedHours - (a.actualHours ?? 0)
                              return (
                                <tr key={t.id} className="border-b border-border/40 hover:bg-muted/30">
                                  <td className="py-1.5 pr-3 truncate max-w-0 w-full">
                                    <span className={t.status === 'DONE' ? 'line-through text-muted-foreground' : ''}>
                                      {t.title}
                                    </span>
                                  </td>
                                  <td className="py-1.5 pr-3 whitespace-nowrap">
                                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLS[t.status] ?? ''}`}>
                                      {STATUS_LABEL[t.status] ?? t.status}
                                    </span>
                                  </td>
                                  <td className="py-1.5 pr-3 text-right tabular-nums">
                                    {a.estimatedHours > 0 ? `${a.estimatedHours}h` : '—'}
                                  </td>
                                  <td className={`py-1.5 text-right tabular-nums ${avail < 0 ? 'text-destructive' : ''}`}>
                                    {a.estimatedHours > 0 ? `${avail}h` : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="font-medium">
                              <td colSpan={2} className="pt-2 text-xs text-muted-foreground">Total</td>
                              <td className="pt-2 pr-3 text-right tabular-nums text-foreground">
                                {totalEst > 0 ? `${totalEst}h` : '—'}
                              </td>
                              <td className={`pt-2 text-right tabular-nums ${totalAvail < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                {totalEst > 0 ? `${totalAvail}h` : '—'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit user' : 'New user'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input
                placeholder="e.g. John Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  placeholder="e.g. john.s"
                  value={form.username}
                  onChange={(e) => { setForm({ ...form, username: e.target.value }); setUsernameError('') }}
                  className={usernameError ? 'border-destructive' : ''}
                />
                {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Set password..."
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Project role</Label>
                <Input
                  placeholder="e.g. Developer, Designer..."
                  value={form.projectRole}
                  onChange={(e) => setForm({ ...form, projectRole: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Availability (h/week)</Label>
                <Input
                  type="number" min="1" max="80"
                  value={form.weeklyHours}
                  onChange={(e) => setForm({ ...form, weeklyHours: parseInt(e.target.value) || 40 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate (/h)</Label>
                <Input
                  type="number" min="0" step="0.5"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate currency</Label>
                <Select
                  value={form.hourlyRateCurrency}
                  onValueChange={(v) => setForm({ ...form, hourlyRateCurrency: v as Currency })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="PLN">PLN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {contractors.length > 0 && (
                <div className="space-y-2 col-span-2">
                  <Label>Contractor company</Label>
                  <Select
                    value={form.contractorId ?? ''}
                    onValueChange={(v) => setForm({ ...form, contractorId: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (individual billing)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None (individual billing)</SelectItem>
                      {contractors.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.contractorId && (
                    <p className="text-xs text-muted-foreground">
                      Hourly costs for this member will not be summed — covered by the company contract.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-1">
                {PERMISSIONS_CONFIG.map(({ key, label, description }) => (
                  <label
                    key={key}
                    title={description}
                    className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm hover:bg-muted/60 border border-transparent hover:border-border select-none"
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions[key]}
                      onChange={() => setForm({
                        ...form,
                        permissions: { ...form.permissions, [key]: !form.permissions[key] },
                      })}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className={form.permissions[key] ? 'font-medium' : 'text-muted-foreground'}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.username.trim() || !form.password.trim()}
            >
              {editId ? 'Save changes' : 'Create account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
