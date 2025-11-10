import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAuthService } from "../../auth.service";
import type { IAuthRepository } from "../../auth.repo";
import bcrypt from "bcryptjs";

// Mock repository
const mockRepo: IAuthRepository = {
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createVerificationToken: vi.fn(),
  findVerificationTokensByIdentifier: vi.fn(),
  deleteVerificationToken: vi.fn(),
  useVerificationToken: vi.fn(),
  createVerificationCode: vi.fn(),
  useVerificationCode: vi.fn(),
};

describe("Auth Service - useVerificationToken", () => {
  let service: ReturnType<typeof createAuthService>;

  const testIdentifier = "test@example.com";
  const testPlainToken = "abc123def456";
  const testHashedToken = "$2a$10$hashedtokenvalue";
  const fixedNow = new Date("2025-11-10T14:30:00Z");
  const futureExpires = new Date("2025-11-10T15:00:00Z"); // 30 min in future
  const pastExpires = new Date("2025-11-10T14:00:00Z"); // 30 min in past

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuthService(mockRepo);
  });

  it("successfully validates token when it exists and is not expired", async () => {
    // Given: Token exists and is not expired
    vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockResolvedValue([
      {
        identifier: testIdentifier,
        token: testHashedToken,
        expires: futureExpires,
      },
    ]);

    vi.mocked(mockRepo.deleteVerificationToken).mockResolvedValue(true);

    // Mock bcrypt to return true (token matches)
    vi.spyOn(bcrypt, "compare").mockImplementation(async () => true);

    // When
    const result = await service.useVerificationToken(
      testIdentifier,
      testPlainToken,
      { now: () => fixedNow },
    );

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe(testIdentifier);
    }
    expect(mockRepo.deleteVerificationToken).toHaveBeenCalledWith(
      testIdentifier,
      testHashedToken,
    );
  });

  it("compares plain token against hashed token using bcrypt", async () => {
    // Given: Token exists
    vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockResolvedValue([
      {
        identifier: testIdentifier,
        token: testHashedToken,
        expires: futureExpires,
      },
    ]);

    vi.mocked(mockRepo.deleteVerificationToken).mockResolvedValue(true);

    const bcryptCompareSpy = vi
      .spyOn(bcrypt, "compare")
      .mockImplementation(async () => true);

    // When
    await service.useVerificationToken(testIdentifier, testPlainToken, {
      now: () => fixedNow,
    });

    // Then: bcrypt.compare was called with plain and hashed tokens
    expect(bcryptCompareSpy).toHaveBeenCalledWith(
      testPlainToken,
      testHashedToken,
    );
  });

  it("returns error when token not found", async () => {
    // Given: Token doesn't exist
    vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockResolvedValue(
      [],
    );

    // When
    const result = await service.useVerificationToken(
      testIdentifier,
      testPlainToken,
      { now: () => fixedNow },
    );

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid or expired token");
    }
  });

  it("returns error when token is expired", async () => {
    // Given: Token exists but is expired
    vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockResolvedValue([
      {
        identifier: testIdentifier,
        token: testHashedToken,
        expires: pastExpires, // Expired
      },
    ]);

    vi.mocked(mockRepo.deleteVerificationToken).mockResolvedValue(true);

    vi.spyOn(bcrypt, "compare").mockImplementation(async () => true);

    // When
    const result = await service.useVerificationToken(
      testIdentifier,
      testPlainToken,
      { now: () => fixedNow },
    );

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid or expired token");
    }
  });

  it("returns error when token hash doesn't match", async () => {
    // Given: Token exists but hash doesn't match
    vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockResolvedValue([
      {
        identifier: testIdentifier,
        token: testHashedToken,
        expires: futureExpires,
      },
    ]);

    // Mock bcrypt to return false (token doesn't match)
    vi.spyOn(bcrypt, "compare").mockImplementation(async () => false);

    // When
    const result = await service.useVerificationToken(
      testIdentifier,
      testPlainToken,
      { now: () => fixedNow },
    );

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid or expired token");
    }
  });

  it("returns error when repository throws exception", async () => {
    // Given: Repository throws error
    vi.mocked(mockRepo.findVerificationTokensByIdentifier).mockRejectedValue(
      new Error("Database connection failed"),
    );

    // When
    const result = await service.useVerificationToken(
      testIdentifier,
      testPlainToken,
      { now: () => fixedNow },
    );

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to use verification token");
    }
  });
});
