/**
 * Routine Actions - Barrel File
 *
 * This file re-exports all routine-related server actions for backward compatibility.
 * The implementation has been split into focused modules:
 *
 * - validation.ts - Zod schemas and input types (derived with z.infer)
 * - utils.ts - Utility functions (date normalization)
 * - routine-crud.ts - CRUD operations (get, create, delete)
 * - publish-routine.ts - Publishing logic (draft → published with task generation)
 * - update-routine.ts - Routine update logic (with task regeneration)
 * - update-routine-product.ts - Product update logic (with task regeneration)
 *
 * Shared types:
 * - lib/result.ts - Result<T> type used across the app
 *
 * Note: No "use server" directive here because barrel files that re-export types
 * cannot have it. The actual server action files already have "use server".
 */

// Re-export Result type from shared lib
export type { Result, SuccessResult, ErrorResult } from "@/lib/result";

// Re-export input types from validation (single source of truth)
export type {
  CreateRoutineInput,
  UpdateRoutineInput,
  UpdateRoutineProductInput,
} from "./validation";

// Re-export dependency injection types (for testing)
export type { RoutineDeps } from "./routine-crud";
export type { PublishRoutineDeps } from "./publish-routine";
export type { UpdateRoutineProductDeps } from "./update-routine-product";

// Re-export CRUD operations
export { getRoutine, createRoutine, deleteRoutine } from "./routine-crud";

// Re-export publish operation
export { publishRoutine } from "./publish-routine";

// Re-export update operations
export { updateRoutine } from "./update-routine";
export { updateRoutineProduct } from "./update-routine-product";

// Re-export save as template operation
export { saveRoutineAsTemplate } from "./save-as-template";

// Re-export utilities (if needed by consumers)
export { toMidnightUTC } from "./utils";
