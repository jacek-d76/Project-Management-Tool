import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { Welcome } from '@/pages/Welcome'
import { TeamView } from '@/pages/TeamView'
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

export default function App() {
  return (
    <BrowserRouter basename="/Project-Management-Tool">
      <RequireAuth>
        <Routes>
          {/* Ekran powitalny (tworzenie/import projektu) */}
          <Route path="/" element={<Welcome />} />

          {/* Aplikacja - wymaga istniejącego projektu */}
          <Route element={<AppLayout />}>
            <Route
              path="/tasks"
              element={
                <RequireProject>
                  <PlaceholderPage
                    title="Lista zadań (WBS)"
                    description="Widok zostanie zbudowany w Etapie 2. Możesz już zarządzać projektem i zespołem."
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
            <Route
              path="/costs"
              element={
                <RequireProject>
                  <PlaceholderPage
                    title="Analiza kosztów"
                    description="Widok kosztów i wycen zostanie zbudowany w Etapie 6."
                  />
                </RequireProject>
              }
            />
            <Route
              path="/team"
              element={
                <RequireProject>
                  <TeamView />
                </RequireProject>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireProject>
                  <Settings />
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
