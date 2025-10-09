import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db/verification-codes', () => ({
  validateVerificationCode: vi.fn(),
}));

import { validateVerificationCode } from '@/lib/db/verification-codes';

describe('POST /api/auth/verify-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('returns valid:true when code is correct', async () => {
      // Arrange
      const mockVerificationCode = {
        id: '123',
        adminId: 'admin-123',
        codeHash: 'hashed',
        expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        used: false,
      };

      // Stub: Valid code
      vi.mocked(validateVerificationCode).mockResolvedValue(mockVerificationCode as any);

      const request = new NextRequest('http://localhost:3000/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.message).toContain('valid');
      expect(validateVerificationCode).toHaveBeenCalledWith('admin@example.com', '123456');
    });
  });

  describe('Validation errors', () => {
    it('returns 400 when email is invalid format', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          code: '123456',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('returns 400 when code is not 6 digits', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '12345', // Only 5 digits
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('returns 400 when code contains non-numeric characters', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '12345a', // Contains letter
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBeTruthy();
    });
  });

  describe('Error cases', () => {
    it('returns valid:false when code is incorrect', async () => {
      // Arrange - Stub: Invalid code
      vi.mocked(validateVerificationCode).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toContain('Invalid or expired');
    });

    it('returns valid:false when code is expired', async () => {
      // Arrange - Stub: Expired code returns null
      vi.mocked(validateVerificationCode).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          code: '123456',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toContain('Invalid or expired');
    });

    it('returns valid:false when admin does not exist', async () => {
      // Arrange - Stub: No admin found returns null
      vi.mocked(validateVerificationCode).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          code: '123456',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toContain('Invalid or expired');
    });
  });
});
