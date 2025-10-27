import { describe, it, expect, beforeEach } from "vitest";
import {
  createUserProfile,
  getUserProfileById,
  getUserProfileByEmail,
  checkUserProfileExists,
  updateUserProfile,
  getUserProfiles,
  type UserProfileDeps,
} from "./actions";
import type {
  UserProfileCreate,
  UserProfileUpdate,
} from "./schemas";
import { makeUserProfilesRepoFake } from "./userProfiles.repo.fake";

describe("createUserProfile", () => {
  let repo: ReturnType<typeof makeUserProfilesRepoFake>;
  let deps: UserProfileDeps;

  beforeEach(() => {
    repo = makeUserProfilesRepoFake();
    deps = {
      repo: repo as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };
  });

  it("creates new profile with valid data and returns profile with PERSONAL step", async () => {
    const input: UserProfileCreate = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: "1990-01-15",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.firstName).toBe("John");
      expect(result.data.lastName).toBe("Doe");
      expect(result.data.email).toBe("john@example.com");
      expect(result.data.phoneNumber).toBe("555-1234");
      expect(result.data.completedSteps).toEqual(["PERSONAL"]);
    }
  });

  it("normalizes email to lowercase before creating profile", async () => {
    const input: UserProfileCreate = {
      firstName: "John",
      lastName: "Doe",
      email: "JOHN@EXAMPLE.COM",
      phoneNumber: "555-1234",
      dateOfBirth: "1990-01-15",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("normalizes phone number (trims whitespace) before creating profile", async () => {
    const input: UserProfileCreate = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "  555-1234  ",
      dateOfBirth: "1990-01-15",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.phoneNumber).toBe("555-1234");
    }
  });

  it("converts dateOfBirth string to Date object", async () => {
    const input: UserProfileCreate = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: "1990-01-15",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
      expect(result.data.dateOfBirth.toISOString()).toBe("1990-01-15T00:00:00.000Z");
    }
  });

  it("returns existing profile when exact match found (same email AND phone)", async () => {
    // Pre-populate with existing profile
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL", "SKIN_TYPE"],
      skinType: ["oily"],
    });

    const input: UserProfileCreate = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: "1985-05-20",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.completedSteps).toEqual(["PERSONAL", "SKIN_TYPE"]);
      expect(result.data.skinType).toEqual(["oily"]);
    }
  });

  it("returns only completed step data when resuming (hides incomplete step data)", async () => {
    // Pre-populate with partial completion
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL", "SKIN_TYPE"],
      skinType: ["oily"],
      concerns: ["acne"], // NOT in completedSteps - should be hidden
    });

    const input: UserProfileCreate = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: "1985-05-20",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      // Should return skinType (completed step)
      expect(result.data.skinType).toEqual(["oily"]);
      // Should hide concerns (incomplete step)
      expect(result.data.concerns).toBeNull();
    }
  });

  it("returns empty strings for sensitive fields (firstName, lastName, email, phone) when resuming", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const input: UserProfileCreate = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: "1985-05-20",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      // Sensitive fields should be empty for security
      expect(result.data.firstName).toBe("");
      expect(result.data.lastName).toBe("");
      expect(result.data.email).toBe("");
      expect(result.data.phoneNumber).toBe("");
    }
  });

  it("returns completedSteps array when resuming", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS"],
      skinType: ["oily"],
      concerns: ["acne"],
    });

    const input: UserProfileCreate = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: "1985-05-20",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.completedSteps).toEqual([
        "PERSONAL",
        "SKIN_TYPE",
        "SKIN_CONCERNS",
      ]);
    }
  });

  it("returns error when email exists with different phone number", async () => {
    // Pre-populate with existing email
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-9999",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const input: UserProfileCreate = {
      firstName: "John",
      lastName: "Doe",
      email: "jane@example.com", // Same email
      phoneNumber: "555-1234", // Different phone
      dateOfBirth: "1990-01-15",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Email");
      expect(result.error).toContain("already registered");
    }
  });

  it("returns error when phone exists with different email", async () => {
    // Pre-populate with existing phone
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const input: UserProfileCreate = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com", // Different email
      phoneNumber: "555-5678", // Same phone
      dateOfBirth: "1990-01-15",
    };

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Phone number");
      expect(result.error).toContain("already registered");
    }
  });

  it("returns error for invalid input (Zod validation fails)", async () => {
    const input = {
      firstName: "",
      lastName: "Doe",
      email: "invalid-email",
      phoneNumber: "123",
      dateOfBirth: "not-a-date",
    } as UserProfileCreate;

    const result = await createUserProfile(input, deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid input data");
    }
  });

  it("returns error when database create fails", async () => {
    // Override create to return null (simulating failure)
    const failingRepo = {
      ...repo,
      create: async () => null,
    };

    const failingDeps: UserProfileDeps = {
      repo: failingRepo as unknown as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };

    const input: UserProfileCreate = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: "1990-01-15",
    };

    const result = await createUserProfile(input, failingDeps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Failed to create profile");
    }
  });
});

