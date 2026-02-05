import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from './session'

export const verifySession = cache(async () => {
  const session = await getSession()

  if (!session.isLoggedIn) {
    redirect('/login')
  }

  return { isAuth: true, userId: session.userId }
})

export const getSessionSafe = cache(async () => {
  const session = await getSession()
  return {
    isLoggedIn: session.isLoggedIn,
    userId: session.userId,
  }
})
