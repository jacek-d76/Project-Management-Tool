import { useState } from 'react'
import { AlertTriangle, ChevronRight, ChevronDown, DollarSign, Building2 } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { computeTaskCostTree, computePersonCosts, computeContractorCosts, computeTotals } from '@/lib/costs'
import type { TaskCost } from '@/lib/costs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(eur: number, showPln: boolean, rate: number): string {
  const val = showPln ? eur * rate : eur
  return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, desc, color,
}: {
  label: string
  value: string
  sub?: string
  desc: string
  color?: string
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${color ?? ''}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      <span className="text-[10px] text-muted-foreground/60 mt-1 leading-snug">{desc}</span>
    </div>
  )
}

// ─── Phase tree row ───────────────────────────────────────────────────────────

function PhaseRow({
  node, showPln, rate, expanded, onToggle,
}: {
  node: TaskCost
  showPln: boolean
  rate: number
  expanded: Set<string>
  onToggle: (id: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isOpen      = expanded.has(node.taskId)
  const indent      = node.depth * 20

  return (
    <>
      <tr
        className={[
          'border-b hover:bg-muted/30 transition-colors',
          node.depth === 0 ? 'font-medium bg-muted/10' : '',
          node.isAtRisk ? 'bg-orange-50/60 dark:bg-orange-950/20' : '',
        ].join(' ')}
      >
        {/* Name */}
        <td className="px-3 py-2 text-sm" style={{ paddingLeft: indent + 12 }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                onClick={() => onToggle(node.taskId)}
                className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted text-muted-foreground shrink-0"
              >
                {isOpen
                  ? <ChevronDown  className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <span className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate max-w-[260px]">{node.title}</span>
            {node.isAtRisk && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full shrink-0">
                <AlertTriangle className="h-2.5 w-2.5" />
                AT RISK
              </span>
            )}
          </div>
        </td>

        {/* Mode */}
        <td className="px-3 py-2 text-center">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            node.pricingMode === 'fixed'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {node.pricingMode === 'fixed' ? 'Fixed' : 'Hourly'}
          </span>
        </td>

        {/* Progress */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden shrink-0">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${node.progress}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground w-8">{node.progress}%</span>
            {node.timeElapsedPct != null && (
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                ({Math.round(node.timeElapsedPct)}% time)
              </span>
            )}
          </div>
        </td>

        {/* Budget */}
        <td className="px-3 py-2 text-right tabular-nums text-sm">
          {node.estimatedCost > 0 ? fmt(node.estimatedCost, showPln, rate) : '—'}
        </td>

        {/* Earned value */}
        <td className="px-3 py-2 text-right tabular-nums text-sm text-green-700 dark:text-green-400">
          {node.earnedValue > 0 ? fmt(node.earnedValue, showPln, rate) : '—'}
        </td>

        {/* Actual */}
        <td className="px-3 py-2 text-right tabular-nums text-sm text-muted-foreground">
          {node.actualCost > 0 ? fmt(node.actualCost, showPln, rate) : '—'}
        </td>
      </tr>

      {/* Children */}
      {hasChildren && isOpen && node.children.map((child) => (
        <PhaseRow
          key={child.taskId}
          node={child}
          showPln={showPln}
          rate={rate}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  )
}

// ─── CostsView ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

export function CostsView() {
  const { project, tasks, members, contractors } = useProjectStore()
  const [showPln,         setShowPln]         = useState(false)
  const [expanded,        setExpanded]        = useState<Set<string>>(new Set())
  const [showPersons,     setShowPersons]     = useState(false)
  const [showPhases,      setShowPhases]      = useState(false)
  const [showContractors, setShowContractors] = useState(false)

  if (!project) return null

  const rate            = project.exchangeRate
  const usdRate         = project.usdExchangeRate ?? 1.08
  const rates           = { eurToPln: rate, eurToUsd: usdRate }
  const tree            = computeTaskCostTree(tasks, members, TODAY, rates)
  const persons         = computePersonCosts(tasks, members, rates)
  const contractorCosts = computeContractorCosts(contractors, members, tasks, rates)
  const totals          = computeTotals(tree, contractorCosts)

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const cur = showPln ? 'PLN' : 'EUR'

  // Only members without a company (individually billed)
  const individualPersons = persons.filter((p) => !p.contractorId)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full px-4 py-6 space-y-8">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Cost Analysis</h1>
            <span className="text-xs text-muted-foreground">{project.name}</span>
          </div>
          {/* Currency toggle */}
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            {(['EUR', 'PLN'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setShowPln(c === 'PLN')}
                className={[
                  'px-3 py-0.5 rounded text-xs font-semibold transition-colors',
                  (c === 'PLN') === showPln
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total budget"
            value={fmt(totals.budget, showPln, rate)}
            sub={`${cur}${totals.contractorsBudget > 0 ? ` (tasks + contracts)` : ''}`}
            desc="Sum of task costs (individual hourly + fixed price) and company contracts."
          />
          <StatCard
            label="Earned value"
            value={fmt(totals.earnedValue, showPln, rate)}
            sub={`${totals.evPct}% of budget · ${cur}`}
            desc="Budget × progress %. Shows how much work has been completed in monetary terms."
            color="text-green-600 dark:text-green-400"
          />
          <StatCard
            label="Actual cost"
            value={totals.actualCost > 0 ? fmt(totals.actualCost, showPln, rate) : '—'}
            sub={totals.actualCost > 0 ? cur : 'No actual hours logged'}
            desc="Real cost based on actual hours logged × hourly rate. If AC > EV, the project is over budget."
            color={totals.actualCost > totals.earnedValue ? 'text-red-600' : undefined}
          />
          <StatCard
            label="Remaining"
            value={fmt(totals.remaining, showPln, rate)}
            sub={`${100 - totals.evPct}% of budget · ${cur}`}
            desc="Budget − Earned value. Estimated cost of work still to be done."
          />
        </div>

        {/* ── Contractor contracts ── */}
        {contractorCosts.length > 0 && (
          <section>
            <button
              className="flex items-center gap-2 w-full text-left mb-3 group"
              onClick={() => setShowContractors((v) => !v)}
            >
              {showContractors
                ? <ChevronDown  className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold group-hover:text-primary transition-colors">Company contracts</h2>
              <span className="text-xs text-muted-foreground">
                {contractorCosts.length} {contractorCosts.length === 1 ? 'company' : 'companies'} ·{' '}
                <span className="font-medium text-foreground">
                  {fmt(totals.contractorsBudget, showPln, rate)} {cur}
                </span>
              </span>
            </button>
            {showContractors && (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/30 text-xs text-muted-foreground border-b">
                      <th className="text-left px-3 py-2 font-medium">Company</th>
                      <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Scope / notes</th>
                      <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Members</th>
                      <th className="text-right px-3 py-2 font-medium">Contract</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractorCosts.map((c, i) => (
                      <tr key={c.contractorId} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs hidden sm:table-cell">
                          {c.description || '—'}
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            {c.members.length > 0
                              ? c.members.map((m) => (
                                  <div key={m.name} className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                      {m.name}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground tabular-nums">
                                      {m.estimatedHours}h est.
                                      {m.actualHours > 0 && (
                                        <> · <span className={m.actualHours > m.estimatedHours ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}>{m.actualHours}h act.</span></>
                                      )}
                                    </span>
                                  </div>
                                ))
                              : <span className="text-xs text-muted-foreground">—</span>
                            }
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className="font-semibold text-primary">
                            {c.contractPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} {c.contractCurrency}
                          </span>
                          {c.contractCurrency !== 'EUR' && (
                            <span className="block text-[11px] text-muted-foreground">
                              ≈ {fmt(c.contractPriceEur, showPln, rate)} {cur}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/20 border-t font-semibold text-sm">
                      <td className="px-3 py-2" colSpan={3}>Total contracts</td>
                      <td className="px-3 py-2 text-right tabular-nums text-primary">
                        {fmt(totals.contractorsBudget, showPln, rate)} {cur}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── By person (individual billing) ── */}
        {individualPersons.length > 0 && (
          <section>
            <button
              className="flex items-center gap-2 w-full text-left mb-3 group"
              onClick={() => setShowPersons((v) => !v)}
            >
              {showPersons
                ? <ChevronDown  className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <h2 className="text-sm font-semibold group-hover:text-primary transition-colors">By person</h2>
              <span className="text-xs text-muted-foreground">
                {individualPersons.length} member{individualPersons.length !== 1 ? 's' : ''} (individual billing)
              </span>
            </button>
            {showPersons && <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-xs text-muted-foreground border-b">
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Role</th>
                    <th className="text-right px-3 py-2 font-medium">Rate</th>
                    <th className="text-right px-3 py-2 font-medium">Est. h</th>
                    <th className="text-right px-3 py-2 font-medium hidden md:table-cell">Act. h</th>
                    <th className="text-right px-3 py-2 font-medium">Budget</th>
                    <th className="text-right px-3 py-2 font-medium text-green-700 dark:text-green-400">Earned</th>
                    <th className="text-right px-3 py-2 font-medium hidden md:table-cell">Actual cost</th>
                  </tr>
                </thead>
                <tbody>
                  {individualPersons.map((p, i) => (
                    <tr key={p.personId} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{p.projectRole || '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.hourlyRate.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        <span className="text-[10px] text-muted-foreground ml-0.5">{p.hourlyRateCurrency}/h</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.estimatedHours}h</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                        {p.actualHours > 0 ? `${p.actualHours}h` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {fmt(p.estimatedCost, showPln, rate)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-700 dark:text-green-400">
                        {fmt(p.earnedValue, showPln, rate)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                        {p.actualCost > 0 ? fmt(p.actualCost, showPln, rate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/20 border-t font-semibold text-sm">
                    <td className="px-3 py-2" colSpan={3}>Total (hourly tasks)</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {individualPersons.reduce((s, p) => s + p.estimatedHours, 0)}h
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell" />
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmt(individualPersons.reduce((s, p) => s + p.estimatedCost, 0), showPln, rate)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-700 dark:text-green-400">
                      {fmt(individualPersons.reduce((s, p) => s + p.earnedValue, 0), showPln, rate)}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>}
          </section>
        )}

        {/* ── By phase ── */}
        {tree.length > 0 && (
          <section>
            <button
              className="flex items-center gap-2 w-full text-left mb-3 group"
              onClick={() => setShowPhases((v) => !v)}
            >
              {showPhases
                ? <ChevronDown  className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <h2 className="text-sm font-semibold group-hover:text-primary transition-colors">By phase / task</h2>
              <span className="text-xs text-muted-foreground">{tree.length} top-level task{tree.length !== 1 ? 's' : ''} · click ▶ in table to expand subtasks</span>
            </button>
            {showPhases && (
              <>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/30 text-xs text-muted-foreground border-b">
                        <th className="text-left px-3 py-2 font-medium">Task / Phase</th>
                        <th className="text-center px-3 py-2 font-medium w-20">Mode</th>
                        <th className="text-left px-3 py-2 font-medium w-44">Progress</th>
                        <th className="text-right px-3 py-2 font-medium w-28">Budget</th>
                        <th className="text-right px-3 py-2 font-medium w-28 text-green-700 dark:text-green-400">Earned</th>
                        <th className="text-right px-3 py-2 font-medium w-28">Actual cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tree.map((node) => (
                        <PhaseRow
                          key={node.taskId}
                          node={node}
                          showPln={showPln}
                          rate={rate}
                          expanded={expanded}
                          onToggle={toggleExpand}
                        />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/20 border-t font-semibold text-sm">
                        <td className="px-3 py-2" colSpan={3}>Total (tasks)</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.tasksBudget, showPln, rate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-green-700 dark:text-green-400">{fmt(totals.earnedValue, showPln, rate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {totals.actualCost > 0 ? fmt(totals.actualCost, showPln, rate) : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {tree.some((t) => t.isAtRisk || t.children.some((c) => c.isAtRisk)) && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    AT RISK — time elapsed &gt; 25% but progress &lt; 50% of elapsed time
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {/* Empty state */}
        {tree.length === 0 && contractors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <DollarSign className="h-12 w-12 opacity-20" />
            <p className="text-sm">No tasks with cost data yet.</p>
            <p className="text-xs">Assign people with hourly rates or set fixed prices on tasks.</p>
          </div>
        )}
      </div>
    </div>
  )
}
