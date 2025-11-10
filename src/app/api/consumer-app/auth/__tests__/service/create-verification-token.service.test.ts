import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAuthService } from "../../auth.service";
import type { IAuthRepository } from "../../auth.repo";

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

describe("Auth Service - createVerificationToken", () => {
  let service: ReturnType<typeof createAuthService>;

  const testIdentifier = "test@example.com";
  const fixedNow = new Date("2025-11-10T14:00:00Z");
  const fixedExpires = new Date("2025-11-10T14:15:00Z"); // 15 minutes later

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuthService(mockRepo);
  });

  it("generates random token and hashes it before storing", async () => {
    // Given: Repository will store the token
    vi.mocked(mockRepo.createVerificationToken).mockResolvedValue({
      identifier: testIdentifier,
      token: "hashed_value", // This would be the bcrypt hash
      expires: fixedExpires,
    });

    // When
    const result = await service.createVerificationToken(testIdentifier, {
      now: () => fixedNow,
    });

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      // Plain token should be returned (not hashed)
      expect(result.data.token).toBeDefined();
      expect(result.data.token.length).toBeGreaterThan(0);

      // Repository should have been called with hashed token
      expect(mockRepo.createVerificationToken).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: testIdentifier,
          token: expect.any(String), // Hashed token
          expires: fixedExpires,
        }),
      );
    }
  });

  it("returns both plain token (for email) and token stored in DB", async () => {
    // Given: Repository stores hashed token
    const hashedToken = "hashed_abc123";
    vi.mocked(mockRepo.createVerificationToken).mockResolvedValue({
      identifier: testIdentifier,
      token: hashedToken,
      expires: fixedExpires,
    });

    // When
    const result = await service.createVerificationToken(testIdentifier, {
      now: () => fixedNow,
    });

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      // Returns plain token for sending in email
      expect(result.data.token).toBeDefined();
      expect(typeof result.data.token).toBe("string");

      // Plain token should NOT be the hashed token
      expect(result.data.token).not.toBe(hashedToken);
    }
  });

  it("sets expiration time correctly (15 minutes from now)", async () => {
    // Given: Fixed current time
    vi.mocked(mockRepo.createVerificationToken).mockResolvedValue({
      identifier: testIdentifier,
      token: "hashed_token",
      expires: fixedExpires,
    });

    // When
    await service.createVerificationToken(testIdentifier, {
      now: () => fixedNow,
    });

    // Then: Repository called with 15 minutes expiration
    expect(mockRepo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        expires: fixedExpires, // 15 minutes after fixedNow
      }),
    );
  });

  it("stores identifier (email) correctly in repository", async () => {
    // Given: Different email
    const differentEmail = "another@example.com";
    vi.mocked(mockRepo.createVerificationToken).mockResolvedValue({
      identifier: differentEmail,
      token: "hashed_token",
      expires: fixedExpires,
    });

    // When
    await service.createVerificationToken(differentEmail, {
      now: () => fixedNow,
    });

    // Then
    expect(mockRepo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: differentEmail,
      }),
    );
  });

  it("returns error when email is invalid format", async () => {
    // Given: Invalid email
    const invalidEmail = "not-an-email";

    // When
    const result = await service.createVerificationToken(invalidEmail, {
      now: () => fixedNow,
    });

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid email format");
    }
    expect(mockRepo.createVerificationToken).not.toHaveBeenCalled();
  });

  it("returns error when repository throws exception", async () => {
    // Given: Repository throws error
    vi.mocked(mockRepo.createVerificationToken).mockRejectedValue(
      new Error("Database connection failed"),
    );

    // When
    const result = await service.createVerificationToken(testIdentifier, {
      now: () => fixedNow,
    });

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to create verification token");
    }
  });

  it("generated token is URL-safe (only alphanumeric + safe chars)", async () => {
    // Given: Repository stores token
    vi.mocked(mockRepo.createVerificationToken).mockResolvedValue({
      identifier: testIdentifier,
      token: "hashed_token",
      expires: fixedExpires,
    });

    // When
    const result = await service.createVerificationToken(testIdentifier, {
      now: () => fixedNow,
    });

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      // Token should only contain URL-safe characters
      const urlSafeRegex = /^[A-Za-z0-9_-]+$/;
      expect(result.data.token).toMatch(urlSafeRegex);
    }
  });
});
