# UI Testing Guide (Based on Kent C. Dodds)

## Core Philosophy

**"The more your tests resemble the way your software is used, the more confidence they can give you."**

**"Write tests. Not too many. Mostly integration."**

---

## What is a UI Test?

A **UI test** (also called integration test) verifies that multiple units work together from the user's perspective.

**Example:** User logs in → navigates to a page → performs an action → sees the result

---

## The Testing Trophy 🏆

```
       E2E (few - cypress/playwright)
      ███ INTEGRATION (MOST) ← Focus here
     █ Unit (some - isolated utilities)
    ██████ Static (lots - TypeScript, ESLint)
```

**Focus on integration tests** - best balance of confidence vs cost.

---

## What to Test

✅ **User interactions:**
- Clicking buttons
- Typing in inputs
- Selecting dropdowns
- Submitting forms
- Navigating between pages

✅ **Observable effects from the user's perspective:**
- DOM changes (what user sees)
- Network requests (API calls)
- Callback execution
- Error messages
- Loading states
- Success messages

✅ **Complete user workflows:**
- User completes a multi-step form
- User filters a list and sees filtered results
- User creates/edits/deletes an item
- User sees validation errors and corrects them

✅ **Critical features** - prioritize what would cause the most damage if broken

---

## What NOT to Test

❌ **Implementation details:**
- Internal component state (`useState` values)
- Lifecycle methods (`useEffect`, `componentDidMount`)
- Event handler functions
- Private methods
- Component structure/organization
- CSS class names

❌ **Things covered by TypeScript/ESLint:**
- Type errors
- Linting violations

❌ **Library internals:**
- How your data fetching library caches
- How your UI library renders internally
- How your router works internally

---

## What to Mock

**Only mock these things:**

1. **External network requests** - Use `vi.mock()` for API routes and services
   - Third-party APIs
   - Your own backend API routes (when testing components)
   - Server actions (Next.js server actions)

2. **Browser APIs that don't work in test environment:**
   - `window.matchMedia` (if needed)
   - `IntersectionObserver` (if needed)
   - Timers/animations (only if they cause issues)

**Kent's quote:** "When you mock something you're removing all confidence in the integration"

**Rule of thumb:** Mock at the network boundary, not at the component boundary.

---

## What NOT to Mock

✅ **Use the real things:**
- Internal components (modals, forms, tables)
- Custom hooks
- Context providers
- State management
- Utilities and business logic
- Routing

**Example:**
```typescript
// ❌ Bad - mocking internal components
vi.mock('./Modal');
vi.mock('./useCustomHook');

// ✅ Good - use real components
render(<App />); // Renders everything for real
```

---

## When to Use a Test Database vs Mocking

### Use a test database when:
- Your app has its own backend/database
- Tests interact with your server
- You want to test server actions/API routes
- Example: Authentication, CRUD operations on your data

### Mock network requests when:
- Your app calls external APIs
- You want tests to run without network access
- The external service is rate-limited or costs money
- Example: Payment providers, third-party services, geocoding APIs

---

## Query Priorities (React Testing Library)

**Always query the way users would:**

1. **`getByRole`** - ✅ BEST (accessible to everyone)
   ```typescript
   getByRole('button', { name: /submit/i })
   getByRole('textbox', { name: /email/i })
   getByRole('combobox', { name: /country/i })
   getByRole('heading', { name: /welcome/i })
   ```

2. **`getByLabelText`** - ✅ GOOD (form inputs)
   ```typescript
   getByLabelText(/email/i)
   getByLabelText(/password/i)
   ```

3. **`getByPlaceholderText`** - ⚠️ OK (if no label)
   ```typescript
   getByPlaceholderText(/search/i)
   ```

4. **`getByText`** - ⚠️ OK (non-interactive elements)
   ```typescript
   getByText(/welcome back/i)
   ```

5. **`getByTestId`** - ❌ LAST RESORT
   ```typescript
   getByTestId('custom-component')
   ```

**Never use:**
- ❌ `container.querySelector()`
- ❌ `container.getElementsByClassName()`

**Why?** These don't reflect how users interact with your app.

---

## User Interactions

**Always use `userEvent` not `fireEvent`:**

```typescript
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// ✅ Good - simulates real user behavior
await user.click(button);
await user.type(input, 'test@example.com');
await user.selectOptions(select, 'option-value');
await user.keyboard('{Enter}');
await user.tab();

// ❌ Bad - doesn't simulate real user behavior
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'test' } });
```

**Why?** `userEvent` simulates the full sequence of events a real user would trigger.

---

## Test Structure

### Write fewer, longer tests (complete workflows)

**✅ Good - Complete workflow:**
```typescript
it('user creates and edits a todo item', async () => {
  const user = userEvent.setup();

  render(<TodoApp />);

  // User creates a todo
  await user.type(screen.getByLabelText(/new todo/i), 'Buy groceries');
  await user.click(screen.getByRole('button', { name: /add/i }));

  // User sees the todo
  expect(screen.getByText('Buy groceries')).toBeInTheDocument();

  // User edits the todo
  await user.click(screen.getByRole('button', { name: /edit buy groceries/i }));
  await user.clear(screen.getByLabelText(/edit todo/i));
  await user.type(screen.getByLabelText(/edit todo/i), 'Buy milk');
  await user.click(screen.getByRole('button', { name: /save/i }));

  // User sees the updated todo
  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
});
```

