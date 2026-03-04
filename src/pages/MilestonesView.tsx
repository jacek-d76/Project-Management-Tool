import { useState } from 'react'
import {
  Flag, Plus, Pencil, Trash2, Link2, FolderOpen, Copy, Check,
  AlertTriangle, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useProjectStore } from '@/store/projectStore'
import { useSessionStore } from '@/store/sessionStore'
import { workingDaysBetween } from '@/lib/scheduler'
import type { Milestone, MilestoneStatus, EvidenceType } from '@/types'
import { generateId } from '@/lib/utils'

// ─── Status helpers ───────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)

function calcStatus(milestone: Milestone, tasks: ReturnType<typeof useProjectStore.getState>['tasks']): MilestoneStatus {
  const linked = tasks.filter((t) => milestone.linkedTaskIds.includes(t.id))
  if (linked.length === 0) return 'OK'
  const now = today()
  const anyOverdue   = linked.some((t) => t.endDate && t.endDate > milestone.date)
  const pastNotDone  = now > milestone.date && linked.some((t) => t.status !== 'DONE')
  if (anyOverdue || pastNotDone) return 'BREACHED'
  const daysLeft = workingDaysBetween(now, milestone.date)
  const atRisk   = daysLeft <= 7 && linked.some((t) => t.status !== 'DONE' && t.progress < 80)
  if (atRisk) return 'AT_RISK'
  return 'OK'
}

const STATUS_CFG = {
  OK:       { icon: CheckCircle2, cls: 'text-green-600',  bg: 'bg-green-50  border-green-200',  label: 'OK'       },
  AT_RISK:  { icon: AlertTriangle, cls: 'text-amber-600', bg: 'bg-amber-50  border-amber-200',  label: 'AT RISK'  },
  BREACHED: { icon: AlertCircle,   cls: 'text-red-600',   bg: 'bg-red-50    border-red-200',    label: 'BREACHED' },
}

// ─── Empty forms ──────────────────────────────────────────────────────────────

const emptyMilestone = { name: '', date: '', description: '' }
const emptyEvidence  = { type: 'url' as EvidenceType, link: '', description: '' }

// ─── MilestonesView ───────────────────────────────────────────────────────────

