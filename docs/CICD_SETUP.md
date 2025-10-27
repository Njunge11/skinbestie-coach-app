# CI/CD Setup Guide

This document explains how to configure GitHub Actions and Vercel for automated deployments.

---

## Overview

Our CI/CD pipeline has three environments:

| Environment | Branch | Domain | Database |
|-------------|--------|--------|----------|
| **Production** | `main` | `admin.skinbestie.co` | PlanetScale Postgres |
| **Staging** | `staging` | `staging-admin.skinbestie.co` | Supabase (Session Pooler) |
| **PR Previews** | `feature/*` | Auto-generated Vercel URLs | Supabase (isolated schemas) |

---

## Step 1: Configure Supabase

### Get the Session Pooler Connection String

**IMPORTANT: Use Session Pooler (port 5432), NOT Transaction Pooler (port 6543)**

**Why Session Pooler?**
- ✅ Supports prepared statements (works out of the box with postgres.js)
- ✅ No special configuration needed
- ✅ Won't cause app freezing
- ❌ Transaction Pooler (6543) requires `prepare: false` and can cause freezing

**How to get it:**

1. Go to your Supabase project dashboard
2. Click **Project Settings** (gear icon in sidebar)
3. Go to **Database** section
4. Scroll to **Connection string**
5. Select **Session pooler** tab
6. Copy the connection string that looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
7. **Important:** Replace `[password]` with your actual database password

---

## Step 2: Configure PlanetScale

### Get the Production Connection String

1. Go to PlanetScale dashboard
2. Select your database
3. Go to **main** branch (production)
4. Click **Connect**
5. Copy the PostgreSQL connection string
6. Format: `postgresql://[username]:[password]@[host]/[database]?sslmode=require`

---

## Step 3: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

### Secret 1: SUPABASE_DATABASE_URL
- **Name:** `SUPABASE_DATABASE_URL`
- **Value:** Your Supabase Session Pooler connection string (port 5432)
- **Used for:** Staging database and PR preview schemas

### Secret 2: PLANETSCALE_POSTGRES_URL
- **Name:** `PLANETSCALE_POSTGRES_URL`
- **Value:** Your PlanetScale production connection string
- **Used for:** Production database

---

## Step 3b: Configure Seeding (Optional)

By default, database seeders **do NOT run automatically** to save time and resources.

### To Enable Seeding:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click on **Variables** tab (not Secrets)
3. Click **New repository variable**
4. Add this variable:

#### For PR Previews:
- **Name:** `RUN_SEEDERS`
- **Value:** `true`
- **When to enable:** If you want test data in every PR preview

### Manual Seeding (Recommended)

Instead of automatic seeding, you can manually trigger seeding when needed:

1. Go to **Actions** tab in GitHub
2. Select the **PR Preview** workflow
3. Click **Run workflow**
4. Choose branch
5. Select **run_seeders: true**
6. Click **Run workflow**

This gives you full control over when seeding happens.

---

## Step 4: Configure Vercel Environment Variables

### Backend (Admin App) Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables**

#### Production Environment

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `DATABASE_URL` | PlanetScale Postgres connection string | Production |

#### Staging Branch (Preview)

| Variable Name | Value | Environment | Branch |
|---------------|-------|-------------|--------|
| `DATABASE_URL` | Supabase Session Pooler connection string | Preview | `staging` |
| `NODE_ENV` | `staging` | Preview | `staging` |

#### Other Preview Branches

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `DATABASE_URL` | Supabase Session Pooler connection string | Preview (default) |

---

## Step 5: Configure Vercel Custom Domains

### Backend Domains

1. Go to Vercel project → **Settings** → **Domains**
2. Add domain: `admin.skinbestie.co`
   - Assign to: `main` branch (Production)
3. Add domain: `staging-admin.skinbestie.co`
   - Assign to: `staging` branch (Preview)
4. Configure DNS records as instructed by Vercel

---

## Step 6: Enable System Environment Variables

1. In Vercel → **Settings** → **Environment Variables**
2. Find **"Automatically expose System Environment Variables"**
3. Toggle it **ON**

This enables variables like `VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, etc.

---

## Verification

### Test PR Preview

1. Create a feature branch: `git checkout -b feature/test`
2. Make a small change and commit
3. Push: `git push origin feature/test`
4. Open a Pull Request to `staging`
5. Check:
   - ✅ GitHub Actions runs and applies migrations to Supabase staging
   - ✅ Tests pass
   - ✅ Comment appears on PR with success message
   - ✅ Vercel deploys preview

### Test Staging

1. Merge PR to `staging`
2. Check:
   - ✅ Vercel automatically deploys to `staging-admin.skinbestie.co`
   - ✅ Test your changes on staging

### Test Production

1. Create PR: `staging` → `main`
2. Merge to `main`
3. Check:
   - ✅ GitHub Actions runs and applies migrations to PlanetScale
   - ✅ Tests pass
   - ✅ Vercel deploys to `admin.skinbestie.co`

---

## Troubleshooting

### App freezes with DATABASE_URL

**Problem:** Application hangs or freezes when connecting to database

**Solution:**
- ✅ Make sure you're using **Session Pooler (port 5432)**
- ❌ DO NOT use Transaction Pooler (port 6543) unless you configure `prepare: false`

Your connection string should end with `:5432/postgres`, not `:6543/postgres`

### GitHub Actions fails with "psql: command not found"

**Solution:** The workflow installs `postgresql-client` automatically. This error shouldn't occur.

### Schema changes not reflected in staging

**Solution:**
- Make sure `DATABASE_URL` is set correctly in GitHub secrets
- Check that `npm run db:migrate` ran successfully in the workflow logs
- Verify migration files were generated locally with `npm run db:generate` and committed

### Vercel deployment uses wrong database

**Solution:**
- Verify environment variables are set correctly in Vercel dashboard
- Check that branch-specific overrides are configured for `staging` branch
- Redeploy after changing environment variables

---

## Workflow Files

- `.github/workflows/pr-preview.yml` - PR preview setup and testing
- `.github/workflows/production-deploy.yml` - Production deployment

---

## Database Architecture

### Supabase (Staging & PR Previews)

- **Staging & PR Previews:** All use the shared `public` schema (default)
- **Workflow:** PR previews apply migrations to staging database, then tests run
- **Benefit:** Simple, cost-effective for solo/small teams

### PlanetScale (Production)

- **Production:** Uses `main` branch
- **Migrations:** Applied automatically via `db:migrate` in GitHub Actions
- **Schema changes:** Generated locally with `db:generate`, committed to git, and reviewed in PRs

---

## Cost Summary

| Service | Usage | Cost |
|---------|-------|------|
| Supabase | Staging & PR previews (shared database) | $0 (free tier) |
| PlanetScale Postgres | Production only | ~$39/month |
| Vercel | Unlimited deployments | $0 (included) |
| GitHub Actions | Standard usage | $0 (free tier) |

**Total:** ~$39/month

---

## Support

If you encounter issues:
1. Check GitHub Actions logs for error messages
2. Verify environment variables in Vercel dashboard
3. Confirm connection strings are correct (port 5432 for Supabase)
4. Review workflow files for any syntax errors
