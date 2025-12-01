import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  toggleSurveyVisibility,
  type ToggleSurveyVisibilityDeps,
} from "./actions";
import type { UserProfile } from "@/lib/db/schema";

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Fake repository for testing
type UserProfileRepo = {
  findById(
    id: string,
  ): Promise<Pick<UserProfile, "id" | "feedbackSurveyVisible"> | null>;
  update(
    id: string,
    data: Partial<Pick<UserProfile, "feedbackSurveyVisible">>,
  ): Promise<Pick<UserProfile, "id" | "feedbackSurveyVisible"> | null>;
};

type UserProfileRepoFake = UserProfileRepo & {
  _store: Map<string, Pick<UserProfile, "id" | "feedbackSurveyVisible">>;
};

function makeUserProfileRepoFake(): UserProfileRepoFake {
  const store = new Map<
    string,
    Pick<UserProfile, "id" | "feedbackSurveyVisible">
  >();

  return {
    async findById(id: string) {
      return store.get(id) || null;
    },
    async update(
      id: string,
      data: Partial<Pick<UserProfile, "feedbackSurveyVisible">>,
    ) {
      const profile = store.get(id);
      if (!profile) return null;

      const updated = { ...profile, ...data };
      store.set(id, updated);
      return updated;
    },
    // Helper for tests
    _store: store,
  };
}

describe("toggleSurveyVisibility - Unit Tests", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  let repo: ReturnType<typeof makeUserProfileRepoFake>;
  let deps: ToggleSurveyVisibilityDeps;

  beforeEach(() => {
    repo = makeUserProfileRepoFake();
    deps = { repo };
  });

  it("toggles survey visibility from false to true", async () => {
    // Given: user with survey hidden
    repo._store.set(userId, {
      id: userId,
      feedbackSurveyVisible: false,
    });

    // When
    const result = await toggleSurveyVisibility(userId, deps);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.feedbackSurveyVisible).toBe(true);
    }
  });

  it("toggles survey visibility from true to false", async () => {
    // Given: user with survey visible
    repo._store.set(userId, {
      id: userId,
      feedbackSurveyVisible: true,
    });

    // When
    const result = await toggleSurveyVisibility(userId, deps);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.feedbackSurveyVisible).toBe(false);
    }
  });

  it("returns error when user profile not found", async () => {
    // Given: no user in store

    // When
    const result = await toggleSurveyVisibility(userId, deps);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User profile not found");
    }
  });

  it("returns error when userId is invalid UUID", async () => {
    // When
    const result = await toggleSurveyVisibility("not-a-uuid", deps);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid user ID");
    }
  });

  it("returns error when userId is empty", async () => {
    // When
    const result = await toggleSurveyVisibility("", deps);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid user ID");
    }
  });
});
