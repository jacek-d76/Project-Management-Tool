import { useState } from 'react'
import { ShieldCheck, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSessionStore } from '@/store/sessionStore'
import { useProjectStore } from '@/store/projectStore'

type LoginMode = 'select' | 'pm' | 'user'

export function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>('select')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const login    = useSessionStore((s) => s.login)
  const project  = useProjectStore((s) => s.project)

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
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              {project?.avatar?.startsWith('data:') || project?.avatar?.startsWith('http') ? (
                <img src={project.avatar} alt="Project" className="max-w-full max-h-28 object-contain rounded-xl shadow-sm" />
              ) : null}
            </div>
            <CardTitle className="text-xl">
              {project?.name ?? 'Project Manager'}
            </CardTitle>
            <CardDescription>Select login method</CardDescription>
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
              Team Member
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
            {mode === 'pm' ? 'Project Manager' : 'Team member login'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'user' && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username..."
                  autoFocus
                  autoComplete="username"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                autoComplete="current-password"
                autoFocus={mode === 'pm'}
                className={error ? 'border-destructive' : ''}
              />
              {error && (
                <p className="text-sm text-destructive">
                  Invalid credentials.
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={mode === 'user' ? (!username.trim() || !password) : !password}
            >
              Log in
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={goBack}>
              ← Back
            </Button>
          </form>
          {mode === 'user' && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              No account? Contact your Project Manager.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
