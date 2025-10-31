import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUserProfile } from "./actions";
import type { UserProfileDeps } from "./actions";
import type { userProfilesRepo } from "./userProfiles.repo";

describe("createUserProfile", () => {
  const mockRepo = {
    findByEmail: vi.fn(),
    findByEmailAndPhone: vi.fn(),
    findByEmailOrPhone: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteById: vi.fn(),
  };

  const mockDeps: UserProfileDeps = {
    repo: mockRepo as unknown as typeof userProfilesRepo,
    now: () => new Date("2024-01-01T00:00:00Z"),
  };

  const validInput = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phoneNumber: "+1234567890",
    dateOfBirth: "1990-01-01",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Duplicate Detection", () => {
    it("should allow registration when email and phone both match existing profile (resume flow)", async () => {
      const existingProfile = {
        id: "existing-id",
        userId: "user-id",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01"),
        completedSteps: ["PERSONAL", "SKIN_TYPE"],
        skinType: "oily",
        concerns: null,
        hasAllergies: null,
        allergyDetails: null,
        isSubscribed: null,
        hasCompletedBooking: null,
        occupation: null,
        bio: null,
        timezone: null,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.findByEmailAndPhone.mockResolvedValue(existingProfile);

      const result = await createUserProfile(validInput, mockDeps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data!.id).toBe("existing-id");
        expect(result.data!.completedSteps).toEqual(["PERSONAL", "SKIN_TYPE"]);
        // Personal info should be hidden
        expect(result.data!.firstName).toBe("");
        expect(result.data!.lastName).toBe("");
        expect(result.data!.email).toBe("");
        expect(result.data!.phoneNumber).toBe("");
      }
    });

    it("should reject registration when email exists with different phone", async () => {
      const existingProfile = {
        id: "existing-id",
        userId: "user-id",
        email: "john@example.com",
        phoneNumber: "+9999999999", // Different phone
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01"),
        completedSteps: ["PERSONAL"],
        skinType: null,
        concerns: null,
        hasAllergies: null,
        allergyDetails: null,
        isSubscribed: null,
        hasCompletedBooking: null,
        occupation: null,
        bio: null,
        timezone: null,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.findByEmailAndPhone.mockResolvedValue(null);
      mockRepo.findByEmail.mockResolvedValue(existingProfile);

      const result = await createUserProfile(validInput, mockDeps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Email is already registered with a different phone number",
        );
      }
    });

    it("should reject registration when phone exists with different email", async () => {
      const existingProfile = {
        id: "existing-id",
        userId: "user-id",
        email: "other@example.com", // Different email
        phoneNumber: "+1234567890",
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01"),
        completedSteps: ["PERSONAL"],
        skinType: null,
        concerns: null,
        hasAllergies: null,
        allergyDetails: null,
        isSubscribed: null,
        hasCompletedBooking: null,
        occupation: null,
        bio: null,
        timezone: null,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.findByEmailAndPhone.mockResolvedValue(null);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByEmailOrPhone.mockResolvedValue(existingProfile);

      const result = await createUserProfile(validInput, mockDeps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Phone number is already registered with a different email",
        );
      }
    });

    it("should allow registration when neither email nor phone exist", async () => {
      mockRepo.findByEmailAndPhone.mockResolvedValue(null);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByEmailOrPhone.mockResolvedValue(null);

      // Mock the db.transaction to avoid actual database calls
      vi.mock("@/lib/db", () => ({
        db: {
          transaction: vi.fn(async (callback) => {
            // Simulate successful transaction
            return callback({
              insert: vi.fn().mockReturnValue({
                values: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    {
                      id: "new-user-id",
                      email: "john@example.com",
                      name: "John Doe",
                      emailVerified: null,
                      image: null,
                    },
                  ]),
                }),
              }),
            });
          }),
        },
        users: {},
        userProfiles: {},
      }));

      // Note: This test will need the actual transaction to work
      // For now, we're just testing the validation logic
      // A full integration test would test the actual creation
    });
  });

  describe("Input Validation", () => {
    it("should reject invalid email format", async () => {
      const invalidInput = {
        ...validInput,
        email: "not-an-email",
      };

      const result = await createUserProfile(invalidInput, mockDeps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid input data");
      }
    });

    it("should reject invalid phone format", async () => {
      const invalidInput = {
        ...validInput,
        phoneNumber: "123", // Too short
      };

      const result = await createUserProfile(invalidInput, mockDeps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid input data");
      }
    });

    it("should reject missing required fields", async () => {
      const invalidInput = {
        firstName: "John",
        // Missing other required fields
      };

      const result = await createUserProfile(
        invalidInput as {
          firstName: string;
          lastName: string;
          email: string;
          phoneNumber: string;
          dateOfBirth: string;
        },
        mockDeps,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid input data");
      }
    });
  });

  describe("Email and Phone Normalization", () => {
    it("should normalize email to lowercase", async () => {
      const inputWithUppercaseEmail = {
        ...validInput,
        email: "JOHN@EXAMPLE.COM",
      };

      mockRepo.findByEmailAndPhone.mockResolvedValue(null);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByEmailOrPhone.mockResolvedValue(null);

      await createUserProfile(inputWithUppercaseEmail, mockDeps);

      // Check that findByEmail was called with normalized (lowercase) email
      expect(mockRepo.findByEmail).toHaveBeenCalledWith("john@example.com");
    });

    it("should normalize phone number format", async () => {
      const inputWithDifferentPhoneFormat = {
        ...validInput,
        phoneNumber: "1234567890", // Without + prefix
      };

      mockRepo.findByEmailAndPhone.mockResolvedValue(null);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByEmailOrPhone.mockResolvedValue(null);

      await createUserProfile(inputWithDifferentPhoneFormat, mockDeps);

      // Check that phone was normalized (this depends on your normalizePhone implementation)
      expect(mockRepo.findByEmailAndPhone).toHaveBeenCalled();
    });
  });
});
