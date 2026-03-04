import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { generateWeeks, computeWorkload } from '@/lib/workload'
import type { WeekDef, WorkloadCell } from '@/lib/workload'
import type { TeamMember } from '@/types'

// ─── Cell colour helpers ──────────────────────────────────────────────────────

function cellBg(ratio: number): string {
  if (ratio <= 0)   return ''
  if (ratio < 0.5)  return 'bg-sky-50 dark:bg-sky-950/30'
  if (ratio < 0.8)  return 'bg-yellow-100 dark:bg-yellow-900/40'
  if (ratio <= 1.0) return 'bg-orange-200 dark:bg-orange-800/50'
  return 'bg-red-200 dark:bg-red-800/50'
}

function cellText(ratio: number): string {
  if (ratio <= 0)   return 'text-muted-foreground/30'
  if (ratio < 0.5)  return 'text-sky-700 dark:text-sky-400'
  if (ratio < 0.8)  return 'text-yellow-800 dark:text-yellow-300'
  if (ratio <= 1.0) return 'text-orange-800 dark:text-orange-200'
  return 'text-red-800 dark:text-red-200'
}

// ─── Cell detail popup ────────────────────────────────────────────────────────

function CellPopup({
  cell, member, week, onClose,
}: {
  cell: WorkloadCell
  member: TeamMember
  week: WeekDef
  onClose: () => void
}) {
  const ratio = cell.hours / cell.capacity
  const pct   = Math.round(ratio * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-background border rounded-xl shadow-xl p-5 w-80 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-sm">{member.name}</p>
            <p className="text-xs text-muted-foreground">
              Week of {week.label}
              <span className="ml-1">({week.start} – {week.end})</span>
            </p>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground ml-3 shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                ratio <= 0 ? '' : ratio < 0.8 ? 'bg-yellow-400' : ratio <= 1 ? 'bg-orange-400' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
          <p className={`text-xs mt-1 font-medium ${cellText(ratio)}`}>
            {cell.hours}h allocated · {cell.capacity}h capacity · {pct}%
            {ratio > 1 && <span className="ml-1 text-red-600 font-semibold">OVERLOADED</span>}
          </p>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-auto space-y-1">
          {cell.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No tasks this week.</p>
          ) : (
            [...cell.tasks]
              .sort((a, b) => b.hours - a.hours)
              .map((t) => (
                <div
                  key={t.taskId}
                  className="flex justify-between items-center text-xs rounded-md bg-muted px-3 py-1.5 gap-2"
                >
                  <span className="truncate flex-1 text-muted-foreground">{t.title}</span>
                  <span className="font-semibold shrink-0">{t.hours}h</span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── WorkloadView ─────────────────────────────────────────────────────────────

const NAME_W = 168  // px — fixed width of the name column

export function WorkloadView() {
  const { project, tasks, members } = useProjectStore()
  const [popup, setPopup] = useState<{ personId: string; weekStart: string } | null>(null)

  if (!project) return null

  const active = members.filter((m) => m.isActive)
  const weeks  = generateWeeks(project.startDate, project.endDate)
  const grid   = computeWorkload(tasks, active, weeks)

  const popupMember = popup ? active.find((m) => m.id === popup.personId)         : null
  const popupWeek   = popup ? weeks.find((w) => w.start === popup.weekStart)       : null
  const popupCell   = popup ? grid.get(popup.personId)?.get(popup.weekStart) ?? null : null

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Workload</h2>
          <span className="text-xs text-muted-foreground">
            {active.length} member{active.length !== 1 ? 's' : ''} · {weeks.length} week{weeks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-sky-50 border border-sky-200" />
            &lt;50%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300" />
            50–80%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-orange-200 border border-orange-400" />
            80–100%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-200 border border-red-400" />
            &gt;100%
          </span>
        </div>
      </div>

      {/* ── Grid ── */}
      {active.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No active team members.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-sm" style={{ minWidth: NAME_W + weeks.length * 76 }}>

            {/* ── Header row ── */}
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                {/* Name col header */}
                <th
                  className="sticky left-0 z-20 bg-background border-b border-r text-left text-xs font-medium text-muted-foreground px-3 py-2"
                  style={{ width: NAME_W, minWidth: NAME_W }}
                >
                  Team member
                </th>
                {weeks.map((w) => (
                  <th
                    key={w.start}
                    className="border-b text-center text-[10px] font-medium text-muted-foreground px-1 py-2 whitespace-nowrap"
                    style={{ minWidth: 72 }}
                  >
                    {w.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Data rows ── */}
            <tbody>
              {active.map((member, ri) => {
                const row = grid.get(member.id)!
                const rowBg = ri % 2 === 0 ? 'bg-background' : 'bg-muted/20'

                return (
                  <tr key={member.id} className={rowBg}>
                    {/* Name cell (sticky) */}
                    <td
                      className={`sticky left-0 z-10 border-r px-3 py-2 ${rowBg}`}
                      style={{ width: NAME_W, minWidth: NAME_W }}
                    >
                      <div className="truncate font-medium text-sm">{member.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {member.projectRole ? `${member.projectRole} · ` : ''}{member.weeklyHours}h/wk
                      </div>
                    </td>

                    {/* Week cells */}
                    {weeks.map((w) => {
                      const cell  = row.get(w.start) ?? { hours: 0, capacity: member.weeklyHours, tasks: [] }
                      const ratio = cell.hours / cell.capacity
                      const empty = cell.hours === 0

                      return (
                        <td
                          key={w.start}
                          className={[
                            'text-center px-1 py-1 border-b border-r/20 select-none',
                            empty ? '' : `cursor-pointer hover:opacity-75 ${cellBg(ratio)}`,
                          ].join(' ')}
                          title={empty ? undefined : `${cell.hours}h / ${cell.capacity}h (${Math.round(ratio * 100)}%)`}
                          onClick={() => !empty && setPopup({ personId: member.id, weekStart: w.start })}
                        >
                          {empty ? (
                            <span className="text-[10px] text-muted-foreground/25">—</span>
                          ) : (
                            <div>
                              <div className={`text-[11px] font-semibold leading-tight ${cellText(ratio)}`}>
                                {cell.hours}h
                              </div>
                              <div className="text-[9px] text-muted-foreground leading-tight">
                                {Math.round(ratio * 100)}%
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Cell popup ── */}
      {popup && popupMember && popupWeek && popupCell && (
        <CellPopup
          cell={popupCell}
          member={popupMember}
          week={popupWeek}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
