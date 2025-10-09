import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  admins: {},
}));

vi.mock('@/lib/db/verification-codes', () => ({
  createNewVerificationCode: vi.fn(),
}));

vi.mock('@/lib/email/send-verification-code', () => ({
  sendVerificationCode: vi.fn(),
}));

import { db } from '@/lib/db';
import { createNewVerificationCode } from '@/lib/db/verification-codes';
import { sendVerificationCode } from '@/lib/email/send-verification-code';

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('sends verification code to existing admin successfully', async () => {
      // Arrange
      const mockAdmin = {
        id: '123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      // Stub: Admin exists
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAdmin]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      // Stub: Create verification code
      vi.mocked(createNewVerificationCode).mockResolvedValue({
        plainCode: '123456',
        record: {} as any,
      });

      // Stub: Send email successfully
      vi.mocked(sendVerificationCode).mockResolvedValue({
        success: true,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('verification code has been sent');
      expect(sendVerificationCode).toHaveBeenCalledWith({
        to: 'admin@example.com',
        code: '123456',
      });
    });
  });

  describe('Validation errors', () => {
    it('returns 400 when email is invalid format', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid email address');
    });

    it('returns 400 when email is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });
  });

  describe('Error cases', () => {
    it('returns 404 when admin does not exist', async () => {
      // Arrange - Stub: No admin found
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('No account found with this email address');
      // Should NOT call email service
      expect(sendVerificationCode).not.toHaveBeenCalled();
    });

    it('returns 500 when email service fails', async () => {
      // Arrange
      const mockAdmin = {
        id: '123',
        email: 'admin@example.com',
      };

      // Stub: Admin exists
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAdmin]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      // Stub: Create verification code
      vi.mocked(createNewVerificationCode).mockResolvedValue({
        plainCode: '123456',
        record: {} as any,
      });

      // Stub: Email fails
      vi.mocked(sendVerificationCode).mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to send verification code');
    });
  });
});
