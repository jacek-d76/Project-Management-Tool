import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronRight, ChevronDown, Trash2, X, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/store/projectStore'
import { useSessionStore } from '@/store/sessionStore'
import type { Task, TaskStatus, TaskPriority, TeamMember } from '@/types'

// ─── Konfiguracja ─────────────────────────────────────────────────────────────

const STATUS_OPTS: { value: TaskStatus; label: string; cls: string }[] = [
  { value: 'TODO',        label: 'Do zrobienia',  cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'IN_PROGRESS', label: 'W trakcie',     cls: 'bg-blue-100 text-blue-700' },
  { value: 'IN_REVIEW',   label: 'Do przeglądu',  cls: 'bg-amber-100 text-amber-700' },
  { value: 'DONE',        label: 'Gotowe',        cls: 'bg-green-100 text-green-700' },
  { value: 'BLOCKED',     label: 'Zablokowane',   cls: 'bg-red-100 text-red-700' },
]

const PRIORITY_OPTS: { value: TaskPriority; label: string; cls: string }[] = [
  { value: 'LOW',      label: 'Niski',     cls: 'bg-gray-100 text-gray-500' },
  { value: 'MEDIUM',   label: 'Średni',    cls: 'bg-blue-100 text-blue-600' },
  { value: 'HIGH',     label: 'Wysoki',    cls: 'bg-orange-100 text-orange-600' },
  { value: 'CRITICAL', label: 'Krytyczny', cls: 'bg-red-100 text-red-700' },
]

const statusLabel = (s: TaskStatus) => STATUS_OPTS.find((o) => o.value === s)?.label ?? s
const statusCls   = (s: TaskStatus) => STATUS_OPTS.find((o) => o.value === s)?.cls ?? ''
const priorityLabel = (p: TaskPriority) => PRIORITY_OPTS.find((o) => o.value === p)?.label ?? p
const priorityCls   = (p: TaskPriority) => PRIORITY_OPTS.find((o) => o.value === p)?.cls ?? ''

// ─── InlineAdd ────────────────────────────────────────────────────────────────

