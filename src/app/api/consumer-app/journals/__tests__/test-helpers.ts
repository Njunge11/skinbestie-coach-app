import { vi } from "vitest";
import { db } from "@/lib/db";

/**
 * Helper to create a properly typed mock database query chain
 *
 * This uses a type assertion because we're creating a partial mock for testing.
 * The mock only implements the specific query chain methods used in tests
 * (select().from().where().limit()), not the full Drizzle query builder API.
 *
 * This is an acceptable use of type assertion for test mocks where:
 * 1. We control the mock implementation
 * 2. We only call the mocked methods
 * 3. The alternative (full query builder implementation) is impractical
 */
export function createMockDbSelect(
  resolveValue: unknown[],
): ReturnType<typeof db.select> {
  const mockLimit = vi.fn().mockResolvedValue(resolveValue);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  return { from: mockFrom } as unknown as ReturnType<typeof db.select>;
}
