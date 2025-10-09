import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateVerificationCode, markCodeAsUsed } from '@/lib/db/verification-codes';
import { hashPassword } from '@/lib/password';
import { z } from 'zod';

// Schema for reset-password endpoint (includes email, code, and passwords)
const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = resetPasswordRequestSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues?.[0] || result.error.errors?.[0];
      return NextResponse.json(
        { error: firstError?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { email, code, password } = result.data;

    // Validate verification code
    const verificationCode = await validateVerificationCode(
      email.toLowerCase().trim(),
      code
    );

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Get admin
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email.toLowerCase().trim()))
      .limit(1);

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update admin password
    await db
      .update(admins)
      .set({
        passwordHash,
        passwordSet: true,
        updatedAt: new Date(),
      })
      .where(eq(admins.id, admin.id));

    // Mark verification code as used
    await markCodeAsUsed(verificationCode.id);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
