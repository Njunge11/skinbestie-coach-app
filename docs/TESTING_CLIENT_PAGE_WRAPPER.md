# Testing Plan: client-page-wrapper.tsx

## Executive Summary

This document outlines the comprehensive testing strategy for `client-page-wrapper.tsx`, a React container component that orchestrates state management for a client profile page with multiple sections (goals, routines, photos, notes).

**Component Type:** Container/Orchestrator Component
**Primary Responsibility:** State coordination, optimistic updates, error handling
**Testing Approach:** Integration tests (per Kent C. Dodds & Mark Erikson recommendations)

---

## Best Practices Research Summary

### Sources Consulted

1. **Kent C. Dodds** - Creator of React Testing Library
   - "Write tests. Not too many. Mostly integration."
   - "The more your tests resemble the way your software is used, the more confidence they can give you."
   - Never test implementation details (state, handlers, props)
   - Test what users "use, see, and know about"

2. **Mark Erikson** - Redux Maintainer
   - Blog: "The Evolution of Redux Testing Approaches" (2021)
   - Official Redux docs now recommend integration tests by default
   - Containers should be tested as integrated units, not in isolation
   - React ecosystem has moved away from "container/presentational" pattern thanks to hooks

3. **React Testing Library Documentation**
   - Mock at the network boundary, not component boundary
   - Use real components whenever possible
   - Focus on user-facing behavior, not internal state
   - Test error states and edge cases, not just happy paths

---

## Component Analysis

### What client-page-wrapper.tsx Does

**State Management (6 state pieces):**
1. `client` - Client profile data
2. `photos` - Progress photos array
3. `goals` - Skincare goals array
4. `routine` - Active routine object
5. `routineProducts` - Products in routine
6. `coachNotes` - Coach notes array
7. `isCompareMode` - Photo comparison UI state
8. `selectedPhotos` - Selected photos for comparison

**Handler Functions (23 total):**

**Profile Updates (1):**
- `handleUpdateClient` - Optimistic update + revert on error

**Photo Management (3):**
- `handleUpdatePhotoFeedback` - Optimistic update + revert
- `handlePhotoSelect` - Local state only
- `handleToggleCompareMode` - Local state only
- `handleCloseComparison` - Local state only

**Goals Management (5):**
- `handleAddGoal` - Server action, add to array
- `handleUpdateGoal` - Optimistic update + revert
- `handleToggleGoal` - Optimistic toggle + revert
- `handleDeleteGoal` - Optimistic delete + revert
- `handleReorderGoals` - Optimistic reorder + revert

**Routine Management (6):**
- `handleCreateRoutine` - Updates routine + client.hasRoutine flag
- `handleUpdateRoutine` - Optimistic update + revert
- `handleCreateRoutineFromTemplate` - Updates routine, products, hasRoutine flag
- `handleCreateBlankRoutine` - Updates routine + hasRoutine flag
- `handleDeleteRoutine` - **CRITICAL:** Clears routine, products, AND hasRoutine flag (cross-cutting state)

**Routine Products (4):**
- `handleAddRoutineProduct` - Validates routine exists, adds product
- `handleUpdateRoutineProduct` - Optimistic update + revert
- `handleDeleteRoutineProduct` - Optimistic delete + revert
- `handleReorderRoutineProducts` - Optimistic reorder + revert

**Coach Notes (3):**
- `handleAddCoachNote` - Adds to array (prepends for newest-first)
- `handleUpdateCoachNote` - Optimistic update + revert
- `handleDeleteCoachNote` - Optimistic delete + revert

**Error Handling Patterns:**
- Optimistic updates (update UI immediately)
- Server action calls
- Revert to previous/initial state on error
- Toast notifications for errors

---

## What Needs Testing

### Critical Behaviors (MUST TEST)

#### 1. **Optimistic Updates & Error Handling**
**Why Critical:** Core UX pattern used in 15+ handlers. If broken, creates poor user experience.

**Test Coverage Needed:**
- ✅ Optimistic update shows immediately in UI
- ✅ Server action is called with correct data
- ✅ On error: state reverts to previous value
- ✅ On error: error toast is displayed
- ✅ On success: state persists

