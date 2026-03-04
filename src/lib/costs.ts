import type { Task, TeamMember } from '@/types'

// ─── Output types ─────────────────────────────────────────────────────────────

export interface PersonCost {
  personId: string
  name: string
  projectRole: string
  hourlyRate: number       // EUR
  estimatedHours: number
  actualHours: number
  estimatedCost: number    // EUR
  actualCost: number       // EUR (based on actualHours)
  earnedValue: number      // EUR (estimatedCost × weighted progress)
}

export interface TaskCost {
  taskId: string
  title: string
  depth: number
  pricingMode: 'hourly' | 'fixed'
  progress: number         // 0–100 (leaf) or weighted avg (parent)
  estimatedCost: number    // EUR
  earnedValue: number      // EUR
  actualCost: number       // EUR
  timeElapsedPct: number | null
  isAtRisk: boolean
  children: TaskCost[]
}

export interface CostTotals {
  budget: number           // total estimated EUR
  earnedValue: number      // EV EUR
  actualCost: number       // AC EUR
  remaining: number        // budget – earnedValue
  evPct: number            // EV / budget %
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function leafCosts(task: Task, members: TeamMember[]): { est: number; actual: number } {
  if (task.pricingMode === 'fixed') {
    return { est: task.fixedPrice ?? 0, actual: task.fixedPrice ?? 0 }
  }
  let est = 0, actual = 0
  for (const a of task.assignments) {
    const m = members.find((x) => x.id === a.personId)
    if (!m) continue
    est    += a.estimatedHours * m.hourlyRate
    actual += (a.actualHours ?? 0) * m.hourlyRate
  }
  return { est, actual }
}

function buildTaskCost(
  task: Task,
  allTasks: Task[],
  members: TeamMember[],
  today: string,
  depth: number,
): TaskCost {
  const children = allTasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => a.position - b.position)

  let estimatedCost: number
  let actualCost: number
  let earnedValue: number
  let childCosts: TaskCost[]
  let progress: number

  if (children.length > 0) {
    childCosts    = children.map((c) => buildTaskCost(c, allTasks, members, today, depth + 1))
    estimatedCost = childCosts.reduce((s, c) => s + c.estimatedCost, 0)
    actualCost    = childCosts.reduce((s, c) => s + c.actualCost, 0)
    earnedValue   = childCosts.reduce((s, c) => s + c.earnedValue, 0)
    // Weighted-average progress for display
    progress = estimatedCost > 0
      ? Math.round(earnedValue / estimatedCost * 100)
      : Math.round(childCosts.reduce((s, c) => s + c.progress, 0) / childCosts.length)
  } else {
    childCosts    = []
    const { est, actual } = leafCosts(task, members)
    estimatedCost = est
    actualCost    = actual
    earnedValue   = est * (task.progress / 100)
    progress      = task.progress
  }

  // Time elapsed %
  let timeElapsedPct: number | null = null
  if (task.startDate && task.endDate) {
    const s = new Date(task.startDate).getTime()
    const e = new Date(task.endDate).getTime()
    const n = new Date(today).getTime()
    if (e > s) timeElapsedPct = Math.min(100, Math.max(0, (n - s) / (e - s) * 100))
  }

  // At risk: time > 25% elapsed but progress < 50% of elapsed time
  const isAtRisk =
    timeElapsedPct != null &&
    task.status !== 'DONE' &&
    timeElapsedPct > 25 &&
    progress < timeElapsedPct * 0.5

  return {
    taskId: task.id, title: task.title, depth,
    pricingMode: task.pricingMode, progress,
    estimatedCost, earnedValue, actualCost,
    timeElapsedPct, isAtRisk, children: childCosts,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeTaskCostTree(
  tasks: Task[],
  members: TeamMember[],
  today: string,
): TaskCost[] {
  return tasks
    .filter((t) => !t.parentId)
    .sort((a, b) => a.position - b.position)
    .map((t) => buildTaskCost(t, tasks, members, today, 0))
}

export function computePersonCosts(tasks: Task[], members: TeamMember[]): PersonCost[] {
  const map = new Map<string, PersonCost>()
  for (const m of members) {
    map.set(m.id, {
      personId: m.id, name: m.name, projectRole: m.projectRole, hourlyRate: m.hourlyRate,
      estimatedHours: 0, actualHours: 0, estimatedCost: 0, actualCost: 0, earnedValue: 0,
    })
  }

  for (const task of tasks) {
    if (task.pricingMode !== 'hourly') continue
    const evRatio = task.progress / 100
    for (const a of task.assignments) {
      const pc = map.get(a.personId)
      const m  = members.find((x) => x.id === a.personId)
      if (!pc || !m) continue
      pc.estimatedHours += a.estimatedHours
      pc.actualHours    += a.actualHours ?? 0
      pc.estimatedCost  += a.estimatedHours * m.hourlyRate
      pc.actualCost     += (a.actualHours ?? 0) * m.hourlyRate
      pc.earnedValue    += a.estimatedHours * m.hourlyRate * evRatio
    }
  }

  return [...map.values()].filter((p) => p.estimatedCost > 0 || p.actualCost > 0)
}

export function computeTotals(tree: TaskCost[]): CostTotals {
  const budget      = tree.reduce((s, t) => s + t.estimatedCost, 0)
  const earnedValue = tree.reduce((s, t) => s + t.earnedValue, 0)
  const actualCost  = tree.reduce((s, t) => s + t.actualCost, 0)
  return {
    budget,
    earnedValue,
    actualCost,
    remaining: budget - earnedValue,
    evPct: budget > 0 ? Math.round(earnedValue / budget * 100) : 0,
  }
}
