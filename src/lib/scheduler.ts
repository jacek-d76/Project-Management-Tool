import type { Task } from '@/types'

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Add N working days to a date (negative = subtract). */
export function addWorkingDays(dateStr: string, days: number): string {
  if (days === 0) return dateStr
  const d = new Date(dateStr)
  const sign = days > 0 ? 1 : -1
  let remaining = Math.abs(days)
  while (remaining > 0) {
    d.setDate(d.getDate() + sign)
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining--
  }
  return d.toISOString().slice(0, 10)
}

/** Count working days between two dates (inclusive both ends). */
export function workingDaysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr)
  const end   = new Date(endStr)
  if (start > end) return 0
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// ─── Cycle detection ──────────────────────────────────────────────────────────

/** Returns true if making predecessorId a predecessor of taskId would create a cycle. */
export function wouldCreateCycle(tasks: Task[], taskId: string, predecessorId: string): boolean {
  if (taskId === predecessorId) return true
  const visited = new Set<string>()
  const dfs = (id: string): boolean => {
    if (id === taskId) return true
    if (visited.has(id)) return false
    visited.add(id)
    const t = tasks.find((t) => t.id === id)
    return t?.dependencies.some((d) => dfs(d.taskId)) ?? false
  }
  return dfs(predecessorId)
}

// ─── Forward-pass scheduler ───────────────────────────────────────────────────

/**
 * Starting from changedTaskId, propagate date changes to all successors.
 * Returns a Map of taskId → { startDate, endDate } for tasks that need updating.
 * The caller is responsible for applying the updates.
 */
export function runScheduler(
  tasks: Task[],
  changedTaskId: string,
): Map<string, { startDate: string; endDate: string }> {
  const updates = new Map<string, { startDate: string; endDate: string }>()
  const queue   = [changedTaskId]
  const processed = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (processed.has(currentId)) continue
    processed.add(currentId)

    // Find successors – tasks that list currentId in their dependencies
    const successors = tasks.filter((t) =>
      t.dependencies.some((d) => d.taskId === currentId)
    )

    for (const successor of successors) {
      let earliestStart: string | null = null

      for (const dep of successor.dependencies) {
        const pred = tasks.find((t) => t.id === dep.taskId)
        if (!pred) continue

        // Use already-scheduled dates if available
        const predUpd  = updates.get(dep.taskId)
        const predStart = predUpd?.startDate ?? pred.startDate
        const predEnd   = predUpd?.endDate   ?? pred.endDate
        if (!predStart || !predEnd) continue

        const candidate =
          dep.type === 'FS'
            ? addWorkingDays(predEnd, 1 + dep.lagDays)    // starts after predecessor ends
            : addWorkingDays(predStart, dep.lagDays)       // starts with predecessor (SS)

        if (!earliestStart || candidate > earliestStart) earliestStart = candidate
      }

      if (!earliestStart) continue

      const existing      = updates.get(successor.id)
      const currentStart  = existing?.startDate ?? successor.startDate
      const currentEnd    = existing?.endDate   ?? successor.endDate

      if (currentStart === earliestStart) continue  // no change needed

      // Preserve task duration (in working days)
      if (currentStart && currentEnd) {
        const duration = workingDaysBetween(currentStart, currentEnd)
        const newEnd   = duration > 0 ? addWorkingDays(earliestStart, duration - 1) : earliestStart
        updates.set(successor.id, { startDate: earliestStart, endDate: newEnd })
      } else {
        updates.set(successor.id, { startDate: earliestStart, endDate: earliestStart })
      }

      queue.push(successor.id)
    }
  }

  return updates
}
