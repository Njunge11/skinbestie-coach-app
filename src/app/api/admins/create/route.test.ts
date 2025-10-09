import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock schema
vi.mock('@/lib/db/schema', () => ({
  admins: {},
}));

import { db } from '@/lib/db';

describe('POST /api/admins/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('creates admin successfully with email and name', async () => {
      // Arrange
      const mockAdmin = {
        id: '123',
        email: 'admin@example.com',
        name: 'Admin User',
        passwordSet: false,
      };

      // Stub: No existing admin
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      // Stub: Create admin
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAdmin]),
        }),
      });
      vi.mocked(db.insert).mockReturnValue(insertMock() as any);

      const request = new NextRequest('http://localhost:3000/api/admins/create', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', name: 'Admin User' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.admin).toEqual({
        id: '123',
        email: 'admin@example.com',
        name: 'Admin User',
      });
      expect(data.message).toContain('Admin created successfully');
    });

    it('creates admin successfully with only email (name optional)', async () => {
      // Arrange
      const mockAdmin = {
        id: '123',
        email: 'admin@example.com',
        name: null,
        passwordSet: false,
      };

      // Stub: No existing admin
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      // Stub: Create admin
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAdmin]),
        }),
      });
      vi.mocked(db.insert).mockReturnValue(insertMock() as any);

      const request = new NextRequest('http://localhost:3000/api/admins/create', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.admin.name).toBeNull();
    });
  });

  describe('Validation errors', () => {
    it('returns 400 when email is invalid format', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/admins/create', {
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
      const request = new NextRequest('http://localhost:3000/api/admins/create', {
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
    it('returns 409 when admin with email already exists', async () => {
      // Arrange
      const existingAdmin = {
        id: '123',
        email: 'admin@example.com',
        name: 'Existing Admin',
      };

      // Stub: Admin exists
      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingAdmin]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(selectMock() as any);

      const request = new NextRequest('http://localhost:3000/api/admins/create', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', name: 'New Admin' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });
  });
});