function InlineAdd({
  parentId, depth, value, inputRef, onChange, onConfirm, onCancel,
}: {
  parentId: string | null
  depth: number
  value: string
  inputRef: React.RefObject<HTMLInputElement>
  onChange: (v: string) => void
  onConfirm: (parentId: string | null) => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
      <Input
        ref={inputRef}
        className="h-7 text-sm"
        placeholder="Nazwa zadania... (Enter aby dodać)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  onConfirm(parentId)
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => setTimeout(() => onCancel(), 150)}
      />
      <Button size="sm" className="h-7 px-2 shrink-0" onMouseDown={() => onConfirm(parentId)}>Dodaj</Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onMouseDown={() => onCancel()}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ─── TasksView ────────────────────────────────────────────────────────────────

export function TasksView() {
  const { project, tasks, members, addTask, updateTask, deleteTask } = useProjectStore()
  const isPM    = useSessionStore((s) => s.isPM())
  const can     = useSessionStore((s) => s.can)
  const canEdit     = isPM || can('canEditTasks')
  const canProgress = isPM || can('canUpdateProgress')

  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [expanded,       setExpanded]       = useState<Set<string>>(new Set())
  const [addingTo,       setAddingTo]       = useState<string | 'root' | null>(null)
  const [newTitle,       setNewTitle]       = useState('')
  const [filterStatus,   setFilterStatus]   = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterMember,   setFilterMember]   = useState('all')

  const addInputRef = useRef<HTMLInputElement>(null)

  const rootTasks  = tasks.filter((t) => !t.parentId).sort((a, b) => a.position - b.position)
  const getChildren = (pid: string) => tasks.filter((t) => t.parentId === pid).sort((a, b) => a.position - b.position)
  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  const passesFilter = (t: Task) => {
    if (filterStatus   !== 'all' && t.status   !== filterStatus)   return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterMember   !== 'all' && !t.assignments.some((a) => a.personId === filterMember)) return false
    return true
  }

  const rootVisible = (t: Task) => passesFilter(t) || getChildren(t.id).some(passesFilter)

  const startAdd = (parentId: string | 'root') => {
    setAddingTo(parentId)
    setNewTitle('')
    setTimeout(() => addInputRef.current?.focus(), 50)
  }

  const confirmAdd = (parentId: string | null) => {
    if (!newTitle.trim() || !project) { setAddingTo(null); return }
    const siblings = parentId ? getChildren(parentId) : rootTasks
    const position = siblings.length > 0 ? Math.max(...siblings.map((t) => t.position)) + 1 : 0
    addTask({
      projectId: project.id,
      parentId,
      title: newTitle.trim(),
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      startDate: null,
      endDate: null,
      estimatedHours: 0,
      progress: 0,
      pricingMode: 'hourly',
      fixedPrice: null,
      assignments: [],
      dependencies: [],
      position,
    })
    setNewTitle('')
    setAddingTo(null)
  }

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleDelete = (task: Task) => {
    const kids = getChildren(task.id).length
    if (!confirm(`Usunąć "${task.title}"${kids > 0 ? ` i ${kids} podzada${kids === 1 ? 'nie' : 'nia/ń'}` : ''}?`)) return
    deleteTask(task.id)
    if (selectedId === task.id) setSelectedId(null)
  }

  // ─── Task Row ───────────────────────────────────────────────────────────────

  const renderTask = (task: Task, depth: number) => {
    const children   = getChildren(task.id)
    const isExpanded = expanded.has(task.id)
    const isSelected = selectedId === task.id
    const hasChildren = children.length > 0
    if (!rootVisible(task) && depth === 0) return null
    if (depth > 0 && !passesFilter(task)) return null

    return (
      <div key={task.id}>
        <div
          className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors
            ${isSelected ? 'bg-accent border border-primary/30' : 'hover:bg-accent/50'}
          `}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => setSelectedId(isSelected ? null : task.id)}
        >
          {/* Expand toggle */}
          <button
            className="h-5 w-5 shrink-0 flex items-center justify-center rounded hover:bg-muted"
            onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(task.id) }}
          >
            {hasChildren
              ? isExpanded
                ? <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              : <span className="h-3.5 w-3.5 block" />
            }
          </button>

          {/* Progress mini-bar */}
          <div className="h-1.5 w-8 rounded-full bg-muted shrink-0 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${task.progress}%` }} />
          </div>

          {/* Title */}
          <span className={`flex-1 text-sm truncate ${task.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </span>

          {/* Badges */}
          <span className={`shrink-0 hidden sm:inline text-xs px-1.5 py-0.5 rounded-full font-medium ${statusCls(task.status)}`}>
            {statusLabel(task.status)}
          </span>
          <span className={`shrink-0 hidden sm:inline text-xs px-1.5 py-0.5 rounded-full ${priorityCls(task.priority)}`}>
            {priorityLabel(task.priority)}
          </span>

          {/* Hover actions */}
          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
            {canEdit && depth === 0 && (
              <button
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                title="Dodaj podzadanie"
                onClick={(e) => { e.stopPropagation(); if (!isExpanded) toggleExpand(task.id); startAdd(task.id) }}
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {canEdit && (
              <button
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-destructive/60 hover:text-destructive"
                title="Usuń"
                onClick={(e) => { e.stopPropagation(); handleDelete(task) }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {isExpanded && (
          <div>
            {children.map((child) => renderTask(child, depth + 1))}
            {addingTo === task.id && <InlineAdd parentId={task.id} depth={depth + 1} value={newTitle} inputRef={addInputRef} onChange={setNewTitle} onConfirm={confirmAdd} onCancel={() => setAddingTo(null)} />}
          </div>
        )}
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* Task list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap bg-background">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie priorytety</SelectItem>
              {PRIORITY_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {members.length > 0 && (
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex-1" />
          {canEdit && (
            <Button size="sm" className="h-8" onClick={() => startAdd('root')}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj zadanie
            </Button>
          )}
        </div>

        {/* Task tree */}
        <div className="flex-1 overflow-auto p-3">
          {rootTasks.length === 0 && addingTo !== 'root' ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
              <ListTodo className="h-12 w-12 opacity-30" />
              <div>
                <p className="font-medium">Brak zadań</p>
                <p className="text-sm">
                  {canEdit ? 'Kliknij "+ Dodaj zadanie" aby rozpocząć.' : 'Brak zadań w tym projekcie.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {rootTasks.map((task) => renderTask(task, 0))}
              {addingTo === 'root' && <InlineAdd parentId={null} depth={0} value={newTitle} inputRef={addInputRef} onChange={setNewTitle} onConfirm={confirmAdd} onCancel={() => setAddingTo(null)} />}
            </div>
          )}
        </div>
      </div>

      {/* Task panel */}
      {selectedTask && (
        <TaskPanel
          key={selectedTask.id}
          task={selectedTask}
          members={members}
          canEdit={canEdit}
          canProgress={canProgress}
          onClose={() => setSelectedId(null)}
          updateTask={updateTask}
          currencyLabel={project?.currency ?? 'EUR'}
        />
      )}
    </div>
  )
}

// ─── TaskPanel ────────────────────────────────────────────────────────────────

function TaskPanel({
  task, members, canEdit, canProgress, onClose, updateTask, currencyLabel,
}: {
  task: Task
  members: TeamMember[]
  canEdit: boolean
  canProgress: boolean
  onClose: () => void
  updateTask: (id: string, data: Partial<Task>) => void
  currencyLabel: string
}) {
  const [localTitle,      setLocalTitle]      = useState(task.title)
  const [localDesc,       setLocalDesc]       = useState(task.description)
  const [localEstHours,   setLocalEstHours]   = useState(String(task.estimatedHours))
  const [localFixedPrice, setLocalFixedPrice] = useState(String(task.fixedPrice ?? ''))

  // Reset local state when task changes (key prop handles re-mount, but just in case)
  useEffect(() => {
    setLocalTitle(task.title)
    setLocalDesc(task.description)
    setLocalEstHours(String(task.estimatedHours))
    setLocalFixedPrice(String(task.fixedPrice ?? ''))
  }, [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (data: Partial<Task>) => updateTask(task.id, data)

  const toggleMember = (memberId: string) => {
    const has = task.assignments.some((a) => a.personId === memberId)
    update({
      assignments: has
        ? task.assignments.filter((a) => a.personId !== memberId)
        : [...task.assignments, { personId: memberId }],
    })
  }

  return (
    <div className="w-72 border-l flex flex-col overflow-hidden bg-background shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Szczegóły zadania</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nazwa</Label>
          <input
            className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none py-1 transition-colors disabled:opacity-60"
            value={localTitle}
            disabled={!canEdit}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => {
              const v = localTitle.trim()
              if (v && v !== task.title) update({ title: v })
            }}
          />
        </div>

        {/* Status + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={task.status} disabled={!canEdit} onValueChange={(v) => update({ status: v as TaskStatus })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priorytet</Label>
            <Select value={task.priority} disabled={!canEdit} onValueChange={(v) => update({ priority: v as TaskPriority })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Postęp: <span className="font-medium text-foreground">{task.progress}%</span></Label>
          <input
            type="range" min={0} max={100} step={5}
            value={task.progress}
            disabled={!canProgress}
            onChange={(e) => update({ progress: parseInt(e.target.value) })}
            className="w-full h-2 accent-primary disabled:opacity-40"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Start</Label>
            <Input type="date" className="h-8 text-xs" value={task.startDate ?? ''} disabled={!canEdit}
              onChange={(e) => update({ startDate: e.target.value || null })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Deadline</Label>
            <Input type="date" className="h-8 text-xs" value={task.endDate ?? ''} disabled={!canEdit}
              onChange={(e) => update({ endDate: e.target.value || null })} />
          </div>
        </div>

        {/* Estimated hours */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Szacowane godziny</Label>
          <Input type="number" min={0} step={0.5} className="h-8 text-xs"
            value={localEstHours} disabled={!canEdit}
            onChange={(e) => setLocalEstHours(e.target.value)}
            onBlur={() => update({ estimatedHours: parseFloat(localEstHours) || 0 })} />
        </div>

        {/* Pricing */}
        {canEdit && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Wycena</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" checked={task.pricingMode === 'hourly'} disabled={!canEdit}
                  onChange={() => update({ pricingMode: 'hourly', fixedPrice: null })} />
                Godzinowo
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" checked={task.pricingMode === 'fixed'} disabled={!canEdit}
                  onChange={() => update({ pricingMode: 'fixed' })} />
                Fixed price
              </label>
            </div>
            {task.pricingMode === 'fixed' && (
              <Input type="number" min={0} step={1} placeholder={`Kwota (${currencyLabel})`}
                className="h-8 text-xs" value={localFixedPrice} disabled={!canEdit}
                onChange={(e) => setLocalFixedPrice(e.target.value)}
                onBlur={() => update({ fixedPrice: parseFloat(localFixedPrice) || null })} />
            )}
          </div>
        )}

        {/* Assigned members */}
        {members.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Przypisane osoby</Label>
            <div className="space-y-0.5">
              {members.filter((m) => m.isActive).map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 rounded px-1 py-1">
                  <input type="checkbox"
                    checked={task.assignments.some((a) => a.personId === m.id)}
                    disabled={!canEdit}
                    onChange={() => toggleMember(m.id)}
                    className="h-3.5 w-3.5" />
                  <span>{m.name}</span>
                  {m.projectRole && <span className="text-muted-foreground">({m.projectRole})</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Opis</Label>
          <textarea
            className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            placeholder="Dodaj opis zadania..."
            value={localDesc}
            disabled={!canEdit}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={() => { if (localDesc !== task.description) update({ description: localDesc }) }}
          />
        </div>
      </div>
    </div>
  )
}
