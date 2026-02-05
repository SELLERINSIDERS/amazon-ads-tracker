import 'server-only'

// For simple password auth, we compare against env var directly
// (no hashing needed since env vars are already secure)
export function validateDashboardPassword(password: string): boolean {
  return password === process.env.PPC_DASHBOARD_PASSWORD
}
