# Stack Research

**Domain:** Amazon PPC Management Dashboard
**Researched:** 2026-02-04
**Confidence:** MEDIUM (based on Next.js ecosystem patterns; external verification blocked)

## Already Decided

The following stack decisions have already been made for this project:

| Technology | Version | Purpose | Source |
|------------|---------|---------|--------|
| Next.js | 14+ (App Router) | Web framework | PROJECT.md |
| Tailwind CSS | Latest | Styling | PROJECT.md |
| shadcn/ui | Latest | UI components | PROJECT.md |
| Prisma | Latest | ORM | PROJECT.md |
| SQLite | Latest | Database | PROJECT.md |
| Recharts or Tremor | Latest | Data visualization | PROJECT.md |
| @scaleleap/amazon-advertising-api-sdk | Latest | Amazon Ads API client | PROJECT.md |

This document focuses on **complementary technologies** needed to complete the stack.

## Recommended Stack

### Authentication & Session Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| iron-session | ^8.0.x | Cookie-based sessions | Lightweight, works natively with Next.js App Router, no database needed for single-user auth. Better than JWT for this use case because sessions are encrypted server-side. |
| bcryptjs | ^2.4.x | Password hashing | Industry standard for password hashing. Use over bcrypt (native) to avoid compilation issues. |

**Confidence:** HIGH (established pattern for simple auth in Next.js)

**Rationale:** For single-user password auth, you need stateless encrypted sessions (iron-session) + secure password hashing (bcryptjs). Avoid heavier solutions like NextAuth.js, which is overkill for single-user apps.

### Form Handling & Validation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-hook-form | ^7.50.x | Form state management | De facto standard for forms in React. Works seamlessly with shadcn/ui form components. Minimal re-renders, excellent DX. |
| zod | ^3.22.x | Schema validation | TypeScript-first validation library. shadcn/ui is built around react-hook-form + zod pattern. Type-safe, composable schemas. |

**Confidence:** HIGH (shadcn/ui explicitly recommends this combination)

**Rationale:** shadcn/ui components are designed for react-hook-form + zod. This is the standard pattern for type-safe forms in modern Next.js apps.

### HTTP Client & API Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| axios | ^1.6.x | HTTP client | More robust than fetch() for API integrations. Built-in interceptors for rate limiting, request/response transformation, retry logic. Critical for Amazon Ads API rate limit handling. |
| p-queue | ^8.0.x | Promise queue | Essential for respecting Amazon's 10 req/sec burst, ~2 req/sec sustained rate limits. Prevents API throttling errors. |

**Confidence:** HIGH (axios is standard for complex API integrations; p-queue is standard for rate limiting)

**Rationale:** You need request queuing to stay under Amazon's rate limits. p-queue + axios interceptors is the standard pattern. The @scaleleap SDK doesn't handle queuing across all your endpoints.

### Background Jobs & Scheduling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| node-cron | ^3.0.x | In-process job scheduling | Lightweight cron scheduler that runs in your Next.js process. No external dependencies. Perfect for periodic Amazon API syncs. |
| async-mutex | ^0.5.x | Lock management | Prevents overlapping sync jobs. Critical for data consistency when syncing campaigns/metrics from Amazon. |

**Confidence:** MEDIUM (pattern works but external cron might be preferred for production)

**Alternative:** Since your constraints mention "Cron scheduling — handled externally," you may not need node-cron if you'll trigger syncs via external cron hitting API endpoints. In that case, you only need async-mutex for lock management.

### State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| zustand | ^4.5.x | Client state management | Minimal, unopinionated state manager. Perfect for dashboard UI state (selected date ranges, filters, expanded panels). Avoid Redux complexity for single-user app. |
| swr | ^2.2.x | Server state caching | Stale-while-revalidate pattern for API data. Built by Vercel for Next.js. Handles caching, revalidation, deduplication automatically. |

**Confidence:** HIGH (standard pattern for Next.js dashboards)

**Rationale:** Separate client state (zustand) from server state (swr). swr is perfect for polling-based updates (you mentioned no WebSockets in v1). Auto-revalidation keeps dashboard data fresh.

**Alternative:** If you prefer React Server Components for all data fetching, you might skip swr and use Next.js caching primitives. But swr is valuable for client-side polling and optimistic updates.

### Date Handling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| date-fns | ^3.x.x | Date manipulation | Lightweight, tree-shakeable, immutable. Better than moment.js (deprecated) or day.js (smaller ecosystem). Essential for date range pickers, metric aggregations. |

**Confidence:** HIGH (date-fns is current standard over moment.js)

### TypeScript Utilities

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| type-fest | ^4.x.x | Advanced TS types | Utility types for complex API response typing. Helps maintain type safety across Amazon API SDK responses and your REST API. |

