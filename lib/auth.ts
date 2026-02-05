import 'server-only'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// For simple password auth, we compare against env var directly
// (no hashing needed since env vars are already secure)
export function validateDashboardPassword(password: string): boolean {
  return password === process.env.PPC_DASHBOARD_PASSWORD
}
