import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSessionStore } from '@/store/sessionStore'

export function LoginScreen() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const login = useSessionStore((s) => s.login)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = login(password)
    if (!ok) {
      setError(true)
      setPassword('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Project Manager</CardTitle>
          <CardDescription>Wpisz hasło dostępu aby kontynuować</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Wpisz hasło..."
                autoFocus
                className={error ? 'border-destructive' : ''}
              />
              {error && (
                <p className="text-sm text-destructive">Nieprawidłowe hasło. Spróbuj ponownie.</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Zaloguj się
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