export function MilestonesView() {
  const { tasks, milestones, addMilestone, updateMilestone, deleteMilestone } = useProjectStore()
  const isPM  = useSessionStore((s) => s.isPM())
  const can   = useSessionStore((s) => s.can)
  const canEditMilestones = isPM || can('canEditMilestones')
  const canAddEvidence    = isPM || can('canAddEvidence')
  const currentUser = useSessionStore((s) => s.currentUser)

  // Milestone dialog
  const [mOpen,  setMOpen]  = useState(false)
  const [mEditId, setMEditId] = useState<string | null>(null)
  const [mForm,  setMForm]  = useState(emptyMilestone)

  // Evidence dialog
  const [eOpen,  setEOpen]  = useState(false)
  const [eMsId,  setEMsId]  = useState<string | null>(null)
  const [eForm,  setEForm]  = useState(emptyEvidence)

  // Task linking panel
  const [linkingId, setLinkingId] = useState<string | null>(null)

  // Copy-to-clipboard feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date))

  // ─── Milestone CRUD ─────────────────────────────────────────────────────────

  const openAddMilestone = () => {
    setMEditId(null)
    setMForm(emptyMilestone)
    setMOpen(true)
  }

  const openEditMilestone = (m: Milestone) => {
    setMEditId(m.id)
    setMForm({ name: m.name, date: m.date, description: m.description })
    setMOpen(true)
  }

  const saveMilestone = () => {
    if (!mForm.name.trim() || !mForm.date) return
    if (mEditId) {
      updateMilestone(mEditId, { name: mForm.name.trim(), date: mForm.date, description: mForm.description })
    } else {
      addMilestone({
        projectId: '',
        name: mForm.name.trim(),
        date: mForm.date,
        description: mForm.description,
        status: 'OK',
        linkedTaskIds: [],
        evidence: [],
      })
    }
    setMOpen(false)
  }

  // ─── Evidence CRUD ──────────────────────────────────────────────────────────

  const openAddEvidence = (milestoneId: string) => {
    setEMsId(milestoneId)
    setEForm(emptyEvidence)
    setEOpen(true)
  }

  const saveEvidence = () => {
    if (!eForm.link.trim() || !eMsId) return
    const ms = milestones.find((m) => m.id === eMsId)
    if (!ms) return
    const newEvidence = {
      id: generateId(),
      type: eForm.type,
      link: eForm.link.trim(),
      description: eForm.description.trim(),
      addedBy: currentUser?.name ?? 'PM',
      addedAt: new Date().toISOString(),
    }
    updateMilestone(eMsId, { evidence: [...ms.evidence, newEvidence] })
    setEOpen(false)
  }

  const deleteEvidence = (milestoneId: string, evidenceId: string) => {
    const ms = milestones.find((m) => m.id === milestoneId)
    if (!ms) return
    updateMilestone(milestoneId, { evidence: ms.evidence.filter((e) => e.id !== evidenceId) })
  }

  // ─── Task linking ────────────────────────────────────────────────────────────

  const toggleLinkedTask = (milestoneId: string, taskId: string) => {
    const ms = milestones.find((m) => m.id === milestoneId)
    if (!ms) return
    const linked = ms.linkedTaskIds.includes(taskId)
      ? ms.linkedTaskIds.filter((id) => id !== taskId)
      : [...ms.linkedTaskIds, taskId]
    updateMilestone(milestoneId, { linkedTaskIds: linked })
  }

  // ─── Clipboard ──────────────────────────────────────────────────────────────

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // Leaf tasks (no children) for linking
  const leafTasks = tasks.filter((t) => !tasks.some((c) => c.parentId === t.id))

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6" />
            Milestones
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {milestones.length} {milestones.length === 1 ? 'milestone' : 'milestones'}
          </p>
        </div>
        {canEditMilestones && (
          <Button onClick={openAddMilestone}>
            <Plus className="h-4 w-4 mr-2" />
            Add milestone
          </Button>
        )}
      </div>

      {/* Empty state */}
      {milestones.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Flag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No milestones</p>
            {canEditMilestones && (
              <p className="text-sm mt-1">Click "Add milestone" to create the first one.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Milestone list */}
      <div className="space-y-4">
        {sorted.map((ms) => {
          const status   = calcStatus(ms, tasks)
          const statusCfg = STATUS_CFG[status]
          const StatusIcon = statusCfg.icon
          const isLinking = linkingId === ms.id
          const linked = tasks.filter((t) => ms.linkedTaskIds.includes(t.id))

          return (
            <Card key={ms.id} className={`border ${status !== 'OK' ? statusCfg.bg : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {/* Status icon + diamond */}
                  <div className="relative mt-0.5 shrink-0">
                    <div className="h-5 w-5 rotate-45 bg-muted border border-border rounded-sm" />
                    <StatusIcon className={`h-3 w-3 absolute -bottom-1 -right-1 ${statusCfg.cls}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{ms.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.cls} ${statusCfg.bg}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{ms.date}</span>
                    </div>
                    {ms.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ms.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    {canEditMilestones && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditMilestone(ms)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isPM && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete "${ms.name}"?`)) deleteMilestone(ms.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Linked tasks */}
                {(linked.length > 0 || canEditMilestones) && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Linked tasks</span>
                      {canEditMilestones && (
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => setLinkingId(isLinking ? null : ms.id)}
                        >
                          {isLinking ? 'Done' : 'Edit'}
                        </button>
                      )}
                    </div>

                    {isLinking ? (
                      <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-auto bg-background">
                        {leafTasks.length === 0
                          ? <p className="text-xs text-muted-foreground">No tasks in project.</p>
                          : leafTasks.map((t) => (
                            <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5">
                              <input
                                type="checkbox"
                                checked={ms.linkedTaskIds.includes(t.id)}
                                onChange={() => toggleLinkedTask(ms.id, t.id)}
                                className="h-3.5 w-3.5"
                              />
                              <span>{t.title}</span>
                            </label>
                          ))
                        }
                      </div>
                    ) : linked.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {linked.map((t) => (
                          <span key={t.id} className="text-xs bg-muted rounded px-2 py-0.5">{t.title}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Evidence */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Delivery evidence</span>
                    {canAddEvidence && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => openAddEvidence(ms.id)}
                      >
                        + Add
                      </button>
                    )}
                  </div>

                  {ms.evidence.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No evidence.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {ms.evidence.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-2 text-xs group">
                          {ev.type === 'url' ? (
                            <Link2 className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                          ) : (
                            <FolderOpen className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            {ev.type === 'url' ? (
                              <a
                                href={ev.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline truncate block"
                              >
                                {ev.link}
                              </a>
                            ) : (
                              <button
                                className="text-left text-amber-700 hover:underline truncate block w-full"
                                onClick={() => copyToClipboard(ev.link, ev.id)}
                                title="Click to copy path"
                              >
                                {ev.link}
                              </button>
                            )}
                            {ev.description && (
                              <span className="text-muted-foreground">{ev.description}</span>
                            )}
                            <span className="text-muted-foreground ml-1">— {ev.addedBy}</span>
                          </div>
                          {/* Copy feedback */}
                          {copiedId === ev.id && (
                            <span className="text-green-600 flex items-center gap-0.5 shrink-0">
                              <Check className="h-3 w-3" /> Copied
                            </span>
                          )}
                          {/* Copy button for all */}
                          <button
                            className="opacity-0 group-hover:opacity-100 shrink-0"
                            title="Copy to clipboard"
                            onClick={() => copyToClipboard(ev.link, ev.id)}
                          >
                            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                          {canAddEvidence && (
                            <button
                              className="opacity-0 group-hover:opacity-100 shrink-0 text-destructive/60 hover:text-destructive"
                              onClick={() => deleteEvidence(ms.id, ev.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Milestone add/edit dialog */}
      <Dialog open={mOpen} onOpenChange={setMOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mEditId ? 'Edit milestone' : 'New milestone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Phase 1 delivery"
                value={mForm.name}
                onChange={(e) => setMForm({ ...mForm, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={mForm.date}
                onChange={(e) => setMForm({ ...mForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>PM notes</Label>
              <textarea
                className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Description, acceptance criteria, notes..."
                value={mForm.description}
                onChange={(e) => setMForm({ ...mForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMOpen(false)}>Cancel</Button>
            <Button
              onClick={saveMilestone}
              disabled={!mForm.name.trim() || !mForm.date}
            >
              {mEditId ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence dialog */}
      <Dialog open={eOpen} onOpenChange={setEOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add delivery evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={eForm.type === 'url'}
                    onChange={() => setEForm({ ...eForm, type: 'url' })}
                  />
                  <Link2 className="h-4 w-4 text-blue-500" />
                  URL (link)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={eForm.type === 'network_path'}
                    onChange={() => setEForm({ ...eForm, type: 'network_path' })}
                  />
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                  Network path
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{eForm.type === 'url' ? 'URL *' : 'UNC path *'}</Label>
              <Input
                placeholder={eForm.type === 'url' ? 'https://...' : '\\\\NAS\\folder\\file'}
                value={eForm.link}
                onChange={(e) => setEForm({ ...eForm, link: e.target.value })}
                autoFocus
              />
              {eForm.type === 'network_path' && (
                <p className="text-xs text-muted-foreground">Clicking will copy the path to clipboard.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g. Delivery protocol, version 1.2"
                value={eForm.description}
                onChange={(e) => setEForm({ ...eForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEOpen(false)}>Cancel</Button>
            <Button onClick={saveEvidence} disabled={!eForm.link.trim()}>Add evidence</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
