import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAuthService } from "../../auth.service";
import type { IAuthRepository } from "../../auth.repo";
import bcrypt from "bcryptjs";

// Mock bcrypt
vi.mock("bcryptjs");

// Mock email sending
vi.mock("@/lib/email/send-consumer-verification-code", () => ({
  sendConsumerVerificationCode: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock repository
const mockRepo: IAuthRepository = {
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createVerificationToken: vi.fn(),
  createVerificationCode: vi.fn(),
  findVerificationTokensByIdentifier: vi.fn(),
  deleteVerificationToken: vi.fn(),
  useVerificationToken: vi.fn(),
  useVerificationCode: vi.fn(),
};

describe("Auth Service - Verification Code", () => {
  let service: ReturnType<typeof createAuthService>;

  const testIdentifier = "test@example.com";
  const fixedNow = new Date("2025-11-10T14:00:00Z");
  const fixedExpires = new Date("2025-11-10T14:15:00Z"); // 15 minutes later

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuthService(mockRepo);
  });

  describe("createVerificationCode", () => {
    it("successfully generates verification code and sends email", async () => {
      // Given: Valid identifier
      vi.mocked(mockRepo.createVerificationCode).mockResolvedValue({
        identifier: testIdentifier,
        code: "hashed_code",
        expires: fixedExpires,
      });

      // When
      const result = await service.createVerificationCode(testIdentifier, {
        now: () => fixedNow,
      });

      // Then: Returns success message (not the actual code)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe(
          "Verification code sent to your email",
        );
        expect(result.data.expires).toEqual(fixedExpires);
      }
    });

    it("hashes code before storing in repository", async () => {
      // Given: Generated 6-digit code
      vi.mocked(mockRepo.createVerificationCode).mockResolvedValue({
        identifier: testIdentifier,
        code: "hashed_code",
        expires: fixedExpires,
      });

      // Mock bcrypt.hash
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed_code" as never);

      // When
      await service.createVerificationCode(testIdentifier, {
        now: () => fixedNow,
      });

      // Then: bcrypt.hash was called
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockRepo.createVerificationCode).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: testIdentifier,
          code: expect.any(String), // Hashed code
          expires: fixedExpires,
        }),
      );
    });

    it("sets expiration to 15 minutes from now", async () => {
      // Given: Fixed timestamp
      vi.mocked(mockRepo.createVerificationCode).mockResolvedValue({
        identifier: testIdentifier,
        code: "hashed_code",
        expires: fixedExpires,
      });

      // When
      await service.createVerificationCode(testIdentifier, {
        now: () => fixedNow,
      });

      // Then: Repository receives correct expiration
      expect(mockRepo.createVerificationCode).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: fixedExpires, // 15 minutes after fixedNow
        }),
      );
    });

    it("returns error when email format is invalid", async () => {
      // Given: Invalid email identifier
      const invalidEmail = "not-an-email";

      // When
      const result = await service.createVerificationCode(invalidEmail, {
        now: () => fixedNow,
      });

      // Then
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid email format");
      }
      expect(mockRepo.createVerificationCode).not.toHaveBeenCalled();
    });

    it("returns error when repository throws exception", async () => {
      // Given: Repository throws error
      vi.mocked(mockRepo.createVerificationCode).mockRejectedValue(
        new Error("Database connection failed"),
      );

      // When
      const result = await service.createVerificationCode(testIdentifier, {
        now: () => fixedNow,
      });

      // Then
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create verification code");
      }
    });
  });

  describe("verifyCode", () => {
    const testPlainCode = "123456";
    const testHashedCode = "hashed_123456";
    const futureExpires = new Date("2025-11-10T14:30:00Z"); // Future
    const pastExpires = new Date("2025-11-10T13:00:00Z"); // Past

    it("successfully validates code when it exists and is not expired", async () => {
      // Given: Valid identifier, code, and unexpired timestamp
      vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockResolvedValue([
        {
          identifier: testIdentifier,
          token: testHashedCode,
          expires: futureExpires,
        },
      ]);

      vi.mocked(mockRepo.deleteVerificationToken).mockResolvedValue(true);

      // Mock bcrypt to return true (code matches)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      // When
      const result = await service.verifyCode(testIdentifier, testPlainCode, {
        now: () => fixedNow,
      });

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.identifier).toBe(testIdentifier);
      }
      // Code should be deleted (one-time use)
      expect(mockRepo.deleteVerificationToken).toHaveBeenCalledWith(
        testIdentifier,
        testHashedCode,
      );
    });

    it("returns error when code is expired", async () => {
      // Given: Valid code but expired timestamp
      vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockResolvedValue([
        {
          identifier: testIdentifier,
          token: testHashedCode,
          expires: pastExpires,
        },
      ]);

      vi.mocked(mockRepo.deleteVerificationToken).mockResolvedValue(true);

      // Mock bcrypt to return true (code matches)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      // When
      const result = await service.verifyCode(testIdentifier, testPlainCode, {
        now: () => fixedNow,
      });

      // Then
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid or expired code");
      }
      // Expired code should be deleted
      expect(mockRepo.deleteVerificationToken).toHaveBeenCalled();
    });

    it("returns error when code doesn't match any stored codes", async () => {
      // Given: Code exists but doesn't match provided code
      vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockResolvedValue([
        {
          identifier: testIdentifier,
          token: testHashedCode,
          expires: futureExpires,
        },
      ]);

      // Mock bcrypt to return false (code doesn't match)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      // When
      const result = await service.verifyCode(testIdentifier, testPlainCode, {
        now: () => fixedNow,
      });

      // Then
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid or expired code");
      }
    });
  });
});