**Handlers to Test:**
- `handleUpdateClient`
- `handleUpdatePhotoFeedback`
- `handleUpdateGoal`
- `handleToggleGoal`
- `handleDeleteGoal`
- `handleReorderGoals`
- `handleUpdateRoutine`
- `handleUpdateRoutineProduct`
- `handleDeleteRoutineProduct`
- `handleReorderRoutineProducts`
- `handleUpdateCoachNote`
- `handleDeleteCoachNote`

#### 2. **Cross-Cutting State Synchronization**
**Why Critical:** Multiple state pieces must stay in sync. Breaking this causes data inconsistencies.

**Test Coverage Needed:**
- ✅ Creating routine updates both `routine` and `client.hasRoutine`
- ✅ Creating routine from template updates `routine`, `products`, AND `client.hasRoutine`
- ✅ Deleting routine clears `routine`, `routineProducts`, AND `client.hasRoutine`
- ✅ On routine deletion error: ALL three state pieces revert

**Handlers to Test:**
- `handleCreateRoutine`
- `handleCreateRoutineFromTemplate`
- `handleCreateBlankRoutine`
- `handleDeleteRoutine` (MOST CRITICAL - touches 3 state pieces)

#### 3. **Data Flow from Props to Children**
**Why Important:** Wrapper's job is to pass state + callbacks correctly.

**Test Coverage Needed:**
- ✅ Initial props render in child components
- ✅ State updates propagate to children
- ✅ Callbacks are passed and functional

#### 4. **Error Edge Cases**
**Why Important:** Production resilience.

**Test Coverage Needed:**
- ✅ Attempting to add product without routine shows error
- ✅ Server timeouts/failures handled gracefully
- ✅ Rapid user actions don't cause race conditions

---

## Testing Strategy

### Approach: Integration Tests

**Why Integration over Unit?**
- Kent C. Dodds: "Write tests. Not too many. Mostly integration."
- Mark Erikson: "Integration tests exercise all the logic working together as used in real app"
- Wrapper's value IS in integration - coordinating multiple concerns

**What to Mock:**
- ✅ Server actions (network boundary)
- ✅ Toast notifications (external library)

**What NOT to Mock:**
- ❌ Child components (ProfileHeader, GoalsSection, etc.)
- ❌ React hooks (useState, etc.)
- ❌ Internal handlers

### Test Structure

```typescript
describe("ClientPageWrapper - Integration Tests", () => {
  // Mock at network boundary
  vi.mock("../goal-actions/actions");
  vi.mock("sonner");

  // Use real components
  // Test user-visible behavior
  // Verify state coordination
});
```

---

## Comprehensive Test List

### Category 1: Optimistic Updates - Success Path (12 tests)

1. **Goal Toggle Success**
   - User toggles goal checkbox → checkbox updates immediately → server called → state persists

2. **Goal Update Success**
   - User edits goal → changes show immediately → server called → state persists

3. **Goal Delete Success**
   - User deletes goal → goal disappears immediately → server called → state persists

4. **Goal Reorder Success**
   - User drags goal → order updates immediately → server called → state persists

5. **Profile Update Success**
   - User edits profile → changes show immediately → server called → state persists

6. **Photo Feedback Update Success**
   - User adds feedback → feedback shows immediately → server called → state persists

7. **Routine Update Success**
   - User edits routine → changes show immediately → server called → state persists

8. **Routine Product Update Success**
   - User edits product → changes show immediately → server called → state persists

9. **Routine Product Delete Success**
   - User deletes product → product disappears immediately → server called → state persists

10. **Routine Product Reorder Success**
    - User drags product → order updates immediately → server called → state persists

11. **Coach Note Update Success**
    - User edits note → changes show immediately → server called → state persists

12. **Coach Note Delete Success**
    - User deletes note → note disappears immediately → server called → state persists

### Category 2: Optimistic Updates - Error Path (12 tests)

13. **Goal Toggle Failure**
    - User toggles goal → checkbox updates → server fails → checkbox reverts → error toast shows

14. **Goal Update Failure**
    - User edits goal → changes show → server fails → original data restored → error toast shows

15. **Goal Delete Failure**
    - User deletes goal → goal disappears → server fails → goal reappears → error toast shows

16. **Goal Reorder Failure**
    - User drags goal → order updates → server fails → original order restored → error toast shows

17. **Profile Update Failure**
    - User edits profile → changes show → server fails → original data restored → error toast shows

18. **Photo Feedback Update Failure**
    - User adds feedback → feedback shows → server fails → original feedback restored → error toast shows

