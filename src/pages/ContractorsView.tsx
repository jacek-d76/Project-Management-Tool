import { useState, useRef } from 'react'
import { Plus, Trash2, Pencil, Building2, Bold, Italic, List, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProjectStore } from '@/store/projectStore'
import type { Contractor, Currency } from '@/types'

// ─── Prosty render markdown (bold, italic, listy) ─────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside">$1</ul>')
    .replace(/\n/g, '<br />')
}

// ─── Pasek narzędzi ───────────────────────────────────────────────────────────

function ToolbarButton({
  onClick, title, children,
}: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </button>
  )
}

function NotesEditor({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)

  const wrap = (before: string, after: string) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const selected = value.slice(s, e) || 'tekst'
    const next = value.slice(0, s) + before + selected + after + value.slice(e)
    onChange(next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + selected.length)
    }, 0)
  }

  const insertList = () => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s } = el
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    const before = value.slice(0, lineStart)
    const after  = value.slice(lineStart)
    const lines  = after.split('\n')
    lines[0] = lines[0].startsWith('- ') ? lines[0] : '- ' + lines[0]
    const next = before + lines.join('\n')
    onChange(next)
    setTimeout(() => el.focus(), 0)
  }

  return (
    <div className="rounded-md border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30">
        <ToolbarButton title="Bold (**text**)" onClick={() => wrap('**', '**')}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic (*text*)" onClick={() => wrap('*', '*')}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="List (- item)" onClick={insertList}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="flex-1" />
        <ToolbarButton title={preview ? 'Edit' : 'Preview'} onClick={() => setPreview((v) => !v)}>
          <span className="flex items-center gap-1">
            {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{preview ? 'Edit' : 'Preview'}</span>
          </span>
        </ToolbarButton>
      </div>

      {preview ? (
        <div
          className="min-h-[120px] px-3 py-2 text-sm prose-sm [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-0.5"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || '<span class="text-muted-foreground italic">No content</span>' }}
        />
      ) : (
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'Scope of work, contract terms, notes...\n\n**Bold**, *italic*, list:\n- item 1\n- item 2'}
          className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[120px] resize-y"
        />
      )}
    </div>
  )
}

// ─── ContractorsView ──────────────────────────────────────────────────────────

const emptyForm = { name: '', contractPrice: 0, contractCurrency: 'EUR' as Currency, description: '' }

export function ContractorsView() {
  const { contractors, members, addContractor, updateContractor, deleteContractor, project } =
    useProjectStore()

  const [open, setOpen]     = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm]     = useState({ ...emptyForm })

  const projectCurrency = project?.currency ?? 'EUR'

  const openAdd = () => {
    setEditId(null)
    setForm({ ...emptyForm, contractCurrency: projectCurrency })
    setOpen(true)
  }

  const openEdit = (c: Contractor) => {
    setEditId(c.id)
    setForm({ name: c.name, contractPrice: c.contractPrice, contractCurrency: c.contractCurrency ?? 'EUR', description: c.description })
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
      ? `"${c.name}" has ${assignedCount} assigned member${assignedCount !== 1 ? 's' : ''}. Delete anyway? Members will be unlinked from this company.`
      : `Delete contractor "${c.name}"?`
    if (confirm(msg)) deleteContractor(c.id)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Contractors
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {contractors.length} {contractors.length === 1 ? 'contractor' : 'contractors'}
            {contractors.length > 0 && (
              <> ·{' '}
                {contractors.map((c) => (
                  <span key={c.id} className="font-semibold mr-2">
                    {c.contractPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} {c.contractCurrency ?? projectCurrency}
                  </span>
                ))}
              </>
            )}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add contractor
        </Button>
      </div>

      {contractors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No contractors yet.</p>
            <p className="text-sm text-muted-foreground">
              Click "Add contractor" to add the first one.
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
                          {c.contractPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} {c.contractCurrency ?? projectCurrency}
                        </span>
                      </div>
                      {c.description && (
                        <div
                          className="text-xs text-muted-foreground mt-1 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-0.5 [&_strong]:font-semibold [&_em]:italic"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(c.description) }}
                        />
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit contractor' : 'New contractor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Company name *</Label>
              <Input
                placeholder="e.g. Kraków University of Technology"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contract value</Label>
                <Input
                  type="number" min="0" step="100"
                  value={form.contractPrice}
                  onChange={(e) => setForm({ ...form, contractPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.contractCurrency}
                  onValueChange={(v) => setForm({ ...form, contractCurrency: v as Currency })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="PLN">PLN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Scope / notes</Label>
              <NotesEditor
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
              />
              <p className="text-[10px] text-muted-foreground">
                Supports **bold**, *italic* and lists (- item)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editId ? 'Save changes' : 'Add contractor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
