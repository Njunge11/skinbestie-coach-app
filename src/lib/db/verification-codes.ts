import { db } from './index';
import { verificationCodes, admins } from './schema';
import type { VerificationCode } from './schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  generateVerificationCode,
  hashVerificationCode,
  verifyVerificationCode,
  getCodeExpiration,
  isCodeExpired,
} from '../verification-code';

/**
 * Creates a new verification code for an admin
 * Returns the plain code (to send via email) and the database record
 */
export async function createVerificationCode(
  adminId: string
): Promise<{ plainCode: string; record: VerificationCode }> {
  // Generate plain code
  const plainCode = generateVerificationCode();

  // Hash the code before storing
  const codeHash = await hashVerificationCode(plainCode);

  // Create record
  const [record] = await db
    .insert(verificationCodes)
    .values({
      adminId,
      codeHash,
      expiresAt: getCodeExpiration(15), // 15 minutes
    })
    .returning();

  return { plainCode, record };
}

/**
 * Marks all unused verification codes for an admin as expired
 * Called before creating a new code to invalidate old ones
 */
export async function expireExistingCodes(adminId: string): Promise<void> {
  await db
    .update(verificationCodes)
    .set({ expiresAt: new Date() }) // Set to now (expired)
    .where(
      and(
        eq(verificationCodes.adminId, adminId),
        eq(verificationCodes.used, false)
      )
    );
}

/**
 * Finds the most recent active verification code for an admin
 * Returns null if no valid code exists
 */
export async function findActiveCode(
  adminId: string
): Promise<VerificationCode | null> {
  const [code] = await db
    .select()
    .from(verificationCodes)
    .where(
      and(
        eq(verificationCodes.adminId, adminId),
        eq(verificationCodes.used, false)
      )
    )
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);

  if (!code) {
    return null;
  }

  // Check if expired
  if (isCodeExpired(code.expiresAt)) {
    return null;
  }

  return code;
}

/**
 * Validates a verification code for an admin
 * Returns the code record if valid, null otherwise
 */
export async function validateVerificationCode(
  email: string,
  plainCode: string
): Promise<VerificationCode | null> {
  // Get admin by email
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  if (!admin) {
    return null;
  }

  // Get active code
  const activeCode = await findActiveCode(admin.id);

  if (!activeCode) {
    return null;
  }

  // Verify the code matches
  const isValid = await verifyVerificationCode(plainCode, activeCode.codeHash);

  if (!isValid) {
    return null;
  }

  return activeCode;
}

/**
 * Marks a verification code as used
 */
export async function markCodeAsUsed(codeId: string): Promise<void> {
  await db
    .update(verificationCodes)
    .set({
      used: true,
      usedAt: new Date(),
    })
    .where(eq(verificationCodes.id, codeId));
}

/**
 * Combined function: Expire old codes and create new one
 * This is what you'll typically use when sending a new verification code
 */
export async function createNewVerificationCode(
  adminId: string
): Promise<{ plainCode: string; record: VerificationCode }> {
  // First, expire any existing unused codes
  await expireExistingCodes(adminId);

  // Then create a new one
  return createVerificationCode(adminId);
}
