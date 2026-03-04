import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { Welcome } from '@/pages/Welcome'
import { UsersView } from '@/pages/UsersView'
import { Settings } from '@/pages/Settings'
import { TasksView } from '@/pages/TasksView'
import { MilestonesView } from '@/pages/MilestonesView'
import { GanttView } from '@/pages/GanttView'
import { WorkloadView } from '@/pages/WorkloadView'
import { CostsView } from '@/pages/CostsView'
import { useSessionStore } from '@/store/sessionStore'
import { useProjectStore } from '@/store/projectStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const role = useSessionStore((s) => s.role)
  if (!role) return <LoginScreen />
  return <>{children}</>
}

function RequireProject({ children }: { children: React.ReactNode }) {
  const project = useProjectStore((s) => s.project)
  if (!project) return <Navigate to="/" replace />
  return <>{children}</>
}

// Pages available to PM only – team member is redirected to /tasks
function RequirePM({ children }: { children: React.ReactNode }) {
  const isPM = useSessionStore((s) => s.isPM())
  if (!isPM) return <Navigate to="/tasks" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter basename="/Project-Management-Tool">
      <RequireAuth>
        <Routes>
          {/* Welcome screen – create / import project (PM only) */}
          <Route path="/" element={<Welcome />} />

          {/* App – requires an existing project */}
          <Route element={<AppLayout />}>
            <Route
              path="/tasks"
              element={
                <RequireProject>
                  <TasksView />
                </RequireProject>
              }
            />
            <Route
              path="/milestones"
              element={
                <RequireProject>
                  <MilestonesView />
                </RequireProject>
              }
            />
            <Route
              path="/gantt"
              element={
                <RequireProject>
                  <GanttView />
                </RequireProject>
              }
            />
            <Route
              path="/workload"
              element={
                <RequireProject>
                  <WorkloadView />
                </RequireProject>
              }
            />
            {/* Costs – PM only */}
            <Route
              path="/costs"
              element={
                <RequireProject>
                  <RequirePM>
                    <CostsView />
                  </RequirePM>
                </RequireProject>
              }
            />
            {/* Users – PM only, no project required */}
            <Route
              path="/users"
              element={
                <RequirePM>
                  <UsersView />
                </RequirePM>
              }
            />
            {/* Settings – PM only */}
            <Route
              path="/settings"
              element={
                <RequireProject>
                  <RequirePM>
                    <Settings />
                  </RequirePM>
                </RequireProject>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RequireAuth>
    </BrowserRouter>
  )
}
