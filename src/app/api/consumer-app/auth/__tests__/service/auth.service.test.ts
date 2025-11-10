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

describe("Auth Service - getUserByEmail", () => {
  let service: ReturnType<typeof createAuthService>;

  const testUserEmail = "test@example.com";
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testProfileId = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuthService(mockRepo);
  });

  it("returns user data with onboarding status when user exists with complete profile", async () => {
    // Given: Repository returns user with complete onboarding
    vi.mocked(mockRepo.getUserByEmail).mockResolvedValue({
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
    const result = await service.getUserByEmail(testUserEmail);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.id).toBe(testUserId);
      expect(result.data.user.email).toBe(testUserEmail);
      expect(result.data.profile).not.toBeNull();
      expect(result.data.profile?.onboardingComplete).toBe(true);
    }
    expect(mockRepo.getUserByEmail).toHaveBeenCalledWith(testUserEmail);
  });

  it("returns user data with onboarding status false when profile incomplete", async () => {
    // Given: Repository returns user with incomplete onboarding
    vi.mocked(mockRepo.getUserByEmail).mockResolvedValue({
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
        onboardingComplete: false,
      },
    });

    // When
    const result = await service.getUserByEmail(testUserEmail);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile?.onboardingComplete).toBe(false);
    }
  });

  it("returns error when user does not exist", async () => {
    // Given: Repository returns null (user not found)
    vi.mocked(mockRepo.getUserByEmail).mockResolvedValue(null);

    // When
    const result = await service.getUserByEmail("nonexistent@example.com");

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User not found");
    }
  });

  it("returns error when repository throws exception", async () => {
    // Given: Repository throws error
    vi.mocked(mockRepo.getUserByEmail).mockRejectedValue(
      new Error("Database connection failed"),
    );

    // When
    const result = await service.getUserByEmail(testUserEmail);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to retrieve user");
    }
  });
});
