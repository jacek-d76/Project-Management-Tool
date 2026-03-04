import type { Task, TeamMember } from '@/types'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export interface WeekDef {
  start: string  // YYYY-MM-DD (Monday)
  end: string    // YYYY-MM-DD (Sunday)
  label: string  // e.g. "Mar 3"
}

export interface TaskAlloc {
  taskId: string
  title: string
  hours: number
}

export interface WorkloadCell {
  hours: number       // total allocated hours this week for this person
  capacity: number    // person's weeklyHours (full week)
  tasks: TaskAlloc[]
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function shiftDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Monday of the week containing dateStr */
function mondayOf(dateStr: string): Date {
  const d = new Date(dateStr)
  const dow = d.getDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow
  return shiftDays(d, diff)
}

/** Count Mon–Fri days between two ISO date strings (inclusive) */
function workingDays(startStr: string, endStr: string): number {
  if (startStr > endStr) return 0
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

// ─── Public API ───────────────────────────────────────────────────────────────

/** Generate one WeekDef per calendar week (Mon–Sun) spanning the project. */
export function generateWeeks(projectStart: string, projectEnd: string): WeekDef[] {
  const weeks: WeekDef[] = []
  let mon = mondayOf(projectStart)
  const endDate = new Date(projectEnd)

  while (mon <= endDate) {
    const sun = shiftDays(mon, 6)
    weeks.push({
      start: toIso(mon),
      end:   toIso(sun),
      label: `${MONTH_SHORT[mon.getMonth()]} ${mon.getDate()}`,
    })
    mon = shiftDays(mon, 7)
  }
  return weeks
}

/**
 * For each (member, week) pair compute allocated hours by distributing
 * each assignment's estimatedHours proportionally across the working days
 * that fall within the task's date range.
 *
 * Returns: Map<personId, Map<weekStart, WorkloadCell>>
 */
export function computeWorkload(
  tasks: Task[],
  members: TeamMember[],
  weeks: WeekDef[],
): Map<string, Map<string, WorkloadCell>> {
  // Initialise empty grid
  const grid = new Map<string, Map<string, WorkloadCell>>()
  for (const m of members) {
    const row = new Map<string, WorkloadCell>()
    for (const w of weeks) row.set(w.start, { hours: 0, capacity: m.weeklyHours, tasks: [] })
    grid.set(m.id, row)
  }

  for (const task of tasks) {
    if (!task.startDate || !task.endDate) continue
    const totalWdays = workingDays(task.startDate, task.endDate)
    if (totalWdays === 0) continue

    for (const a of task.assignments) {
      if (a.estimatedHours <= 0) continue
      const row = grid.get(a.personId)
      if (!row) continue

      const hpd = a.estimatedHours / totalWdays  // hours per working day

      for (const w of weeks) {
        // Overlap between task and week
        const oStart = task.startDate > w.start ? task.startDate : w.start
        const oEnd   = task.endDate   < w.end   ? task.endDate   : w.end
        if (oStart > oEnd) continue

        const oWdays = workingDays(oStart, oEnd)
        if (oWdays === 0) continue

        const h = Math.round(oWdays * hpd * 10) / 10
        const cell = row.get(w.start)!
        cell.hours = Math.round((cell.hours + h) * 10) / 10

        const existing = cell.tasks.find((t) => t.taskId === task.id)
        if (existing) {
          existing.hours = Math.round((existing.hours + h) * 10) / 10
        } else {
          cell.tasks.push({ taskId: task.id, title: task.title, hours: h })
        }
      }
    }
  }

  return grid
}
