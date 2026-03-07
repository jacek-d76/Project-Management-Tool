import { useState } from 'react'
import { ShieldCheck, User, LogIn, LogOut, Trash2, AlertTriangle, CheckCircle2, Clock, Ban, Circle, CalendarDays, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/projectStore'
import { getActivityEvents, getActiveSessions, clearActivityLog } from '@/lib/activityLog'
import type { ActivityEvent, ActiveSession } from '@/lib/activityLog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label, value, sub, accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'orange' | 'blue' | 'default'
}) {
  const colours = {
    green:   'text-green-600 dark:text-green-400',
    red:     'text-red-600 dark:text-red-400',
    orange:  'text-orange-500 dark:text-orange-400',
    blue:    'text-blue-600 dark:text-blue-400',
    default: 'text-foreground',
  }
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold leading-none ${colours[accent ?? 'default']}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ─── Confirm reset modal ───────────────────────────────────────────────────────

function ResetConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl border w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Reset statistics</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              This will permanently delete the full login history and active session records.
              The action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── StatisticsView ───────────────────────────────────────────────────────────

export function StatisticsView() {
  const { tasks, project } = useProjectStore()
  const [events,   setEvents]   = useState<ActivityEvent[]>(() => getActivityEvents())
  const [sessions, setSessions] = useState<ActiveSession[]>(() => getActiveSessions())
  const [showReset, setShowReset] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // ─── Project stats ─────────────────────────────────────────────────────────

  const leafTasks = tasks.filter((t) => !tasks.some((c) => c.parentId === t.id))
  const total     = leafTasks.length
  const done      = leafTasks.filter((t) => t.status === 'DONE').length
  const inProg    = leafTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length
  const blocked   = leafTasks.filter((t) => t.status === 'BLOCKED').length
  const todo      = leafTasks.filter((t) => t.status === 'TODO').length
  const overallPct = total > 0 ? Math.round(done / total * 100) : 0

  const overdue = leafTasks.filter(
    (t) => t.endDate && t.endDate < today && t.status !== 'DONE'
  )

  const atRisk = leafTasks.filter((t) => {
    if (!t.startDate || !t.endDate || t.status === 'DONE') return false
    const s = new Date(t.startDate).getTime()
    const e = new Date(t.endDate).getTime()
    const n = new Date(today).getTime()
    if (e <= s) return false
    const elapsed = (n - s) / (e - s) * 100
    return elapsed > 25 && t.progress < elapsed * 0.5
  })

  const daysLeft = project?.endDate
    ? Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000)
    : null

  const projectElapsedPct = (project?.startDate && project?.endDate)
    ? Math.min(100, Math.max(0, Math.round(
        (Date.now() - new Date(project.startDate).getTime()) /
        (new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) * 100
      )))
    : null

  // ─── Reset handler ──────────────────────────────────────────────────────────

  const handleReset = () => {
    clearActivityLog()
    setEvents([])
    setSessions([])
    setShowReset(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-auto bg-muted/20">
      {showReset && (
        <ResetConfirm onConfirm={handleReset} onCancel={() => setShowReset(false)} />
      )}

      <div className="max-w-5xl mx-auto w-full px-6 py-6 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Statistics</h1>
            <p className="text-sm text-muted-foreground">Project activity and health overview</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/5"
            onClick={() => setShowReset(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset statistics
          </Button>
        </div>

        {/* ── Section 1: Active sessions ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Active now
          </h2>
          {sessions.length === 0 ? (
            <div className="rounded-xl border bg-background p-6 text-center text-sm text-muted-foreground">
              No active sessions recorded yet.
              <span className="block text-xs mt-1 opacity-70">Sessions appear here after the next login.</span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((s) => (
                <div key={s.username} className="rounded-xl border bg-background p-4 shadow-sm flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    s.role === 'pm' ? 'bg-primary/10' : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {s.role === 'pm'
                      ? <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                      : <User className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role === 'pm' ? 'Project Manager' : 'Team member'}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Logged in {timeAgo(s.loginTime)}</p>
                  </div>
                  <div className="ml-auto shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            Sessions older than 12 hours are automatically removed.
          </p>
        </section>

        {/* ── Section 2: Project health ── */}
        {project && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Project health
            </h2>

            {/* Progress bar */}
            <div className="rounded-xl border bg-background p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall completion</span>
                <span className="text-sm font-bold">{overallPct}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              {projectElapsedPct !== null && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-400/60 transition-all"
                      style={{ width: `${projectElapsedPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {projectElapsedPct}% time elapsed
                    {project.startDate && project.endDate && (
                      <> · {fmtDate(project.startDate)} – {fmtDate(project.endDate)}</>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <StatTile label="Done" value={done} sub={`of ${total} tasks`} accent="green" />
              <StatTile label="In progress" value={inProg} sub="tasks" accent="blue" />
              <StatTile label="Blocked" value={blocked} sub="tasks" accent={blocked > 0 ? 'red' : 'default'} />
              <StatTile
                label="Days left"
                value={daysLeft === null ? '—' : daysLeft < 0 ? `${Math.abs(daysLeft)} overdue` : daysLeft}
                sub={project.endDate ? `Deadline: ${fmtDate(project.endDate)}` : 'No deadline set'}
                accent={daysLeft !== null && daysLeft < 0 ? 'red' : daysLeft !== null && daysLeft < 14 ? 'orange' : 'default'}
              />
            </div>

            {/* Overdue + At risk */}
            {(overdue.length > 0 || atRisk.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-3">
                {overdue.length > 0 && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Ban className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-700 dark:text-red-400">Overdue tasks ({overdue.length})</span>
                    </div>
                    <div className="space-y-1">
                      {overdue.slice(0, 5).map((t) => (
                        <div key={t.id} className="flex justify-between text-xs gap-2">
                          <span className="truncate text-red-700 dark:text-red-300">{t.title}</span>
                          <span className="shrink-0 text-red-600/70">{fmtDate(t.endDate!)}</span>
                        </div>
                      ))}
                      {overdue.length > 5 && (
                        <p className="text-[10px] text-red-600/70 mt-1">+{overdue.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
                {atRisk.length > 0 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">At risk ({atRisk.length})</span>
                    </div>
                    <div className="space-y-1">
                      {atRisk.slice(0, 5).map((t) => (
                        <div key={t.id} className="flex justify-between text-xs gap-2">
                          <span className="truncate text-amber-700 dark:text-amber-300">{t.title}</span>
                          <span className="shrink-0 text-amber-600/70">{t.progress}%</span>
                        </div>
                      ))}
                      {atRisk.length > 5 && (
                        <p className="text-[10px] text-amber-600/70 mt-1">+{atRisk.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Section 3: Login history ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Login history
          </h2>
          {events.length === 0 ? (
            <div className="rounded-xl border bg-background p-6 text-center text-sm text-muted-foreground">
              No login events recorded yet.
            </div>
          ) : (
            <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Event</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Date & time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 100).map((ev) => (
                    <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {ev.role === 'pm'
                            ? <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            : <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          }
                          <span className="font-medium">{ev.name}</span>
                          <span className="text-xs text-muted-foreground">@{ev.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {ev.role === 'pm' ? 'Project Manager' : 'Team member'}
                      </td>
                      <td className="px-4 py-2.5">
                        {ev.action === 'login' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <LogIn className="h-3 w-3" /> Login
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <LogOut className="h-3 w-3" /> Logout
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(ev.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {events.length > 100 && (
                <p className="text-xs text-muted-foreground text-center py-3 border-t">
                  Showing 100 of {events.length} events.
                </p>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
