# Git Hooks Quick Reference

A quick cheat sheet for working with Git hooks in this project.

## What Runs When?

### On Every Commit (`git commit`)

```
1. lint-staged     → Auto-fix & format staged files
2. test:run        → Run all tests
3. tsc --noEmit    → Type check
```

**Time**: ~5-15 seconds

### On Every Push (`git push`)

```
1. test:run        → Run all tests
2. tsc --noEmit    → Type check
3. npm run build   → Production build
```

**Time**: ~30-60 seconds

## Common Commands

### Normal Workflow

```bash
# Make changes
git add .
git commit -m "Add feature X"  # Pre-commit runs
git push                        # Pre-push runs
```

### Check What Will Run

```bash
# See what lint-staged will check
git diff --staged --name-only

# Manually run pre-commit checks
npx lint-staged
npm run test:run
npx tsc --noEmit

# Manually run pre-push checks
npm run test:run
npx tsc --noEmit
npm run build
```

### Emergency: Skip Hooks

```bash
# Skip pre-commit (use sparingly!)
git commit -m "Hotfix" --no-verify

# Skip pre-push (use sparingly!)
git push --no-verify
```

**⚠️ Warning**: Only use `--no-verify` in emergencies. Fix issues immediately after.

## Troubleshooting

### Hooks Not Running

```bash
# Reinstall hooks
npm run prepare

# Check hooks are installed
ls -la .husky/
git config core.hooksPath  # Should show: .husky/_
```

### Permission Denied

```bash
# Fix permissions
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Hook Fails - How to Fix

#### ESLint Errors

```bash
# See errors
npm run lint

# Auto-fix
npx eslint . --fix
```

#### Prettier Formatting

```bash
# Check formatting
npx prettier --check .

# Auto-format
npx prettier --write .
```

#### Test Failures

```bash
# Run tests in watch mode
npm run test

# Run specific test
npm run test -- src/path/to/test.ts

# Run with UI
npm run test:ui
```

#### Type Errors

```bash
# See all errors
npx tsc --noEmit

# See errors for specific file
npx tsc --noEmit src/path/to/file.ts
```

#### Build Errors

```bash
# Run build to see errors
npm run build

# Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

## Hook Configuration Files

```
.husky/
├── pre-commit     → Runs on git commit
└── pre-push       → Runs on git push

package.json
└── lint-staged    → Config for staged file linting
```

## Customization

### Temporarily Disable Specific Check

Edit `.husky/pre-commit` or `.husky/pre-push`:

```bash
#!/bin/sh

npx lint-staged
npm run test:run
# npx tsc --noEmit  # Commented out temporarily
```

**Remember**: Re-enable before pushing!

### Add File Type to lint-staged

Edit `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.json": ["prettier --write"],     // Add this
    "*.md": ["prettier --write"]        // Add this
  }
}
```

## Performance Tips

### Hook Too Slow?

**Option 1**: Move tests to pre-push only

```bash
# .husky/pre-commit (remove test line)
#!/bin/sh
npx lint-staged
# npm run test:run  ← Commented out
npx tsc --noEmit
```

**Option 2**: Cache npm dependencies

```bash
# Already cached by npm, but clear if issues:
npm cache clean --force
npm install
```

**Option 3**: Use faster test patterns

Create in `package.json`:

```json
{
  "scripts": {
    "test:unit": "vitest run -t unit",
    "test:quick": "vitest run --changed"
  }
}
```

## Quick Fixes

### "Hooks not running"

```bash
npm run prepare
```

### "Command not found: npx"

```bash
npm install
```

### "Git hooks disabled"

```bash
git config core.hooksPath .husky/_
```

### "Can't find module X"

```bash
npm install
```

### Reset Everything

```bash
# Remove hooks
rm -rf .husky

# Reinstall
npm install
npx husky init

# Recreate hooks (see main guide)
```

## File Locations

| File | Purpose |
|------|---------|
| `.husky/pre-commit` | Pre-commit hook script |
| `.husky/pre-push` | Pre-push hook script |
| `package.json` → `lint-staged` | Staged file linting config |
| `package.json` → `scripts.prepare` | Auto-install hooks on npm install |
| `.git/hooks/` | Git hooks (managed by Husky) |

## Need More Help?

See the [complete Git Hooks Guide](./GIT_HOOKS_GUIDE.md) for:
- Detailed setup instructions
- Architecture explanations
- Advanced customization
- Troubleshooting details
- Best practices

## Tool Documentation

- [Husky](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/lint-staged/lint-staged)
- [ESLint](https://eslint.org/docs/latest/)
- [Prettier](https://prettier.io/docs/en/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Vitest](https://vitest.dev/)

---

**Last Updated**: October 29, 2025