**Confidence:** MEDIUM (useful but optional)

### Testing Stack

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| vitest | ^1.2.x | Unit test runner | Faster than Jest, native ESM support, works seamlessly with Next.js. Vercel team recommends it. |
| @testing-library/react | ^14.x.x | Component testing | Industry standard for React component testing. Works with App Router. |
| @testing-library/user-event | ^14.x.x | User interaction testing | Simulates real user events for form testing, click flows. |
| playwright | ^1.41.x | E2E testing | Best-in-class E2E testing. More reliable than Cypress for complex workflows (OAuth, API mocking). |

**Confidence:** MEDIUM (standard stack but needs verification for Next.js 14 App Router compatibility)

**Note:** Testing is critical for the audit trail and safety enforcement requirements. Rules engine and agent API need comprehensive test coverage.

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| tsx | ^4.x.x | TypeScript execution | Run TS scripts directly (Prisma seed, migrations). Faster than ts-node. |
| dotenv-cli | ^7.x.x | Environment management | Load different .env files for dev/staging/prod. |
| prettier | ^3.x.x | Code formatting | Consistent formatting. Use with prettier-plugin-tailwindcss for class sorting. |
| eslint | ^8.x.x | Linting | Next.js includes ESLint config. Add @typescript-eslint for stricter checks. |

**Confidence:** HIGH (standard Next.js dev tooling)

## Installation

```bash
# Already decided (from PROJECT.md)
npm install next@latest react react-dom
npm install tailwindcss postcss autoprefixer
npm install @prisma/client
npm install @scaleleap/amazon-advertising-api-sdk
npm install recharts  # or tremor

# Authentication
npm install iron-session bcryptjs
npm install -D @types/bcryptjs

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# HTTP & Rate Limiting
npm install axios p-queue

# Background Jobs (if not using external cron)
npm install node-cron async-mutex
npm install -D @types/node-cron

# State Management
npm install zustand swr

# Utilities
npm install date-fns

# TypeScript Utilities (optional)
npm install type-fest

# Development
npm install -D tsx dotenv-cli prettier prettier-plugin-tailwindcss
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Testing (optional but recommended)
npm install -D vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react
npm install -D playwright @playwright/test
```

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Session Management | iron-session | NextAuth.js | If you need OAuth providers or multi-user support later. Overkill for single-user password auth. |
| Forms | react-hook-form + zod | Formik + Yup | If already familiar with Formik. But react-hook-form has better performance and shadcn/ui integration. |
| HTTP Client | axios | native fetch() | If you want zero dependencies. But axios interceptors simplify rate limit handling significantly. |
| Rate Limiting | p-queue | bottleneck | Both work. p-queue has simpler API. bottleneck has more features (clustering). |
| State Management | zustand | Redux Toolkit | If you need Redux DevTools time-travel debugging. Overkill for single-user dashboard. |
| Server State | swr | TanStack Query (react-query) | Both excellent. swr is smaller and simpler. TanStack Query has more features (infinite scroll, optimistic updates). |
| Date Library | date-fns | day.js | day.js is smaller (2kb). date-fns has more comprehensive API and better TypeScript support. |
| Test Runner | vitest | Jest | Jest works but slower. vitest is faster and better for Vite/Next.js. |
| E2E Testing | playwright | Cypress | Cypress has better DX. Playwright is more reliable for complex auth flows and headless CI. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| moment.js | Deprecated, huge bundle size (200kb+), mutable API causes bugs | date-fns or day.js |
| JWT libraries (jsonwebtoken) | Unnecessary complexity for single-user. Stateless JWTs can't be revoked server-side. | iron-session (encrypted cookies) |
| Redux (plain) | Too much boilerplate for single-user dashboard. Overkill. | zustand for client state, swr for server state |
| Class Validator | Incompatible with Zod. shadcn/ui ecosystem is built around Zod. | zod |
| node-fetch | Deprecated in Node 18+. Native fetch() is now built-in. | axios or native fetch() |
| bcrypt (native) | Requires C++ compilation, breaks on some systems | bcryptjs (pure JS) |

## Stack Patterns by Use Case

### API Rate Limiting Pattern

**For Amazon Ads API calls:**
```typescript
import PQueue from 'p-queue';

// Max 10 req/sec burst, ~2 req/sec sustained
const amazonQueue = new PQueue({
  concurrency: 1,
  interval: 1000,
  intervalCap: 2,
});

// Wrap all Amazon API calls
await amazonQueue.add(() => amazonClient.getCampaigns());
```

### Form Validation Pattern

