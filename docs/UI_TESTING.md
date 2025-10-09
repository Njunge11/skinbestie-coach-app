# UI Component Testing Guide

> Based on Kent C. Dodds' React Testing Library philosophy and best practices

## Table of Contents
1. What is a UI component test
2. The guiding principle
3. Core rules
4. What to test (use cases)
5. Query priorities
6. User interactions
7. Common mistakes (avoid these)
8. Test structure (fewer, longer tests)
9. Assertions best practices
10. Accessibility in tests
11. Checklists

## What is a UI component test
* Tests React components through their **public interface** (props in, rendered output, user interactions).
* Uses the DOM as rendered, not component internals (no `.state()`, `.instance()`, or private methods).
* Simulates real user behavior (clicks, typing, form submission).
* Tests observable effects: what appears on screen, what callbacks are called, what side effects happen.

If you're testing internal state or lifecycle methods directly, you're testing implementation details (don't do this).

## The guiding principle

> **"The more your tests resemble the way your software is used, the more confidence they can give you."**
>
> — Kent C. Dodds

Write tests from the user's perspective:
* What does the user see?
* What can the user interact with?
* What happens when they do?

## Core rules
* **Test use cases, not code.** Think: "What is this component for?" not "What methods does it have?"
* **Test behavior, not implementation.** Assert what renders and what happens, not how it happens internally.
* **Use the public API.** Props + rendered DOM + user events. No `.state()`, `.instance()`, or internal method calls.
* **Query like a user.** Prefer accessible queries (`getByRole`, `getByLabelText`) over test IDs or classes.
* **Simulate real interactions.** Use `userEvent` (not `fireEvent`) for realistic user behavior.
* **Avoid false positives/negatives.** Tests should fail when behavior breaks, not when implementation changes.
* **Write fewer, longer tests.** Cover complete workflows, not isolated assertions.

## What to test (use cases)

### Think about two users
1. **End users** → what they see and interact with
2. **Developer users** → props/context the component receives

### Test these observable effects
✅ **Do test:**
* User interactions (clicking, typing, selecting)
* Prop changes → different renders
* Context changes → different behavior
* Rendered output (text, images, buttons)
* Callbacks being called
* Navigation/routing
* Form validation and submission
* Loading/error states
* Accessibility (keyboard nav, screen reader support)

❌ **Don't test:**
* Component state directly (`.state()`)
* Lifecycle methods (`componentDidMount`, `useEffect` internals)
* Internal helper functions
* CSS class names (unless they affect behavior)
* Implementation details that users don't see

### Ask yourself
"If I refactor this component (change state structure, rename functions, swap hooks), will my tests still pass?"
* **Yes** → you're testing behavior (good!)
* **No** → you're testing implementation (refactor tests)

## Query priorities

Use queries in this order (best → worst):

### 1. Accessible queries (best)
```typescript
// ✅ Preferred: query by role (most accessible)
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('heading', { name: /welcome/i })

// ✅ Good: query by label (forms)
screen.getByLabelText(/email address/i)

// ✅ Good: query by placeholder (if no label)
screen.getByPlaceholderText(/enter email/i)

// ✅ Good: query by text content
screen.getByText(/welcome back/i)
```

### 2. Test IDs (fallback only)
```typescript
// ⚠️ Use only when nothing else works
screen.getByTestId('custom-element')
```

### 3. Avoid these (bad)
```typescript
// ❌ Never: query by class or id
container.querySelector('.my-class')
container.querySelector('#my-id')

// ❌ Never: component internals
wrapper.state()
wrapper.instance()
```

### Query variants
* `getBy*` → element must exist (throws if not found)
* `queryBy*` → returns null if not found (use to assert non-existence)
* `findBy*` → async, waits for element (use for async rendering)

```typescript
// Check element exists
expect(screen.getByRole('button')).toBeInTheDocument()

// Check element doesn't exist
expect(screen.queryByRole('button')).not.toBeInTheDocument()

// Wait for async element
const button = await screen.findByRole('button')
```

## User interactions

### Use `userEvent` (not `fireEvent`)
`userEvent` simulates real browser behavior more accurately.

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('submits form on button click', async () => {
  const handleSubmit = vi.fn()
  render(<LoginForm onSubmit={handleSubmit} />)

  const user = userEvent.setup()

  // ✅ Type into inputs
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')

  // ✅ Click button
  await user.click(screen.getByRole('button', { name: /log in/i }))

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123'
  })
})
```

### Common interactions
```typescript
const user = userEvent.setup()

