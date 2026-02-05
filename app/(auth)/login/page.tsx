'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { login, LoginState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign In'}
    </Button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState<LoginState | undefined, FormData>(
    login,
    undefined
  )

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">PPC Dashboard</CardTitle>
        <CardDescription>
          Enter your password to access the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              name="password"
              placeholder="Enter password"
              required
            />
            {state?.errors?.password && (
              <p className="text-sm text-red-500">{state.errors.password[0]}</p>
            )}
            {state?.error && (
              <p className="text-sm text-red-500">{state.error}</p>
            )}
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