19. **Routine Update Failure**
    - User edits routine → changes show → server fails → original data restored → error toast shows

20. **Routine Product Update Failure**
    - User edits product → changes show → server fails → original data restored → error toast shows

21. **Routine Product Delete Failure**
    - User deletes product → product disappears → server fails → product reappears → error toast shows

22. **Routine Product Reorder Failure**
    - User drags product → order updates → server fails → original order restored → error toast shows

23. **Coach Note Update Failure**
    - User edits note → changes show → server fails → original content restored → error toast shows

24. **Coach Note Delete Failure**
    - User deletes note → note disappears → server fails → note reappears → error toast shows

### Category 3: Cross-Cutting State (8 tests)

25. **Create Blank Routine Success**
    - User creates routine → `routine` set → `client.hasRoutine` becomes true → success toast

26. **Create Routine from Template Success**
    - User creates from template → `routine` set → `routineProducts` populated → `client.hasRoutine` becomes true → success toast

27. **Delete Routine Success**
    - User deletes routine → `routine` cleared → `routineProducts` cleared → `client.hasRoutine` becomes false → success toast

28. **Delete Routine Failure**
    - User deletes routine → all cleared → server fails → `routine` restored → `routineProducts` restored → `client.hasRoutine` restored to true → error toast

29. **Create Blank Routine Failure**
    - User creates routine → server fails → `routine` stays null → `client.hasRoutine` stays false → error toast

30. **Create from Template Failure**
    - User creates from template → server fails → `routine` stays null → `routineProducts` empty → `client.hasRoutine` stays false → error toast

31. **Update Routine Success with State Sync**
    - User updates routine name → routine data updates → routine object reference updated

32. **Add Product Validates Routine Exists**
    - User tries to add product without routine → error toast shows → no state change

### Category 4: Add Operations (Non-Optimistic) (5 tests)

33. **Add Goal Success**
    - User adds goal → server called → new goal appears in list

34. **Add Goal Failure**
    - User adds goal → server fails → error toast shows → goal doesn't appear

35. **Add Coach Note Success**
    - User adds note → server called → note appears at top of list (newest first)

36. **Add Coach Note Failure**
    - User adds note → server fails → error toast shows → note doesn't appear

37. **Add Product Success**
    - User adds product → server called → product appears in correct time-of-day list

### Category 5: Data Flow & Rendering (8 tests)

38. **Renders Initial Client Data**
    - Component mounts → client name displayed → client email displayed

39. **Renders Initial Goals**
    - Component mounts with goals → all goals visible → in correct order

40. **Renders Initial Routine & Products**
    - Component mounts with routine → routine name visible → products grouped by time

41. **Renders Initial Photos**
    - Component mounts with photos → photos visible → week numbers shown

42. **Renders Initial Coach Notes**
    - Component mounts with notes → notes visible → in chronological order

43. **Shows Empty States Correctly**
    - No goals → "No goals yet" message
    - No routine → "Create Routine" button visible
    - No photos → "No progress photos yet" message

44. **Shows Create Routine Button When hasRoutine=false**
    - `client.hasRoutine = false` → "Create Routine" button visible

45. **Hides Create Routine Button When hasRoutine=true**
    - `client.hasRoutine = true` → routine displayed, no create button

### Category 6: Photo Comparison State (5 tests)

46. **Toggle Compare Mode On**
    - User clicks "Compare Photos" → `isCompareMode` becomes true → selection UI appears

47. **Toggle Compare Mode Off**
    - User in compare mode → clicks "Cancel Compare" → `isCompareMode` becomes false → selected photos cleared

48. **Select Photo in Compare Mode**
    - Compare mode active → user clicks photo → photo added to `selectedPhotos`

49. **Deselect Photo in Compare Mode**
    - Photo selected → user clicks again → photo removed from `selectedPhotos`

50. **Max 2 Photos Selection**
    - 2 photos selected → user clicks 3rd photo → 3rd photo not added

### Category 7: Edge Cases & Error Boundaries (5 tests)

51. **Rapid Consecutive Updates Don't Race**
    - User clicks delete twice rapidly → only one server call → state consistent

52. **Multiple Section Updates Independently**
    - User edits goal + adds note simultaneously → both succeed independently

53. **Server Timeout Handling**
    - Server takes >30s → timeout error → state reverts → error toast

