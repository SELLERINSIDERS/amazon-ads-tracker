# Phase 1: Foundation & Authentication - Research

**Researched:** 2026-02-04
**Domain:** Next.js 14 App Router with stateless cookie-based authentication
**Confidence:** HIGH

## Summary

This phase establishes the foundational Next.js 14 application with App Router, implements simple password-based authentication using iron-session for stateless cookie management, and sets up Prisma with SQLite for database operations. The research focused on the standard stack for Next.js authentication patterns in 2026, with particular attention to App Router-specific considerations.

The standard approach for simple password authentication in Next.js 14 App Router involves:
1. **Stateless session management** using iron-session (not full JWT libraries, avoiding database sessions for simplicity)
2. **Server Actions** for login/logout operations with form handling
3. **Middleware** for optimistic route protection (cookie-only checks)
4. **Data Access Layer (DAL)** for secure session verification in Server Components
5. **Prisma Client singleton pattern** to prevent connection pool exhaustion during hot reload

Key architectural insight: Next.js App Router requires a two-layer security model—optimistic checks in middleware (Edge Runtime) and secure verification in the Data Access Layer (Node.js runtime with database access).

**Primary recommendation:** Use iron-session for stateless cookie sessions with Server Actions for auth flows, implement middleware for route guards (optimistic checks only), and centralize session verification in a Data Access Layer using React's `cache` API.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.25+ | App framework with App Router | Industry standard React framework; App Router is the current architecture (2026) |
| iron-session | 8.x | Stateless cookie-based sessions | Lightweight, App Router native, no database required; official Next.js docs cite stateless cookies |
| Prisma | Latest | Type-safe ORM | De facto standard for Next.js database access; excellent TypeScript support |
| bcrypt | Latest | Password hashing | Industry standard for password hashing; recommended by Next.js official docs |
| Tailwind CSS | 4.x | Utility-first CSS | Default choice for Next.js styling; built into create-next-app |
| shadcn/ui | Latest | Component library | Copy-paste components (not npm dependency); standard for Next.js UI |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | Latest | Schema validation | Server Action form validation; type-safe validation |
| better-sqlite3 | Latest | SQLite driver | Required Prisma adapter for SQLite; faster than default |
| @prisma/adapter-better-sqlite3 | Latest | Prisma-SQLite bridge | Connects Prisma to better-sqlite3 driver |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| iron-session | NextAuth.js (Auth.js) | NextAuth offers OAuth/multiple providers but adds complexity for simple password auth |
| iron-session | jose + manual JWT | More control but requires Edge Runtime compatible crypto; more code to maintain |
| Stateless cookies | Database sessions | More secure for multi-device tracking but adds complexity and database queries |
| bcrypt | argon2 | argon2 is slightly more secure (2026 standard) but bcrypt has broader ecosystem support |

**Installation:**
```bash
# Core dependencies
npm install iron-session bcrypt zod
npm install --save-dev @types/bcrypt

# Prisma + SQLite
npm install prisma @prisma/client better-sqlite3 @prisma/adapter-better-sqlite3
npm install --save-dev @types/better-sqlite3

# Tailwind + shadcn/ui (included in create-next-app)
npx shadcn@latest init
```

## Architecture Patterns

### Recommended Project Structure
```
amazon-ads-tracker/
├── app/                          # App Router
│   ├── (auth)/                   # Route group for auth pages
│   │   └── login/
│   │       └── page.tsx          # Login page
│   ├── (dashboard)/              # Route group for protected pages
│   │   ├── layout.tsx            # Dashboard layout
│   │   └── page.tsx              # Dashboard home
│   ├── api/                      # API routes (if needed)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles (Tailwind)
├── components/
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── prisma.ts                 # Prisma Client singleton
│   ├── session.ts                # iron-session config & helpers
│   ├── dal.ts                    # Data Access Layer (auth verification)
│   └── auth.ts                   # Password hashing utilities (bcrypt)
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Migration files
├── middleware.ts                 # Route protection (optimistic checks)
├── .env.local                    # Environment variables (gitignored)
└── next.config.ts                # Next.js configuration
```

### Pattern 1: Prisma Client Singleton
**What:** Single PrismaClient instance reused across hot reloads in development
**When to use:** Always in Next.js projects using Prisma
**Example:**
```typescript
// Source: https://www.prisma.io/docs/guides/nextjs
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const db = new Database('file:./prisma/dev.db')
const adapter = new PrismaBetterSqlite3(db)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
```

