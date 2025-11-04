/**
 * Result type for operations that can succeed or fail
 *
 * Use this instead of throwing exceptions for expected errors.
 * Inspired by Rust's Result type and functional error handling.
 *
 * @example
 * async function getUser(id: string): Promise<Result<User>> {
 *   const user = await db.findById(id);
 *   if (!user) {
 *     return { success: false, error: "User not found" };
 *   }
 *   return { success: true, data: user };
 * }
 *
 * // Consumer code
 * const result = await getUser("123");
 * if (result.success) {
 *   console.log(result.data.name); // TypeScript knows data exists
 * } else {
 *   console.error(result.error); // TypeScript knows error exists
 * }
 */

export type SuccessResult<T> = { success: true; data: T };
export type ErrorResult = { success: false; error: string };
export type Result<T> = SuccessResult<T> | ErrorResult;
