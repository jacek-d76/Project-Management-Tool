import { useState, useRef } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { useSessionStore } from '@/store/sessionStore'
import type { Task } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_H = 32   // task row height
const BAR_H = 18   // bar height inside row
const HDR_H = 44   // date header height (2 rows)
const MS_H  = 22   // milestone strip height at top of SVG

const ZOOM_OPTS = {
  week:     { dayW: 40,  label: 'Tydzień'  },
  month:    { dayW: 14,  label: 'Miesiąc'  },
  quarter:  { dayW:  5,  label: 'Kwartał'  },
  halfyear: { dayW:  3,  label: 'Pół roku' },
  year:     { dayW: 1.5, label: 'Rok'      },
} as const
type ZoomKey = keyof typeof ZOOM_OPTS

const STATUS_CLR: Record<string, string> = {
  TODO: '#94a3b8', IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#f59e0b', DONE: '#22c55e', BLOCKED: '#ef4444',
}
const MONTHS = ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru']
const WDAYS  = ['N','P','W','Ś','C','P','S']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iso(d: Date)  { return d.toISOString().slice(0, 10) }
function parse(s: string) { return new Date(s + 'T12:00:00') }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function diff(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000) }

// ─── GanttView ────────────────────────────────────────────────────────────────

export function GanttView() {
  const { project, tasks, milestones, setTaskDates } = useProjectStore()
  const isPM    = useSessionStore((s) => s.isPM())
  const can     = useSessionStore((s) => s.can)
  const canEdit = isPM || can('canEditTasks')

  const [zoom, setZoom]   = useState<ZoomKey>('month')
  const [leftW, setLeftW] = useState(220)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(tasks.map((t) => t.id))
  )
  const [hscroll, setHscroll] = useState(0)

  type DragState = {
    type: 'move' | 'resize'
    taskId: string; startX: number
    origStart: string; origEnd: string
    curStart: string; curEnd: string
  }
  const dragRef = useRef<DragState | null>(null)
  const [preview, setPreview] = useState<{ taskId: string; start: string; end: string } | null>(null)

  const leftRef  = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const syncing  = useRef(false)

  if (!project) return null

  const dayW = ZOOM_OPTS[zoom].dayW

  // ─── Date range ─────────────────────────────────────────────────────────────

  const allDates = [
    project.startDate, project.endDate,
    ...tasks.flatMap((t) => [t.startDate, t.endDate].filter(Boolean) as string[]),
    ...milestones.map((m) => m.date),
  ]
  const minD = parse(allDates.reduce((a, b) => (a < b ? a : b)))
  const maxD = parse(allDates.reduce((a, b) => (a > b ? a : b)))
  const gsDate    = addDays(minD, -7)
  const geDate    = addDays(maxD, +14)
  const totalDays = diff(gsDate, geDate) + 1
  const totalW    = totalDays * dayW

  const xOf = (s: string) => diff(gsDate, parse(s)) * dayW

  // ─── Flatten visible tree ────────────────────────────────────────────────────

  const getKids = (pid: string | null) =>
    tasks.filter((t) => t.parentId === pid).sort((a, b) => a.position - b.position)

  const rows: { task: Task; depth: number }[] = []
  const visit = (pid: string | null, depth: number) => {
    for (const t of getKids(pid)) {
      rows.push({ task: t, depth })
      if (expanded.has(t.id)) visit(t.id, depth + 1)
    }
  }
  visit(null, 0)

  const svgH = MS_H + rows.length * ROW_H

  // ─── Header cells ────────────────────────────────────────────────────────────

  const topRow: { x: number; w: number; label: string }[] = []
  const botRow: { x: number; w: number; label: string }[] = []

  if (zoom === 'year') {
    // topRow = years, botRow = quarters
    let lastYKey = '', lastYX = 0
    let lastQKey = '', lastQX = 0
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(gsDate, i)
      const x = i * dayW
      const yk = `${d.getFullYear()}`
      const qk = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3)}`
      if (yk !== lastYKey) {
        if (topRow.length) topRow[topRow.length - 1].w = x - lastYX
        topRow.push({ x, w: 0, label: `${d.getFullYear()}` })
        lastYX = x; lastYKey = yk
      }
      if (qk !== lastQKey) {
        if (botRow.length) botRow[botRow.length - 1].w = x - lastQX
        botRow.push({ x, w: 0, label: `Q${Math.floor(d.getMonth() / 3) + 1}` })
        lastQX = x; lastQKey = qk
      }
    }
    if (topRow.length) topRow[topRow.length - 1].w = totalW - lastYX
    if (botRow.length) botRow[botRow.length - 1].w = totalW - lastQX
  } else {
    let lastMK = '', lastMX = 0
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(gsDate, i)
      const x = i * dayW
      const mk = `${d.getFullYear()}-${d.getMonth()}`
      if (mk !== lastMK) {
        if (topRow.length) topRow[topRow.length - 1].w = x - lastMX
        topRow.push({ x, w: 0, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` })
        lastMX = x; lastMK = mk
      }
      if (zoom === 'week') {
        botRow.push({ x, w: dayW, label: `${WDAYS[d.getDay()]} ${d.getDate()}` })
      } else if (zoom === 'month' && d.getDay() === 1) {
        botRow.push({ x, w: 7 * dayW, label: `${d.getDate()} ${MONTHS[d.getMonth()]}` })
      } else if ((zoom === 'quarter' || zoom === 'halfyear') && d.getDate() === 1) {
        if (botRow.length) botRow[botRow.length - 1].w = x - botRow[botRow.length - 1].x
        botRow.push({ x, w: 0, label: MONTHS[d.getMonth()] })
      }
    }
    if (topRow.length) topRow[topRow.length - 1].w = totalW - lastMX
    if ((zoom === 'quarter' || zoom === 'halfyear') && botRow.length)
      botRow[botRow.length - 1].w = totalW - botRow[botRow.length - 1].x
  }

  // ─── Left panel resize ───────────────────────────────────────────────────────

  const onDividerDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftW
    const onMove = (ev: MouseEvent) => {
      setLeftW(Math.max(120, Math.min(600, startW + ev.clientX - startX)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─── Drag ────────────────────────────────────────────────────────────────────

  const onBarDown = (e: React.MouseEvent, task: Task, type: 'move' | 'resize') => {
    if (!canEdit || !task.startDate || !task.endDate) return
    e.preventDefault(); e.stopPropagation()
    dragRef.current = {
      type, taskId: task.id, startX: e.clientX,
      origStart: task.startDate, origEnd: task.endDate,
      curStart: task.startDate, curEnd: task.endDate,
    }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = Math.round((ev.clientX - dragRef.current.startX) / dayW)
      const { origStart, origEnd } = dragRef.current
      if (type === 'move') {
        const ns = iso(addDays(parse(origStart), delta))
        const ne = iso(addDays(parse(origEnd),   delta))
        dragRef.current.curStart = ns; dragRef.current.curEnd = ne
        setPreview({ taskId: task.id, start: ns, end: ne })
      } else {
        const ne = iso(addDays(parse(origEnd), delta))
        if (ne >= origStart) {
          dragRef.current.curEnd = ne
          setPreview({ taskId: task.id, start: origStart, end: ne })
        }
      }
    }
    const onUp = () => {
      if (dragRef.current) {
        setTaskDates(dragRef.current.taskId, dragRef.current.curStart, dragRef.current.curEnd)
        dragRef.current = null; setPreview(null)
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─── Scroll sync ─────────────────────────────────────────────────────────────

  const onLeftScroll = () => {
    if (syncing.current) return
    syncing.current = true
    if (rightRef.current && leftRef.current) rightRef.current.scrollTop = leftRef.current.scrollTop
    syncing.current = false
  }
  const onRightScroll = () => {
    if (syncing.current) return
    syncing.current = true
    if (leftRef.current && rightRef.current) leftRef.current.scrollTop = rightRef.current.scrollTop
    setHscroll(rightRef.current?.scrollLeft ?? 0)
    syncing.current = false
  }

  // ─── Dependency arrows ───────────────────────────────────────────────────────

  const arrows = tasks.flatMap((succ) =>
    succ.dependencies.flatMap((dep) => {
      const pred = tasks.find((t) => t.id === dep.taskId)
      if (!pred?.startDate || !pred?.endDate || !succ.startDate) return []
      const pi = rows.findIndex((r) => r.task.id === pred.id)
      const si = rows.findIndex((r) => r.task.id === succ.id)
      if (pi < 0 || si < 0) return []
      const py = MS_H + pi * ROW_H + ROW_H / 2
      const sy = MS_H + si * ROW_H + ROW_H / 2
      if (dep.type === 'FS') {
        const x1 = xOf(pred.endDate) + dayW
        const x2 = xOf(succ.startDate)
        const cx = Math.max(x1 + 6, x2 - 6)
        return [<path key={`${dep.taskId}>${succ.id}`}
          d={`M${x1},${py} H${cx} V${sy} H${x2}`}
          fill="none" stroke="#6366f1" strokeWidth={1.5} markerEnd="url(#arr-fs)" opacity={0.7} />]
      } else {
        const x1 = xOf(pred.startDate)
        const x2 = xOf(succ.startDate)
        const lx = Math.min(x1, x2) - 10
        return [<path key={`${dep.taskId}>${succ.id}`}
          d={`M${x1},${py} H${lx} V${sy} H${x2}`}
          fill="none" stroke="#8b5cf6" strokeWidth={1.5} markerEnd="url(#arr-ss)" opacity={0.7} />]
      }
    })
  )

  // ─── Grid line major condition ────────────────────────────────────────────────

  const isMajorLine = (d: Date) => {
    if (zoom === 'week')     return true
    if (zoom === 'month')    return d.getDay() === 1
    if (zoom === 'quarter')  return d.getDate() === 1
    if (zoom === 'halfyear') return d.getDate() === 1
    if (zoom === 'year')     return d.getDate() === 1 && [0, 3, 6, 9].includes(d.getMonth())
    return false
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0 bg-background">
        <span className="text-xs text-muted-foreground mr-1">Zoom:</span>
        {(Object.keys(ZOOM_OPTS) as ZoomKey[]).map((z) => (
          <button key={z} onClick={() => setZoom(z)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              zoom === z ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
            }`}>
            {ZOOM_OPTS[z].label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {tasks.filter((t) => t.startDate && t.endDate).length}/{tasks.length} zadań z datami
        </span>
      </div>

      {/* Fixed date header */}
      <div className="flex shrink-0 border-b" style={{ height: HDR_H }}>
        {/* Left corner */}
        <div className="shrink-0 border-r bg-muted/30 flex items-end px-3 pb-1" style={{ width: leftW }}>
          <span className="text-[11px] font-semibold text-muted-foreground">Zadanie</span>
        </div>
        {/* Divider placeholder */}
        <div className="w-1 shrink-0 bg-border" />
        {/* Scrolling header */}
        <div className="flex-1 overflow-hidden bg-muted/10 relative">
          <div style={{ transform: `translateX(-${hscroll}px)`, width: totalW, height: HDR_H, position: 'relative' }}>
            {topRow.map((c) => (
              <div key={c.x} className="absolute top-0 border-r border-border/30 flex items-center px-1.5 overflow-hidden"
                style={{ left: c.x, width: c.w, height: HDR_H / 2 }}>
                <span className="text-[10px] font-semibold text-muted-foreground truncate">{c.label}</span>
              </div>
            ))}
            {botRow.map((c) => (
              <div key={c.x} className="absolute bottom-0 border-r border-t border-border/20 flex items-center justify-center overflow-hidden"
                style={{ left: c.x, width: c.w, height: HDR_H / 2 }}>
                <span className="text-[9px] text-muted-foreground">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: task names */}
        <div ref={leftRef} onScroll={onLeftScroll}
          className="shrink-0 border-r overflow-y-scroll overflow-x-hidden"
          style={{ width: leftW }}>

          {/* Milestone label row */}
          <div style={{ height: MS_H }}
            className="border-b border-amber-200/50 bg-amber-50/20 flex items-center px-3">
            <span className="text-[9px] font-medium text-amber-700/60 uppercase tracking-wide">Milestone'y</span>
          </div>

          {rows.map(({ task, depth }) => {
            const hasKids = tasks.some((c) => c.parentId === task.id)
            return (
              <div key={task.id}
                className="flex items-center gap-1 border-b border-border/20 hover:bg-accent/20 text-xs"
                style={{ height: ROW_H, paddingLeft: 4 + depth * 14 }}>
                <button
                  className="h-4 w-4 shrink-0 flex items-center justify-center"
                  onClick={() => {
                    if (!hasKids) return
                    setExpanded((p) => {
                      const n = new Set(p); n.has(task.id) ? n.delete(task.id) : n.add(task.id); return n
                    })
                  }}>
                  {hasKids
                    ? expanded.has(task.id)
                      ? <ChevronDown  className="h-3 w-3 text-muted-foreground" />
                      : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    : null}
                </button>
                <span className={`truncate ${task.status === 'DONE' ? 'line-through opacity-40' : ''}`}>
                  {task.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Resize divider */}
        <div
          onMouseDown={onDividerDown}
          className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 transition-colors"
          title="Przeciągnij aby zmienić szerokość"
        />

        {/* Right: timeline SVG */}
        <div ref={rightRef} onScroll={onRightScroll} className="flex-1 overflow-auto">
          <div style={{ width: totalW, height: Math.max(svgH, 200) }}>
            <svg width={totalW} height={Math.max(svgH, 200)} style={{ display: 'block' }}>
              <defs>
                <marker id="arr-fs" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L5,2.5 L0,5 Z" fill="#6366f1" />
                </marker>
                <marker id="arr-ss" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L5,2.5 L0,5 Z" fill="#8b5cf6" />
                </marker>
              </defs>

              {/* Weekend shading */}
              {Array.from({ length: totalDays }, (_, i) => {
                const dow = addDays(gsDate, i).getDay()
                return (dow === 0 || dow === 6)
                  ? <rect key={i} x={i * dayW} y={0} width={dayW} height={svgH} fill="rgba(0,0,0,0.025)" />
                  : null
              })}

              {/* Vertical grid lines */}
              {Array.from({ length: totalDays }, (_, i) => {
                const d = addDays(gsDate, i)
                return isMajorLine(d)
                  ? <line key={i} x1={i * dayW} y1={0} x2={i * dayW} y2={svgH}
                      stroke="currentColor" strokeWidth={0.3} opacity={0.2} />
                  : null
              })}

              {/* Horizontal row lines */}
              {Array.from({ length: rows.length + 1 }, (_, i) => (
                <line key={i}
                  x1={0} y1={MS_H + i * ROW_H} x2={totalW} y2={MS_H + i * ROW_H}
                  stroke="currentColor" strokeWidth={0.3} opacity={0.1} />
              ))}

              {/* Today line */}
              {(() => {
                const tx = xOf(iso(new Date())) + dayW / 2
                return tx > 0 && tx < totalW
                  ? <line x1={tx} y1={0} x2={tx} y2={svgH}
                      stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.35} />
                  : null
              })()}

              {/* Milestones */}
              {milestones.map((m) => {
                const mx = xOf(m.date) + dayW / 2
                const half = 7
                const cy = MS_H / 2
                return (
                  <g key={m.id}>
                    <line x1={mx} y1={0} x2={mx} y2={svgH}
                      stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" opacity={0.3} />
                    <polygon
                      points={`${mx},${cy - half} ${mx + half},${cy} ${mx},${cy + half} ${mx - half},${cy}`}
                      fill="#f59e0b" stroke="white" strokeWidth={1} />
                    <text x={mx + half + 3} y={cy + 4} fontSize={9} fill="#92400e"
                      style={{ pointerEvents: 'none' }}>
                      {m.name}
                    </text>
                  </g>
                )
              })}

              {/* Dependency arrows */}
              {arrows}

              {/* Task bars */}
              {rows.map(({ task }, ri) => {
                const p = preview?.taskId === task.id ? preview : null
                const s = p?.start ?? task.startDate
                const e = p?.end   ?? task.endDate
                if (!s || !e) return null

                const bx = xOf(s)
                const bw = Math.max(dayW * 0.7, (diff(parse(s), parse(e)) + 1) * dayW)
                const by = MS_H + ri * ROW_H + (ROW_H - BAR_H) / 2
                const color = STATUS_CLR[task.status] || '#94a3b8'
                const maxChars = Math.max(0, Math.floor((bw - 8) / 6.5))

                return (
                  <g key={task.id}>
                    {/* Bar */}
                    <rect x={bx} y={by} width={bw} height={BAR_H} rx={3}
                      fill={color} opacity={p ? 0.55 : 0.85}
                      style={{ cursor: canEdit ? 'grab' : 'default' }}
                      onMouseDown={(ev) => onBarDown(ev, task, 'move')} />

                    {/* Progress strip */}
                    {task.progress > 0 && (
                      <rect x={bx} y={by + BAR_H - 4}
                        width={bw * task.progress / 100} height={4} rx={2}
                        fill="rgba(255,255,255,0.5)"
                        style={{ pointerEvents: 'none' }} />
                    )}

                    {/* Title */}
                    {maxChars > 2 && (
                      <text x={bx + 4} y={by + BAR_H / 2 + 4} fontSize={10} fill="white"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {task.title.length > maxChars ? task.title.slice(0, maxChars) + '…' : task.title}
                      </text>
                    )}

                    {/* Resize handle */}
                    {canEdit && (
                      <rect x={bx + bw - 7} y={by} width={7} height={BAR_H} rx={2}
                        fill="rgba(0,0,0,0.2)"
                        style={{ cursor: 'ew-resize' }}
                        onMouseDown={(ev) => { ev.stopPropagation(); onBarDown(ev, task, 'resize') }} />
                    )}

                    {/* Dates tooltip (title element) */}
                    <title>{task.title}: {s} → {e} ({task.progress}%)</title>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
