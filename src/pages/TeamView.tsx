import { useState } from 'react'
import { Plus, Trash2, Pencil, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useProjectStore } from '@/store/projectStore'
import type { Person } from '@/types'

const emptyForm = {
  name: '',
  role: '',
  weeklyHours: 40,
  hourlyRate: 0,
}

export function TeamView() {
  const { project, persons, addPerson, updatePerson, deletePerson } = useProjectStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const currencyLabel = project?.currency ?? 'EUR'

  const openAdd = () => {
    setEditId(null)
    setForm({ ...emptyForm })
    setOpen(true)
  }

  const openEdit = (p: Person) => {
    setEditId(p.id)
    setForm({ name: p.name, role: p.role, weeklyHours: p.weeklyHours, hourlyRate: p.hourlyRate })
    setOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editId) {
      updatePerson(editId, form)
    } else {
      addPerson(form)
    }
    setOpen(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Zespół
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {persons.length} {persons.length === 1 ? 'osoba' : 'osoby/osób'} w projekcie
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj osobę
        </Button>
      </div>

      {persons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Brak członków zespołu.</p>
            <p className="text-sm text-muted-foreground">Kliknij "Dodaj osobę" aby rozpocząć.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Nagłówek tabeli */}
          <div className="grid grid-cols-[1fr_1fr_80px_100px_80px] gap-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Imię i nazwisko</span>
            <span>Rola</span>
            <span>H/tydzień</span>
            <span>Stawka/{currencyLabel}</span>
            <span></span>
          </div>

          {persons.map((p) => (
            <Card key={p.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-3">
                <div className="grid grid-cols-[1fr_1fr_80px_100px_80px] gap-3 items-center">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{p.role || '—'}</div>
                  <div className="text-sm">{p.weeklyHours}h</div>
                  <div className="text-sm font-mono">
                    {p.hourlyRate} {currencyLabel}/h
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Usunąć ${p.name} z zespołu?`)) deletePerson(p.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog dodaj/edytuj */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edytuj osobę' : 'Dodaj osobę do zespołu'}</DialogTitle>
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
            <div className="space-y-2">
              <Label>Rola</Label>
              <Input
                placeholder="np. Designer, Developer, PM..."
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dostępność (h/tydzień)</Label>
                <Input
                  type="number"
                  min="1"
                  max="80"
                  value={form.weeklyHours}
                  onChange={(e) =>
                    setForm({ ...form, weeklyHours: parseInt(e.target.value) || 40 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stawka ({currencyLabel}/h)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.hourlyRate}
                  onChange={(e) =>
                    setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editId ? 'Zapisz zmiany' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
