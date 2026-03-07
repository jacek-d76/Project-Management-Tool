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
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/store/projectStore'
import { useSessionStore } from '@/store/sessionStore'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/tasks',       icon: LayoutList,       label: 'Task list',   pmOnly: false },
  { to: '/gantt',       icon: GanttChartSquare, label: 'Gantt',       pmOnly: false },
  { to: '/milestones',  icon: Flag,             label: 'Milestones',  pmOnly: false },
  { to: '/workload',    icon: BarChart3,        label: 'Workload',    pmOnly: false },
  { to: '/costs',       icon: DollarSign,       label: 'Costs',       pmOnly: true  },
  { to: '/contractors', icon: Building2,        label: 'Contractors', pmOnly: true  },
  { to: '/users',       icon: UserCog,          label: 'Users',       pmOnly: true  },
]

export function Sidebar() {
  const project = useProjectStore((s) => s.project)
  const { isPM, logout, currentUser } = useSessionStore()
  const navigate = useNavigate()

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card">
      {/* Logo / Nazwa projektu */}
      <div className="flex flex-col items-center border-b px-4 py-4 gap-1">
        {project?.avatar?.startsWith('data:') || project?.avatar?.startsWith('http') ? (
          <img src={project.avatar} alt="Project" className="w-full max-h-14 object-contain rounded-md" />
        ) : (
          <FolderKanban className="h-7 w-7 text-primary" />
        )}
        <div className="min-w-0 text-center">
          <p className="text-xs text-muted-foreground">Project</p>
          <p className="truncate text-sm font-semibold">
            {project?.name ?? 'No project'}
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
            Settings
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
          Log out
        </Button>
      </div>
    </aside>
  )
}
