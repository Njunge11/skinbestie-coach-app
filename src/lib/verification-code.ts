import crypto from 'crypto';
import { hashPassword, verifyPassword } from './password';

/**
 * Generates a cryptographically secure 6-digit verification code
 * Uses Node's crypto module for secure random number generation
 */
export function generateVerificationCode(): string {
  // Generate a random number between 0 and 999999
  const code = crypto.randomInt(0, 1000000);

  // Pad with leading zeros to ensure 6 digits
  return code.toString().padStart(6, '0');
}

/**
 * Hashes a verification code using bcrypt
 * Same hashing algorithm as passwords for consistency
 */
export async function hashVerificationCode(code: string): Promise<string> {
  return hashPassword(code);
}

/**
 * Verifies a plain verification code against a hashed code
 * Returns true if the code matches, false otherwise
 */
export async function verifyVerificationCode(
  plainCode: string,
  hashedCode: string
): Promise<boolean> {
  return verifyPassword(plainCode, hashedCode);
}

/**
 * Generates expiration timestamp for verification codes
 * Default: 15 minutes from now
 */
export function getCodeExpiration(minutesFromNow: number = 15): Date {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + minutesFromNow);
  return expiration;
}

/**
 * Checks if a verification code has expired
 */
export function isCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
