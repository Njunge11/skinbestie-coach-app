import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./db/queries', () => ({
  getAdminByEmail: vi.fn(),
}));

vi.mock('./password', () => ({
  verifyPassword: vi.fn(),
}));

import { getAdminByEmail } from './db/queries';
import { verifyPassword } from './password';

// We need to test the authorize function from NextAuth config
// Since it's embedded in the NextAuth call, we'll extract and test its logic
async function authorize(credentials: Record<string, unknown> | undefined) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const email = credentials.email as string;
  const password = credentials.password as string;

  // Get admin from database
  const admin = await getAdminByEmail(email);

  // Check if admin exists and password is set
  if (!admin || !admin.passwordSet || !admin.passwordHash) {
    return null;
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, admin.passwordHash);

  if (!isValidPassword) {
    return null;
  }

  // Return user object (will be stored in JWT)
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name ?? undefined,
  };
}

describe('NextAuth authorize function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('returns user object when credentials are valid', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        passwordSet: true,
        passwordHash: 'hashed-password',
      };

      vi.mocked(getAdminByEmail).mockResolvedValue(mockAdmin as Awaited<ReturnType<typeof getAdminByEmail>>);
      vi.mocked(verifyPassword).mockResolvedValue(true);

      const credentials = {
        email: 'admin@example.com',
        password: 'ValidPass123',
      };

      // Act
      const result = await authorize(credentials);

      // Assert
      expect(result).toEqual({
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
      });
      expect(getAdminByEmail).toHaveBeenCalledWith('admin@example.com');
      expect(verifyPassword).toHaveBeenCalledWith('ValidPass123', 'hashed-password');
    });

    it('returns user object with undefined name when admin has no name', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: null,
        passwordSet: true,
        passwordHash: 'hashed-password',
      };

      vi.mocked(getAdminByEmail).mockResolvedValue(mockAdmin as Awaited<ReturnType<typeof getAdminByEmail>>);
      vi.mocked(verifyPassword).mockResolvedValue(true);

      const credentials = {
        email: 'admin@example.com',
        password: 'ValidPass123',
      };

      // Act
      const result = await authorize(credentials);

      // Assert
      expect(result).toEqual({
        id: 'admin-123',
        email: 'admin@example.com',
        name: undefined,
      });
    });
  });

  describe('Validation errors', () => {
    it('returns null when email is missing', async () => {
      // Arrange
      const credentials = {
        password: 'ValidPass123',
      };

      // Act
      const result = await authorize(credentials);

      // Assert
      expect(result).toBeNull();
      expect(getAdminByEmail).not.toHaveBeenCalled();
    });

    it('returns null when password is missing', async () => {
      // Arrange
      const credentials = {
        email: 'admin@example.com',
      };

      // Act
      const result = await authorize(credentials);

      // Assert
      expect(result).toBeNull();
      expect(getAdminByEmail).not.toHaveBeenCalled();
    });

    it('returns null when credentials are undefined', async () => {
      // Act
      const result = await authorize(undefined);

      // Assert
      expect(result).toBeNull();
      expect(getAdminByEmail).not.toHaveBeenCalled();
    });

    it('returns null when credentials are empty object', async () => {
      // Act
      const result = await authorize({});

      // Assert
      expect(result).toBeNull();
      expect(getAdminByEmail).not.toHaveBeenCalled();
    });
  });

  describe('Error cases', () => {
    it('returns null when admin does not exist', async () => {
      // Arrange
      vi.mocked(getAdminByEmail).mockResolvedValue(null);

      const credentials = {
        email: 'nonexistent@example.com',
        password: 'ValidPass123',
      };

      // Act
      const result = await authorize(credentials);

      // Assert
      expect(result).toBeNull();
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('returns null when admin has not set password', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        passwordSet: false,
        passwordHash: null,
      };

      vi.mocked(getAdminByEmail).mockResolvedValue(mockAdmin as Awaited<ReturnType<typeof getAdminByEmail>>);

      const credentials = {
        email: 'admin@example.com',
        password: 'ValidPass123',
      };

      // Act
      const result = await authorize(credentials);

      // Assert
      expect(result).toBeNull();
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('returns null when password hash is missing', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        passwordSet: true,
        passwordHash: null,
      };

      vi.mocked(getAdminByEmail).mockResolvedValue(mockAdmin as Awaited<ReturnType<typeof getAdminByEmail>>);

      const credentials = {
        email: 'admin@example.com',
        password: 'ValidPass123',
      };

      // Act
      const result = await authorize(credentials);

      // Assert
      expect(result).toBeNull();
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('returns null when password is incorrect', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        passwordSet: true,
        passwordHash: 'hashed-password',
      };

      vi.mocked(getAdminByEmail).mockResolvedValue(mockAdmin as Awaited<ReturnType<typeof getAdminByEmail>>);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const credentials = {
        email: 'admin@example.com',
        password: 'WrongPassword123',
      };

      // Act
      const result = await authorize(credentials);

      // Assert
      expect(result).toBeNull();
      expect(verifyPassword).toHaveBeenCalledWith('WrongPassword123', 'hashed-password');
    });
  });
});
