import { NextRequest, NextResponse } from 'next/server';
import { validateVerificationCode } from '@/lib/db/verification-codes';
import { verificationCodeSchema } from '@/lib/validations/auth';
import { z } from 'zod';

// Schema for verify-code endpoint (includes email + code)
const verifyCodeRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: verificationCodeSchema.shape.code,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = verifyCodeRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { valid: false, error: 'Invalid email or code format' },
        { status: 400 }
      );
    }

    const { email, code } = result.data;

    // Validate verification code
    const verificationCode = await validateVerificationCode(
      email.toLowerCase().trim(),
      code
    );

    if (!verificationCode) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired verification code',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'Verification code is valid',
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { valid: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