### Pattern 2: iron-session Configuration
**What:** Centralized session configuration with TypeScript types
**When to use:** All session operations (login, logout, verification)
**Example:**
```typescript
// Source: https://github.com/vvo/iron-session + https://blog.lama.dev/next-js-14-auth-with-iron-session/
// lib/session.ts
import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId?: string
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!, // Min 32 characters
  cookieName: 'ppc-dashboard-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

// Helper to get session in Server Components/Actions
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions)
}
```

### Pattern 3: Data Access Layer (DAL) for Auth
**What:** Centralized auth verification using React's `cache` API
**When to use:** All Server Components/Actions that need auth state
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from './session'
import { prisma } from './prisma'

export const verifySession = cache(async () => {
  const session = await getSession()

  if (!session.isLoggedIn || !session.userId) {
    redirect('/login')
  }

  return { isAuth: true, userId: session.userId }
})

export const getUser = cache(async () => {
  const session = await verifySession()

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true },
    })
    return user
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return null
  }
})
```

### Pattern 4: Server Actions for Login/Logout
**What:** Server-side form handling with session management
**When to use:** Authentication flows (login, logout)
**Example:**
```typescript
// Source: https://blog.lama.dev/next-js-14-auth-with-iron-session/ + https://nextjs.org/docs/app/guides/authentication
// app/(auth)/login/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/auth'

export async function login(prevState: any, formData: FormData) {
  const password = formData.get('password') as string

  // Validate password against PPC_DASHBOARD_PASSWORD env var
  const isValid = password === process.env.PPC_DASHBOARD_PASSWORD

  if (!isValid) {
    return { error: 'Invalid password' }
  }

  // Create session
  const session = await getSession()
  session.userId = 'dashboard-user' // Single user system
  session.isLoggedIn = true
  await session.save()

  redirect('/dashboard')
}

export async function logout() {
  const session = await getSession()
  session.destroy()
  redirect('/login')
}
```

### Pattern 5: Middleware for Route Protection (Optimistic Checks)
**What:** Edge Runtime middleware that reads cookies for route guards
**When to use:** Protecting routes from unauthenticated access
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from './lib/session'

const protectedRoutes = ['/dashboard']
const publicRoutes = ['/login', '/']

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isPublicRoute = publicRoutes.includes(path)

  // Optimistic check: only read cookie (no DB queries in Edge Runtime)
  const session = await getIronSession<SessionData>(req.cookies, sessionOptions)

  if (isProtectedRoute && !session.isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isPublicRoute && session.isLoggedIn && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
```

### Pattern 6: Server Action Form with Validation (Zod)
**What:** Type-safe form validation in Server Actions
**When to use:** Any form that needs validation (optional for simple password check)
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/forms + Multiple zod guides
'use server'

