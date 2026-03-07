import { useState, useRef, useEffect } from 'react'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { GripVertical, Plus, ChevronRight, ChevronDown, Trash2, X, ListTodo, Calculator, Layers, AlertTriangle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/store/projectStore'
import { useSessionStore } from '@/store/sessionStore'
import { wouldCreateCycle } from '@/lib/scheduler'
import { generateId } from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority, TeamMember, DependencyType } from '@/types'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_OPTS: { value: TaskStatus; label: string; cls: string }[] = [
  { value: 'TODO',        label: 'To do',       cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'IN_PROGRESS', label: 'In progress', cls: 'bg-blue-100 text-blue-700' },
  { value: 'IN_REVIEW',   label: 'In review',   cls: 'bg-amber-100 text-amber-700' },
  { value: 'DONE',        label: 'Done',        cls: 'bg-green-100 text-green-700' },
  { value: 'BLOCKED',     label: 'Blocked',     cls: 'bg-red-100 text-red-700' },
]

const PRIORITY_OPTS: { value: TaskPriority; label: string; cls: string }[] = [
  { value: 'LOW',      label: 'Low',      cls: 'bg-gray-100 text-gray-500' },
  { value: 'MEDIUM',   label: 'Medium',   cls: 'bg-blue-100 text-blue-600' },
  { value: 'HIGH',     label: 'High',     cls: 'bg-orange-100 text-orange-600' },
  { value: 'CRITICAL', label: 'Critical', cls: 'bg-red-100 text-red-700' },
]

const statusLabel   = (s: TaskStatus)   => STATUS_OPTS.find((o) => o.value === s)?.label ?? s
const statusCls     = (s: TaskStatus)   => STATUS_OPTS.find((o) => o.value === s)?.cls ?? ''
const priorityLabel = (p: TaskPriority) => PRIORITY_OPTS.find((o) => o.value === p)?.label ?? p
const priorityCls   = (p: TaskPriority) => PRIORITY_OPTS.find((o) => o.value === p)?.cls ?? ''