describe("getUserProfileById", () => {
  let repo: ReturnType<typeof makeUserProfilesRepoFake>;
  let deps: UserProfileDeps;

  beforeEach(() => {
    repo = makeUserProfilesRepoFake();
    deps = {
      repo: repo as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };
  });

  it("returns profile when found by ID", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL", "SKIN_TYPE"],
      skinType: ["oily"],
    });

    const result = await getUserProfileById(created.id, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.id).toBe(created.id);
      expect(result.data.firstName).toBe("Jane");
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("returns error when profile not found", async () => {
    const result = await getUserProfileById("non-existent-id", deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Profile not found");
    }
  });

  it("handles database errors gracefully", async () => {
    const failingRepo = {
      ...repo,
      findById: async () => {
        throw new Error("Database connection failed");
      },
    };

    const failingDeps: UserProfileDeps = {
      repo: failingRepo as unknown as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };

    const result = await getUserProfileById("user-123", failingDeps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to fetch profile");
    }
  });
});

describe("getUserProfileByEmail", () => {
  let repo: ReturnType<typeof makeUserProfilesRepoFake>;
  let deps: UserProfileDeps;

  beforeEach(() => {
    repo = makeUserProfilesRepoFake();
    deps = {
      repo: repo as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };
  });

  it("returns profile when found by email", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfileByEmail("jane@example.com", deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.firstName).toBe("Jane");
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("normalizes email before searching", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    // Search with uppercase email
    const result = await getUserProfileByEmail("JANE@EXAMPLE.COM", deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("returns error when profile not found", async () => {
    const result = await getUserProfileByEmail("nonexistent@example.com", deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Profile not found");
    }
  });

  it("handles database errors gracefully", async () => {
    const failingRepo = {
      ...repo,
      findByEmail: async () => {
        throw new Error("Database connection failed");
      },
    };

    const failingDeps: UserProfileDeps = {
      repo: failingRepo as unknown as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };

    const result = await getUserProfileByEmail("jane@example.com", failingDeps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to fetch profile");
    }
  });
});

describe("checkUserProfileExists", () => {
  let repo: ReturnType<typeof makeUserProfilesRepoFake>;
  let deps: UserProfileDeps;

  beforeEach(() => {
    repo = makeUserProfilesRepoFake();
    deps = {
      repo: repo as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };
  });

  it("returns exists=true and profile when email found", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await checkUserProfileExists({ email: "jane@example.com" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.exists).toBe(true);
      expect(result.data.profile).toBeDefined();
      expect(result.data.profile?.id).toBe(created.id);
    }
  });

  it("returns exists=true and profile when phone found", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await checkUserProfileExists({ phoneNumber: "555-5678" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.exists).toBe(true);
      expect(result.data.profile).toBeDefined();
      expect(result.data.profile?.id).toBe(created.id);
    }
  });

  it("returns exists=true when either email or phone found", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await checkUserProfileExists(
      { email: "jane@example.com", phoneNumber: "555-9999" },
      deps
    );

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.exists).toBe(true);
      expect(result.data.profile).toBeDefined();
    }
  });

  it("returns exists=false when not found", async () => {
    const result = await checkUserProfileExists(
      { email: "nonexistent@example.com" },
      deps
    );

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.exists).toBe(false);
      expect(result.data.profile).toBeNull();
    }
  });

  it("returns error when neither email nor phone provided", async () => {
    const result = await checkUserProfileExists({}, deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Either email or phoneNumber must be provided");
    }
  });

  it("handles database errors gracefully", async () => {
    const failingRepo = {
      ...repo,
      findByEmailOrPhone: async () => {
        throw new Error("Database connection failed");
      },
    };

    const failingDeps: UserProfileDeps = {
      repo: failingRepo as unknown as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };

    const result = await checkUserProfileExists(
      { email: "jane@example.com" },
      failingDeps
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to check profile existence");
    }
  });
});