**For dashboard forms (rule builder, campaign editor):**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ruleSchema = z.object({
  name: z.string().min(1),
  maxBidChange: z.number().max(50), // Safety limit
});

const form = useForm({
  resolver: zodResolver(ruleSchema),
});
```

### Background Sync Pattern

**For periodic Amazon data sync:**
```typescript
import cron from 'node-cron';
import { Mutex } from 'async-mutex';

const syncMutex = new Mutex();

cron.schedule('*/15 * * * *', async () => {
  if (syncMutex.isLocked()) return; // Skip if already running

  const release = await syncMutex.acquire();
  try {
    await syncCampaigns();
  } finally {
    release();
  }
});
```

**Alternative (if using external cron):**
```typescript
// app/api/sync/route.ts
export async function POST(req: Request) {
  const release = await syncMutex.acquire();
  try {
    await syncCampaigns();
    return Response.json({ success: true });
  } finally {
    release();
  }
}
```

### Authentication Pattern

**For single-user password auth:**
```typescript
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';

// Login
const hashedPassword = await bcrypt.hash(password, 10);
const valid = await bcrypt.compare(inputPassword, hashedPassword);

// Session
const session = await getIronSession(cookies(), {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ppc-session',
});
session.userId = 'user';
await session.save();
```

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-hook-form@^7.x | Next.js 14+ App Router | Works with Server Components via client-side forms |
| swr@^2.x | Next.js 14+ App Router | Client-side only. Use in 'use client' components. |
| zustand@^4.x | Next.js 14+ App Router | Client-side only. Use in 'use client' components. |
| iron-session@^8.x | Next.js 14+ App Router | Works in Server Components and API routes |
| Prisma@^5.x | SQLite | Use `provider = "sqlite"` in schema.prisma |
| axios@^1.6 | Node.js 18+ | Works with Next.js fetch caching if configured |

**CRITICAL:** Next.js 14 App Router requires careful separation of Client Components (`'use client'`) and Server Components. Libraries like swr, zustand, react-hook-form are client-only. Prisma, iron-session work server-side.

## Configuration Files Needed

### 1. `tsconfig.json`
Next.js generates this. Ensure:
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 2. `tailwind.config.ts`
shadcn/ui requires specific Tailwind config. Follow shadcn/ui setup docs.

### 3. `prisma/schema.prisma`
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### 4. `.env.local`
```bash
DATABASE_URL="file:./dev.db"
SESSION_SECRET="[32+ char random string]"
PPC_DASHBOARD_PASSWORD="[bcrypt hash]"
AMAZON_CLIENT_ID="[from Amazon]"
AMAZON_CLIENT_SECRET="[from Amazon]"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 5. `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    serverActions: true, // For form actions
  },
};
```

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Forms (react-hook-form + zod) | HIGH | Established shadcn/ui pattern |
| Auth (iron-session + bcryptjs) | HIGH | Standard simple auth pattern |
| Rate Limiting (p-queue) | HIGH | Standard pattern for API throttling |
| State (zustand + swr) | MEDIUM | Common pattern but needs verification for App Router edge cases |
| Background Jobs (node-cron) | MEDIUM | Works but external cron might be preferred |
| Testing (vitest) | MEDIUM | Needs verification for Next.js 14 compatibility |
| Specific Versions | LOW | Cannot verify latest versions without external tools |

## Verification Needed

**IMPORTANT:** The following need verification with official sources before implementation:

1. **Exact version numbers** - Check npm for latest stable versions
2. **Next.js 14 App Router compatibility** - Verify swr, zustand, vitest work with RSC
3. **@scaleleap/amazon-advertising-api-sdk documentation** - Verify it handles OAuth token refresh automatically
4. **shadcn/ui setup** - Follow official installation guide for exact dependencies
5. **iron-session App Router support** - Verify v8.x works with App Router cookies API

## Sources

**Unable to verify with external sources** due to WebSearch/WebFetch/Context7 being unavailable. Recommendations based on:

- Next.js ecosystem patterns (as of Jan 2025 knowledge cutoff)
- shadcn/ui documented dependencies
- Standard React/TypeScript patterns
- Amazon Ads API rate limit requirements from PROJECT.md

**Required verification:**
- Official Next.js docs: https://nextjs.org/docs
- shadcn/ui setup: https://ui.shadcn.com/docs/installation/next
- iron-session docs: https://github.com/vvo/iron-session
- react-hook-form docs: https://react-hook-form.com
- Prisma SQLite docs: https://www.prisma.io/docs/orm/overview/databases/sqlite

---
*Stack research for: Amazon PPC Management Dashboard*
*Researched: 2026-02-04*
*Confidence: MEDIUM (needs external verification)*
