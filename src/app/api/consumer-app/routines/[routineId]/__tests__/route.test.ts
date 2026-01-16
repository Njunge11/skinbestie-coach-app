import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../route";

// Mock dependencies
vi.mock("../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock(
  "@/app/(dashboard)/subscribers/[id]/routine-info-actions/actions",
  () => ({
    updateRoutine: vi.fn(),
  }),
);

vi.mock("../../utils", () => ({
  verifyRoutineOwnership: vi.fn(),
}));

import { validateApiKey } from "../../../shared/auth";
import { updateRoutine } from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/actions";
import { verifyRoutineOwnership } from "../../utils";

describe("PATCH /api/consumer-app/routines/[routineId]", () => {
  const routineId = "550e8400-e29b-41d4-a716-446655440000";
  const userId = "350e8400-e29b-41d4-a716-446655440099";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create request
  const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest(
      `http://localhost:3000/api/consumer-app/routines/${routineId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  };

  describe("Authentication", () => {
    it("returns 401 when API key is invalid", async () => {
      // Given
      vi.mocked(validateApiKey).mockResolvedValue(false);
      const request = createRequest({ userId });

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });
      const data = await response.json();

      // Then
      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 400 when userId is missing", async () => {
      // Given
      const request = createRequest({ startDate: "2025-11-17" });

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });
      const data = await response.json();

      // Then
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when userId is invalid UUID", async () => {
      // Given
      const request = createRequest({
        userId: "not-a-uuid",
        startDate: "2025-11-17",
      });

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });
      const data = await response.json();

      // Then
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when startDate format is invalid", async () => {
      // Given
      const request = createRequest({
        userId,
        startDate: "11/17/2025", // Wrong format
      });

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });
      const data = await response.json();

      // Then
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when request body is malformed", async () => {
      // Given
      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/routines/${routineId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "invalid json{",
        },
      );

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });
      const data = await response.json();

      // Then
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("Authorization", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 403 when routine belongs to different user", async () => {
      // Given
      vi.mocked(verifyRoutineOwnership).mockResolvedValue(false);
      const request = createRequest({
        userId,
        startDate: "2025-11-17",
      });

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });
      const data = await response.json();

      // Then
      expect(response.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("returns 200 when routine belongs to user", async () => {
      // Given
      vi.mocked(verifyRoutineOwnership).mockResolvedValue(true);
      vi.mocked(updateRoutine).mockResolvedValue({
        success: true,
        data: {
          id: routineId,
          userProfileId: "profile-id",
          name: "My Routine",
          startDate: new Date("2025-11-17"),
          endDate: null,
          status: "published" as const,
          savedAsTemplate: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const request = createRequest({
        userId,
        startDate: "2025-11-17",
      });

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });

      // Then
      expect(response.status).toBe(200);
    });
  });

  describe("Response Contract", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
      vi.mocked(verifyRoutineOwnership).mockResolvedValue(true);
    });

    it("returns 200 with routine data when update succeeds", async () => {
      // Given
      const mockRoutine = {
        id: routineId,
        userProfileId: "profile-id",
        name: "Updated Routine",
        startDate: new Date("2025-11-17"),
        endDate: new Date("2025-12-31"),
        status: "published" as const,
        savedAsTemplate: false,
        createdAt: new Date("2025-11-01"),
        updatedAt: new Date("2025-11-12"),
      };

      vi.mocked(updateRoutine).mockResolvedValue({
        success: true,
        data: mockRoutine,
      });

      const request = createRequest({
        userId,
        startDate: "2025-11-17",
        name: "Updated Routine",
      });

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });
      const data = await response.json();

      // Then
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(routineId);
      expect(data.data.name).toBe("Updated Routine");
    });

    it("returns 400 with error when updateRoutine fails", async () => {
      // Given
      vi.mocked(updateRoutine).mockResolvedValue({
        success: false,
        error: "Routine not found",
      });

      const request = createRequest({
        userId,
        startDate: "2025-11-17",
      });

      // When
      const response = await PATCH(request, {
        params: Promise.resolve({ routineId }),
      });
      const data = await response.json();

      // Then
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("UPDATE_FAILED");
      expect(data.error.message).toBe("Routine not found");
    });
  });
});
