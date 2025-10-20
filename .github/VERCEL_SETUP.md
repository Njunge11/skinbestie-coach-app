# Vercel Preview Deployment Setup

This guide explains how to set up GitHub Actions for automated Vercel preview deployments.

## Prerequisites

- Vercel account with the project already created
- GitHub repository with admin access

## Setup Steps

### 1. Get Vercel Credentials

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link your project (run in project root)
vercel link

# This creates a .vercel directory with project.json
```

After running `vercel link`, you'll find your credentials in `.vercel/project.json`:
- `projectId` → `VERCEL_PROJECT_ID`
- `orgId` → `VERCEL_ORG_ID`

#### Option B: From Vercel Dashboard

1. Go to your project settings on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **General**
3. Copy the **Project ID**
4. For Org ID, go to your team/account settings

### 2. Create Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Give it a name (e.g., "GitHub Actions")
4. Set expiration as needed
5. Copy the token (you won't be able to see it again!)

### 3. Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VERCEL_ORG_ID` | Your org/team ID | Found in `.vercel/project.json` as `orgId` |
| `VERCEL_PROJECT_ID` | Your project ID | Found in `.vercel/project.json` as `projectId` |
| `VERCEL_TOKEN` | Your Vercel token | Created in Vercel account settings |

### 4. Grant Workflow Permissions (Important!)

1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

This allows the workflow to comment preview URLs on PRs.

### 5. (Optional) Disable Vercel's Automatic GitHub Integration

If you want GitHub Actions to be the only deployment method:

1. Create/update `vercel.json` in your project root:

```json
{
  "github": {
    "enabled": false
  }
}
```

This prevents Vercel from automatically deploying when you push to GitHub.

## How It Works

When you open or update a pull request:

1. **Tests run first** - All tests must pass before deployment
2. **Build in GitHub Actions** - Project is built using your CI environment
3. **Deploy to Vercel** - Built artifacts are uploaded to Vercel
4. **Preview URL commented** - Bot comments the preview URL on the PR

## Testing the Workflow

1. Create a new branch: `git checkout -b test/preview-deployment`
2. Make a small change
3. Push and open a PR
4. Watch the workflow run in the **Actions** tab
5. Check the PR for the preview URL comment

## Troubleshooting

### "Error: No token provided"
- Verify `VERCEL_TOKEN` is set correctly in GitHub secrets

### "Error: Project not found"
- Verify `VERCEL_PROJECT_ID` matches your Vercel project
- Verify `VERCEL_ORG_ID` is correct

### "Permission denied" when commenting on PR
- Check workflow permissions are set to "Read and write"
- Verify "Allow GitHub Actions to create and approve pull requests" is enabled

### Tests failing
- Run tests locally: `npm run test:run`
- Check test logs in the Actions tab

## References

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [GitHub Actions with Vercel](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
