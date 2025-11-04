# Test Organization Playbook

## Rule

Organize tests by functionality for easy review and navigation.

## Structure

```
src/feature/
├── __tests__/
│   ├── route.test.ts
│   ├── service/
│   │   ├── feature-1.test.ts
│   │   ├── feature-2.test.ts
│   │   └── feature-3.test.ts
│   └── repo/
│       ├── feature-1.test.ts
│       ├── feature-2.test.ts
│       └── feature-3.test.ts
├── feature.repo.ts
├── feature.service.ts
└── route.ts
```

## Example

```
__tests__/
├── route.test.ts
├── service/
│   ├── timezone-handling.test.ts
│   ├── calculations.test.ts
│   └── error-handling.test.ts
└── repo/
    ├── user-profile.test.ts
    ├── today-progress.test.ts
    ├── streak.test.ts
    └── weekly-compliance.test.ts
```

## How to Split

Split by what the tests are testing:
- **Repo:** Method names or query features
- **Service:** Business concepts or calculations
- **Route:** Concerns (auth, validation, errors)