**❌ Bad - Testing implementation:**
```typescript
it('sets loading state to true', () => {
  // Don't test internal state
});

it('calls handleSubmit function', () => {
  // Don't test that handlers exist
});

it('renders with correct props', () => {
  // Don't test props, test behavior
});
```

---

## Waiting for Changes

**Use `find*` queries for async operations:**

```typescript
// ✅ Good - built-in waiting
expect(await screen.findByText('Success')).toBeInTheDocument();

// ❌ Bad - manual waiting when find* would work
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

**Only use `waitFor` when necessary:**
```typescript
// ✅ Good - only one assertion
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});

// ❌ Bad - multiple assertions
await waitFor(() => {
  expect(screen.getByText('A')).toBeInTheDocument();
  expect(screen.getByText('B')).toBeInTheDocument();
});

// ❌ Bad - side effects
await waitFor(() => {
  doSomething();
});
```

---

## Common Mistakes to Avoid

1. ❌ Using `fireEvent` instead of `userEvent`
2. ❌ Mocking internal components
3. ❌ Testing implementation details (state, handlers, props)
4. ❌ Not using `screen` for queries
5. ❌ Using `container.querySelector()`
6. ❌ Wrapping things in `act()` manually
7. ❌ Multiple assertions in `waitFor`
8. ❌ Using `getByText` when `getByRole` exists
9. ❌ Testing that components render (they always render if there's no error)
10. ❌ Checking for CSS classes

---

## Example: Form Submission with Validation

```typescript
describe('Contact Form', () => {
  it('user submits form with validation errors and corrects them', async () => {
    const user = userEvent.setup();

    render(<ContactForm />);

    // User submits empty form
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // User sees validation errors
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/message is required/i)).toBeInTheDocument();

    // User fills in email incorrectly
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // User sees email format error
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();

    // User corrects email and fills message
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Hello world');

    // User submits successfully
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // User sees success message
    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
  });
});
```

---

## Example: Mocking API Routes and Server Actions

```typescript
import { vi } from 'vitest';

// Mock server action
vi.mock('@/app/(dashboard)/actions', () => ({
  getUsers: vi.fn(),
}));

import { getUsers } from '@/app/(dashboard)/actions';

describe('User List', () => {
  it('user views and filters the list', async () => {
    const user = userEvent.setup();

    // Mock the API response
    vi.mocked(getUsers).mockResolvedValue([
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' }
    ]);

    render(<UserList />);

    // User sees all users
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    // User searches for "Jane"
    await user.type(screen.getByLabelText(/search/i), 'Jane');

    // User sees only Jane
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });
});
```

**For API route tests:**

```typescript
import { vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock dependencies
vi.mock('../shared/auth', () => ({
  validateApiKey: vi.fn(),
}));

vi.mock('./service', () => ({
  makeService: vi.fn(),
}));

import { validateApiKey } from '../shared/auth';
import { makeService } from './service';

describe('GET /api/users', () => {
  it('returns users when authenticated', async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUsers: vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: 1, name: 'John' }]
      })
    };

    vi.mocked(makeService).mockReturnValue(mockService);

    const request = new NextRequest('http://localhost:3000/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([{ id: 1, name: 'John' }]);
  });
});
```

---

## Quick Decision Tree

**Should I mock this?**

```
Is it outside my application boundary (external API)?
  YES → Mock with vi.mock()
  NO  ↓

Is it a browser API that doesn't work in tests?
  YES → Provide a test polyfill
  NO  ↓

Is it an internal component/hook/utility?
  YES → Use the REAL thing (don't mock)
```

---

## Error Recovery Workflows

**Focus on complete recovery workflows, not isolated error states.**

### ✅ Good - Complete Error Recovery
```typescript
it('user encounters validation errors and recovers to submit successfully', async () => {
  const user = userEvent.setup();
  render(<Form />);

  // User submits empty form
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // User sees ALL validation errors
  expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();

  // User fixes name but not email
  await user.type(screen.getByLabelText(/name/i), 'John');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // User still sees email error
  expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
  expect(await screen.findByText(/email is required/i)).toBeInTheDocument();

  // User fixes email
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // User succeeds
  expect(await screen.findByText(/success/i)).toBeInTheDocument();
});
```

### ❌ Bad - Testing Error Permutations
```typescript
// Don't create separate tests for every validation rule
it('shows error when name is missing', () => {});
it('shows error when email is missing', () => {});
it('shows error when phone is missing', () => {});
it('shows error when name is too short', () => {});
it('shows error when name is too long', () => {});
it('shows error when email is invalid', () => {});
// ... 20 more tests for every field/rule combination
```

**Why this is bad:**
- Tests implementation (validation rules) not behavior (user experience)
- Doesn't test recovery (the important part)
- Creates brittle tests that break when validation changes
- Misses the real workflow (users fix multiple errors incrementally)

---

## Key Takeaways

1. **Test behavior, not implementation**
2. **Query like a user would** (`getByRole` > `getByLabelText` > `getByText` > `getByTestId`)
3. **Use `userEvent` not `fireEvent`**
4. **Mock at the network boundary, not the component boundary**
5. **Write complete user workflows, not isolated unit tests**
6. **Don't test implementation details** (state, props, handlers, CSS)
7. **Focus on error recovery workflows, not error permutations**
