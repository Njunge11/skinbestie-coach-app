This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality.

### What Happens When You Commit

Every `git commit` automatically runs:
- **ESLint** - Auto-fixes code issues
- **Prettier** - Formats your code
- **Tests** - Runs all Vitest tests
- **Type Check** - Validates TypeScript

### What Happens When You Push

Every `git push` automatically runs:
- **Tests** - Full test suite
- **Type Check** - Full TypeScript validation
- **Build** - Production build verification

### Quick Reference

```bash
# Normal workflow - hooks run automatically
git add .
git commit -m "Your message"  # Runs pre-commit checks
git push                       # Runs pre-push checks

# Emergency only - skip hooks (not recommended)
git commit -m "Hotfix" --no-verify
git push --no-verify
```

For complete documentation, see [Git Hooks Guide](./docs/GIT_HOOKS_GUIDE.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Test CI/CD
