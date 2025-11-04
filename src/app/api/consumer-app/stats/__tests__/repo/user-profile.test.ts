// Repo tests for getUserProfileId
import { describe, it, expect } from "vitest";
import * as schema from "@/lib/db/schema";
import {
  setupRepoTests,
  db,
  repo,
  authUserId,
  authUserId2,
  profileId,
  profileId2,
} from "./test-setup";

describe("StatsRepo - getUserProfileId", () => {
  setupRepoTests();

  it("returns user profile ID and timezone when user exists", async () => {
    await db.insert(schema.userProfiles).values({
      id: profileId,
      userId: authUserId,
      email: "user@test.com",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "America/New_York",
    });

    const result = await repo.getUserProfileId(authUserId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(profileId);
    expect(result!.timezone).toBe("America/New_York");
  });

  it("returns null when user not found", async () => {
    const result = await repo.getUserProfileId("non-existent-id");

    expect(result).toBeNull();
  });

  it("returns correct user when multiple users exist", async () => {
    await db.insert(schema.userProfiles).values([
      {
        id: profileId,
        userId: authUserId,
        email: "user1@test.com",
        firstName: "User",
        lastName: "One",
        phoneNumber: "+1111111111",
        dateOfBirth: new Date("1990-01-01"),
        timezone: "Europe/London",
      },
      {
        id: profileId2,
        userId: authUserId2,
        email: "user2@test.com",
        firstName: "User",
        lastName: "Two",
        phoneNumber: "+2222222222",
        dateOfBirth: new Date("1991-01-01"),
        timezone: "America/Los_Angeles",
      },
    ]);

    const result = await repo.getUserProfileId(authUserId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(profileId);
    expect(result!.timezone).toBe("Europe/London");
  });
});
