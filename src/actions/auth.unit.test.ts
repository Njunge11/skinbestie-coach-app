import { describe, it, expect, vi } from "vitest";
import {
  forgotPasswordAction,
  verifyCodeAction,
  resetPasswordAction,
  createAdminAction,
  type AuthDeps,
} from "./auth";

// Fake database
function makeFakeDb() {
  const store = new Map<string, Record<string, unknown>>();

  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async (n: number) => {
            // Extract email from condition for lookup
            const entries = Array.from(store.values());
            return entries.slice(0, n);
          },
        }),
      }),
    }),
    insert: () => ({
      values: (data: Record<string, unknown>) => ({
        returning: async () => {
          const admin = {
            ...data,
            id: `admin_${store.size + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          store.set(data.email, admin);
          return [admin];
        },
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
    _store: store, // For test setup
  };
}

describe("Auth Server Actions - Unit Tests", () => {
  describe("createAdminAction", () => {
    it("creates admin when valid email and name provided", async () => {
      const fakeDb = makeFakeDb() as AuthDeps["db"];
      const deps: AuthDeps = {
        db: fakeDb,
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await createAdminAction("ada@example.com", "Ada Lovelace", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.email).toBe("ada@example.com");
        expect(result.data?.name).toBe("Ada Lovelace");
      }
    });

    it("rejects invalid email format", async () => {
      const fakeDb = makeFakeDb() as AuthDeps["db"];
      const deps: AuthDeps = {
        db: fakeDb,
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await createAdminAction("invalid-email", "Test", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("email");
      }
    });

    it("normalizes email to lowercase", async () => {
      const fakeDb = makeFakeDb() as AuthDeps["db"];
      const deps: AuthDeps = {
        db: fakeDb,
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await createAdminAction("ADA@EXAMPLE.COM", "Ada", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.email).toBe("ada@example.com");
      }
    });
  });

  describe("forgotPasswordAction", () => {
    it("sends verification code for existing admin", async () => {
      const fakeDb = makeFakeDb() as AuthDeps["db"];
      fakeDb._store.set("ada@example.com", {
        id: "admin_1",
        email: "ada@example.com",
        name: "Ada",
      });

      const mockCreateCode = vi.fn().mockResolvedValue({ plainCode: "123456" });
      const mockSendEmail = vi.fn().mockResolvedValue({ success: true });

      // Mock db select to return admin
      fakeDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: async () => [fakeDb._store.get("ada@example.com")],
          }),
        }),
      });

      const deps: AuthDeps = {
        db: fakeDb,
        createNewVerificationCode: mockCreateCode,
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: mockSendEmail,
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await forgotPasswordAction("ada@example.com", deps);

      expect(result.success).toBe(true);
      expect(mockCreateCode).toHaveBeenCalledWith("admin_1");
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "ada@example.com",
        code: "123456",
      });
    });

    it("returns error for non-existent admin", async () => {
      const fakeDb = makeFakeDb() as AuthDeps["db"];
      fakeDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: async () => [], // No admin found
          }),
        }),
      });

      const deps: AuthDeps = {
        db: fakeDb,
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await forgotPasswordAction("nonexistent@example.com", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No account found");
      }
    });

    it("rejects invalid email format", async () => {
      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await forgotPasswordAction("invalid-email", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid email address");
      }
    });
  });

  describe("verifyCodeAction", () => {
    it("validates correct verification code", async () => {
      const mockValidateCode = vi.fn().mockResolvedValue({
        id: "code_1",
        adminId: "admin_1",
        codeHash: "hashed_123456",
      });

      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: mockValidateCode,
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await verifyCodeAction("ada@example.com", "123456", deps);

      expect(result.success).toBe(true);
      expect(mockValidateCode).toHaveBeenCalledWith("ada@example.com", "123456");
    });

    it("rejects invalid verification code", async () => {
      const mockValidateCode = vi.fn().mockResolvedValue(null);

      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: mockValidateCode,
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await verifyCodeAction("ada@example.com", "999999", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid or expired verification code");
      }
    });

    it("rejects invalid code format", async () => {
      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await verifyCodeAction("ada@example.com", "12345", deps); // Only 5 digits

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid email or code format");
      }
    });
  });

  describe("resetPasswordAction", () => {
    it("resets password when valid code and password provided", async () => {
      const fakeDb = makeFakeDb() as AuthDeps["db"];

      const mockValidateCode = vi.fn().mockResolvedValue({
        id: "code_1",
        adminId: "admin_1",
      });
      const mockHashPassword = vi.fn().mockResolvedValue("hashed_newpass123");
      const mockMarkAsUsed = vi.fn();

      fakeDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "admin_1",
                email: "ada@example.com",
                name: "Ada",
              },
            ],
          }),
        }),
      });

      const deps: AuthDeps = {
        db: fakeDb,
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: mockValidateCode,
        markCodeAsUsed: mockMarkAsUsed,
        sendVerificationCode: vi.fn(),
        hashPassword: mockHashPassword,
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await resetPasswordAction(
        "ada@example.com",
        "123456",
        "NewPass123",
        "NewPass123",
        deps
      );

      expect(result.success).toBe(true);
      expect(mockValidateCode).toHaveBeenCalledWith("ada@example.com", "123456");
      expect(mockHashPassword).toHaveBeenCalledWith("NewPass123");
      expect(mockMarkAsUsed).toHaveBeenCalledWith("code_1");
    });

    it("rejects password without uppercase letter", async () => {
      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await resetPasswordAction(
        "ada@example.com",
        "123456",
        "lowercase123",
        "lowercase123",
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("uppercase");
      }
    });

    it("rejects password without lowercase letter", async () => {
      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await resetPasswordAction(
        "ada@example.com",
        "123456",
        "UPPERCASE123",
        "UPPERCASE123",
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("lowercase");
      }
    });

    it("rejects password without number", async () => {
      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await resetPasswordAction(
        "ada@example.com",
        "123456",
        "NoNumbersHere",
        "NoNumbersHere",
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("number");
      }
    });

    it("rejects password less than 8 characters", async () => {
      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await resetPasswordAction(
        "ada@example.com",
        "123456",
        "Short1",
        "Short1",
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("8 characters");
      }
    });

    it("rejects mismatched passwords", async () => {
      const deps: AuthDeps = {
        db: makeFakeDb() as AuthDeps["db"],
        createNewVerificationCode: vi.fn(),
        validateVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        sendVerificationCode: vi.fn(),
        hashPassword: vi.fn(),
        now: () => new Date("2025-01-01T12:00:00Z"),
      };

      const result = await resetPasswordAction(
        "ada@example.com",
        "123456",
        "ValidPassword123",
        "DifferentPassword123",
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Passwords do not match");
      }
    });
  });
});
