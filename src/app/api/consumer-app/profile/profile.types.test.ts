import { describe, it, expect } from "vitest";
import { patchProfileRequestSchema } from "./profile.types";

describe("patchProfileRequestSchema - field preservation", () => {
  const validUserId = "550e8400-e29b-41d4-a716-446655440000";

  it("preserves hasCompletedSkinTest when provided", () => {
    const input = { userId: validUserId, hasCompletedSkinTest: true };
    const result = patchProfileRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
    expect(result.data?.hasCompletedSkinTest).toBe(true);
  });

  it("preserves nickname when provided", () => {
    const input = { userId: validUserId, nickname: "skinny" };
    const result = patchProfileRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
    expect(result.data?.nickname).toBe("skinny");
  });

  it("preserves both fields when provided together", () => {
    const input = {
      userId: validUserId,
      nickname: "skinny",
      hasCompletedSkinTest: true,
    };
    const result = patchProfileRequestSchema.safeParse(input);

    expect(result.success).toBe(true);
    expect(result.data?.nickname).toBe("skinny");
    expect(result.data?.hasCompletedSkinTest).toBe(true);
  });
});
