import { z } from "zod";

// Request schema for user-by-email endpoint
export const getUserByEmailRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Request schema for create-verification-token endpoint
export const createVerificationTokenRequestSchema = z.object({
  identifier: z.string().email("Invalid email format"),
});

// Request schema for use-verification-token endpoint
export const useVerificationTokenRequestSchema = z.object({
  identifier: z.string().email("Invalid email format"),
  token: z.string().min(1, "Token is required"),
});

// Request schema for create-verification-code endpoint
export const createVerificationCodeRequestSchema = z.object({
  identifier: z.string().email("Invalid email format"),
});

// Request schema for verify-code endpoint
export const verifyCodeRequestSchema = z.object({
  identifier: z.string().email("Invalid email format"),
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

// TypeScript types
export type GetUserByEmailRequest = z.infer<typeof getUserByEmailRequestSchema>;
export type CreateVerificationTokenRequest = z.infer<
  typeof createVerificationTokenRequestSchema
>;
export type UseVerificationTokenRequest = z.infer<
  typeof useVerificationTokenRequestSchema
>;
export type CreateVerificationCodeRequest = z.infer<
  typeof createVerificationCodeRequestSchema
>;
export type VerifyCodeRequest = z.infer<typeof verifyCodeRequestSchema>;
