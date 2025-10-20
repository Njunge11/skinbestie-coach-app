"use server";

import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createNewVerificationCode,
  validateVerificationCode,
  markCodeAsUsed,
} from "@/lib/db/verification-codes";
import { sendVerificationCode } from "@/lib/email/send-verification-code";
import { hashPassword } from "@/lib/password";
import { forgotPasswordEmailSchema } from "@/lib/validations/auth";
import { z } from "zod";

// Dependencies interface for testing
export interface AuthDeps {
  db: typeof db;
  createNewVerificationCode: typeof createNewVerificationCode;
  validateVerificationCode: typeof validateVerificationCode;
  markCodeAsUsed: typeof markCodeAsUsed;
  sendVerificationCode: typeof sendVerificationCode;
  hashPassword: typeof hashPassword;
  now: () => Date;
}

// Default dependencies
const defaultDeps: AuthDeps = {
  db,
  createNewVerificationCode,
  validateVerificationCode,
  markCodeAsUsed,
  sendVerificationCode,
  hashPassword,
  now: () => new Date(),
};

// Schema for verify-code action
const verifyCodeRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

// Schema for reset-password action
const resetPasswordRequestSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    code: z.string().length(6, "Verification code must be 6 digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Schema for creating admin
const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").optional(),
});

/**
 * Send forgot password email with verification code
 */
export async function forgotPasswordAction(email: string, deps: AuthDeps = defaultDeps) {
  try {
    // Validate input
    const result = forgotPasswordEmailSchema.safeParse({ email });
    if (!result.success) {
      return { success: false, error: "Invalid email address" };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find admin by email
    const [admin] = await deps.db
      .select()
      .from(admins)
      .where(eq(admins.email, normalizedEmail))
      .limit(1);

    // Return error if admin doesn't exist
    if (!admin) {
      return {
        success: false,
        error: "No account found with this email address",
      };
    }

    // Create verification code
    const { plainCode } = await deps.createNewVerificationCode(admin.id);

    // Send email
    const emailResult = await deps.sendVerificationCode({
      to: admin.email,
      code: plainCode,
    });

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
      return { success: false, error: "Failed to send verification code" };
    }

    return {
      success: true,
      message: "If an account exists, a verification code has been sent",
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

/**
 * Verify the verification code
 */
export async function verifyCodeAction(email: string, code: string, deps: AuthDeps = defaultDeps) {
  try {
    // Validate input
    const result = verifyCodeRequestSchema.safeParse({ email, code });
    if (!result.success) {
      return { success: false, error: "Invalid email or code format" };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate verification code
    const verificationCode = await deps.validateVerificationCode(
      normalizedEmail,
      code
    );

    if (!verificationCode) {
      return {
        success: false,
        error: "Invalid or expired verification code",
      };
    }

    return { success: true, message: "Verification code is valid" };
  } catch (error) {
    console.error("Verify code error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

/**
 * Reset password with verification code
 */
export async function resetPasswordAction(
  email: string,
  code: string,
  password: string,
  confirmPassword: string,
  deps: AuthDeps = defaultDeps
) {
  try {
    // Validate input
    const result = resetPasswordRequestSchema.safeParse({
      email,
      code,
      password,
      confirmPassword,
    });
    if (!result.success) {
      const firstError = result.error.issues?.[0];
      return { success: false, error: firstError?.message || "Validation error" };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate verification code
    const verificationCode = await deps.validateVerificationCode(
      normalizedEmail,
      code
    );

    if (!verificationCode) {
      return {
        success: false,
        error: "Invalid or expired verification code",
      };
    }

    // Get admin
    const [admin] = await deps.db
      .select()
      .from(admins)
      .where(eq(admins.email, normalizedEmail))
      .limit(1);

    if (!admin) {
      return { success: false, error: "Admin not found" };
    }

    // Hash new password
    const passwordHash = await deps.hashPassword(password);

    // Update admin password
    await deps.db
      .update(admins)
      .set({
        passwordHash,
        passwordSet: true,
        updatedAt: deps.now(),
      })
      .where(eq(admins.id, admin.id));

    // Mark verification code as used
    await deps.markCodeAsUsed(verificationCode.id);

    return { success: true, message: "Password has been reset successfully" };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

/**
 * Create a new admin account
 */
export async function createAdminAction(email: string, name?: string, deps: AuthDeps = defaultDeps) {
  try {
    // Validate input
    const result = createAdminSchema.safeParse({ email, name });
    if (!result.success) {
      const firstError = result.error.issues?.[0];
      return { success: false, error: firstError?.message || "Validation error" };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if admin already exists
    const [existingAdmin] = await deps.db
      .select()
      .from(admins)
      .where(eq(admins.email, normalizedEmail))
      .limit(1);

    if (existingAdmin) {
      return {
        success: false,
        error: "An admin with this email already exists",
      };
    }

    // Create admin account (password not set yet)
    const [newAdmin] = await deps.db
      .insert(admins)
      .values({
        email: normalizedEmail,
        name: name || null,
        passwordSet: false,
      })
      .returning();

    return {
      success: true,
      data: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
      },
      message: "Admin created successfully. Use forgot password to set password.",
    };
  } catch (error) {
    console.error("Create admin error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}
