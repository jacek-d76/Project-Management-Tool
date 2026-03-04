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
    alert('Settings saved.')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importJSON(ev.target?.result as string)
      if (ok) navigate('/tasks')
      else alert('Failed to load file.')
    }
    reader.readAsText(file)
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to delete the project and all data? This action cannot be undone.')) {
      clearProject()
      navigate('/')
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings2 className="h-6 w-6" />
        Project settings
      </h1>

      {/* Project info */}
      <Card>
        <CardHeader>
          <CardTitle>Project information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Project name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
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
              <Label>Base currency</Label>
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
              <Label>Rate: 1 EUR =</Label>
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
          <Button onClick={handleSave}>Save settings</Button>
        </CardContent>
      </Card>

      {/* Data / Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Project data</CardTitle>
          <CardDescription>Export or import full project data</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={exportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <label>
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import JSON
              </span>
            </Button>
            <input type="file" accept=".json" className="sr-only" onChange={handleImport} />
          </label>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible operations</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete project and all data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
