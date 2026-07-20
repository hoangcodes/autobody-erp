import { useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuthStore } from '@/features/auth/authStore'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const setDevMode = useAuthStore((s) => s.setDevMode)

  function continueInDevMode() {
    setDevMode(true)
    navigate('/workflow')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Wrench className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg">Sign in to AutoSuite</CardTitle>
          <CardDescription>Shop management for auto repair, built for the front counter and the bay.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {supabase ? (
            <p className="text-sm text-muted-foreground">
              Supabase auth is configured, but this build ships with the backend&apos;s dev auth bypass — sign-in
              screens for production auth can be wired here later.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No Supabase project is configured in this environment. The backend runs with{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">DEV_AUTH_BYPASS</code>, so you can jump straight
              in.
            </p>
          )}
          <Button onClick={continueInDevMode} size="lg">
            Continue in dev mode
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
