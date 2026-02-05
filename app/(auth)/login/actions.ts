'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { validateDashboardPassword } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export type LoginState = {
  error?: string
  errors?: {
    password?: string[]
  }
}

export async function login(
  prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const validatedFields = loginSchema.safeParse({
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { password } = validatedFields.data

  // Validate against environment variable
  const isValid = validateDashboardPassword(password)

  if (!isValid) {
    return { error: 'Invalid password' }
  }

  // Create session - IMPORTANT: session operations outside try/catch per research
  const session = await getSession()
  session.userId = 'dashboard-user'
  session.isLoggedIn = true
  await session.save()

  // redirect() must be called outside try/catch (throws internally)
  redirect('/dashboard')
}

export async function logout() {
  const session = await getSession()
  session.destroy()
  redirect('/login')
}
