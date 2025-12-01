# Step Type Feature Plan

## Goal
Allow routine steps to be either:
- **Instruction-only**: Just step name + instructions (no product, frequency, etc.)
- **Product**: Current implementation (product name, URL, purchase instructions, frequency, days)

---

## Implementation Order

### 1. UI Components (Lock in look & feel first)

**ProductForm** (`src/components/routine/product-form.tsx`)
- Add step type toggle (shadcn RadioGroup: "Product" first, then "Instruction")
- Show/hide fields based on selection:
  - Always visible: Instructions (required), Frequency (required), Days (when frequency !== daily)
  - Instruction-only: Routine Step (optional)
  - Product: Routine Step (required), Product Name (required), Product URL (optional), Purchase Instructions (optional)
- Default to "product" step type
- Update validation

**ProductItem** (`src/components/routine/product-item.tsx`)
- Different display for each type
- Instruction-only: Just step badge + instructions
- Product: Current layout

**ProductRecommendationsTable** (`src/app/(dashboard)/subscribers/[id]/_components/product-recommendations-table.tsx`)
- Filter out instruction-only steps

### 2. Database Schema

**Schema** (`src/lib/db/schema.ts`)
- Add `stepTypeEnum`: `"instruction_only"`, `"product"`
- Add `stepType` column (default: `"product"`)
- Make nullable: `routineStep`, `productName`
- Add check constraints for required fields when stepType = 'product' (routineStep, productName must not be null)

**Migration**: User runs `npm run db:generate` and `npm run db:migrate`

### 3. Types

**Update types** (`src/app/(dashboard)/subscribers/[id]/types.ts`)
- Add `StepType = "instruction_only" | "product"`
- Add `stepType` to `RoutineProduct` and `RoutineProductFormData`
- Make optional: `routineStep`, `productName`

**Component types**
- Update `ProductFormData` and `Product` interfaces

### 4. Repository

**Routine Repo** (`src/app/(dashboard)/subscribers/[id]/routine-actions/routine.repo.ts`)
- Add `stepType` to all SELECT queries
- Update `RoutineProduct` type

### 5. Actions/Validation

**Actions** (`src/app/(dashboard)/subscribers/[id]/routine-actions/actions.ts`)
- Add `stepType` to input types and schemas
- Conditional validation (productName/frequency required only for products)
- Only generate scheduled steps for product type
- Handle step type switching

### 6. Consumer API

**Dashboard API**
- Include `stepType` in responses
- Filter instruction-only if needed

### 7. Tests

- ProductForm: Step type toggle, conditional fields, validation
- ProductItem: Display for both types
- ProductRecommendationsTable: Filtering
- Routine Section: Both types work
- Repository: CRUD for both types
- Actions: Validation, step type switching, scheduled steps

### 8. Deploy

- Run tests
- Run migration
- Manual testing

---

## Files to Change

1. `src/components/routine/product-form.tsx`
2. `src/components/routine/product-item.tsx`
3. `src/app/(dashboard)/subscribers/[id]/_components/product-recommendations-table.tsx`
4. `src/lib/db/schema.ts`
5. `src/app/(dashboard)/subscribers/[id]/types.ts`
6. `src/app/(dashboard)/subscribers/[id]/routine-actions/routine.repo.ts`
7. `src/app/(dashboard)/subscribers/[id]/routine-actions/actions.ts`
8. Consumer API files
9. All test files for above components
