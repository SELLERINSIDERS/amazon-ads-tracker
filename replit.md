# Amazon Ads Tracker - PPC Dashboard

## Overview
This is an Amazon PPC (Pay-Per-Click) advertising management dashboard built with Next.js. It tracks and manages Amazon advertising campaigns, keywords, and metrics with automation capabilities.

## Tech Stack
- **Framework**: Next.js 14.2 with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Styling**: Tailwind CSS with Radix UI components
- **Authentication**: Simple password-based auth with iron-session
- **API**: Amazon Advertising API integration via @scaleleap SDK

## Project Structure
```
app/                  # Next.js App Router pages and API routes
  api/               # API endpoints (amazon, auth, campaigns, etc.)
  dashboard/         # Dashboard pages
components/          # React UI components (shadcn/ui based)
lib/                 # Business logic and utilities
  amazon-api.ts      # Amazon Advertising API client
  prisma.ts          # Prisma client singleton
  session.ts         # Session management
  auth.ts            # Authentication logic
  sync.ts            # Data synchronization
  rules.ts           # Automation rules
prisma/              # Prisma schema and migrations
```

## Environment Variables Required
- `POSTGRES_URL` - PostgreSQL connection string (auto-configured by Replit)
- `SESSION_SECRET` - Minimum 32 character secret for session encryption
- `PPC_DASHBOARD_PASSWORD` - Password for dashboard login
- `AMAZON_CLIENT_ID` - Amazon Advertising API client ID
- `AMAZON_CLIENT_SECRET` - Amazon Advertising API client secret
- `AMAZON_REDIRECT_URI` - OAuth callback URL

## Running the Project
```bash
npm run dev      # Start development server on port 5000
npm run build    # Build for production
npm start        # Start production server
```

## Database Commands
```bash
npx prisma db push    # Push schema changes to database
npx prisma studio     # Open Prisma database browser
npx prisma generate   # Regenerate Prisma client
```

## Recent Changes
- February 2026: Migrated from SQLite to PostgreSQL for Replit deployment
- Configured Next.js to allow all dev origins for Replit iframe preview
- Updated server to bind to 0.0.0.0:5000 for Replit environment
