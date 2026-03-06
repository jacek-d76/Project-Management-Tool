import { useState } from 'react'
import { Plus, Trash2, Pencil, ShieldCheck, UserCog, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useProjectStore } from '@/store/projectStore'
import type { TeamMember, UserPermissions } from '@/types'
import { DEFAULT_PERMISSIONS } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PERMISSIONS_CONFIG: { key: keyof UserPermissions; label: string; description: string }[] = [
  { key: 'canEditTasks',      label: 'Edit tasks',      description: 'Add, change status, dates, description of tasks' },
  { key: 'canUpdateProgress', label: 'Progress %',      description: 'Update task progress slider' },
  { key: 'canViewCosts',      label: 'Costs',           description: 'Access to Costs tab' },
  { key: 'canEditMilestones', label: 'Milestones',      description: 'Add and edit milestones' },
  { key: 'canAddEvidence',    label: 'Evidence',        description: 'Delivery evidence for milestones' },
  { key: 'canManageTeam',     label: 'Manage team',     description: 'Edit team member data' },
]

const emptyForm = {
  name: '',
  username: '',
  password: '',
  projectRole: '',
  weeklyHours: 40,
  hourlyRate: 0,
  contractorId: '' as string | undefined,
  isActive: true,
  permissions: { ...DEFAULT_PERMISSIONS },
}

export function UsersView() {
  const { members, addMember, updateMember, deleteMember, project, contractors } = useProjectStore()

  const [dirtyPerms, setDirtyPerms] = useState<Record<string, UserPermissions>>({})

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm, permissions: { ...DEFAULT_PERMISSIONS } })
  const [usernameError, setUsernameError] = useState('')

  const currencyLabel = project?.currency ?? 'EUR'

  const getPerms = (m: TeamMember): UserPermissions => dirtyPerms[m.id] ?? m.permissions

  const togglePerm = (memberId: string, key: keyof UserPermissions) => {
    const current = dirtyPerms[memberId] ?? members.find((m) => m.id === memberId)!.permissions
    setDirtyPerms((d) => ({
      ...d,
      [memberId]: { ...current, [key]: !current[key] },
    }))
  }

  const savePerms = (memberId: string) => {
    if (dirtyPerms[memberId]) {
      updateMember(memberId, { permissions: dirtyPerms[memberId] })
      setDirtyPerms((d) => {
        const next = { ...d }
        delete next[memberId]
        return next
      })
    }
  }

  const discardPerms = (memberId: string) => {
    setDirtyPerms((d) => {
      const next = { ...d }
      delete next[memberId]
      return next
    })
  }

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
    if (duplicate) {
      setUsernameError('This username is already taken.')
      return
    }
    const memberData = {
      ...form,
      contractorId: form.contractorId || undefined,
    }
    if (editId) {
      updateMember(editId, memberData)
    } else {
      addMember(memberData)
    }
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
            const perms = getPerms(m)
            const isDirty = !!dirtyPerms[m.id]
            const contractor = m.contractorId ? contractors.find((c) => c.id === m.contractorId) : null
            return (
              <Card key={m.id} className={!m.isActive ? 'opacity-50' : isDirty ? 'border-primary/50' : ''}>
                <CardContent className="py-3 space-y-3">
                  {/* Row 1: user data */}
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
                        <span>{m.weeklyHours}h/wk · {m.hourlyRate} {currencyLabel}/h</span>
                        {contractor && <span className="ml-1 text-blue-600 dark:text-blue-400">(kontrakt firmy)</span>}
                        {!m.isActive && <span className="ml-1 text-destructive">(inactive)</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
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

                  {/* Row 2: permission checkboxes */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {PERMISSIONS_CONFIG.map(({ key, label, description }) => (
                      <label
                        key={key}
                        title={description}
                        className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-xs hover:bg-muted/60 border border-transparent hover:border-border select-none"
                      >
                        <input
                          type="checkbox"
                          checked={perms[key]}
                          onChange={() => togglePerm(m.id, key)}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <span className={perms[key] ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
                      </label>
                    ))}

                    {isDirty && (
                      <div className="flex gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => discardPerms(m.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs gap-1"
                          onClick={() => savePerms(m.id)}
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
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
              <div className="space-y-2 col-span-2">
                <Label>Rate ({currencyLabel}/h)</Label>
                <Input
                  type="number" min="0" step="0.5"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {contractors.length > 0 && (
                <div className="space-y-2 col-span-2">
                  <Label>Firma kontrahent</Label>
                  <Select
                    value={form.contractorId ?? ''}
                    onValueChange={(v) => setForm({ ...form, contractorId: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Brak (rozliczenie indywidualne)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Brak (rozliczenie indywidualne)</SelectItem>
                      {contractors.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.contractorId && (
                    <p className="text-xs text-muted-foreground">
                      Koszty godzinowe tej osoby nie będą sumowane — pokrywa je kontrakt firmy.
                    </p>
                  )}
                </div>
              )}
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
