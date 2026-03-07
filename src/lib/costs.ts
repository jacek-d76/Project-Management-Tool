import type { Task, TeamMember, Contractor, Currency } from '@/types'

// ─── Output types ─────────────────────────────────────────────────────────────

export interface PersonCost {
  personId: string
  name: string
  projectRole: string
  hourlyRate: number         // in hourlyRateCurrency
  hourlyRateCurrency: Currency
  estimatedHours: number
  actualHours: number
  estimatedCost: number    // EUR
  actualCost: number       // EUR (based on actualHours)
  earnedValue: number      // EUR (estimatedCost × weighted progress)
  contractorId?: string    // jeśli ustawione → koszty pokrywa kontrakt firmy
}

export interface ContractorMemberWorkload {
  name: string
  estimatedHours: number
  actualHours: number
}

export interface ContractorCost {
  contractorId: string
  name: string
  contractPrice: number      // in contractCurrency
  contractPriceEur: number   // normalized to EUR for budget totals
  contractCurrency: Currency
  description: string
  members: ContractorMemberWorkload[]
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
  budget: number           // suma zadań + kontrakty firm
  earnedValue: number      // EV EUR
  actualCost: number       // AC EUR
  remaining: number        // budget – earnedValue
  evPct: number            // EV / budget %
  tasksBudget: number      // część z zadań (hourly indywidualni + fixed tasks)
  contractorsBudget: number // suma kontraktów firm
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Zwraca Set ID członków należących do firm (ich koszty godzinowe są wykluczone) */
function contractorMemberIds(members: TeamMember[]): Set<string> {
  return new Set(members.filter((m) => m.contractorId).map((m) => m.id))
}

type Rates = { eurToPln: number; eurToUsd: number }

function memberRateEur(m: TeamMember, rates: Rates): number {
  return toEur(m.hourlyRate, m.hourlyRateCurrency ?? 'EUR', rates.eurToPln, rates.eurToUsd)
}

function leafCosts(
  task: Task,
  members: TeamMember[],
  excludeIds: Set<string>,
  rates: Rates,
): { est: number; actual: number } {
  if (task.pricingMode === 'fixed') {
    return { est: task.fixedPrice ?? 0, actual: task.status === 'DONE' ? (task.fixedPrice ?? 0) : 0 }
  }
  let est = 0, actual = 0
  for (const a of task.assignments) {
    if (excludeIds.has(a.personId)) continue   // pomiń — pokrywa kontrakt firmy
    const m = members.find((x) => x.id === a.personId)
    if (!m) continue
    const rateEur = memberRateEur(m, rates)
    est    += a.estimatedHours * rateEur
    actual += (a.actualHours ?? 0) * rateEur
  }
  return { est, actual }
}

function buildTaskCost(
  task: Task,
  allTasks: Task[],
  members: TeamMember[],
  excludeIds: Set<string>,
  today: string,
  depth: number,
  rates: Rates,
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
    childCosts    = children.map((c) => buildTaskCost(c, allTasks, members, excludeIds, today, depth + 1, rates))
    estimatedCost = childCosts.reduce((s, c) => s + c.estimatedCost, 0)
    actualCost    = childCosts.reduce((s, c) => s + c.actualCost, 0)
    earnedValue   = childCosts.reduce((s, c) => s + c.earnedValue, 0)
    progress = estimatedCost > 0
      ? Math.round(earnedValue / estimatedCost * 100)
      : Math.round(childCosts.reduce((s, c) => s + c.progress, 0) / childCosts.length)
  } else {
    childCosts    = []
    const { est, actual } = leafCosts(task, members, excludeIds, rates)
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
  rates: Rates,
): TaskCost[] {
  const excludeIds = contractorMemberIds(members)
  return tasks
    .filter((t) => !t.parentId)
    .sort((a, b) => a.position - b.position)
    .map((t) => buildTaskCost(t, tasks, members, excludeIds, today, 0, rates))
}

export function computePersonCosts(tasks: Task[], members: TeamMember[], rates: Rates): PersonCost[] {
  const excludeIds   = contractorMemberIds(members)
  const containerIds = new Set(tasks.filter((t) => tasks.some((o) => o.parentId === t.id)).map((t) => t.id))
  const map = new Map<string, PersonCost>()
  for (const m of members) {
    map.set(m.id, {
      personId: m.id, name: m.name, projectRole: m.projectRole,
      hourlyRate: m.hourlyRate, hourlyRateCurrency: m.hourlyRateCurrency ?? 'EUR',
      estimatedHours: 0, actualHours: 0, estimatedCost: 0, actualCost: 0, earnedValue: 0,
      contractorId: m.contractorId,
    })
  }

  for (const task of tasks) {
    if (containerIds.has(task.id)) continue  // skip containers — costs come from subtasks
    if (task.pricingMode !== 'hourly') continue
    const evRatio = task.progress / 100
    for (const a of task.assignments) {
      const pc = map.get(a.personId)
      const m  = members.find((x) => x.id === a.personId)
      if (!pc || !m) continue
      const rateEur = memberRateEur(m, rates)
      // Zawsze zliczamy godziny (workload), ale koszty tylko dla indywidualnych
      pc.estimatedHours += a.estimatedHours
      pc.actualHours    += a.actualHours ?? 0
      if (!excludeIds.has(a.personId)) {
        pc.estimatedCost += a.estimatedHours * rateEur
        pc.actualCost    += (a.actualHours ?? 0) * rateEur
        pc.earnedValue   += a.estimatedHours * rateEur * evRatio
      }
    }
  }

  // Fixed-price DONE tasks — distribute cost proportionally to assignees
  for (const task of tasks) {
    if (containerIds.has(task.id)) continue
    if (task.pricingMode !== 'fixed' || task.status !== 'DONE') continue
    const price = task.fixedPrice ?? 0
    if (price === 0 || task.assignments.length === 0) continue
    const totalHours = task.assignments.reduce((s, a) => s + a.estimatedHours, 0)
    if (totalHours === 0) continue
    for (const a of task.assignments) {
      const pc = map.get(a.personId)
      if (!pc || excludeIds.has(a.personId)) continue
      pc.actualCost += price * (a.estimatedHours / totalHours)
    }
  }

  return [...map.values()].filter((p) => p.estimatedHours > 0 || p.estimatedCost > 0)
}

function toEur(amount: number, currency: Currency, eurToPln: number, eurToUsd: number): number {
  if (currency === 'PLN') return amount / eurToPln
  if (currency === 'USD') return amount / eurToUsd
  return amount
}

export function computeContractorCosts(
  contractors: Contractor[],
  members: TeamMember[],
  tasks: Task[],
  rates: { eurToPln: number; eurToUsd: number },
): ContractorCost[] {
  return contractors.map((c) => {
    const currency = c.contractCurrency ?? 'EUR'
    const contractPriceEur = toEur(c.contractPrice, currency, rates.eurToPln, rates.eurToUsd)
    return {
      contractorId: c.id,
      name: c.name,
      contractPrice: c.contractPrice,
      contractPriceEur,
      contractCurrency: currency,
      description: c.description,
      members: members
        .filter((m) => m.contractorId === c.id)
        .map((m) => {
          let estimatedHours = 0, actualHours = 0
          for (const task of tasks) {
            for (const a of task.assignments) {
              if (a.personId === m.id) {
                estimatedHours += a.estimatedHours
                actualHours    += a.actualHours ?? 0
              }
            }
          }
          return { name: m.name, estimatedHours, actualHours }
        }),
    }
  })
}

export function computeTotals(tree: TaskCost[], contractorCosts: ContractorCost[]): CostTotals {
  const tasksBudget      = tree.reduce((s, t) => s + t.estimatedCost, 0)
  const contractorsBudget = contractorCosts.reduce((s, c) => s + c.contractPriceEur, 0)
  const budget      = tasksBudget + contractorsBudget
  const earnedValue = tree.reduce((s, t) => s + t.earnedValue, 0)
  const actualCost  = tree.reduce((s, t) => s + t.actualCost, 0) + contractorsBudget
  return {
    budget,
    earnedValue,
    actualCost,
    remaining: budget - earnedValue,
    evPct: budget > 0 ? Math.round(earnedValue / budget * 100) : 0,
    tasksBudget,
    contractorsBudget,
  }
}