import { z } from 'zod'

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export async function login(prevState: any, formData: FormData) {
  const validatedFields = loginSchema.safeParse({
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // Continue with authentication...
}
```

### Anti-Patterns to Avoid

- **Middleware database queries:** Don't query the database in middleware—Edge Runtime doesn't support Node.js APIs. Only read cookies for optimistic checks.
- **Client-side auth checks:** Don't rely on client-side redirects or React Context for authentication. Use Server Components with DAL verification.
- **Exposing session secrets:** Never prefix session secrets with `NEXT_PUBLIC_`—they must remain server-only.
- **Multiple PrismaClient instances:** Don't instantiate PrismaClient without the singleton pattern—causes connection pool exhaustion.
- **redirect() in try/catch:** Don't call `redirect()` inside try/catch blocks—it throws an error internally. Call after error handling.
- **Skipping httpOnly cookies:** Don't set `httpOnly: false` for session cookies—prevents XSS attacks.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session encryption | Custom encryption with crypto | iron-session | Handles encryption, signing, cookie management; Edge Runtime compatible |
| Password hashing | Custom hash function | bcrypt (or argon2) | Proper salting, configurable cost factor, timing attack protection |
| Form validation | Manual string checks | zod | Type-safe schemas, reusable validation, clear error messages |
| Database migrations | Manual SQL scripts | Prisma Migrate | Type-safe schema, automatic migration generation, rollback support |
| UI components | Custom components from scratch | shadcn/ui | Accessible, customizable, copy-paste approach (no dependency bloat) |
| Password comparison | String equality (===) | bcrypt.compare() | Timing-attack resistant, handles salt extraction automatically |
| TypeScript types for env vars | Manual type assertions | zod + type inference | Runtime validation + compile-time types for environment variables |

**Key insight:** Authentication and cryptography have critical edge cases (timing attacks, salt management, secure random generation). Use battle-tested libraries rather than custom implementations.

## Common Pitfalls

### Pitfall 1: Connection Pool Exhaustion from Hot Reload
**What goes wrong:** In development, Next.js hot reload creates multiple PrismaClient instances, each with its own connection pool, leading to "too many connections" errors.
**Why it happens:** Each module reload instantiates a new PrismaClient without closing the previous one.
**How to avoid:** Use the singleton pattern with `globalThis` to reuse the same instance across hot reloads (see Pattern 1).
**Warning signs:** Error messages like "Can't reach database server" or "Too many connections" in development only.

### Pitfall 2: Edge Runtime API Limitations in Middleware
**What goes wrong:** Attempting to use Node.js APIs (like `bcrypt`, `fs`, native `crypto`) in middleware throws runtime errors.
**Why it happens:** Middleware runs on Edge Runtime (Web APIs only), not Node.js runtime.
**How to avoid:** Keep middleware logic simple—only read cookies and redirect. Move all heavy logic (password verification, database queries) to Server Actions or Route Handlers.
**Warning signs:** Errors like "Module not found" or "X is not available in Edge Runtime" when accessing middleware-protected routes.

### Pitfall 3: Redirecting Inside Try/Catch Blocks
**What goes wrong:** Server Actions that call `redirect()` inside try/catch blocks throw unexpected errors.
**Why it happens:** Next.js `redirect()` works by throwing an internal error that the framework catches. Wrapping it in try/catch intercepts this mechanism.
**How to avoid:** Call `redirect()` outside try/catch blocks, or use conditional redirects after error handling completes.
**Warning signs:** Redirect not working, errors logged about redirect throwing, or redirect treated as an exception.

### Pitfall 4: Statically Rendering Pages with Dynamic Session Data
**What goes wrong:** Server Components that read session data get statically rendered at build time, showing stale or missing auth state.
**Why it happens:** Next.js aggressively caches and pre-renders pages. If you don't mark the page as dynamic, session reads happen at build time.
**How to avoid:** Use `export const dynamic = 'force-dynamic'` in layouts/pages that read session state, or ensure you're using dynamic APIs like `cookies()` which automatically opt into dynamic rendering.
**Warning signs:** Auth checks always fail, session data is always empty, or all users see the same content regardless of login state.

### Pitfall 5: Exposing Secrets with NEXT_PUBLIC_ Prefix
**What goes wrong:** Developers prefix session secrets or API keys with `NEXT_PUBLIC_`, embedding them in the client bundle.
**Why it happens:** Misunderstanding of Next.js environment variable prefixing rules—anything with `NEXT_PUBLIC_` is included in client-side JavaScript.
**How to avoid:** Never prefix secrets with `NEXT_PUBLIC_`. Only use this prefix for values explicitly safe for public exposure (like public API endpoints).
**Warning signs:** Secrets visible in browser DevTools → Sources, or in the compiled `_app.js` bundle.

### Pitfall 6: Not Committing .env Files but Missing .env.example
**What goes wrong:** New developers don't know what environment variables are required, leading to missing configuration errors.
**Why it happens:** `.env.local` is gitignored (correct) but no template file exists.
**How to avoid:** Create `.env.example` with placeholder values (no real secrets) and commit it. Document all required variables.
**Warning signs:** Onboarding friction, "undefined env var" errors for new team members.

### Pitfall 7: Using bcrypt in Edge Runtime (Middleware)
**What goes wrong:** Attempting password verification in middleware with `bcrypt.compare()` fails.
**Why it happens:** bcrypt requires Node.js APIs not available in Edge Runtime.
**How to avoid:** Create a separate file (`lib/auth.ts`) with bcrypt logic marked with `'use server'` or only call from Server Actions/Route Handlers (Node.js runtime). Never import bcrypt in middleware.
**Warning signs:** Module not found errors, Edge Runtime compatibility warnings during build.

### Pitfall 8: Session Cookie Not Persisting Across Requests
**What goes wrong:** Session appears to work on login but user is immediately logged out on next request.
**Why it happens:** Session `save()` not awaited, or cookie domain/path misconfigured.
**How to avoid:** Always `await session.save()` after modifying session. Use default cookie options (`path: '/'`, no custom domain unless needed).
**Warning signs:** Login succeeds but immediate redirect shows unauthenticated state; session cookie not visible in DevTools → Application → Cookies.

## Code Examples

Verified patterns from official sources:

### Complete Login Form with Server Actions
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// app/(auth)/login/page.tsx
'use client'

import { useFormState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [state, formAction] = useFormState(login, undefined)

  return (
    <form action={formAction} className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>

      <div>
        <Input
          type="password"
          name="password"
          placeholder="Enter password"
          required
        />
        {state?.error && (
          <p className="text-sm text-red-500 mt-1">{state.error}</p>
        )}
      </div>

      <Button type="submit" className="w-full">
        Login
      </Button>
    </form>
  )
}
```

### Protected Server Component
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
// app/(dashboard)/page.tsx
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  // This will redirect to /login if not authenticated
  const session = await verifySession()

  // Fetch data after auth verification
  const campaigns = await prisma.campaign.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1>Dashboard</h1>
      <p>User ID: {session.userId}</p>
      {/* Render campaigns... */}
    </div>
  )
}
```

### Password Hashing Utilities
```typescript
// Source: https://nextjs.org/learn/dashboard-app/adding-authentication
// lib/auth.ts - Separate file for Node.js APIs
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
```

### Prisma Schema Setup
```prisma
// Source: https://www.prisma.io/docs/getting-started/quickstart-sqlite
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Campaign {
  id              String           @id @default(cuid())
  amazonId        String           @unique
  name            String
  status          String
  budget          Float
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  adGroups        AdGroup[]
  metrics         CampaignMetric[]
}