// Typing
await user.type(input, 'hello')
await user.clear(input)

// Clicking
await user.click(button)
await user.dblClick(button)

// Selection
await user.selectOptions(select, 'option1')

// Keyboard
await user.keyboard('{Enter}')
await user.tab()

// Hover
await user.hover(element)
await user.unhover(element)
```

## Common mistakes (avoid these)

### 1. Using `fireEvent` instead of `userEvent`
```typescript
// ❌ Bad: doesn't simulate real browser behavior
fireEvent.click(button)

// ✅ Good: simulates real user interactions
const user = userEvent.setup()
await user.click(button)
```

### 2. Wrapping everything in `act()`
```typescript
// ❌ Bad: unnecessary act() wrapper
act(() => {
  render(<Component />)
})

// ✅ Good: Testing Library handles act() for you
render(<Component />)
```

### 3. Using `container.querySelector()`
```typescript
// ❌ Bad: not accessible, brittle
const button = container.querySelector('.submit-button')

// ✅ Good: query by role (accessible)
const button = screen.getByRole('button', { name: /submit/i })
```

### 4. Unnecessary `role` attributes
```typescript
// ❌ Bad: adding roles just for testing
<button role="button">Submit</button>

// ✅ Good: use semantic HTML
<button>Submit</button>
```

### 5. Using `query*` to assert existence
```typescript
// ❌ Bad: query* returns null, confusing error messages
expect(screen.queryByRole('button')).toBeInTheDocument()

// ✅ Good: get* throws with clear error if not found
expect(screen.getByRole('button')).toBeInTheDocument()

// ✅ Only use query* for non-existence
expect(screen.queryByRole('button')).not.toBeInTheDocument()
```

### 6. Wrapping everything in `waitFor()`
```typescript
// ❌ Bad: unnecessary waitFor
await waitFor(() => {
  expect(screen.getByRole('button')).toBeInTheDocument()
})

// ✅ Good: getBy* is synchronous
expect(screen.getByRole('button')).toBeInTheDocument()

// ✅ Only use findBy* for async elements
const button = await screen.findByRole('button')
```

### 7. Testing implementation details
```typescript
// ❌ Bad: testing internal state
expect(wrapper.state('isOpen')).toBe(true)

// ✅ Good: test observable effect
expect(screen.getByRole('dialog')).toBeVisible()
```

### 8. One assertion per test
```typescript
// ❌ Bad: artificially splitting related checks
it('renders email input', () => {
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
})
it('renders password input', () => {
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
})

// ✅ Good: test the complete use case
it('renders login form with email and password inputs', () => {
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
})
```

## Test structure (fewer, longer tests)

### Write workflow tests, not unit tests
Think like a manual tester: test the complete user flow in one test.

```typescript
// ✅ Good: complete workflow
it('allows user to log in successfully', async () => {
  const user = userEvent.setup()
  const navigate = vi.fn()

  render(<LoginPage navigate={navigate} />)

  // Check initial state
  expect(screen.getByRole('heading')).toHaveTextContent(/log in/i)
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()

  // Fill form
  await user.type(screen.getByLabelText(/email/i), 'admin@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')

  // Submit
  await user.click(screen.getByRole('button', { name: /log in/i }))

  // Check loading state
  expect(screen.getByText(/logging in/i)).toBeInTheDocument()

  // Check success
  await waitFor(() => {
    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })
})
```

### Structure: Arrange → Act → Assert (multiple acts/asserts OK)
```typescript
it('complete user workflow', async () => {
  // Arrange (once)
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<Form onSubmit={onSubmit} />)

  // Act + Assert (multiple times)
  await user.type(screen.getByLabelText(/name/i), 'Ada')
  expect(screen.getByLabelText(/name/i)).toHaveValue('Ada')

  await user.click(screen.getByRole('button'))
  expect(onSubmit).toHaveBeenCalled()
})
```

## Assertions best practices

### Use `@testing-library/jest-dom` matchers
These provide better error messages.

```typescript
// ❌ Not great
expect(screen.getByRole('button').disabled).toBe(true)

