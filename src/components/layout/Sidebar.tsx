import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutList,
  GanttChartSquare,
  BarChart3,
  DollarSign,
  Settings,
  LogOut,
  FolderKanban,
  UserCog,
  Flag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/store/projectStore'
import { useSessionStore } from '@/store/sessionStore'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/tasks', icon: LayoutList, label: 'Lista zadań' },
  { to: '/gantt', icon: GanttChartSquare, label: 'Gantt' },
  { to: '/milestones', icon: Flag, label: 'Milestone\'y' },
  { to: '/workload', icon: BarChart3, label: 'Obciążenie' },
  { to: '/costs', icon: DollarSign, label: 'Koszty', pmOnly: true },
]

export function Sidebar() {
  const project = useProjectStore((s) => s.project)
  const { isPM, logout, currentUser } = useSessionStore()
  const navigate = useNavigate()

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card">
      {/* Logo / Nazwa projektu */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <FolderKanban className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Projekt</p>
          <p className="truncate text-sm font-semibold">
            {project?.name ?? 'Brak projektu'}
          </p>
        </div>
      </div>

      {/* Nawigacja */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, icon: Icon, label, pmOnly }) => {
          if (pmOnly && !isPM()) return null
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  !project && 'pointer-events-none opacity-40'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Dolna sekcja */}
      <div className="border-t p-2 space-y-1">
        {isPM() && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <UserCog className="h-4 w-4 shrink-0" />
            Użytkownicy
          </NavLink>
        )}
        {isPM() && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Settings className="h-4 w-4 shrink-0" />
            Ustawienia
          </NavLink>
        )}
        {currentUser && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium">{currentUser.name}</span>
            <span className="ml-1 opacity-60">({currentUser.role})</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => { logout(); navigate('/') }}
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </Button>
      </div>
    </aside>
  )
}
