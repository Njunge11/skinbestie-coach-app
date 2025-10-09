import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  admins: {},
}));

vi.mock('@/lib/db/verification-codes', () => ({
  validateVerificationCode: vi.fn(),
  markCodeAsUsed: vi.fn(),
}));

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn(),
}));

import { db } from '@/lib/db';
import { validateVerificationCode, markCodeAsUsed } from '@/lib/db/verification-codes';
import { hashPassword } from '@/lib/password';

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('resets password successfully with valid code', async () => {
      // Arrange
      const mockVerificationCode = {
        id: 'code-123',
        adminId: 'admin-123',
        used: false,
      };

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      // Stub: Valid verification code
      vi.mocked(validateVerificationCode).mockResolvedValue(mockVerificationCode as any);

      // Stub: Admin exists
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAdmin]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      // Stub: Hash password
      vi.mocked(hashPassword).mockResolvedValue('hashed-password');

      // Stub: Update admin
      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(db.update).mockReturnValue(updateMock() as any);

      // Stub: Mark code as used
      vi.mocked(markCodeAsUsed).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('reset successfully');
      expect(hashPassword).toHaveBeenCalledWith('NewPass123');
    });

    it('marks verification code as used after reset', async () => {
      // Arrange
      const mockVerificationCode = {
        id: 'code-123',
        adminId: 'admin-123',
      };

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
      };

      vi.mocked(validateVerificationCode).mockResolvedValue(mockVerificationCode as any);

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAdmin]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      vi.mocked(hashPassword).mockResolvedValue('hashed-password');

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(db.update).mockReturnValue(updateMock() as any);

      vi.mocked(markCodeAsUsed).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      });

      // Act
      await POST(request);

      // Assert
      expect(markCodeAsUsed).toHaveBeenCalledWith('code-123');
    });

    it('sets passwordSet flag to true', async () => {
      // Arrange
      const mockVerificationCode = {
        id: 'code-123',
        adminId: 'admin-123',
      };

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
      };

      vi.mocked(validateVerificationCode).mockResolvedValue(mockVerificationCode as any);

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAdmin]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      vi.mocked(hashPassword).mockResolvedValue('hashed-password');

      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      const updateMock = vi.fn().mockReturnValue({
        set: setMock,
      });
      vi.mocked(db.update).mockReturnValue(updateMock() as any);

      vi.mocked(markCodeAsUsed).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      });

      // Act
      await POST(request);

      // Assert
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordSet: true,
        })
      );
    });
  });

  describe('Validation errors', () => {
    it('returns 400 when email is invalid format', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });

    it('returns 400 when password is too short', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'Short1',
          confirmPassword: 'Short1',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('at least 8 characters');
    });

    it('returns 400 when password missing uppercase letter', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'password123',
          confirmPassword: 'password123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('uppercase letter');
    });

    it('returns 400 when password missing lowercase letter', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'PASSWORD123',
          confirmPassword: 'PASSWORD123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('lowercase letter');
    });

    it('returns 400 when password missing number', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'PasswordOnly',
          confirmPassword: 'PasswordOnly',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('number');
    });

    it('returns 400 when passwords do not match', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'DifferentPass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('do not match');
    });

    it('returns 400 when code is not 6 digits', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '12345',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
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
    it('returns 400 when verification code is invalid', async () => {
      // Arrange - Stub: Invalid code
      vi.mocked(validateVerificationCode).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid or expired');
    });

    it('returns 400 when verification code is expired', async () => {
      // Arrange - Stub: Expired code returns null
      vi.mocked(validateVerificationCode).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid or expired');
    });

    it('returns 400 when verification code already used', async () => {
      // Arrange - Stub: Used code returns null from validation
      vi.mocked(validateVerificationCode).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid or expired');
    });

    it('returns 404 when admin does not exist', async () => {
      // Arrange
      const mockVerificationCode = {
        id: 'code-123',
        adminId: 'admin-123',
      };

      // Stub: Valid verification code
      vi.mocked(validateVerificationCode).mockResolvedValue(mockVerificationCode as any);

      // Stub: Admin does NOT exist
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
          password: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('Admin not found');
    });
  });
});
