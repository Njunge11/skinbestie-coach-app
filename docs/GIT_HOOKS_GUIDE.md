# Git Hooks Guide

This guide explains the pre-commit and pre-push hooks setup for the skinbestie-coach-app project.

## Table of Contents

- [Overview](#overview)
- [Tools Used](#tools-used)
- [Why These Tools?](#why-these-tools)
- [Setup Instructions](#setup-instructions)
- [How It Works](#how-it-works)
- [What Gets Checked](#what-gets-checked)
- [Workflow Examples](#workflow-examples)
- [Troubleshooting](#troubleshooting)
- [Customization](#customization)

## Overview

This project uses Git hooks to automatically validate code quality before commits and pushes. This ensures:

- **Code Quality**: All committed code is linted and formatted
- **Type Safety**: No TypeScript errors make it into the codebase
- **Test Coverage**: All tests pass before code is committed
- **Build Success**: Production builds work before code is pushed

## Tools Used

### 1. Husky (v9.1.7)

**What it is**: Git hooks manager for Node.js projects

**Why**: Industry standard with 7M+ weekly NPM downloads, used by Facebook, Airbnb, Microsoft, and thousands of production projects

**Repository**: https://github.com/typicode/husky

**What it does**: Simplifies Git hooks setup and management by:
- Automatically installing Git hooks
- Making hooks easy to share across the team
- Supporting all Git hooks (pre-commit, pre-push, etc.)

### 2. lint-staged (v16.2.6)

**What it is**: Runs linters only on staged Git files

**Why**: Dramatically improves performance by only checking files you're committing (not the entire codebase)

**Repository**: https://github.com/lint-staged/lint-staged

**What it does**:
- Runs commands only on staged files
- Supports multiple file types and commands
- Automatically adds fixed files back to staging

### 3. Additional Tools (Already in Project)

- **ESLint**: JavaScript/TypeScript linter
- **Prettier**: Code formatter
- **TypeScript**: Type checking
- **Vitest**: Test runner

## Why These Tools?

We evaluated multiple options and chose Husky + lint-staged because:

### Husky vs. Alternatives

| Feature | Husky | Lefthook | pre-commit |
|---------|-------|----------|------------|
| NPM Downloads | 7M+/week | Growing | Python-based |
| Setup Complexity | Simple | Medium | Complex |
| Performance | Good | Excellent | Good |
| Node.js Integration | Native | Binary | None |
| Community Support | Massive | Growing | Large |
| Best For | JS/TS projects | Monorepos, multi-lang | Python projects |

**Decision**: Husky for its simplicity, massive community support, and native Node.js integration.

### Why lint-staged?

Without lint-staged, running ESLint/Prettier on the entire codebase (hundreds of files) would:
- Take 10-30 seconds per commit
- Check files you didn't even touch
- Frustrate developers and encourage skipping hooks

With lint-staged:
- Only checks staged files (typically 1-5 files)
- Takes 1-3 seconds
- Developers stay productive

## Setup Instructions

### Initial Setup (Already Done)

If you cloned this repo, the hooks are already configured. Just run:

```bash
npm install
```

The `prepare` script in package.json automatically runs `husky` to set up hooks.

### Manual Setup (For New Projects)

If setting up from scratch:

#### 1. Install Dependencies

```bash
npm install --save-dev husky lint-staged
```

#### 2. Initialize Husky

```bash
npx husky init
```

This creates:
- `.husky/` directory
- `prepare` script in package.json
- Git hooks path configuration

#### 3. Create Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh

# Run lint-staged for code formatting
npx lint-staged

# Run tests
npm run test:run

# Run type check
npx tsc --noEmit
```

Make it executable:

```bash
chmod +x .husky/pre-commit
```

#### 4. Create Pre-push Hook

Create `.husky/pre-push`:

```bash
#!/bin/sh

# Run tests
npm run test:run

# Run type check
npx tsc --noEmit

# Run build
npm run build
```

Make it executable:

```bash
chmod +x .husky/pre-push
```

#### 5. Configure lint-staged

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## How It Works

### Architecture

```
Git Action (commit/push)
         ↓
    Git Hook Triggered
         ↓
    Husky Executes Hook
         ↓
    Commands Run in Sequence
         ↓
    All Pass → Action Succeeds
    Any Fail → Action Blocked
```

### Pre-commit Hook Flow

```
git commit -m "message"
         ↓
1. lint-staged runs
   - Finds staged *.ts, *.tsx files
   - Runs: eslint --fix
   - Runs: prettier --write
   - Adds fixed files back to staging
         ↓
2. npm run test:run
   - Runs all Vitest tests
   - Must all pass (no skipped critical tests)
         ↓
3. npx tsc --noEmit
   - Type checks entire codebase
   - Must have zero TypeScript errors
         ↓
4. If all succeed → Commit created
   If any fail → Commit blocked
```

### Pre-push Hook Flow

```
git push
         ↓
1. npm run test:run
   - Runs all Vitest tests
         ↓
2. npx tsc --noEmit
   - Type checks entire codebase
         ↓
3. npm run build
   - Runs Next.js production build
   - Uses Turbopack
   - Must complete successfully
         ↓
4. If all succeed → Push proceeds
   If any fail → Push blocked
```

## What Gets Checked

### Pre-commit (Fast - 5-15 seconds)

| Check | Tool | Files Checked | Purpose |
|-------|------|--------------|---------|
| Linting | ESLint | Staged `.ts`, `.tsx` | Code quality, catch errors |
| Formatting | Prettier | Staged `.ts`, `.tsx` | Consistent code style |
| Tests | Vitest | All test files | Prevent breaking changes |
| Type Check | TypeScript | All `.ts`, `.tsx` | Type safety |

### Pre-push (Slower - 30-60 seconds)

| Check | Tool | Scope | Purpose |
|-------|------|-------|---------|
| Tests | Vitest | All tests | Full test suite validation |
| Type Check | TypeScript | All files | Full type safety |
| Build | Next.js | Entire app | Production build verification |

## Workflow Examples

### Example 1: Successful Commit

```bash
# Make changes to a file
vim src/app/page.tsx

# Stage changes
git add src/app/page.tsx

# Attempt commit
git commit -m "Update home page layout"

# Output:
# ✔ Preparing lint-staged...
# ✔ Running tasks for staged files...
# ✔ Applying modifications from tasks...
# ✔ Cleaning up temporary files...
#
# > npm run test:run
# ✓ All tests passed (52 tests)
#
# > npx tsc --noEmit
# ✓ No type errors
#
# [main abc123] Update home page layout
#  1 file changed, 5 insertions(+), 3 deletions(-)
```

### Example 2: Failed Commit (Type Error)

```bash
git commit -m "Add new feature"

# Output:
# ✔ Preparing lint-staged...
# ✔ Running tasks for staged files...
# ✔ Applying modifications from tasks...
# ✔ Cleaning up temporary files...
#
# > npm run test:run
# ✓ All tests passed
#
# > npx tsc --noEmit
# ✗ Type error found:
# src/app/page.tsx:15:7 - error TS2322:
# Type 'string' is not assignable to type 'number'
#
# ✗ Commit blocked - fix type errors and try again
```

### Example 3: Failed Push (Build Error)

```bash
git push origin main

# Output:
# > npm run test:run
# ✓ All tests passed
#
# > npx tsc --noEmit
# ✓ No type errors
#
# > npm run build
# ✗ Build failed:
# Error: Module not found: Can't resolve './missing-module'
#
# ✗ Push blocked - fix build errors and try again
```

### Example 4: Auto-fixed Formatting

```bash
# File has formatting issues
git add src/lib/utils.ts
git commit -m "Add utility function"

# Output:
# ✔ Preparing lint-staged...
# ⚠ Running tasks for staged files...
#   ↓ src/lib/utils.ts
#     ✔ eslint --fix (fixed 2 issues)
#     ✔ prettier --write (formatted)
# ✔ Applying modifications from tasks...
#
# > npm run test:run
# ✓ All tests passed
#
# [main def456] Add utility function
#  1 file changed, 10 insertions(+)
```

## Troubleshooting

### Hook Not Running

**Problem**: Commits succeed without running hooks

**Solutions**:

1. Check if hooks are installed:
   ```bash
   ls -la .husky/
   ```

2. Check Git hooks path:
   ```bash
   git config core.hooksPath
   # Should output: .husky/_
   ```

3. Reinstall hooks:
   ```bash
   npm run prepare
   ```

### Hook Permission Denied

**Problem**: `permission denied: .husky/pre-commit`

**Solution**:
```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Tests Taking Too Long

**Problem**: Pre-commit hook is too slow

**Solutions**:

1. **Option A**: Move tests to pre-push only

   Edit `.husky/pre-commit` and remove:
   ```bash
   # npm run test:run  # Commented out
   ```

2. **Option B**: Run only unit tests in pre-commit

   Create separate test scripts in `package.json`:
   ```json
   {
     "scripts": {
       "test:unit": "vitest run --testNamePattern='unit'",
       "test:integration": "vitest run --testNamePattern='integration'"
     }
   }
   ```

   Update `.husky/pre-commit`:
   ```bash
   npm run test:unit  # Faster
   ```

3. **Option C**: Use test filtering

   Only run tests related to changed files (requires setup)

### Build Taking Too Long

**Problem**: Pre-push takes 2+ minutes

**Solutions**:

1. **Option A**: Build only on CI/CD

   Remove build from `.husky/pre-push` and rely on GitHub Actions/CI

2. **Option B**: Use build cache

   Next.js already caches builds in `.next/cache`

### Skipping Hooks (Emergency Only)

**When to skip**: Only in emergencies (hotfix, critical bug)

**How to skip**:

```bash
# Skip pre-commit
git commit -m "Emergency hotfix" --no-verify

# Skip pre-push
git push --no-verify
```

**⚠️ Warning**: Skipping hooks can introduce bugs. Use sparingly and fix issues immediately after.

### ESLint/Prettier Conflicts

**Problem**: ESLint and Prettier fight over formatting

**Solution**:

1. Ensure ESLint config is compatible with Prettier
2. Install `eslint-config-prettier` to disable conflicting rules:
   ```bash
   npm install --save-dev eslint-config-prettier
   ```

3. Add to ESLint config:
   ```json
   {
     "extends": ["next", "prettier"]
   }
   ```

## Customization

### Adding More File Types

Edit `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "*.json": ["prettier --write"],
    "*.md": ["prettier --write"]
  }
}
```

### Adding Commit Message Linting

Install commitlint:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Create `.husky/commit-msg`:

```bash
#!/bin/sh
npx --no -- commitlint --edit $1
```

Add config to `package.json`:

```json
{
  "commitlint": {
    "extends": ["@commitlent/config-conventional"]
  }
}
```

### Different Checks for Different Branches

Edit `.husky/pre-push`:

```bash
#!/bin/sh

# Get current branch
branch=$(git rev-parse --abbrev-ref HEAD)

# Run tests always
npm run test:run

# Type check always
npx tsc --noEmit

# Only build on main/develop
if [ "$branch" = "main" ] || [ "$branch" = "develop" ]; then
  npm run build
fi
```

### Parallel Execution (Faster)

For independent checks, run in parallel:

Edit `.husky/pre-commit`:

```bash
#!/bin/sh

# Run lint-staged first (modifies files)
npx lint-staged

# Run tests and type-check in parallel
npm run test:run & npx tsc --noEmit &

# Wait for both to complete
wait
```

## Best Practices

1. **Keep hooks fast**: Pre-commit should be < 15 seconds
2. **Move slow checks to pre-push**: Builds, integration tests
3. **Never skip hooks**: Fix issues instead of bypassing
4. **Run hooks locally**: Don't rely only on CI/CD
5. **Document changes**: Update this guide when modifying hooks
6. **Test hook changes**: Ensure they work before committing hook modifications

## Additional Resources

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/lint-staged/lint-staged)
- [Git Hooks Reference](https://git-scm.com/docs/githooks)
- [Next.js ESLint](https://nextjs.org/docs/app/building-your-application/configuring/eslint)

## Maintenance

### Updating Husky

```bash
npm update husky
```

Check for breaking changes in [Husky releases](https://github.com/typicode/husky/releases).

### Updating lint-staged

```bash
npm update lint-staged
```

### Verifying Hook Installation

Run after any updates:

```bash
npm run prepare
ls -la .husky/
git config core.hooksPath
```

Should show:
- `.husky/pre-commit` (executable)
- `.husky/pre-push` (executable)
- Core hooks path: `.husky/_`

---

**Last Updated**: October 29, 2025
**Husky Version**: 9.1.7
**lint-staged Version**: 16.2.6