describe("updateUserProfile", () => {
  let repo: ReturnType<typeof makeUserProfilesRepoFake>;
  let deps: UserProfileDeps;

  beforeEach(() => {
    repo = makeUserProfilesRepoFake();
    deps = {
      repo: repo as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };
  });

  it("successfully updates profile with valid data", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const updateData: UserProfileUpdate = {
      completedSteps: ["PERSONAL", "SKIN_TYPE"],
      skinType: ["oily", "acne-prone"],
    };

    const result = await updateUserProfile(created.id, updateData, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.completedSteps).toEqual(["PERSONAL", "SKIN_TYPE"]);
      expect(result.data.skinType).toEqual(["oily", "acne-prone"]);
    }
  });

  it("updates completedAt field (converts string to Date)", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const updateData: UserProfileUpdate = {
      isCompleted: true,
      completedAt: "2025-01-15T12:00:00Z",
    };

    const result = await updateUserProfile(created.id, updateData, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.isCompleted).toBe(true);
      expect(result.data.completedAt).toBeInstanceOf(Date);
      expect(result.data.completedAt?.toISOString()).toBe("2025-01-15T12:00:00.000Z");
    }
  });

  it("updates updatedAt timestamp", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const updateData: UserProfileUpdate = {
      skinType: ["oily"],
    };

    const result = await updateUserProfile(created.id, updateData, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.updatedAt).toBeInstanceOf(Date);
      expect(result.data.updatedAt).toEqual(deps.now());
    }
  });

  it("updates multiple fields at once", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const updateData: UserProfileUpdate = {
      completedSteps: ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES"],
      skinType: ["oily"],
      concerns: ["acne", "dark-spots"],
      hasAllergies: false,
      allergyDetails: null,
    };

    const result = await updateUserProfile(created.id, updateData, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.completedSteps).toEqual([
        "PERSONAL",
        "SKIN_TYPE",
        "SKIN_CONCERNS",
        "ALLERGIES",
      ]);
      expect(result.data.skinType).toEqual(["oily"]);
      expect(result.data.concerns).toEqual(["acne", "dark-spots"]);
      expect(result.data.hasAllergies).toBe(false);
      expect(result.data.allergyDetails).toBeNull();
    }
  });

  it("partial updates (only some fields)", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      skinType: ["oily"],
    });

    const updateData: UserProfileUpdate = {
      concerns: ["acne"],
    };

    const result = await updateUserProfile(created.id, updateData, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      // Updated field
      expect(result.data.concerns).toEqual(["acne"]);
      // Existing fields should remain
      expect(result.data.skinType).toEqual(["oily"]);
      expect(result.data.completedSteps).toEqual(["PERSONAL"]);
    }
  });

  it("returns error when profile not found", async () => {
    const updateData: UserProfileUpdate = {
      skinType: ["oily"],
    };

    const result = await updateUserProfile("non-existent-id", updateData, deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Profile not found");
    }
  });

  it("returns error for invalid input (Zod validation fails)", async () => {
    const created = await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const updateData = {
      skinType: "invalid", // Should be array
    } as unknown as UserProfileUpdate;

    const result = await updateUserProfile(created.id, updateData, deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid input data");
    }
  });

  it("handles database errors gracefully", async () => {
    const failingRepo = {
      ...repo,
      update: async () => {
        throw new Error("Database connection failed");
      },
    };

    const failingDeps: UserProfileDeps = {
      repo: failingRepo as unknown as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };

    const updateData: UserProfileUpdate = {
      skinType: ["oily"],
    };

    const result = await updateUserProfile("user-123", updateData, failingDeps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to update profile");
    }
  });
});

