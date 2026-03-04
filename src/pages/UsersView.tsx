import { useState } from 'react'
import { Plus, Trash2, Pencil, ShieldCheck, Eye, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useUserStore } from '@/store/userStore'
import { useProjectStore } from '@/store/projectStore'
import type { AppUserRole } from '@/types'

const emptyForm = {
  name: '',
  username: '',
  password: '',
  role: 'member' as AppUserRole,
  personId: null as string | null,
  isActive: true,
}

const roleLabel: Record<AppUserRole, string> = {
  member: 'Członek (może edytować zadania)',
  viewer: 'Obserwator (tylko odczyt)',
}

const roleIcon = {
  member: ShieldCheck,
  viewer: Eye,
}

export function UsersView() {
  const { users, addUser, updateUser, deleteUser } = useUserStore()
  const persons = useProjectStore((s) => s.persons)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [usernameError, setUsernameError] = useState('')

  const openAdd = () => {
    setEditId(null)
    setForm({ ...emptyForm })
    setUsernameError('')
    setOpen(true)
  }

  const openEdit = (u: typeof users[0]) => {
    setEditId(u.id)
    setForm({
      name: u.name,
      username: u.username,
      password: u.password,
      role: u.role,
      personId: u.personId,
      isActive: u.isActive,
    })
    setUsernameError('')
    setOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return

    // Sprawdź unikalność loginu
    const duplicate = users.find(
      (u) => u.username.toLowerCase() === form.username.toLowerCase() && u.id !== editId
    )
    if (duplicate) {
      setUsernameError('Ta nazwa użytkownika jest już zajęta.')
      return
    }

    if (editId) {
      updateUser(editId, form)
    } else {
      addUser(form)
    }
    setOpen(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Użytkownicy
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {users.length} {users.length === 1 ? 'konto' : 'kont'} w systemie
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj użytkownika
        </Button>
      </div>

      {/* Konto PM - informacja */}
      <Card className="mb-4 border-primary/30 bg-primary/5">
        <CardContent className="py-3">
          <div className="grid grid-cols-[1fr_1fr_1fr_80px] gap-3 items-center">
            <div className="font-medium">Project Manager</div>
            <div className="text-sm text-muted-foreground font-mono">pm</div>
            <div className="flex items-center gap-1.5 text-sm text-primary">
              <ShieldCheck className="h-4 w-4" />
              PM (pełny dostęp)
            </div>
            <div className="text-xs text-muted-foreground text-right">wbudowane</div>
          </div>
        </CardContent>
      </Card>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Brak kont użytkowników.</p>
            <p className="text-sm text-muted-foreground">
              Kliknij "Dodaj użytkownika" aby utworzyć konto dla członka zespołu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_80px] gap-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Imię i nazwisko</span>
            <span>Login</span>
            <span>Rola</span>
            <span></span>
          </div>
          {users.map((u) => {
            const Icon = roleIcon[u.role]
            const person = persons.find((p) => p.id === u.personId)
            return (
              <Card key={u.id} className={!u.isActive ? 'opacity-50' : 'hover:border-primary/30 transition-colors'}>
                <CardContent className="py-3">
                  <div className="grid grid-cols-[1fr_1fr_1fr_80px] gap-3 items-center">
                    <div>
                      <div className="font-medium">{u.name}</div>
                      {person && (
                        <div className="text-xs text-muted-foreground">
                          Powiązany: {person.name}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-mono text-muted-foreground">{u.username}</div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {u.role === 'member' ? 'Członek' : 'Obserwator'}
                      {!u.isActive && <span className="ml-1 text-xs text-destructive">(nieaktywny)</span>}
                    </div>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Usunąć konto ${u.name}?`)) deleteUser(u.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog dodaj/edytuj */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
                <Label>Login (nazwa użytkownika) *</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Rola w projekcie</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as AppUserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(roleLabel) as [AppUserRole, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Powiązanie z osobą w projekcie</Label>
              <Select
                value={form.personId ?? '__none__'}
                onValueChange={(v) => setForm({ ...form, personId: v === '__none__' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę (opcjonalnie)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— brak powiązania —</SelectItem>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Powiązanie pozwala użytkownikowi widzieć swoje zadania w widoku Workload.
              </p>
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