54. **Network Offline Handling**
    - Network offline → immediate error → user-friendly message

55. **Invalid Server Response**
    - Server returns malformed data → error handled gracefully → no crash

---

## Test Implementation Guidelines

### 1. Test File Structure

```typescript
// client-page-wrapper.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClientPageWrapper } from "./client-page-wrapper";

// Mock at network boundary ONLY
vi.mock("../goal-actions/actions");
vi.mock("../routine-info-actions/actions");
// ... etc

describe("ClientPageWrapper - Integration Tests", () => {
  describe("Optimistic Updates - Success", () => {
    // Tests 1-12
  });

  describe("Optimistic Updates - Failure & Revert", () => {
    // Tests 13-24
  });

  describe("Cross-Cutting State Synchronization", () => {
    // Tests 25-32
  });

  // ... other categories
});
```

### 2. Test Pattern Template

```typescript
it("user [action] and [expected result]", async () => {
  const user = userEvent.setup();

  // Arrange: Mock server response
  vi.mocked(updateGoal).mockResolvedValueOnce({
    success: false,
    error: "Network error"
  });

  // Arrange: Render with initial state
  render(
    <ClientPageWrapper
      initialGoals={[{ id: "1", name: "Clear skin", complete: false }]}
      // ... other props
    />
  );

  // Act: User performs action
  const checkbox = screen.getByRole("checkbox");
  await user.click(checkbox);

  // Assert: Optimistic update
  expect(checkbox).toBeChecked();

  // Assert: Server called
  await waitFor(() => {
    expect(updateGoal).toHaveBeenCalledWith("1", { complete: true });
  });

  // Assert: State reverted
  await waitFor(() => {
    expect(checkbox).not.toBeChecked();
  });

  // Assert: Error shown
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith("Failed to toggle goal");
  });
});
```

### 3. Assertion Priority

**Primary (What Users See):**
1. DOM content (text, images, buttons)
2. Element states (checked, disabled, visible)
3. Error/success messages

**Secondary (Verification):**
1. Server actions called with correct args
2. Toast notifications
3. State consistency across sections

**DO NOT Assert:**
- Internal state values (`client`, `goals`, etc.)
- Handler function references
- Component props

### 4. Coverage Goals

- **Statements:** >80%
- **Branches:** >80%
- **Functions:** >70% (many handlers)
- **Lines:** >80%

**Current Coverage:** 29.69% statements, 4.34% functions → Need significant improvement

---

## Implementation Priority

### Phase 1: Critical Path (Tests 1-32)
- Optimistic updates (success & failure)
- Cross-cutting state synchronization
- **Target:** 60% coverage
- **Timeline:** Implement first

### Phase 2: Core Functionality (Tests 33-45)
- Add operations
- Data flow & rendering
- **Target:** 75% coverage
- **Timeline:** Implement second

### Phase 3: Edge Cases (Tests 46-55)
- Photo comparison
- Error boundaries
- Race conditions
- **Target:** 85% coverage
- **Timeline:** Implement last

---

## Success Criteria

✅ **Coverage Metrics:**
- Statement coverage: >80%
- Function coverage: >70%
- All critical handlers tested

✅ **Test Quality:**
- Tests read like user stories
- No implementation details tested
- Fast execution (<5s total)
- No flaky tests

✅ **Confidence:**
- Can refactor wrapper internals without breaking tests
- Catches real bugs (optimistic update failures, state sync issues)
- Team understands test purpose

---

## References

1. Kent C. Dodds - "Write tests. Not too many. Mostly integration."
   - https://kentcdodds.com/blog/write-tests

2. Mark Erikson - "The Evolution of Redux Testing Approaches"
   - https://blog.isquaredsoftware.com/2021/06/the-evolution-of-redux-testing-approaches/

3. React Testing Library - Best Practices
   - https://testing-library.com/docs/react-testing-library/faq/

4. Kent C. Dodds - "Common Mistakes with React Testing Library"
   - https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

---

## Document Metadata

**Created:** 2025-01-18
**Component:** `src/app/(dashboard)/subscribers/[id]/_components/client-page-wrapper.tsx`
**Test File:** `src/app/(dashboard)/subscribers/[id]/_components/client-page-wrapper.test.tsx`
**Author:** Testing Strategy Documentation
**Status:** Plan Approved - Ready for Implementation
