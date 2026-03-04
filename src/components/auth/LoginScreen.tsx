import { useState } from 'react'
import { ShieldCheck, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSessionStore } from '@/store/sessionStore'

type LoginMode = 'select' | 'pm' | 'user'

export function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>('select')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const login = useSessionStore((s) => s.login)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const loginUsername = mode === 'pm' ? 'pm' : username.trim()
    const ok = login(loginUsername, password)
    if (!ok) {
      setError(true)
      setPassword('')
      setTimeout(() => setError(false), 2500)
    }
  }

  const goBack = () => {
    setMode('select')
    setUsername('')
    setPassword('')
    setError(false)
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Project Manager</CardTitle>
            <CardDescription>Wybierz sposób logowania</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full h-14 gap-3 text-base"
              onClick={() => setMode('pm')}
            >
              <ShieldCheck className="h-5 w-5" />
              Project Manager
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 gap-3 text-base"
              onClick={() => setMode('user')}
            >
              <User className="h-5 w-5" />
              Użytkownik
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {mode === 'pm'
              ? <ShieldCheck className="h-6 w-6 text-primary" />
              : <User className="h-6 w-6 text-primary" />
            }
          </div>
          <CardTitle>
            {mode === 'pm' ? 'Project Manager' : 'Logowanie użytkownika'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'user' && (
              <div className="space-y-2">
                <Label htmlFor="username">Login</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Wpisz login..."
                  autoFocus
                  autoComplete="username"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Wpisz hasło..."
                autoComplete="current-password"
                autoFocus={mode === 'pm'}
                className={error ? 'border-destructive' : ''}
              />
              {error && (
                <p className="text-sm text-destructive">
                  Nieprawidłowe dane logowania.
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={mode === 'user' ? (!username.trim() || !password) : !password}
            >
              Zaloguj się
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={goBack}>
              ← Wróć
            </Button>
          </form>
          {mode === 'user' && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Nie masz konta? Skontaktuj się z Project Managerem.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
