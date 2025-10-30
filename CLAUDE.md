# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview :-)

This is a Next.js 15 application named "skinbestie-coach-app" built with React 19, TypeScript, and Tailwind CSS v4. The project uses the App Router architecture and is configured to use Turbopack for faster builds.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production (uses Turbopack)
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Test commands (Vitest)
npm run test          # Run tests in watch mode
npm run test:ui       # Run tests with UI interface
npm run test:run      # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report

# Database commands (Drizzle ORM)
npm run db:generate   # Generate migrations from schema
npm run db:push       # Push schema changes to database (no migration files)
npm run db:migrate    # Run migrations
npm run db:studio     # Open Drizzle Studio (database GUI)
```

Development server runs on http://localhost:3000

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **React**: 19.1.0
- **TypeScript**: 5.x with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **Build Tool**: Turbopack (default for dev and build)
- **Linting**: ESLint with Next.js config
- **Testing**: Vitest with React Testing Library
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Driver**: postgres (postgres-js)
- **Git Hooks**: Husky + lint-staged for pre-commit/pre-push validation

## Git Hooks (Husky + lint-staged)

This project uses Git hooks to enforce code quality automatically:

### Pre-commit Hook
Runs on every `git commit`:
1. **lint-staged**: ESLint + Prettier on staged `.ts`/`.tsx` files
2. **Tests**: `npm run test:run` (all tests must pass)
3. **Type check**: `npx tsc --noEmit` (zero TypeScript errors)

### Pre-push Hook
Runs on every `git push`:
1. **Tests**: `npm run test:run`
2. **Type check**: `npx tsc --noEmit`
3. **Build**: `npm run build` (production build must succeed)

### Documentation
- Full guide: `docs/GIT_HOOKS_GUIDE.md`
- Quick reference: `docs/GIT_HOOKS_QUICK_REFERENCE.md`

**Note**: When making commits, be aware that hooks will run automatically. All checks must pass before commits/pushes succeed.

## Project Structure

```
src/
├── app/              # Next.js App Router directory
│   ├── layout.tsx    # Root layout with font configuration (Geist fonts)
│   ├── page.tsx      # Home page
│   ├── globals.css   # Global Tailwind styles
│   └── favicon.ico   # Site favicon
└── lib/
    ├── db/           # Database files
    │   ├── schema.ts      # Drizzle schema definitions
    │   ├── index.ts       # Database connection & exports
    │   └── migrations/    # Generated migration files
    └── utils.ts      # Utility functions
└── test/             # Test utilities
    ├── setup.ts      # Vitest setup
    └── utils.tsx     # Custom render functions

public/               # Static assets (SVG icons, images)
drizzle.config.ts     # Drizzle Kit configuration
vitest.config.ts      # Vitest configuration
```

## TypeScript Configuration

- **Path alias**: `@/*` maps to `./src/*` for cleaner imports
- **Target**: ES2017
- **Module Resolution**: bundler
- **Strict mode**: enabled
- **JSX**: preserve (handled by Next.js)

## Key Conventions

- **Styling**: Uses Tailwind CSS v4 with the new PostCSS plugin (`@tailwindcss/postcss`)
- **Fonts**: Geist Sans and Geist Mono are pre-configured as CSS variables (`--font-geist-sans`, `--font-geist-mono`)
- **Metadata**: Defined using Next.js Metadata API in layout.tsx
- **Component Structure**: Server Components by default (Next.js App Router)

## Database Setup (Drizzle ORM)

This project uses **Drizzle ORM** with PostgreSQL for database operations.

### Schema Location

- Database schema: `src/lib/db/schema.ts`
- Database connection: `src/lib/db/index.ts`
- Configuration: `drizzle.config.ts`

### Current Schema

- **admins**: Admin accounts (email, password, roles)
- **password_tokens**: Password reset/setup tokens

### Workflow

1. **Modify schema** in `src/lib/db/schema.ts`
2. **Generate migration**: `npm run db:generate`
3. **Apply to database**: `npm run db:migrate`
4. For quick prototyping without migrations: `npm run db:push`

### Database Access

```typescript
import { db, admins } from "@/lib/db";

// Use Drizzle queries
const admin = await db
  .select()
  .from(admins)
  .where(eq(admins.email, "test@example.com"));
```

### Environment Variables

Required in `.env.local`:

- `DATABASE_URL`: PostgreSQL connection string

## Testing (Vitest)

This project uses **Vitest** with React Testing Library for unit and integration testing.

### Test Configuration

- Configuration: `vitest.config.ts`
- Setup file: `src/test/setup.ts`
- Test utilities: `src/test/utils.tsx`

### Writing Tests

Place test files next to the code they test with `.test.ts` or `.spec.ts` extension:

```
src/lib/utils.ts
src/lib/utils.test.ts  ← test file
```

### Test Structure

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";

describe("ComponentName", () => {
  it("should render correctly", () => {
    // Your test here
  });
});
```

### Running Tests

- **Watch mode**: `npm run test` (reruns on file changes)
- **UI mode**: `npm run test:ui` (visual test runner)
- **Single run**: `npm run test:run` (for CI/CD)
- **Coverage**: `npm run test:coverage` (generates coverage report)

### Testing Best Practices

- Test user behavior, not implementation details
- Use Testing Library queries in order of priority: `getByRole` > `getByLabelText` > `getByTestId`
- Mock external dependencies (APIs, database)
- Keep tests fast and isolated

## Architecture Notes

This is an admin portal application built with:

- Next.js App Router (not Pages Router)
- Server Components as the default rendering strategy
- Turbopack bundler for both development and production builds
- Tailwind CSS v4 (latest version with simplified PostCSS setup)
- Drizzle ORM for type-safe database operations

When adding new features, follow Next.js 15 conventions:

- Place routes in `src/app/` following file-system routing
- Use Server Components by default, add `"use client"` directive only when needed
- Leverage Next.js built-in optimizations (Image, Font, etc.)
- Use Drizzle ORM for all database operations