// ✅ Better: descriptive matcher
expect(screen.getByRole('button')).toBeDisabled()

// ✅ Other useful matchers
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toHaveTextContent(/hello/i)
expect(element).toHaveValue('test')
expect(element).toHaveAttribute('aria-label', 'Close')
expect(element).toHaveFocus()
```

### Async assertions
```typescript
// ✅ Wait for element to appear
const message = await screen.findByText(/success/i)

// ✅ Wait for condition
await waitFor(() => {
  expect(onSubmit).toHaveBeenCalled()
})

// ✅ Wait for element to disappear
await waitForElementToBeRemoved(() => screen.queryByText(/loading/i))
```

## Accessibility in tests

Testing accessibility makes your app better for everyone.

### Query by role (accessible by default)
```typescript
// ✅ These queries ensure accessible markup
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('checkbox', { name: /terms/i })
screen.getByRole('link', { name: /learn more/i })
```

### Test keyboard navigation
```typescript
it('supports keyboard navigation', async () => {
  const user = userEvent.setup()
  render(<Form />)

  // Tab through form
  await user.tab()
  expect(screen.getByLabelText(/email/i)).toHaveFocus()

  await user.tab()
  expect(screen.getByLabelText(/password/i)).toHaveFocus()

  // Submit with Enter
  await user.keyboard('{Enter}')
  expect(handleSubmit).toHaveBeenCalled()
})
```

### Test screen reader labels
```typescript
// ✅ Ensures proper labeling
expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
expect(screen.getByRole('button')).toHaveAccessibleName('Submit form')
```

## Checklists

### "Is this a good UI test?"
* Queries by role/label (not class/id)? **Yes**
* Tests user-visible behavior? **Yes**
* No internal state/methods? **Yes**
* Uses `userEvent` (not `fireEvent`)? **Yes**
* Would pass if I refactored internals? **Yes**

### "What should I test for this component?"
* Does it render the right content? **Check text/elements**
* Can users interact with it? **Test clicks/typing**
* Does it handle props correctly? **Test different prop values**
* Does it show loading/error states? **Test async scenarios**
* Is it accessible? **Query by role, test keyboard nav**

### "Should I use getBy, queryBy, or findBy?"
* Element must exist → **getBy***
* Checking non-existence → **queryBy***
* Element appears after delay → **findBy***

### "When should I split tests?"
* Testing different use cases? **Split**
* Testing different paths (success/error)? **Split**
* Testing sequential steps in same workflow? **Keep together**

## Examples

### Login form (complete workflow)
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

it('allows admin to log in', async () => {
  const user = userEvent.setup()
  const onSuccess = vi.fn()

  render(<LoginForm onSuccess={onSuccess} />)

  // Check form renders
  expect(screen.getByRole('heading')).toHaveTextContent(/log in/i)
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument()

  // Fill form
  await user.type(screen.getByLabelText(/email/i), 'admin@example.com')
  await user.type(screen.getByLabelText(/password/i), 'secret123')

  // Submit
  await user.click(screen.getByRole('button', { name: /log in/i }))

  // Check callback
  await waitFor(() => {
    expect(onSuccess).toHaveBeenCalledWith({
      email: 'admin@example.com'
    })
  })
})
```

### Validation errors
```typescript
it('shows validation error for invalid email', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)

  await user.type(screen.getByLabelText(/email/i), 'invalid-email')
  await user.click(screen.getByRole('button', { name: /log in/i }))

  expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument()
})
```

### Conditional rendering
```typescript
it('shows forgot password link when enabled', () => {
  render(<LoginForm allowPasswordReset={true} />)

  expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument()
})

it('hides forgot password link when disabled', () => {
  render(<LoginForm allowPasswordReset={false} />)

  expect(screen.queryByRole('link', { name: /forgot password/i })).not.toBeInTheDocument()
})
```

### Loading states
```typescript
it('shows loading state while submitting', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)

  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password')
  await user.click(screen.getByRole('button', { name: /log in/i }))

  // Button should be disabled while loading
  expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled()
})
```

## Further reading
* [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
* [How to know what to test](https://kentcdodds.com/blog/how-to-know-what-to-test)
* [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
* [Write fewer, longer tests](https://kentcdodds.com/blog/write-fewer-longer-tests)
* [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
