import { useState } from 'react'
import { Plus, Trash2, Pencil, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useProjectStore } from '@/store/projectStore'
import type { Contractor } from '@/types'

const emptyForm = { name: '', contractPrice: 0, description: '' }

export function ContractorsView() {
  const { contractors, members, addContractor, updateContractor, deleteContractor, project } =
    useProjectStore()

  const [open, setOpen]   = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm]   = useState({ ...emptyForm })

  const currency = project?.currency ?? 'EUR'

  const openAdd = () => {
    setEditId(null)
    setForm({ ...emptyForm })
    setOpen(true)
  }

  const openEdit = (c: Contractor) => {
    setEditId(c.id)
    setForm({ name: c.name, contractPrice: c.contractPrice, description: c.description })
    setOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editId) {
      updateContractor(editId, form)
    } else {
      addContractor(form)
    }
    setOpen(false)
  }

  const handleDelete = (c: Contractor) => {
    const assignedCount = members.filter((m) => m.contractorId === c.id).length
    const msg = assignedCount > 0
      ? `Firma "${c.name}" ma ${assignedCount} przypisanych członków. Czy na pewno usunąć? Członkowie zostaną odpisani od firmy.`
      : `Usunąć firmę "${c.name}"?`
    if (confirm(msg)) deleteContractor(c.id)
  }

  const totalContracts = contractors.reduce((s, c) => s + c.contractPrice, 0)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Contractors
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {contractors.length} {contractors.length === 1 ? 'firma' : 'firmy/firm'} ·{' '}
            łączna wartość kontraktów:{' '}
            <span className="font-semibold">
              {totalContracts.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}
            </span>
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj firmę
        </Button>
      </div>

      {contractors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Brak firm kontrahentów.</p>
            <p className="text-sm text-muted-foreground">
              Kliknij "Dodaj firmę" aby dodać pierwszego kontrahenta.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contractors.map((c) => {
            const assigned = members.filter((m) => m.contractorId === c.id)
            return (
              <Card key={c.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-sm font-mono text-primary">
                          {c.contractPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      )}
                      {assigned.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {assigned.map((m) => (
                            <span
                              key={m.id}
                              className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                            >
                              {m.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(c)}
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

      {/* Add/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edytuj firmę' : 'Nowa firma kontrahent'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nazwa firmy *</Label>
              <Input
                placeholder="np. Politechnika Krakowska"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Wartość kontraktu ({currency})</Label>
              <Input
                type="number" min="0" step="100"
                value={form.contractPrice}
                onChange={(e) => setForm({ ...form, contractPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Zakres prac / notatki</Label>
              <Input
                placeholder="np. Opracowanie nowej technologii X"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editId ? 'Zapisz zmiany' : 'Dodaj firmę'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
