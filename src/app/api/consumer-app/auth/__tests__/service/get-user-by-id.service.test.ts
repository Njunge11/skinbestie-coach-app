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

describe("Auth Service - getUserById", () => {
  let service: ReturnType<typeof createAuthService>;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testUserEmail = "test@example.com";
  const testProfileId = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuthService(mockRepo);
  });

  it("successfully returns user when found in repository", async () => {
    // Given: Repository returns user with profile
    vi.mocked(mockRepo.getUserById).mockResolvedValue({
      user: {
        id: testUserId,
        email: testUserEmail,
        emailVerified: new Date("2025-01-01"),
        name: "Test User",
        image: null,
      },
      profile: {
        id: testProfileId,
        userId: testUserId,
        email: testUserEmail,
        firstName: "Test",
        lastName: "User",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        onboardingComplete: true,
      },
    });

    // When
    const result = await service.getUserById(testUserId);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.id).toBe(testUserId);
      expect(result.data.user.email).toBe(testUserEmail);
      expect(result.data.profile).not.toBeNull();
      expect(result.data.profile?.onboardingComplete).toBe(true);
    }
    expect(mockRepo.getUserById).toHaveBeenCalledWith(testUserId);
  });

  it("returns error when user not found", async () => {
    // Given: Repository returns null
    vi.mocked(mockRepo.getUserById).mockResolvedValue(null);

    // When
    const result = await service.getUserById(testUserId);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User not found");
    }
  });

  it("validates user ID format (UUID)", async () => {
    // Given: Invalid UUID format
    const invalidId = "not-a-uuid";

    // When
    const result = await service.getUserById(invalidId);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid user ID format");
    }
    expect(mockRepo.getUserById).not.toHaveBeenCalled();
  });

  it("handles repository exceptions gracefully", async () => {
    // Given: Repository throws exception
    vi.mocked(mockRepo.getUserById).mockRejectedValue(
      new Error("Database connection failed"),
    );

    // When
    const result = await service.getUserById(testUserId);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to retrieve user");
    }
  });
});
