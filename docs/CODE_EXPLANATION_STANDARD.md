# Code Explanation Standard

## When Explaining Code

Always follow this structure:

### 1. Start with THE PROBLEM (Real Example)

**Bad:**
"This function calculates min/max dates across all completions using window functions."

**Good:**
"User's routine runs Nov 3-30. Admin changes it to Oct 30 - Dec 15. Now Oct 30 - Nov 2 have NO completions (gap). User can't complete their routine on those dates."

### 2. Then THE SOLUTION (What We're Doing)

**Bad:**
"We use SQL aggregations to get date ranges and then generate records."

**Good:**
"Find the gaps and fill them:
- Find what dates already have completions (Nov 3 - Nov 30)
- Compare to new dates (Oct 30 - Dec 15)
- Fill the missing dates (Oct 30 - Nov 2, Dec 1 - Dec 15)"

### 3. Finally THE HOW (Code Details)

```typescript
// Step 1: What dates currently have completions?
const minDate = Nov 3;  // First completion
const maxDate = Nov 30; // Last completion

// Step 2: Find gaps
if (newStart < minDate) {
  gapBefore = [Oct 30 → Nov 2];  // Fill this gap
}

// Step 3: Generate completions for gaps only
```

## Key Principles

1. **No jargon first** - Don't start with "window functions", "aggregations", "N+1 queries"
2. **Concrete example** - Use actual dates/values, not abstractions
3. **Show the pain** - What breaks if we don't do this?
4. **Solution before implementation** - The "what" before the "how"
5. **Be direct** - No fluffy transitions or over-explaining

## Anti-Patterns to Avoid

❌ "This uses an optimized query pattern with window functions that calculate across all rows without grouping"
✅ "Get the earliest and latest completion dates in one query"

❌ "We leverage deduplication strategies to ensure unique products"
✅ "Remove duplicate products using a Set"

❌ "The architecture employs transactional safety patterns"
✅ "If the insert fails, the update rolls back (no corruption)"

## Template

```markdown
## Problem
[Concrete scenario with real values that shows what breaks]

## Solution
[What we're going to do in 3 bullet points]

## How It Works
[Step-by-step code with inline comments showing real values]
```

## Example: Good Explanation

**Problem:**
Routine published with 10 products. Completions generated for Nov 1-30 (300 records). Admin updates end date to Dec 15. Now Dec 1-15 have NO completions. User sees empty routine in December.

**Solution:**
- Find existing completion range: Nov 1 - Nov 30
- New range is Nov 1 - Dec 15
- Gap found: Dec 1 - Dec 15 (missing 15 days)
- Generate 150 new completion records (10 products × 15 days)

**How:**
```typescript
// 1. Get current range
const { minDate, maxDate } = await getExistingRange(); // Nov 1, Nov 30

// 2. Find gap
if (newEnd > maxDate) {
  gap = { from: Dec 1, to: Dec 15 };
}

// 3. Fill gap
for (date in gap) {
  for (product in products) {
    createCompletion(product, date); // 150 inserts
  }
}
```

---

**Remember:** If someone asks "what does this do?", they want to know WHY it exists, not just WHAT it does.
