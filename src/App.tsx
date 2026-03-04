import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { Welcome } from '@/pages/Welcome'
import { UsersView } from '@/pages/UsersView'
import { Settings } from '@/pages/Settings'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
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

// Strony dostępne tylko dla PM - team member dostaje przekierowanie do /tasks
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
          {/* Ekran powitalny - tworzenie/import projektu (tylko PM) */}
          <Route path="/" element={<Welcome />} />

          {/* Aplikacja - wymaga istniejącego projektu */}
          <Route element={<AppLayout />}>
            <Route
              path="/tasks"
              element={
                <RequireProject>
                  <PlaceholderPage
                    title="Lista zadań (WBS)"
                    description="Widok zostanie zbudowany w Etapie 2."
                  />
                </RequireProject>
              }
            />
            <Route
              path="/gantt"
              element={
                <RequireProject>
                  <PlaceholderPage
                    title="Wykres Gantta"
                    description="Interaktywny wykres Gantta zostanie zbudowany w Etapie 4."
                  />
                </RequireProject>
              }
            />
            <Route
              path="/workload"
              element={
                <RequireProject>
                  <PlaceholderPage
                    title="Widok obciążenia"
                    description="Heatmapa obciążenia pracy zostanie zbudowana w Etapie 5."
                  />
                </RequireProject>
              }
            />
            {/* Koszty - tylko PM */}
            <Route
              path="/costs"
              element={
                <RequireProject>
                  <RequirePM>
                    <PlaceholderPage
                      title="Analiza kosztów"
                      description="Widok kosztów i wycen zostanie zbudowany w Etapie 6."
                    />
                  </RequirePM>
                </RequireProject>
              }
            />
            {/* Użytkownicy - tylko PM, nie wymaga projektu */}
            <Route
              path="/users"
              element={
                <RequirePM>
                  <UsersView />
                </RequirePM>
              }
            />
            {/* Ustawienia - tylko PM */}
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