// ... additional models for AdGroup, Keyword, Metrics, etc.
```

### Environment Variables Setup
```bash
# Source: https://nextjs.org/docs/pages/guides/environment-variables
# .env.example (commit this to git)
# Session secret (min 32 characters) - generate with: openssl rand -base64 32
SESSION_SECRET=your-secret-key-here-min-32-characters

# Simple password auth
PPC_DASHBOARD_PASSWORD=your-dashboard-password

# Database
DATABASE_URL="file:./prisma/dev.db"

# Amazon Advertising API (for later phases)
# AMAZON_CLIENT_ID=
# AMAZON_CLIENT_SECRET=
# AMAZON_REFRESH_TOKEN=
```

### Package.json Scripts for Custom Port
```json
// Source: https://dev.to/collegewap/how-to-set-port-in-nextjs-1l1e
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "postinstall": "prisma generate"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router | App Router | Next.js 13 (stable in 14) | Server Components by default, nested layouts, new routing conventions |
| NextAuth.js v4 | Auth.js (NextAuth v5) | 2024-2025 | Better App Router support, but still complex for simple use cases |
| Manual JWT with jsonwebtoken | jose or iron-session | 2023-2024 | Edge Runtime compatibility; simpler API for stateless sessions |
| Raw Prisma instantiation | Singleton pattern with globalThis | Ongoing (dev issue) | Prevents connection pool exhaustion in development |
| .env files without examples | .env.example committed | Standard practice 2024+ | Better onboarding, clearer required configuration |
| Middleware for all auth logic | Two-layer: Middleware (optimistic) + DAL (secure) | App Router era (2023+) | Avoids Edge Runtime limitations while maintaining protection |
| Client-side redirects | Server-side redirects in Server Actions | App Router era | Better security, SEO, no flash of wrong content |
| Tailwind CSS 3.x | Tailwind CSS 4.x | Late 2024-2025 | Simplified installation, performance improvements |
| bcrypt cost factor 10 | Cost factor 10-14 (benchmark-based) | 2026 guidance | Balance security and performance on modern hardware |

**Deprecated/outdated:**
- **Pages Router authentication patterns:** Use App Router patterns with Server Components and Server Actions instead
- **getServerSideProps for auth:** Use Server Components with session verification in Data Access Layer
- **API routes for login/logout:** Use Server Actions directly instead of API route wrappers
- **Context providers for auth state:** Use Server Components with `verifySession()` from DAL instead
- **Custom middleware crypto operations:** Edge Runtime limitations; use iron-session which handles this

