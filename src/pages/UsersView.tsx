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

const PERMISSIONS_CONFIG: { key: keyof UserPermissions; label: string; description: string }[] = [
  { key: 'canEditTasks',      label: 'Edycja zadań',      description: 'Dodawanie, zmiana statusu, dat, opisu zadań' },
  { key: 'canUpdateProgress', label: '% postępu',          description: 'Aktualizacja suwaka postępu zadania' },
  { key: 'canViewCosts',      label: 'Koszty',             description: 'Dostęp do zakładki Koszty' },
  { key: 'canEditMilestones', label: 'Milestone\'y',       description: 'Dodawanie i edycja kamieni milowych' },
  { key: 'canAddEvidence',    label: 'Dowody',             description: 'Delivery evidence do milestone\'ów' },
  { key: 'canManageTeam',     label: 'Zarządzanie',        description: 'Edycja danych członków zespołu' },
]

const emptyForm = {
  name: '',
  username: '',
  password: '',
  projectRole: '',
  weeklyHours: 40,
  hourlyRate: 0,
  isActive: true,
  permissions: { ...DEFAULT_PERMISSIONS },
}

export function UsersView() {
  const { members, addMember, updateMember, deleteMember, project } = useProjectStore()

  // Lokalny stan uprawnień — śledzi niezapisane zmiany per użytkownik
  const [dirtyPerms, setDirtyPerms] = useState<Record<string, UserPermissions>>({})

  // Dialog dodaj/edytuj (dane podstawowe)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm, permissions: { ...DEFAULT_PERMISSIONS } })
  const [usernameError, setUsernameError] = useState('')

  const currencyLabel = project?.currency ?? 'EUR'

  // Pobierz aktualne uprawnienia (z dirty state lub ze store)
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

  // Dialog
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
      setUsernameError('Ta nazwa użytkownika jest już zajęta.')
      return
    }
    if (editId) {
      updateMember(editId, form)
    } else {
      addMember(form)
    }
    setOpen(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Zespół i użytkownicy
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {members.length} {members.length === 1 ? 'osoba' : 'osób'} w projekcie
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj użytkownika
        </Button>
      </div>

      {/* Konto PM */}
      <Card className="mb-4 border-primary/30 bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="font-medium">Project Manager</div>
              <div className="text-xs text-muted-foreground">
                login: <span className="font-mono">pm</span> · pełny dostęp · hasło w konfiguracji serwera
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Brak użytkowników.</p>
            <p className="text-sm text-muted-foreground">Kliknij "Dodaj użytkownika" aby utworzyć pierwsze konto.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const perms = getPerms(m)
            const isDirty = !!dirtyPerms[m.id]
            return (
              <Card key={m.id} className={!m.isActive ? 'opacity-50' : isDirty ? 'border-primary/50' : ''}>
                <CardContent className="py-3 space-y-3">
                  {/* Wiersz 1: dane użytkownika */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.projectRole && <span>{m.projectRole} · </span>}
                        <span className="font-mono">{m.username}</span>
                        <span className="mx-1">·</span>
                        <span>{m.weeklyHours}h/tydz. · {m.hourlyRate} {currencyLabel}/h</span>
                        {!m.isActive && <span className="ml-1 text-destructive">(nieaktywny)</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Usunąć ${m.name}?`)) deleteMember(m.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Wiersz 2: checkboxy uprawnień */}
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
                          Anuluj
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs gap-1"
                          onClick={() => savePerms(m.id)}
                        >
                          <Save className="h-3 w-3" />
                          Zapisz
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

      {/* Dialog dodaj/edytuj (dane podstawowe bez uprawnień) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edytuj użytkownika' : 'Nowy użytkownik'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Imię i nazwisko *</Label>
              <Input
                placeholder="np. Anna Kowalska"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Login *</Label>
                <Input
                  placeholder="np. anna.k"
                  value={form.username}
                  onChange={(e) => { setForm({ ...form, username: e.target.value }); setUsernameError('') }}
                  className={usernameError ? 'border-destructive' : ''}
                />
                {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Hasło *</Label>
                <Input
                  type="password"
                  placeholder="Ustaw hasło..."
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rola w projekcie</Label>
                <Input
                  placeholder="np. Developer, Designer..."
                  value={form.projectRole}
                  onChange={(e) => setForm({ ...form, projectRole: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dostępność (h/tydzień)</Label>
                <Input
                  type="number" min="1" max="80"
                  value={form.weeklyHours}
                  onChange={(e) => setForm({ ...form, weeklyHours: parseInt(e.target.value) || 40 })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Stawka ({currencyLabel}/h)</Label>
                <Input
                  type="number" min="0" step="0.5"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })}
                />
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
              <Label htmlFor="isActive">Konto aktywne</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.username.trim() || !form.password.trim()}
            >
              {editId ? 'Zapisz zmiany' : 'Utwórz konto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
