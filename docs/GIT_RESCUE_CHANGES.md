# Git: Rescue and Move Changes to New Branch

## The Problem

You're on a branch that was deleted remotely. You have uncommitted code locally. You need to move this code to a new branch without losing anything.

**What breaks:** If you switch branches wrong, you might lose your uncommitted work.

---

## Quick Reference Commands

### Standard Case: Move uncommitted changes to new branch

```bash
git status                           # See what you have
git checkout -b new-branch-name      # Create new branch (changes come with you)
git add .                            # Stage everything
git commit -m "Your message"         # Commit it
git push -u origin new-branch-name   # Push to remote
```

**Done.** Your changes are safe on the new branch.

---

## Detailed Scenarios

### Scenario 1: Uncommitted Changes → New Branch

**Problem:** You have modified files and untracked files. You want them on a new branch.

```bash
# Step 1: Check what you have
git status

# Output shows:
# Changes not staged for commit:
#   modified:   src/app/foo.ts
# Untracked files:
#   src/app/bar.ts

# Step 2: Create and switch to new branch (changes follow you)
git checkout -b feature-new-stuff

# Step 3: Add everything (modified + untracked)
git add .

# Step 4: Commit
git commit -m "Add new feature X"

# Step 5: Push to remote
git push -u origin feature-new-stuff
```

**Result:** All changes now on `feature-new-stuff` branch, pushed to remote.

---

### Scenario 2: Old Branch Deleted Remotely

**Problem:** Branch `feature-old` was deleted on GitHub. You're still on it locally with uncommitted changes.

```bash
# Step 1: Check current state
git status
git branch -vv

# Output shows:
# * feature-old  abc1234 [origin/feature-old: gone] Latest commit
# Changes not staged for commit:
#   modified:   src/app/changes.ts

# Step 2: Create new branch from current state
git checkout -b feature-rescued

# Step 3: Commit your changes
git add .
git commit -m "Rescued changes from deleted branch"

# Step 4: Push new branch
git push -u origin feature-rescued

# Step 5: Delete old local branch (optional, after confirming everything is safe)
git checkout main  # Switch away first
git branch -D feature-old  # Delete old branch
```

**Result:** Changes saved on new branch. Old branch cleaned up.

---

### Scenario 3: Save Changes Without Committing (Stash)

**Problem:** You want to move changes to a new branch but not commit yet.

```bash
# Step 1: Save uncommitted changes temporarily
git stash push -u -m "WIP: Feature X changes"

# Output: Saved working directory and index state

# Step 2: Create and switch to new branch
git checkout -b feature-wip

# Step 3: Restore your changes
git stash pop

# Output: Changes restored to working directory

# Step 4: Later when ready, commit
git add .
git commit -m "Complete feature X"
git push -u origin feature-wip
```

**Result:** Changes moved to new branch, not committed yet.

---

### Scenario 4: Nuclear Backup (When You're Paranoid)

**Problem:** You don't trust git. You want a physical backup before doing anything.

```bash
# Step 1: Create backup outside git
cp -r . ../backup-$(date +%Y%m%d-%H%M%S)

# Output: Creates folder like ../backup-20251105-143022/

# Step 2: Now safely create new branch
git checkout -b feature-safe

# Step 3: Commit everything
git add .
git commit -m "Backed up and moved to new branch"

# Step 4: Push
git push -u origin feature-safe
```

**Result:** Physical backup exists at `../backup-20251105-143022/`. Changes on new branch.

---

## Important Git Behaviors

### ✅ Changes Follow You When Creating Branch

```bash
# You have uncommitted changes on branch-A
git status
# modified: foo.ts

git checkout -b branch-B
# Changes come with you automatically!

git status
# modified: foo.ts  (still there)
```

### ✅ Staged vs Unstaged Changes

```bash
# Both follow you to new branch:
git status
# Changes not staged:     modified: foo.ts  ← Follows you
# Untracked files:        bar.ts            ← Follows you
```

### ❌ What DOES NOT Work

```bash
# DON'T do this - loses uncommitted changes!
git reset --hard HEAD

# DON'T do this - deletes untracked files!
git clean -fd

# DON'T switch to existing branch with conflicts
git checkout main  # Fails if main has conflicting changes
```

---

## Troubleshooting

### Problem: "Cannot switch branch - uncommitted changes"

```bash
# Git says: "Your local changes would be overwritten"

# Option 1: Stash and move
git stash
git checkout target-branch
git stash pop

# Option 2: Commit first
git add .
git commit -m "WIP"
git checkout target-branch
```

### Problem: "Branch already exists"

```bash
# Git says: "A branch named 'feature-x' already exists"

# Solution: Use different name or delete old branch
git branch -D feature-x  # Delete local branch
git checkout -b feature-x  # Now create it
```

### Problem: "Lost some files after switching branches"

```bash
# Check stash
git stash list

# Recover from stash
git stash pop

# Check reflog (last 30 days of git history)
git reflog
git checkout abc1234  # Restore to specific state
```

---

## Common Workflows

### Workflow 1: Rescue changes from deleted remote branch

```bash
git status                          # Check what you have
git checkout -b feature-rescued     # Create new branch
git add .                          # Stage everything
git commit -m "Rescued changes"    # Commit
git push -u origin feature-rescued # Push to remote
git branch -D old-branch-name      # Delete old branch
```

### Workflow 2: Move WIP to new branch (keep uncommitted)

```bash
git stash push -u -m "WIP"         # Save changes
git checkout -b feature-wip        # New branch
git stash pop                      # Restore changes
# Continue working (commit later)
```

### Workflow 3: Split changes across two branches

```bash
# Scenario: foo.ts and bar.ts changed, want them on separate branches

# Option 1: Stash, selective apply
git stash                          # Save both
git checkout -b feature-foo
git stash pop                      # Restore both
git add foo.ts                     # Stage only foo.ts
git commit -m "Feature foo"
git push -u origin feature-foo

git stash push bar.ts              # Save bar.ts
git checkout -b feature-bar
git stash pop
git add bar.ts
git commit -m "Feature bar"
git push -u origin feature-bar
```

---

## Safety Checklist

Before switching branches:

- [ ] Run `git status` to see what you have
- [ ] Commit or stash uncommitted changes
- [ ] Check branch exists: `git branch -a`
- [ ] Check remote tracking: `git branch -vv`

After switching branches:

- [ ] Run `git status` to verify changes came with you
- [ ] Run `git log` to see recent commits
- [ ] Run `git branch` to confirm you're on the right branch

---

## Key Principles

1. **Uncommitted changes follow you** when you create a new branch
2. **`git add .` stages everything** (modified + untracked files)
3. **`git push -u origin branch-name`** sets up remote tracking
4. **Check with `git status`** before and after any operation
5. **You won't lose work** unless you run `git reset --hard` or `git clean -fd`

---

## Quick Command Reference

```bash
# See what you have
git status
git branch -vv

# Create new branch with changes
git checkout -b new-branch

# Stage and commit
git add .
git commit -m "Message"

# Push to remote
git push -u origin new-branch

# Stash for later
git stash push -u -m "Description"
git stash pop

# Backup outside git
cp -r . ../backup-$(date +%Y%m%d-%H%M%S)

# Delete local branch
git branch -D branch-name

# See history
git log --oneline
git reflog
```

---

**Remember:** Git doesn't delete your work unless you explicitly tell it to with destructive commands. Creating branches and switching between them is safe.
