# UI Test Performance Guide

This document outlines best practices for writing performant UI tests and identifies tests that are at risk of timeout issues.

## Root Causes of Slow UI Tests

### 1. `react-remove-scroll` DOM Traversal
Radix UI Dialog uses `react-remove-scroll` internally, which iterates through **every DOM element** when a modal opens. In jsdom, this causes massive slowdowns.

**Fix applied:** Mock `react-remove-scroll` in `src/test/setup.ts`:
```typescript
vi.mock("react-remove-scroll", () => ({
  RemoveScroll: ({ children }: { children: React.ReactNode }) => children,
}));
```

### 2. `userEvent` Keystroke Delays
By default, `userEvent.type()` simulates real typing with delays between keystrokes. Typing 20 characters = 20 delays.

**Fix applied:** Use `setupUser()` from `@/test/utils` which sets `{ delay: null }`:
```typescript
import { setupUser } from "@/test/utils";

it("user fills form", async () => {
  const user = setupUser(); // Not userEvent.setup()
  await user.type(input, "text");
});
```

### 3. Missing jsdom Polyfills
Radix UI requires browser APIs that jsdom doesn't provide.

**Fix applied:** Added polyfills in `src/test/setup.ts`:
- `PointerEvent`
- `ResizeObserver`
- `Element.prototype.hasPointerCapture`
- `Element.prototype.scrollIntoView`
- `window.matchMedia` (returns `prefers-reduced-motion: reduce`)
- CSS animation disabling

---

## Tests at Risk of Timeout

The default Vitest timeout is **5000ms**. Tests with many sequential user interactions are at risk of hitting this limit.

### High Risk (10+ interactions) - May timeout under load

| File | Interactions | Test Name |
|------|--------------|-----------|
| `product-form.test.tsx` | **31** | `user changes from 2x per week to Daily and days selection disappears` |
| `routine-section.test.tsx` | **13** | `user deselects a day and cannot select more than max days` |
| `routine-section.test.tsx` | **11** | `user adds product with 2x per week frequency and selects days` |
| `routine-section.test.tsx` | **10** | `user sees error when routine creation fails and can retry` |
| `product-form.test.tsx` | **10** | `user selects 3x per week and chooses 3 days` |

### Medium Risk (7-9 interactions) - May timeout occasionally

| File | Interactions | Test Name |
|------|--------------|-----------|
| `product-form.test.tsx` | **9** | `user selects 2x per week and chooses 2 days` |
| `login-form.test.tsx` | **9** | `allows user to complete full password reset flow and return to login` |
| `routine-section.test.tsx` | **8** | `user sees validation errors when adding product, corrects them, and succeeds` |
| `routine-section.test.tsx` | **8** | `user adds evening product with all required fields` |
| `coach-notes.test.tsx` | **8** | `user completes full workflow: add, edit, then delete a note` |
| `set-new-password-state.test.tsx` | **8** | `clears password mismatch error when passwords match after being touched` |
| `routine-section.test.tsx` | **7** | `user navigates back through modal steps without losing data` |
| `routine-section.test.tsx` | **7** | `user cancels routine creation and modal resets` |
| `product-list.test.tsx` | **7** | `user adds second product to existing list` |
| `product-list.test.tsx` | **7** | `user adds first product to empty list` |

### Lower Risk (5-6 interactions) - Should pass but monitor

| File | Interactions | Test Name |
|------|--------------|-----------|
| `template-list.test.tsx` | **6** | `user updates template successfully` |
| `routine-section.test.tsx` | **6** | `user edits routine name and dates successfully` |
| `routine-section.test.tsx` | **6** | `user cancels editing a product without saving changes` |
| `product-item.test.tsx` | **6** | `user saves edited product and returns to view mode` |
| `product-form.test.tsx` | **6** | `user fills complete product form with Daily frequency` |
| `template-list.test.tsx` | **5** | `user updates morning product successfully` |
| `template-list.test.tsx` | **5** | `user updates evening product successfully` |
| `template-list.test.tsx` | **5** | `user sees error when updating morning product fails` |
| `template-list.test.tsx` | **5** | `user sees error when updating evening product fails` |
| `edit-template-dialog.test.tsx` | **5** | `user edits template name and description` |
| `invite-booking-modal.test.tsx` | **5** | `user completes full workflow: select event, generate link, copy, and close` |
| `compliance-section.test.tsx` | **5** | `user navigates through all time periods sequentially` |
| `routine-section.test.tsx` | **5** | `user sees validation errors when creating routine, corrects them, and succeeds` |
| `routine-section.test.tsx` | **5** | `user sees validation error when adding No Product step without instructions` |
| `product-form.test.tsx` | **5** | `user creates product without optional URL` |

---

## Best Practices

### 1. Keep Tests Focused on User Workflows (Don't Split)

Kent C. Dodds recommends: **"Write fewer, longer tests"** that follow complete user workflows.

> "Think of a test case workflow for a manual tester and try to make each of your test cases include all parts to that workflow."

Splitting tests causes:
- Shared mutable state issues
- React `act` warnings
- More test isolation overhead

### 2. Use `setupUser()` Helper

Always import from `@/test/utils`:
```typescript
import { setupUser } from "@/test/utils";
```

Never use `userEvent.setup()` directly - it has keystroke delays.

### 3. Wait for UI State Before Acting

Don't click buttons that might be disabled:
```typescript
// Bad - button might be disabled
await user.click(screen.getByRole("button", { name: /submit/i }));

// Good - wait for button to be enabled
await waitFor(() => {
  expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
});
await user.click(screen.getByRole("button", { name: /submit/i }));
```

### 4. Use `findBy` for Async Elements

```typescript
// Bad - element might not exist yet
expect(screen.getByText(/success/i)).toBeInTheDocument();

// Good - waits for element to appear
expect(await screen.findByText(/success/i)).toBeInTheDocument();
```

### 5. Avoid Artificial Delays

Never use `setTimeout` in tests for timing. Instead:
- Set explicit timestamps via database
- Mock time-dependent functions
- Use `waitFor` for UI state

---

## Recommendations for High-Risk Tests

### Option A: Increase Global Timeout (Recommended)

In `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    testTimeout: 10000, // 10 seconds
  },
});
```

This is **not a hack** - it's realistic for complex UI workflows. Kent C. Dodds and Testing Library maintainers acknowledge that realistic user simulations take time.

### Option B: Per-Test Timeout

For specific long tests:
```typescript
it("user completes complex workflow", async () => {
  // ... many interactions
}, 15000); // 15 second timeout
```

### Option C: Split Only If Genuinely Separate Workflows

Only split if the test covers **multiple independent user stories**. Don't split a single workflow just to reduce interactions.

---

## Monitoring

Run the full test suite periodically and watch for:
1. Tests that consistently take >3 seconds
2. Tests that fail intermittently with timeout errors
3. Tests that pass in isolation but fail in full suite

Command to check slowest tests:
```bash
npm run test:run -- --reporter=verbose 2>&1 | grep -E "✓.*[0-9]{4}ms"
```

---

## References

- [Kent C. Dodds: Write Fewer, Longer Tests](https://kentcdodds.com/blog/write-fewer-longer-tests)
- [Testing Library: Considerations for Events](https://testing-library.com/docs/guide-events/)
- [Radix UI: Performance Issues #2356](https://github.com/radix-ui/primitives/issues/2356)
- [Vitest: Improving Performance](https://vitest.dev/guide/improving-performance)