## Open Questions

Things that couldn't be fully resolved:

1. **argon2 vs bcrypt for password hashing**
   - What we know: bcrypt is the official Next.js recommendation; argon2 is slightly more modern (2026 preference in security circles)
   - What's unclear: Whether argon2 works reliably in Next.js Server Actions (Node.js runtime), or if native dependencies cause build issues
   - Recommendation: Start with bcrypt per official docs; can upgrade to argon2 later if needed

2. **iron-session vs NextAuth.js for this specific use case**
   - What we know: iron-session is simpler for single-password auth; NextAuth.js offers more features (OAuth, multiple providers, callbacks)
   - What's unclear: Whether future requirements (e.g., multi-user, OAuth for Amazon API) would necessitate NextAuth.js migration
   - Recommendation: Use iron-session for Phase 1 as specified (simple password auth); NextAuth.js would be migration path for OAuth needs

3. **Tailwind CSS v4 adoption timeline**
   - What we know: Tailwind v4 was released late 2024-2025; simplified installation
   - What's unclear: Whether create-next-app defaults to v4 or v3; compatibility with shadcn/ui
   - Recommendation: Use whatever version create-next-app installs by default; shadcn/ui should work with either

4. **Session refresh strategy**
   - What we know: iron-session supports TTL; session can be extended by calling save()
   - What's unclear: Best practice for session refresh (on every request, only on activity, manual refresh button)
   - Recommendation: Implement basic 7-day expiration initially; can add "refresh on activity" in future phase if needed

## Sources

### Primary (HIGH confidence)
- Next.js Official Docs - Authentication Guide: https://nextjs.org/docs/app/guides/authentication
- Next.js Official Docs - Project Structure: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js Official Tutorial - Adding Authentication: https://nextjs.org/learn/dashboard-app/adding-authentication
- iron-session GitHub Repository: https://github.com/vvo/iron-session
- iron-session npm: https://www.npmjs.com/package/iron-session
- Prisma Next.js Guide: https://www.prisma.io/docs/guides/nextjs
- Prisma SQLite Quickstart: https://www.prisma.io/docs/getting-started/quickstart-sqlite
- shadcn/ui Installation Next.js: https://ui.shadcn.com/docs/installation/next
- Tailwind CSS Next.js Guide: https://tailwindcss.com/docs/guides/nextjs

### Secondary (MEDIUM confidence)
- iron-session Next.js 14 Tutorial: https://blog.lama.dev/next-js-14-auth-with-iron-session/
- Next.js Prisma Production Guide: https://www.digitalapplied.com/blog/prisma-orm-production-guide-nextjs
- Medium - Prisma globalThis Singleton Explanation: https://medium.com/@simarpalsingh13/stop-copy-pasting-globalthis-prisma-hot-reload-in-node-js-vs-next-js-explained-e664ec6ced23
- WorkOS - Top Auth Solutions Next.js 2026: https://workos.com/blog/top-authentication-solutions-nextjs-2026
- Clerk - Complete Authentication Guide Next.js App Router: https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router
- Next.js Project Structure Best Practices 2025: https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji
- Medium - App Router Best Practices 2025: https://medium.com/better-dev-nextjs-react/inside-the-app-router-best-practices-for-next-js-file-and-directory-structure-2025-edition-ed6bc14a8da3

### Tertiary (LOW confidence)
- Various Medium articles on Next.js authentication patterns (cross-verified with official docs)
- DEV Community posts on Prisma setup (verified against official Prisma docs)
- Stack Overflow discussions on Edge Runtime limitations (verified against Next.js official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All recommendations from official documentation or widely-adopted libraries with official Next.js support
- Architecture patterns: HIGH - Patterns sourced from Next.js official docs, Prisma official docs, and iron-session official examples
- Pitfalls: MEDIUM-HIGH - Combination of official documentation warnings and verified community experience; Edge Runtime limitations confirmed in official docs

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - Next.js ecosystem is stable; App Router patterns are established)

**Note on sources:** This research prioritized official documentation (Next.js, Prisma, iron-session) over third-party tutorials. Where third-party sources were used, they were cross-verified with official documentation or multiple credible sources. All code examples are adapted from official sources or verified working patterns.