describe("getUserProfiles", () => {
  let repo: ReturnType<typeof makeUserProfilesRepoFake>;
  let deps: UserProfileDeps;

  beforeEach(() => {
    repo = makeUserProfilesRepoFake();
    deps = {
      repo: repo as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };
  });

  // Basic functionality (2 tests)
  it("returns all profiles with default pagination", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-10T00:00:00Z"),
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-12T00:00:00Z"),
    });

    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(2);
      expect(result.data.totalCount).toBe(2);
      expect(result.data.page).toBe(0);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("returns empty array when no profiles exist", async () => {
    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
    }
  });

  // Search filtering (4 tests)
  it("filters by firstName (case-insensitive)", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({ searchQuery: "jane" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].firstName).toBe("Jane");
    }
  });

  it("filters by lastName (case-insensitive)", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({ searchQuery: "DOE" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].lastName).toBe("Doe");
    }
  });

  it("filters by email (case-insensitive)", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({ searchQuery: "john@" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].email).toBe("john@example.com");
    }
  });

  it("returns empty when search doesn't match", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({ searchQuery: "nonexistent" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(0);
    }
  });

  // Completion status filtering (3 tests)
  it("filters by completionStatus=completed", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: true,
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: false,
    });

    const result = await getUserProfiles({ completionStatus: "completed" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].isCompleted).toBe(true);
    }
  });

  it("filters by completionStatus=incomplete", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: true,
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: false,
    });

    const result = await getUserProfiles({ completionStatus: "incomplete" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].isCompleted).toBe(false);
    }
  });

  it("returns all when completionStatus=all", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: true,
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: false,
    });

    const result = await getUserProfiles({ completionStatus: "all" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(2);
    }
  });

  // Subscription status filtering (3 tests)
  it("filters by subscriptionStatus=subscribed", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isSubscribed: true,
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isSubscribed: false,
    });

    const result = await getUserProfiles({ subscriptionStatus: "subscribed" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].isSubscribed).toBe(true);
    }
  });

  it("filters by subscriptionStatus=not_subscribed (false or null)", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isSubscribed: true,
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isSubscribed: false,
    });
    await repo.create({
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob@example.com",
      phoneNumber: "555-9999",
      dateOfBirth: new Date("1992-03-10T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isSubscribed: null,
    });

    const result = await getUserProfiles({ subscriptionStatus: "not_subscribed" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(2);
    }
  });

  it("returns all when subscriptionStatus=all", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-5678",
      dateOfBirth: new Date("1985-05-20T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isSubscribed: true,
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-1234",
      dateOfBirth: new Date("1990-01-15T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isSubscribed: false,
    });

    const result = await getUserProfiles({ subscriptionStatus: "all" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(2);
    }
  });

  // Date range filtering (4 tests)
  it("filters by dateRange=recent (last 7 days)", async () => {
    await repo.create({
      firstName: "Recent",
      lastName: "User",
      email: "recent@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-14T00:00:00Z"), // 1 day ago
    });
    await repo.create({
      firstName: "Old",
      lastName: "User",
      email: "old@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-01T00:00:00Z"), // 14 days ago
    });

    const result = await getUserProfiles({ dateRange: "recent" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].email).toBe("recent@example.com");
    }
  });

  it("filters by dateRange=this_month", async () => {
    await repo.create({
      firstName: "This Month",
      lastName: "User",
      email: "thismonth@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-10T00:00:00Z"), // This month
    });
    await repo.create({
      firstName: "Last Month",
      lastName: "User",
      email: "lastmonth@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2024-12-15T00:00:00Z"), // Last month
    });

    const result = await getUserProfiles({ dateRange: "this_month" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].email).toBe("thismonth@example.com");
    }
  });

  it("filters by dateRange=last_30_days", async () => {
    await repo.create({
      firstName: "Recent",
      lastName: "User",
      email: "recent@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-10T00:00:00Z"), // 5 days ago
    });
    await repo.create({
      firstName: "Old",
      lastName: "User",
      email: "old@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2024-12-01T00:00:00Z"), // 45 days ago
    });

    const result = await getUserProfiles({ dateRange: "last_30_days" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].email).toBe("recent@example.com");
    }
  });

  it("returns all when dateRange=all", async () => {
    await repo.create({
      firstName: "Recent",
      lastName: "User",
      email: "recent@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-10T00:00:00Z"),
    });
    await repo.create({
      firstName: "Old",
      lastName: "User",
      email: "old@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2024-12-01T00:00:00Z"),
    });

    const result = await getUserProfiles({ dateRange: "all" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(2);
    }
  });

  // Sorting (6 tests)
  it("sorts by name ascending", async () => {
    await repo.create({
      firstName: "Zoe",
      lastName: "Adams",
      email: "zoe@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });
    await repo.create({
      firstName: "Alice",
      lastName: "Brown",
      email: "alice@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, { sortBy: "name", sortOrder: "asc" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles[0].firstName).toBe("Alice");
      expect(result.data.profiles[1].firstName).toBe("Zoe");
    }
  });

  it("sorts by name descending", async () => {
    await repo.create({
      firstName: "Alice",
      lastName: "Brown",
      email: "alice@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });
    await repo.create({
      firstName: "Zoe",
      lastName: "Adams",
      email: "zoe@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, { sortBy: "name", sortOrder: "desc" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles[0].firstName).toBe("Zoe");
      expect(result.data.profiles[1].firstName).toBe("Alice");
    }
  });

  it("sorts by email ascending", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "zoe@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "alice@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, { sortBy: "email", sortOrder: "asc" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles[0].email).toBe("alice@example.com");
      expect(result.data.profiles[1].email).toBe("zoe@example.com");
    }
  });

  it("sorts by email descending", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "alice@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "zoe@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, { sortBy: "email", sortOrder: "desc" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles[0].email).toBe("zoe@example.com");
      expect(result.data.profiles[1].email).toBe("alice@example.com");
    }
  });

  it("sorts by createdAt ascending", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-12T00:00:00Z"),
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-10T00:00:00Z"),
    });

    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, { sortBy: "createdAt", sortOrder: "asc" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles[0].email).toBe("john@example.com");
      expect(result.data.profiles[1].email).toBe("jane@example.com");
    }
  });

  it("sorts by createdAt descending (default)", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-10T00:00:00Z"),
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      createdAt: new Date("2025-01-12T00:00:00Z"),
    });

    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, { sortBy: "createdAt", sortOrder: "desc" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles[0].email).toBe("john@example.com");
      expect(result.data.profiles[1].email).toBe("jane@example.com");
    }
  });

  // Pagination (4 tests)
  it("returns first page with correct limit", async () => {
    for (let i = 1; i <= 5; i++) {
      await repo.create({
        firstName: `User${i}`,
        lastName: "Test",
        email: `user${i}@example.com`,
        phoneNumber: `555-000${i}`,
        dateOfBirth: new Date("1990-01-01T00:00:00Z"),
        completedSteps: ["PERSONAL"],
      });
    }

    const result = await getUserProfiles({}, { page: 0, pageSize: 3 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(3);
      expect(result.data.page).toBe(0);
      expect(result.data.pageSize).toBe(3);
    }
  });

  it("returns second page with correct offset", async () => {
    for (let i = 1; i <= 5; i++) {
      await repo.create({
        firstName: `User${i}`,
        lastName: "Test",
        email: `user${i}@example.com`,
        phoneNumber: `555-000${i}`,
        dateOfBirth: new Date("1990-01-01T00:00:00Z"),
        completedSteps: ["PERSONAL"],
        createdAt: new Date(`2025-01-${10 + i}T00:00:00Z`),
      });
    }

    const result = await getUserProfiles({}, { page: 1, pageSize: 3 }, { sortBy: "createdAt", sortOrder: "asc" }, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(2); // 5 total, page 1 with size 3 = 2 items
      expect(result.data.page).toBe(1);
    }
  });

  it("calculates totalPages correctly", async () => {
    for (let i = 1; i <= 7; i++) {
      await repo.create({
        firstName: `User${i}`,
        lastName: "Test",
        email: `user${i}@example.com`,
        phoneNumber: `555-000${i}`,
        dateOfBirth: new Date("1990-01-01T00:00:00Z"),
        completedSteps: ["PERSONAL"],
      });
    }

    const result = await getUserProfiles({}, { page: 0, pageSize: 3 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.totalCount).toBe(7);
      expect(result.data.totalPages).toBe(3); // Math.ceil(7 / 3) = 3
    }
  });

  it("returns correct totalCount with filters", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: true,
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: false,
    });

    const result = await getUserProfiles({ completionStatus: "completed" }, { page: 0, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.totalCount).toBe(1);
    }
  });

  // Combined filters (2 tests)
  it("combines multiple filters (search + completion status + sort)", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: true,
      createdAt: new Date("2025-01-12T00:00:00Z"),
    });
    await repo.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "555-0002",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: true,
      createdAt: new Date("2025-01-10T00:00:00Z"),
    });
    await repo.create({
      firstName: "Janet",
      lastName: "Williams",
      email: "janet@example.com",
      phoneNumber: "555-0003",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
      isCompleted: false,
    });

    const result = await getUserProfiles(
      { searchQuery: "ja", completionStatus: "completed" },
      { page: 0, pageSize: 20 },
      { sortBy: "createdAt", sortOrder: "asc" },
      deps
    );

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(1);
      expect(result.data.profiles[0].firstName).toBe("Jane");
      expect(result.data.profiles[0].isCompleted).toBe(true);
    }
  });

  it("page beyond totalPages returns empty", async () => {
    await repo.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "555-0001",
      dateOfBirth: new Date("1990-01-01T00:00:00Z"),
      completedSteps: ["PERSONAL"],
    });

    const result = await getUserProfiles({}, { page: 10, pageSize: 20 }, {}, deps);

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.profiles).toHaveLength(0);
      expect(result.data.totalCount).toBe(1);
    }
  });

  // Error handling (1 test)
  it("handles database errors gracefully", async () => {
    const failingRepo = {
      ...repo,
      findMany: async () => {
        throw new Error("Database connection failed");
      },
    };

    const failingDeps: UserProfileDeps = {
      repo: failingRepo as unknown as UserProfileDeps["repo"],
      now: () => new Date("2025-01-15T12:00:00Z"),
    };

    const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, {}, failingDeps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to fetch user profiles");
    }
  });
});
