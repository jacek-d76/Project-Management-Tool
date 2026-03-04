import { useState, useEffect } from 'react'
import { Settings2, Download, Upload, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/store/projectStore'
import { useNavigate } from 'react-router-dom'
import type { Currency } from '@/types'

export function Settings() {
  const navigate = useNavigate()
  const { project, updateProject, clearProject, exportJSON, importJSON } = useProjectStore()

  const [form, setForm] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    startDate: project?.startDate ?? '',
    endDate: project?.endDate ?? '',
    currency: (project?.currency ?? 'EUR') as Currency,
    exchangeRate: project?.exchangeRate ?? 4.25,
  })

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        currency: project.currency,
        exchangeRate: project.exchangeRate,
      })
    }
  }, [project])

  const handleSave = () => {
    updateProject(form)
    alert('Ustawienia zapisane.')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importJSON(ev.target?.result as string)
      if (ok) navigate('/tasks')
      else alert('Błąd wczytywania pliku.')
    }
    reader.readAsText(file)
  }

  const handleClear = () => {
    if (confirm('Czy na pewno chcesz usunąć projekt i wszystkie dane? Tej operacji nie można cofnąć.')) {
      clearProject()
      navigate('/')
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings2 className="h-6 w-6" />
        Ustawienia projektu
      </h1>

      {/* Dane projektu */}
      <Card>
        <CardHeader>
          <CardTitle>Informacje o projekcie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nazwa projektu</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Opis</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data startu</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
              <Label>Kurs: 1 EUR =</Label>
              <div className="relative">
                <Input
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
          <Button onClick={handleSave}>Zapisz ustawienia</Button>
        </CardContent>
      </Card>

      {/* Dane / Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Dane projektu</CardTitle>
          <CardDescription>Eksportuj lub importuj pełne dane projektu</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={exportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Eksportuj JSON
          </Button>
          <label>
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Importuj JSON
              </span>
            </Button>
            <input type="file" accept=".json" className="sr-only" onChange={handleImport} />
          </label>
        </CardContent>
      </Card>

      {/* Strefa niebezpieczna */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Strefa niebezpieczna</CardTitle>
          <CardDescription>Operacje nieodwracalne</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Usuń projekt i wszystkie dane
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
