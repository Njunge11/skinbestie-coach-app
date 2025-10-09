import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { admins, verificationCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createNewVerificationCode, validateVerificationCode, markCodeAsUsed } from '@/lib/db/verification-codes';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('Password Reset Flow Integration Tests', () => {
  describe('Complete password reset flow', () => {
    it('allows admin to reset password with valid verification code', async () => {
      // Step 1: Create admin account
      const [admin] = await db
        .insert(admins)
        .values({
          email: 'test@example.com',
          name: 'Test Admin',
          passwordSet: false,
        })
        .returning();

      expect(admin).toBeDefined();
      expect(admin.email).toBe('test@example.com');
      expect(admin.passwordSet).toBe(false);

      // Step 2: Create verification code (simulating forgot-password)
      const { plainCode, record } = await createNewVerificationCode(admin.id);

      expect(plainCode).toMatch(/^\d{6}$/); // 6-digit code
      expect(record.adminId).toBe(admin.id);
      expect(record.used).toBe(false);

      // Step 3: Validate verification code
      const validatedCode = await validateVerificationCode(admin.email, plainCode);

      expect(validatedCode).toBeDefined();
      expect(validatedCode?.id).toBe(record.id);
      expect(validatedCode?.used).toBe(false);

      // Step 4: Set new password
      const newPassword = 'NewSecurePass123';
      const passwordHash = await hashPassword(newPassword);

      await db
        .update(admins)
        .set({
          passwordHash,
          passwordSet: true,
          updatedAt: new Date(),
        })
        .where(eq(admins.id, admin.id));

      // Step 5: Mark code as used
      await markCodeAsUsed(record.id);

      // Step 6: Verify password was set correctly
      const [updatedAdmin] = await db
        .select()
        .from(admins)
        .where(eq(admins.id, admin.id))
        .limit(1);

      expect(updatedAdmin.passwordSet).toBe(true);
      expect(updatedAdmin.passwordHash).toBeDefined();

      // Verify password is correct
      const isPasswordValid = await verifyPassword(newPassword, updatedAdmin.passwordHash!);
      expect(isPasswordValid).toBe(true);

      // Step 7: Verify code was marked as used
      const [usedCode] = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.id, record.id))
        .limit(1);

      expect(usedCode.used).toBe(true);
      expect(usedCode.usedAt).toBeDefined();
    });

    it('prevents reusing verification codes', async () => {
      // Create admin
      const [admin] = await db
        .insert(admins)
        .values({
          email: 'test2@example.com',
          name: 'Test Admin 2',
          passwordSet: false,
        })
        .returning();

      // Create and use verification code
      const { plainCode, record } = await createNewVerificationCode(admin.id);
      await markCodeAsUsed(record.id);

      // Try to validate the used code
      const validatedCode = await validateVerificationCode(admin.email, plainCode);

      expect(validatedCode).toBeNull();
    });

    it('rejects expired verification codes', async () => {
      // Create admin
      const [admin] = await db
        .insert(admins)
        .values({
          email: 'test3@example.com',
          name: 'Test Admin 3',
          passwordSet: false,
        })
        .returning();

      // Create verification code
      const { plainCode } = await createNewVerificationCode(admin.id);

      // Manually expire the code
      await db
        .update(verificationCodes)
        .set({ expiresAt: new Date(Date.now() - 1000) }) // Expired 1 second ago
        .where(eq(verificationCodes.adminId, admin.id));

      // Try to validate expired code
      const validatedCode = await validateVerificationCode(admin.email, plainCode);

      expect(validatedCode).toBeNull();
    });

    it('invalidates old codes when creating new verification code', async () => {
      // Create admin
      const [admin] = await db
        .insert(admins)
        .values({
          email: 'test4@example.com',
          name: 'Test Admin 4',
          passwordSet: false,
        })
        .returning();

      // Create first verification code
      const { plainCode: firstCode } = await createNewVerificationCode(admin.id);

      // Create second verification code (should invalidate first)
      const { plainCode: secondCode } = await createNewVerificationCode(admin.id);

      // First code should no longer be valid
      const firstValidation = await validateVerificationCode(admin.email, firstCode);
      expect(firstValidation).toBeNull();

      // Second code should be valid
      const secondValidation = await validateVerificationCode(admin.email, secondCode);
      expect(secondValidation).toBeDefined();
    });

    it('rejects incorrect verification codes', async () => {
      // Create admin
      const [admin] = await db
        .insert(admins)
        .values({
          email: 'test5@example.com',
          name: 'Test Admin 5',
          passwordSet: false,
        })
        .returning();

      // Create verification code
      await createNewVerificationCode(admin.id);

      // Try to validate with wrong code
      const validatedCode = await validateVerificationCode(admin.email, '999999');

      expect(validatedCode).toBeNull();
    });

    it('handles password requirements correctly', async () => {
      // Create admin
      const [admin] = await db
        .insert(admins)
        .values({
          email: 'test6@example.com',
          name: 'Test Admin 6',
          passwordSet: false,
        })
        .returning();

      // Test various password scenarios
      const validPassword = 'SecurePass123';
      const validHash = await hashPassword(validPassword);

      await db
        .update(admins)
        .set({
          passwordHash: validHash,
          passwordSet: true,
        })
        .where(eq(admins.id, admin.id));

      const [updatedAdmin] = await db
        .select()
        .from(admins)
        .where(eq(admins.id, admin.id))
        .limit(1);

      // Verify correct password
      const correctPassword = await verifyPassword(validPassword, updatedAdmin.passwordHash!);
      expect(correctPassword).toBe(true);

      // Verify incorrect password
      const incorrectPassword = await verifyPassword('WrongPassword123', updatedAdmin.passwordHash!);
      expect(incorrectPassword).toBe(false);
    });
  });
});
