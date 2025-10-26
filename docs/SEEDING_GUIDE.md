# Database Seeding Guide

This guide explains how to control when test data is seeded in your environments.

---

## Default Behavior

**Seeders do NOT run automatically** by default. This saves time and GitHub Actions minutes.

When workflows run without seeding:
- ✅ Database schema is created/updated
- ✅ Tests run (may fail if tests require seeded data)
- ❌ No test data is inserted

---

## Two Ways to Run Seeders

### Option 1: Manual Trigger (Recommended)

**Best for:** Running seeders once initially, then only when needed

**How to do it:**

1. Go to GitHub repository → **Actions** tab
2. Select **"PR Preview - Setup and Test"** workflow
3. Click **"Run workflow"** button (top right)
4. Select your feature branch
5. For "Run database seeders" → Select **true**
6. Click **"Run workflow"**

**Result:** Seeders run for this execution only

---

### Option 2: Enable for All PR Previews

**Best for:** When you always want test data in PR previews

**How to do it:**

1. Go to GitHub repository → **Settings**
2. Navigate to **Secrets and variables** → **Actions**
3. Click **Variables** tab
4. Click **"New repository variable"**
5. Add variable:
   - **Name:** `RUN_SEEDERS`
   - **Value:** `true`
6. Click **"Add variable"**

**Result:** Every PR preview will run seeders automatically

**To disable later:** Delete the `RUN_SEEDERS` variable or change value to `false`

---

## What Gets Seeded

When seeders run, they create:

### 1. User Profiles (100 total)
- Names, emails, phone numbers
- Skin types and concerns
- Various completion stages

### 2. Detailed Data (First 3 profiles only)
- 5 skincare goals each
- 1 routine each (started 5 months ago)
- ~150 days of compliance data each
- 20 weekly progress photos each
- 10 coach notes each

### 3. Templates & Admin
- 1 routine template (morning + evening skincare)
- 1 admin account (if none exists)

---

## Seeding Performance

**Approximate execution time:**
- Creating 100 user profiles: ~10 seconds
- Seeding 3 detailed profiles: ~30-60 seconds
- **Total:** ~1 minute

**Why it matters:** Disabling seeders when not needed saves GitHub Actions minutes and speeds up workflows.

---

## Recommended Strategy

**Starting out:**
1. ❌ Don't enable `RUN_SEEDERS` variable
2. ✅ Manually trigger seeding when you need to test with data (Option 1)
3. ✅ Keep seeders disabled by default to save time

**Later (when team grows):**
- Enable automatic seeding with `RUN_SEEDERS=true` if team always needs test data
- Otherwise, keep manual triggers for flexibility

---

## Checking If Seeders Ran

**In GitHub Actions logs:**
- If seeding ran: You'll see "🌱 Running database seeders..."
- If seeding skipped: You'll see "⏭️ Database seeders skipped"

**In PR comments:**
- If seeding ran: "🌱 Test data seeded"
- If seeding skipped: "⏭️ Seeders skipped (enable RUN_SEEDERS variable to seed data)"

---

## Troubleshooting

### Problem: Tests fail without seeded data

**Solution:** Either:
1. Update tests to not require seeded data (use fixtures)
2. Enable seeders for that environment
3. Manually trigger seeding before running tests

### Problem: Seeding takes too long

**Solution:**
- Reduce number of profiles in `seed-sample-users.ts` (change from 100 to 10)
- Only seed when absolutely necessary
- Keep seeders disabled by default

### Problem: Need test data for UI testing

**Solution:**
- Manually trigger seeding when you need to test UI that displays data
- Keep seeders disabled for regular test runs (fixtures are better for unit tests)
- Seed the staging database once, then it persists for all PRs to use

---

## Running Seeders Locally

To seed your local development database:

```bash
# Create user profiles
DATABASE_URL="your-local-db-url" node src/scripts/seed-sample-users.ts

# Add detailed data
DATABASE_URL="your-local-db-url" node src/scripts/seed-profiles.ts
```

---

## Summary

| Method | When to Use | Setup Required |
|--------|-------------|----------------|
| **Manual Trigger** | One-time or occasional seeding | None (available by default) |
| **Auto PR Previews** | Always want test data in PRs | Add `RUN_SEEDERS=true` variable |

**Recommendation:** Use manual triggers only. Enable automatic seeding later if needed.
