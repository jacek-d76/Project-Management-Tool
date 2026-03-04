import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Plus, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSessionStore } from '@/store/sessionStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/store/projectStore'
import { generateId } from '@/lib/utils'
import type { Currency } from '@/types'

export function Welcome() {
  const navigate = useNavigate()
  const { project, setProject, importJSON } = useProjectStore()
  const isPM = useSessionStore((s) => s.isPM())

  // Jeśli projekt już istnieje - przekieruj od razu
  if (project) {
    navigate('/tasks', { replace: true })
    return null
  }

  // Team member nie może tworzyć projektu - brak projektu = komunikat
  if (!isPM) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Brak aktywnego projektu</h2>
            <p className="text-sm text-muted-foreground">
              Project Manager musi najpierw zainicjować projekt.
              Skontaktuj się z PM i poproś o udostępnienie pliku projektu.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    currency: 'EUR' as Currency,
    exchangeRate: 4.25,
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) return
    setProject({ ...form, id: generateId() })
    navigate('/tasks')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importJSON(ev.target?.result as string)
      if (ok) navigate('/tasks')
      else alert('Błąd wczytywania pliku. Sprawdź format JSON.')
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <FolderKanban className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Project Manager</h1>
          <p className="text-muted-foreground mt-1">Utwórz nowy projekt lub wczytaj istniejący</p>
        </div>

        {/* Formularz tworzenia projektu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" />
              Nowy projekt
            </CardTitle>
            <CardDescription>Wypełnij podstawowe informacje o projekcie</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nazwa projektu *</Label>
                <Input
                  id="name"
                  placeholder="np. Budowa strony internetowej"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis (opcjonalnie)</Label>
                <Input
                  id="description"
                  placeholder="Krótki opis projektu..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data startu *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Deadline *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Waluta bazowa</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v as Currency })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (euro)</SelectItem>
                      <SelectItem value="PLN">PLN (złoty)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">
                    Kurs: 1 EUR =
                  </Label>
                  <div className="relative">
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.exchangeRate}
                      onChange={(e) =>
                        setForm({ ...form, exchangeRate: parseFloat(e.target.value) || 4.25 })
                      }
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      PLN
                    </span>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Utwórz projekt
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Import */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-muted/40 px-2 text-muted-foreground">lub</span>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/50">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Wczytaj projekt z pliku JSON</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kliknij aby wybrać plik eksportu
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                className="sr-only"
                onChange={handleImport}
              />
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