type DropZone = 'before' | 'after' | 'inside'
type DropInfo = { id: string; zone: DropZone } | null

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel,
}: {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl border w-full max-w-sm mx-4 p-6 space-y-4">
        <h3 className="font-semibold text-base">{title}</h3>
        <div className="text-sm text-muted-foreground leading-relaxed">{message}</div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" variant={danger ? 'destructive' : 'default'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

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
    <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${depth * 20 + 28}px` }}>
      <Input
        ref={inputRef}
        className="h-7 text-sm"
        placeholder="Task name... (Enter to add)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  onConfirm(parentId)
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => setTimeout(() => onCancel(), 150)}
      />
      <Button size="sm" className="h-7 px-2 shrink-0" onMouseDown={() => onConfirm(parentId)}>Add</Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onMouseDown={() => onCancel()}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ─── DraggableTaskRow ────────────────────────────────────────────────────────

function DraggableTaskRow({
  task, depth, isSelected, isExpanded, hasChildren, isContainer, canEdit, canAddSubtask,
  dropInfo, isDragActive, displayProgress, displayStatus,
  onSelect, onToggleExpand, onStartAdd, onDelete,
  children,
}: {
  task: Task
  depth: number
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  isContainer: boolean
  canEdit: boolean
  canAddSubtask: boolean
  dropInfo: DropInfo
  isDragActive: boolean
  displayProgress: number
  displayStatus: TaskStatus
  isAtRisk: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onStartAdd: () => void
  onDelete: () => void
  children?: React.ReactNode
}) {
  const { setNodeRef: setDropRef } = useDroppable({ id: task.id })
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: task.id })

  const showBefore = dropInfo?.id === task.id && dropInfo.zone === 'before'
  const showAfter  = dropInfo?.id === task.id && dropInfo.zone === 'after'
  const showInside = dropInfo?.id === task.id && dropInfo.zone === 'inside'
  const indent = depth * 20 + 8

  return (
    <div>
      {showBefore && (
        <div className="h-0.5 bg-primary rounded-full my-0.5" style={{ marginLeft: indent + 20, marginRight: 8 }} />
      )}

      <div
        ref={setDropRef}
        className={[
          'group flex items-center gap-1.5 rounded-md py-1.5 cursor-pointer transition-colors',
          isDragging ? 'opacity-30' : '',
          isSelected ? 'bg-accent border border-primary/30' : 'hover:bg-accent/50',
          showInside ? 'ring-2 ring-primary ring-inset rounded-md' : '',
        ].join(' ')}
        style={{ paddingLeft: indent }}
        onClick={() => !isDragActive && onSelect()}
      >
        {/* Drag handle */}
        {canEdit ? (
          <div
            ref={setDragRef}
            {...attributes}
            {...listeners}
            className="h-5 w-5 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        ) : (
          <div className="h-5 w-5 shrink-0" />
        )}

        {/* Expand toggle */}
        <button
          className="h-5 w-5 shrink-0 flex items-center justify-center rounded hover:bg-muted"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggleExpand() }}
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
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${displayProgress}%` }} />
        </div>

        {/* Container icon */}
        {isContainer && (
          <Layers className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        )}

        {/* Title */}
        <span className={`flex-1 text-sm truncate ${displayStatus === 'DONE' ? 'line-through text-muted-foreground' : ''} ${isContainer ? 'font-medium' : ''}`}>
          {task.title}
        </span>

        {/* Risk indicator */}
        {isAtRisk && (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" title="Subtask deadline exceeds this task's deadline" />
        )}

        {/* Badges */}
        <span className={`shrink-0 hidden sm:inline text-xs px-1.5 py-0.5 rounded-full font-medium ${statusCls(displayStatus)}`}>
          {statusLabel(displayStatus)}
        </span>
        <span className={`shrink-0 hidden sm:inline text-xs px-1.5 py-0.5 rounded-full ${priorityCls(task.priority)}`}>
          {priorityLabel(task.priority)}
        </span>

        {/* Hover actions */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0 pr-1">
          {canEdit && canAddSubtask && (
            <button
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
              title="Add subtask"
              onClick={(e) => { e.stopPropagation(); onStartAdd() }}
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
          {canEdit && (
            <button
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-destructive/60 hover:text-destructive"
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {showAfter && (
        <div className="h-0.5 bg-primary rounded-full my-0.5" style={{ marginLeft: indent + 20, marginRight: 8 }} />
      )}

      {isExpanded && children}
    </div>
  )
}

// ─── TasksView ────────────────────────────────────────────────────────────────

export function TasksView() {
  const { project, tasks, members, addTask, updateTask, deleteTask, moveTask, setTaskDates, addTaskDependency } = useProjectStore()
  const isPM       = useSessionStore((s) => s.isPM())
  const can        = useSessionStore((s) => s.can)
  const currentUser = useSessionStore((s) => s.currentUser)
  const canEdit     = isPM || can('canEditTasks')
  const canProgress = isPM || can('canUpdateProgress')

  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [expanded,       setExpanded]       = useState<Set<string>>(new Set())
  const [addingTo,       setAddingTo]       = useState<string | 'root' | null>(null)
  const [newTitle,       setNewTitle]       = useState('')
  const [filterStatus,   setFilterStatus]   = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterMember,   setFilterMember]   = useState<string>(
    () => !isPM && currentUser?.memberId ? currentUser.memberId : 'all'
  )

  // Modals
  const [confirmDelete,    setConfirmDelete]    = useState<{ task: Task; descCount: number } | null>(null)
  const [confirmContainer, setConfirmContainer] = useState<Task | null>(null)
  const [notOwnedTitle,    setNotOwnedTitle]    = useState<string | null>(null)

  // Drag state
  const [dragId,   setDragId]   = useState<string | null>(null)
  const [dropInfo, setDropInfo] = useState<DropInfo>(null)
  const pointerY = useRef(0)

  const addInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const rootTasks   = tasks.filter((t) => !t.parentId).sort((a, b) => a.position - b.position)
  const getChildren = (pid: string) => tasks.filter((t) => t.parentId === pid).sort((a, b) => a.position - b.position)
  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getTaskDepth = (taskId: string): number => {
    const t = tasks.find((x) => x.id === taskId)
    if (!t?.parentId) return 0
    return 1 + getTaskDepth(t.parentId)
  }

  const countDescendants = (taskId: string): number => {
    const children = getChildren(taskId)
    return children.length + children.reduce((sum, c) => sum + countDescendants(c.id), 0)
  }

  const isContainerTask = (taskId: string) => tasks.some((t) => t.parentId === taskId)

  const passesFilter = (t: Task) => {
    if (filterStatus   !== 'all' && t.status   !== filterStatus)   return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterMember   !== 'all' && !t.assignments.some((a) => a.personId === filterMember)) return false
    return true
  }
  const hasVisibleDescendant = (taskId: string): boolean =>
    getChildren(taskId).some((c) => passesFilter(c) || hasVisibleDescendant(c.id))
  const rootVisible = (t: Task) => passesFilter(t) || hasVisibleDescendant(t.id)

  // ─── Add ────────────────────────────────────────────────────────────────────

  const startAdd = (parentId: string | 'root') => {
    setAddingTo(parentId)
    setNewTitle('')
    setTimeout(() => addInputRef.current?.focus(), 50)
  }

  const confirmAdd = (parentId: string | null) => {
    if (!newTitle.trim() || !project) { setAddingTo(null); return }
    const siblings = parentId ? getChildren(parentId) : rootTasks
    const position = siblings.length > 0 ? Math.max(...siblings.map((t) => t.position)) + 1 : 0
    // Auto-assign member to their own task so it stays visible in the filter
    const autoAssignments = (!isPM && currentUser?.memberId)
      ? [{ personId: currentUser.memberId, estimatedHours: 0, actualHours: null }]
      : []
    const parentTask = parentId ? tasks.find((t) => t.id === parentId) : null
    const newId = generateId()
    addTask({
      id: newId,
      projectId: project.id, parentId,
      title: newTitle.trim(), description: '',
      status: 'TODO', priority: 'MEDIUM',
      startDate: parentTask?.startDate ?? null,
      endDate: parentTask?.endDate ?? null,
      startDateLocked: false,
      progress: 0,
      pricingMode: 'hourly', fixedPrice: null,
      assignments: autoAssignments, dependencies: [], position,
    })
    setNewTitle('')
    setAddingTo(null)
    // Auto-open panel for team members so they can set planned hours immediately
    if (!isPM && currentUser?.memberId) {
      setSelectedId(newId)
    }
  }

  const handleStartAddSubtask = (task: Task) => {
    // If already a container — just open inline add
    if (isContainerTask(task.id)) {
      if (!expanded.has(task.id)) toggleExpand(task.id)
      startAdd(task.id)
      return
    }
    // First subtask — show warning modal
    setConfirmContainer(task)
  }

  const doCreateSubtask = () => {
    if (!confirmContainer) return
    const task = confirmContainer
    setConfirmContainer(null)
    if (!expanded.has(task.id)) toggleExpand(task.id)
    startAdd(task.id)
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (task: Task) => {
    setConfirmDelete({ task, descCount: countDescendants(task.id) })
  }

  const doDelete = () => {
    if (!confirmDelete) return
    deleteTask(confirmDelete.task.id)
    if (selectedId === confirmDelete.task.id) setSelectedId(null)
    setConfirmDelete(null)
  }

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ─── Drag helpers ───────────────────────────────────────────────────────────

  const isDescendantOrSelf = (ancestorId: string, candidateId: string): boolean => {
    if (ancestorId === candidateId) return true
    const c = tasks.find((t) => t.id === candidateId)
    if (!c?.parentId) return false
    return isDescendantOrSelf(ancestorId, c.parentId)
  }

  const handleDragStart = (e: DragStartEvent) => { setDragId(String(e.active.id)) }

  const handleDragOver = (e: DragOverEvent) => {
    if (!e.over) { setDropInfo(null); return }
    const targetId = String(e.over.id)
    if (targetId === dragId || (dragId && isDescendantOrSelf(dragId, targetId))) {
      setDropInfo(null); return
    }
    const rect  = e.over.rect
    const relY  = (pointerY.current - rect.top) / rect.height
    const zone: DropZone = relY < 0.3 ? 'before' : relY > 0.7 ? 'after' : 'inside'
    setDropInfo({ id: targetId, zone })
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const draggedId = String(e.active.id)
    if (dropInfo && draggedId !== dropInfo.id && !isDescendantOrSelf(draggedId, dropInfo.id)) {
      const target = tasks.find((t) => t.id === dropInfo.id)!
      if (dropInfo.zone === 'inside') {
        const childCount = tasks.filter((t) => t.parentId === dropInfo.id).length
        moveTask(draggedId, dropInfo.id, childCount)
        setExpanded((prev) => new Set([...prev, dropInfo.id]))
      } else {
        const siblings = tasks
          .filter((t) => t.parentId === target.parentId && t.id !== draggedId)
          .sort((a, b) => a.position - b.position)
        const idx    = siblings.findIndex((t) => t.id === dropInfo.id)
        const newPos = dropInfo.zone === 'before' ? idx : idx + 1
        moveTask(draggedId, target.parentId, newPos)
      }
    }
    setDragId(null)
    setDropInfo(null)
  }

  const handleDragCancel = () => { setDragId(null); setDropInfo(null) }

  // ─── Recursive task renderer ─────────────────────────────────────────────

  const renderTask = (task: Task, depth: number): React.ReactNode => {
    const children    = getChildren(task.id)
    const isExpanded  = expanded.has(task.id)
    const isSelected  = selectedId === task.id
    const hasChildren = children.length > 0
    const isContainer = hasChildren
    const canAddSubtask = depth < 2  // max 3 levels (depth 0, 1, 2)
    const displayProgress = isContainer ? computeContainerProgress(task.id, tasks) : task.progress
    const displayStatus   = isContainer ? computeContainerStatus(task.id, tasks)   : task.status
    const isAtRisk        = isContainer && hasEndDateOverflow(task.id, tasks)

    if (!rootVisible(task) && depth === 0) return null
    if (depth > 0 && !passesFilter(task) && !hasVisibleDescendant(task.id)) return null

    return (
      <DraggableTaskRow
        key={task.id}
        task={task}
        depth={depth}
        isSelected={isSelected}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        isContainer={isContainer}
        canEdit={canEdit}
        canAddSubtask={canAddSubtask}
        dropInfo={dropInfo}
        isDragActive={!!dragId}
        displayProgress={displayProgress}
        displayStatus={displayStatus}
        isAtRisk={isAtRisk}
        onSelect={() => setSelectedId(isSelected ? null : task.id)}
        onToggleExpand={() => toggleExpand(task.id)}
        onStartAdd={() => handleStartAddSubtask(task)}
        onDelete={() => {
          const canDeleteTask = isPM || !currentUser?.memberId ||
            (task.assignments.length === 1 && task.assignments[0].personId === currentUser.memberId)
          if (canDeleteTask) handleDelete(task)
          else setNotOwnedTitle(task.title)
        }}
      >
        {children.map((child) => renderTask(child, depth + 1))}
        {addingTo === task.id && (
          <InlineAdd
            parentId={task.id} depth={depth + 1}
            value={newTitle} inputRef={addInputRef}
            onChange={setNewTitle} onConfirm={confirmAdd} onCancel={() => setAddingTo(null)}
          />
        )}
      </DraggableTaskRow>
    )
  }

  const draggedTask = dragId ? tasks.find((t) => t.id === dragId) : null

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-full overflow-hidden"
      onPointerMove={(e) => { pointerY.current = e.clientY }}
    >
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete task"
          danger
          confirmLabel="Delete"
          message={
            confirmDelete.descCount > 0 ? (
              <>
                Delete <strong>"{confirmDelete.task.title}"</strong> and all{' '}
                <strong>{confirmDelete.descCount} subtask{confirmDelete.descCount !== 1 ? 's' : ''}</strong>?
                <br /><span className="text-destructive/80">This action cannot be undone.</span>
              </>
            ) : (
              <>
                Delete <strong>"{confirmDelete.task.title}"</strong>?
                <br /><span className="text-destructive/80">This action cannot be undone.</span>
              </>
            )
          }
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Cannot delete modal */}
      {notOwnedTitle && (
        <ConfirmModal
          title="Cannot delete task"
          confirmLabel="OK"
          message={
            <>
              You can only delete tasks assigned solely to you.<br />
              <strong>"{notOwnedTitle}"</strong> is assigned to multiple people or someone else.
            </>
          }
          onConfirm={() => setNotOwnedTitle(null)}
          onCancel={() => setNotOwnedTitle(null)}
        />
      )}

      {/* Container warning modal */}
      {confirmContainer && (
        <ConfirmModal
          title="Create subtask"
          confirmLabel="Create subtask"
          message={
            <>
              <strong>"{confirmContainer.title}"</strong> will become a container task.
              <br /><br />
              Its cost, progress and assignments will be <strong>calculated automatically</strong> as the sum of its subtasks. The task's own values will no longer be editable.
            </>
          }
          onConfirm={doCreateSubtask}
          onCancel={() => setConfirmContainer(null)}
        />
      )}

      {/* Task list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap bg-background">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITY_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {isPM && members.length > 0 && (
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex-1" />
          {canEdit && (
            <Button size="sm" className="h-8" onClick={() => startAdd('root')}>
              <Plus className="h-4 w-4 mr-1" />
              Add task
            </Button>
          )}
        </div>

        {/* Task tree with DnD */}
        <div className="flex-1 overflow-auto p-3">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {rootTasks.length === 0 && addingTo !== 'root' ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
                <ListTodo className="h-12 w-12 opacity-30" />
                <div>
                  <p className="font-medium">No tasks</p>
                  <p className="text-sm">
                    {canEdit ? 'Click "+ Add task" to get started.' : 'No tasks in this project.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {rootTasks.map((task) => renderTask(task, 0))}
                {addingTo === 'root' && (
                  <InlineAdd
                    parentId={null} depth={0}
                    value={newTitle} inputRef={addInputRef}
                    onChange={setNewTitle} onConfirm={confirmAdd} onCancel={() => setAddingTo(null)}
                  />
                )}
              </div>
            )}

            <DragOverlay dropAnimation={null}>
              {draggedTask && (
                <div className="flex items-center gap-2 rounded-md bg-background border border-primary shadow-lg px-3 py-2 text-sm opacity-90 pointer-events-none">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{draggedTask.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusCls(draggedTask.status)}`}>
                    {statusLabel(draggedTask.status)}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Task panel */}
      {selectedTask && (
        <TaskPanel
          key={selectedTask.id}
          task={selectedTask}
          tasks={tasks}
          members={members}
          isPM={isPM}
          canEdit={canEdit}
          canProgress={canProgress}
          currentMemberId={currentUser?.memberId ?? null}
          onClose={() => setSelectedId(null)}
          updateTask={updateTask}
          setTaskDates={setTaskDates}
          addTaskDependency={addTaskDependency}
          currencyLabel={project?.currency ?? 'EUR'}
        />
      )}
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function workingDaysBetween(startStr: string, endStr: string): number {
  const end = new Date(endStr)
  let count = 0
  const d = new Date(startStr)
  while (d <= end) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// ─── Computed container values ────────────────────────────────────────────────

function computeContainerProgress(taskId: string, allTasks: Task[]): number {
  const children = allTasks.filter((t) => t.parentId === taskId)
  if (children.length === 0) return 0
  const childProgresses = children.map((c) =>
    allTasks.some((t) => t.parentId === c.id)
      ? computeContainerProgress(c.id, allTasks)
      : c.progress
  )
  return Math.round(childProgresses.reduce((s, p) => s + p, 0) / childProgresses.length)
}

function hasEndDateOverflow(taskId: string, allTasks: Task[]): boolean {
  const parent = allTasks.find((t) => t.id === taskId)
  if (!parent?.endDate) return false
  const children = allTasks.filter((t) => t.parentId === taskId)
  for (const child of children) {
    if (child.endDate && child.endDate > parent.endDate) return true
    if (hasEndDateOverflow(child.id, allTasks)) return true
  }
  return false
}

function computeContainerStatus(taskId: string, allTasks: Task[]): TaskStatus {
  const children = allTasks.filter((t) => t.parentId === taskId)
  if (children.length === 0) return 'TODO'
  const statuses = children.map((c) =>
    allTasks.some((t) => t.parentId === c.id)
      ? computeContainerStatus(c.id, allTasks)
      : c.status
  )
  if (statuses.every((s) => s === 'DONE'))        return 'DONE'
  if (statuses.some((s) => s === 'BLOCKED'))      return 'BLOCKED'
  if (statuses.some((s) => s === 'IN_PROGRESS' || s === 'IN_REVIEW')) return 'IN_PROGRESS'
  return 'TODO'
}

// ─── TaskPanel ────────────────────────────────────────────────────────────────

function TaskPanel({
  task, tasks, members, isPM, canEdit, canProgress, currentMemberId, onClose, updateTask, setTaskDates, addTaskDependency, currencyLabel,
}: {
  task: Task
  tasks: Task[]
  members: TeamMember[]
  isPM: boolean
  canEdit: boolean
  canProgress: boolean
  currentMemberId: string | null
  onClose: () => void
  updateTask: (id: string, data: Partial<Task>) => void
  setTaskDates: (id: string, startDate: string | null, endDate: string | null) => void
  addTaskDependency: (taskId: string, dep: Task['dependencies'][number]) => void
  currencyLabel: string
}) {
  const isContainer = tasks.some((t) => t.parentId === task.id)
  const computedProgress = isContainer ? computeContainerProgress(task.id, tasks) : task.progress
  const computedStatus   = isContainer ? computeContainerStatus(task.id, tasks)   : task.status

  const [localTitle,      setLocalTitle]      = useState(task.title)
  const [localDesc,       setLocalDesc]       = useState(task.description)
  const [localFixedPrice, setLocalFixedPrice] = useState(String(task.fixedPrice ?? ''))

  type HourEntry = { est: string; actual: string }
  const initHours = () => {
    const r: Record<string, HourEntry> = {}
    task.assignments.forEach((a) => {
      r[a.personId] = { est: String(a.estimatedHours), actual: a.actualHours != null ? String(a.actualHours) : '' }
    })
    return r
  }
  const [localHours, setLocalHours] = useState<Record<string, HourEntry>>(initHours)

  const [newDepId,   setNewDepId]   = useState('')
  const [newDepType, setNewDepType] = useState<DependencyType>('FS')
  const [newDepLag,  setNewDepLag]  = useState('0')
  const [depError,   setDepError]   = useState<string | null>(null)

  useEffect(() => {
    setLocalTitle(task.title)
    setLocalDesc(task.description)
    setLocalFixedPrice(String(task.fixedPrice ?? ''))
    setLocalHours(initHours())
    setNewDepId(''); setNewDepLag('0'); setDepError(null)
  }, [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (data: Partial<Task>) => updateTask(task.id, data)

  const toggleMember = (memberId: string) => {
    const has = task.assignments.some((a) => a.personId === memberId)
    if (has) {
      update({ assignments: task.assignments.filter((a) => a.personId !== memberId) })
      setLocalHours((prev) => { const r = { ...prev }; delete r[memberId]; return r })
    } else {
      update({ assignments: [...task.assignments, { personId: memberId, estimatedHours: 0, actualHours: null }] })
      setLocalHours((prev) => ({ ...prev, [memberId]: { est: '0', actual: '' } }))
    }
  }

  const saveHours = (memberId: string) => {
    const entry = localHours[memberId]
    if (!entry) return
    const estimatedHours = parseFloat(entry.est) || 0
    const actualHours    = entry.actual !== '' ? parseFloat(entry.actual) || 0 : null
    update({
      assignments: task.assignments.map((a) =>
        a.personId === memberId ? { ...a, estimatedHours, actualHours } : a
      ),
    })
  }

  const autoCalcHours = (memberId: string) => {
    if (!task.startDate || !task.endDate) return
    const member = members.find((m) => m.id === memberId)
    if (!member) return
    const days        = workingDaysBetween(task.startDate, task.endDate)
    const hoursPerDay = member.weeklyHours / 5
    const estimated   = Math.round(days * hoursPerDay * 2) / 2
    setLocalHours((prev) => ({ ...prev, [memberId]: { ...prev[memberId], est: String(estimated) } }))
    update({
      assignments: task.assignments.map((a) =>
        a.personId === memberId ? { ...a, estimatedHours: estimated } : a
      ),
    })
  }

  const removeDep = (predId: string) => {
    update({ dependencies: task.dependencies.filter((d) => d.taskId !== predId) })
  }

  const addDep = () => {
    if (!newDepId) return
    if (wouldCreateCycle(tasks, task.id, newDepId)) {
      setDepError('This dependency would create a cycle'); return
    }
    const lag = parseInt(newDepLag) || 0
    addTaskDependency(task.id, { taskId: newDepId, type: newDepType, lagDays: lag })
    setNewDepId(''); setNewDepLag('0'); setDepError(null)
  }

  return (
    <div className="w-80 border-l flex flex-col overflow-hidden bg-background shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-1.5">
          {isContainer && <Layers className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isContainer ? 'Container task' : 'Task details'}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Container banner */}
      {isContainer && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-md bg-muted/60 border text-xs text-muted-foreground leading-relaxed">
          Progress, status and assignments are <strong>calculated from subtasks</strong> and cannot be edited directly.
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Name</Label>
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
            {isContainer ? (
              <div className={`h-8 px-3 flex items-center rounded-md border text-xs font-medium ${statusCls(computedStatus)}`}>
                {statusLabel(computedStatus)}
              </div>
            ) : (
              <Select value={task.status} disabled={!canEdit} onValueChange={(v) => update({ status: v as TaskStatus })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select value={task.priority} disabled={!canEdit || isContainer} onValueChange={(v) => update({ priority: v as TaskPriority })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Progress: <span className="font-medium text-foreground">{computedProgress}%</span>
            {isContainer && <span className="ml-1 text-muted-foreground/60">(avg of subtasks)</span>}
          </Label>
          <input
            type="range" min={0} max={100} step={5}
            value={computedProgress}
            disabled={!canProgress || isContainer}
            onChange={(e) => !isContainer && update({ progress: parseInt(e.target.value) })}
            className="w-full h-2 accent-primary disabled:opacity-40"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>

        {/* Dates */}
        {(() => {
          const parentTask = task.parentId ? tasks.find((t) => t.id === task.parentId) : null
          const isStartLocked = !isPM && task.startDateLocked === true
          const dateOverflow = !!(parentTask?.endDate && task.endDate && task.endDate > parentTask.endDate)
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Start date</Label>
                    {isPM && canEdit && (
                      <button
                        title={task.startDateLocked ? 'Locked for team — click to unlock' : 'Click to lock start date for team'}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => updateTask(task.id, { startDateLocked: !task.startDateLocked })}
                      >
                        <Lock className={`h-3 w-3 ${task.startDateLocked ? 'text-amber-500' : 'opacity-30'}`} />
                      </button>
                    )}
                  </div>
                  <Input type="date" className="h-8 text-xs" value={task.startDate ?? ''}
                    disabled={!canEdit || isStartLocked}
                    onChange={(e) => setTaskDates(task.id, e.target.value || null, task.endDate)} />
                  {isStartLocked && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Locked by PM
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Deadline</Label>
                  <Input type="date" className="h-8 text-xs" value={task.endDate ?? ''}
                    disabled={!canEdit}
                    onChange={(e) => setTaskDates(task.id, task.startDate, e.target.value || null)} />
                </div>
              </div>
              {task.startDate && task.endDate && (() => {
                const wdays = workingDaysBetween(task.startDate, task.endDate)
                const calDays = Math.round((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / 86400000) + 1
                return (
                  <p className="text-[10px] text-muted-foreground">
                    {calDays} calendar days · <span className="font-medium text-foreground">{wdays} working days</span>
                  </p>
                )
              })()}
              {dateOverflow && (
                <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Deadline exceeds parent <strong>"{parentTask!.title}"</strong> ({parentTask!.endDate}).
                    {!isPM && ' PM sees a risk indicator on the parent task.'}
                  </span>
                </div>
              )}
            </div>
          )
        })()}

        {/* Pricing mode — hidden for containers */}
        {isPM && !isContainer && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pricing</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" checked={task.pricingMode === 'hourly'} disabled={!canEdit}
                  onChange={() => update({ pricingMode: 'hourly', fixedPrice: null })} />
                Hourly
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" checked={task.pricingMode === 'fixed'} disabled={!canEdit}
                  onChange={() => update({ pricingMode: 'fixed' })} />
                Fixed price
              </label>
            </div>
            {task.pricingMode === 'fixed' && (
              <Input type="number" min={0} step={1} placeholder={`Amount (${currencyLabel})`}
                className="h-8 text-xs" value={localFixedPrice} disabled={!canEdit}
                onChange={(e) => setLocalFixedPrice(e.target.value)}
                onBlur={() => update({ fixedPrice: parseFloat(localFixedPrice) || null })} />
            )}
          </div>
        )}

        {/* Assigned members — hidden for containers */}
        {members.length > 0 && !isContainer && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Assigned people</Label>

            {isPM ? (
              members.filter((m) => m.isActive).map((m) => {
                const assignment = task.assignments.find((a) => a.personId === m.id)
                const isAssigned = !!assignment
                const hours = localHours[m.id]
                return (
                  <div key={m.id} className={`rounded-md border ${isAssigned ? 'border-border bg-muted/20' : 'border-transparent'}`}>
                    <label className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5">
                      <input type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleMember(m.id)}
                        className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium flex-1">{m.name}</span>
                      {m.projectRole && <span className="text-muted-foreground text-[10px]">{m.projectRole}</span>}
                      <span className="text-muted-foreground text-[10px] shrink-0">{m.hourlyRate} {currencyLabel}/h</span>
                    </label>

                    {isAssigned && hours && (
                      <div className="px-2 pb-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground w-14 shrink-0">Planned:</span>
                          <Input
                            type="number" min={0} step={0.5}
                            className="h-6 text-xs w-16 px-1.5"
                            value={hours.est}
                            onChange={(e) => setLocalHours((p) => ({ ...p, [m.id]: { ...p[m.id], est: e.target.value } }))}
                            onBlur={() => saveHours(m.id)}
                          />
                          <span className="text-[10px] text-muted-foreground">h</span>
                          {task.startDate && task.endDate && (
                            <button
                              title={`Auto-calculate: ${workingDaysBetween(task.startDate, task.endDate)} working days × ${(m.weeklyHours / 5).toFixed(1)} h/day = ${Math.round(workingDaysBetween(task.startDate, task.endDate) * (m.weeklyHours / 5) * 2) / 2}h`}
                              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                              onClick={() => autoCalcHours(m.id)}
                            >
                              <Calculator className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {(task.startDate && task.endDate || (assignment.estimatedHours > 0 && task.pricingMode === 'hourly')) && (
                          <div className="flex items-center gap-1 pl-[3.75rem]">
                            {task.startDate && task.endDate && (() => {
                              const wdays = workingDaysBetween(task.startDate, task.endDate)
                              const hpd = m.weeklyHours / 5
                              return (
                                <span className="text-[10px] text-muted-foreground/70">
                                  {wdays}d&nbsp;×&nbsp;{hpd % 1 === 0 ? hpd : hpd.toFixed(1)}h/d
                                </span>
                              )
                            })()}
                            {assignment.estimatedHours > 0 && task.pricingMode === 'hourly' && (
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                ≈&nbsp;{(assignment.estimatedHours * m.hourlyRate).toLocaleString()}&nbsp;{currencyLabel}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground w-14 shrink-0">Actual:</span>
                          <Input
                            type="number" min={0} step={0.5}
                            className="h-6 text-xs w-16 px-1.5"
                            value={hours.actual}
                            placeholder="—"
                            disabled={!canProgress}
                            onChange={(e) => setLocalHours((p) => ({ ...p, [m.id]: { ...p[m.id], actual: e.target.value } }))}
                            onBlur={() => saveHours(m.id)}
                          />
                          <span className="text-[10px] text-muted-foreground">h</span>
                          {assignment.actualHours != null && assignment.actualHours > 0 && task.pricingMode === 'hourly' && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              = {(assignment.actualHours * m.hourlyRate).toLocaleString()} {currencyLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              task.assignments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No one assigned</p>
              ) : (
                <div className="space-y-1.5">
                  {task.assignments.map((a) => {
                    const m = members.find((x) => x.id === a.personId)
                    if (!m) return null
                    const isOwnAssignment = a.personId === currentMemberId
                    const hours = localHours[a.personId]
                    return (
                      <div key={a.personId} className={`rounded-md border ${isOwnAssignment ? 'border-border bg-muted/20' : 'border-transparent'}`}>
                        <div className="flex items-center gap-2 text-xs px-2 py-1.5">
                          <span className="font-medium flex-1">{m.name}</span>
                          {m.projectRole && <span className="text-muted-foreground text-[10px]">{m.projectRole}</span>}
                        </div>
                        {isOwnAssignment && hours && (
                          <div className="px-2 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Planned:</span>
                              <Input
                                type="number" min={0} step={0.5}
                                className="h-6 text-xs w-16 px-1.5"
                                value={hours.est}
                                onChange={(e) => setLocalHours((p) => ({ ...p, [a.personId]: { ...p[a.personId], est: e.target.value } }))}
                                onBlur={() => saveHours(a.personId)}
                              />
                              <span className="text-[10px] text-muted-foreground">h</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Actual:</span>
                              <Input
                                type="number" min={0} step={0.5}
                                className="h-6 text-xs w-16 px-1.5"
                                value={hours.actual}
                                placeholder="—"
                                onChange={(e) => setLocalHours((p) => ({ ...p, [a.personId]: { ...p[a.personId], actual: e.target.value } }))}
                                onBlur={() => saveHours(a.personId)}
                              />
                              <span className="text-[10px] text-muted-foreground">h</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* Dependencies */}
        {canEdit && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Dependencies (predecessors)</Label>

            {task.dependencies.length > 0 && (
              <div className="space-y-1">
                {task.dependencies.map((dep) => {
                  const pred = tasks.find((t) => t.id === dep.taskId)
                  if (!pred) return null
                  return (
                    <div key={dep.taskId} className="flex items-center gap-1.5 text-xs rounded-md border px-2 py-1.5 bg-muted/20">
                      <span className="flex-1 truncate min-w-0">{pred.title}</span>
                      <span className="shrink-0 font-mono text-[10px] bg-muted rounded px-1">{dep.type}</span>
                      {dep.lagDays !== 0 && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {dep.lagDays > 0 ? '+' : ''}{dep.lagDays}d
                        </span>
                      )}
                      <button
                        className="h-4 w-4 flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDep(dep.taskId)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {(() => {
              const available = tasks.filter(
                (t) => t.id !== task.id && !task.dependencies.some((d) => d.taskId === t.id)
              )
              if (available.length === 0) return null
              return (
                <div className="space-y-1.5">
                  <Select value={newDepId} onValueChange={(v) => { setNewDepId(v); setDepError(null) }}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Add predecessor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {newDepId && (
                    <div className="flex items-center gap-1.5">
                      <Select value={newDepType} onValueChange={(v) => setNewDepType(v as DependencyType)}>
                        <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FS" title="Finish-to-Start: B starts after A finishes">FS – kończy→startuje</SelectItem>
                          <SelectItem value="SS" title="Start-to-Start: B starts after A starts">SS – startuje→startuje</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" step={1}
                        className="h-7 w-14 text-xs"
                        title="Lag in working days (negative = lead)"
                        value={newDepLag}
                        onChange={(e) => setNewDepLag(e.target.value)}
                      />
                      <span className="text-[10px] text-muted-foreground">d</span>
                      <Button size="sm" className="h-7 px-2 text-xs ml-auto" onClick={addDep}>Add</Button>
                    </div>
                  )}
                  {depError && <p className="text-[10px] text-destructive">{depError}</p>}
                </div>
              )
            })()}
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <textarea
            className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            placeholder="Add task description..."
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
