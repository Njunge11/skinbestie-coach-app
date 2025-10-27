import { describe, it, expect, vi } from "vitest";
import {
  fetchBookings,
  cancelBooking,
  generateBookingLink,
  fetchHosts,
  fetchEventTypes,
  type BookingsDeps,
} from "./actions";

describe("Bookings Server Actions - Unit Tests", () => {
  describe("fetchBookings", () => {
    it("fetches and transforms bookings successfully", async () => {
      const mockCalendlyFetch = vi.fn()
        .mockResolvedValueOnce({
          collection: [{
            uri: "https://api.calendly.com/scheduled_events/EVENT123",
            start_time: "2025-10-20T10:00:00Z",
            end_time: "2025-10-20T11:00:00Z",
            name: "Initial Consultation",
            status: "active",
            event_memberships: [{ user_name: "Dr. Sarah" }],
            location: { location: "Online", join_url: "https://meet.google.com/abc" },
          }],
        })
        .mockResolvedValueOnce({
          collection: [{
            name: "John Doe",
            email: "john@example.com",
            timezone: "America/New_York",
            reschedule_url: "https://calendly.com/reschedule/123",
            cancel_url: "https://calendly.com/cancel/123",
            questions_and_answers: [
              { question: "What's your concern?", answer: "Acne" },
            ],
          }],
        });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn().mockReturnValue(12345),
        now: () => new Date("2025-10-15T12:00:00Z"),
      };

      const result = await fetchBookings(undefined, deps);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toMatchObject({
          id: 12345,
          uuid: "EVENT123",
          title: "Initial Consultation",
          host: "Dr. Sarah",
          location: "Online",
          status: "Active",
          invitee: {
            name: "John Doe",
            email: "john@example.com",
          },
          qa: [{ question: "What's your concern?", answer: "Acne" }],
        });
      }
    });

    it("applies upcoming filter correctly", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({ collection: [] });
      const mockNow = new Date("2025-10-15T12:00:00Z");

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => mockNow,
      };

      await fetchBookings({ dateFilter: "upcoming", statusFilter: "all" }, deps);

      const callArgs = mockCalendlyFetch.mock.calls[0][0] as string;
      // Decode URL since query params are URL encoded
      const decodedArgs = decodeURIComponent(callArgs);
      expect(decodedArgs).toContain("min_start_time=" + mockNow.toISOString());
    });

    it("applies today filter correctly", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({ collection: [] });
      const mockNow = new Date("2025-10-15T14:30:00Z");

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => mockNow,
      };

      await fetchBookings({ dateFilter: "today", statusFilter: "all" }, deps);

      const callArgs = mockCalendlyFetch.mock.calls[0][0] as string;
      const decodedArgs = decodeURIComponent(callArgs);

      // Should have min_start_time at start of day (00:00:00)
      expect(decodedArgs).toContain("min_start_time=2025-10-15T00:00:00.000Z");
      // Should have max_start_time at start of next day
      expect(decodedArgs).toContain("max_start_time=2025-10-16T00:00:00.000Z");
    });

    it("applies next7days filter correctly", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({ collection: [] });
      const mockNow = new Date("2025-10-15T12:00:00Z");

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => mockNow,
      };

      await fetchBookings({ dateFilter: "next7days", statusFilter: "all" }, deps);

      const callArgs = mockCalendlyFetch.mock.calls[0][0] as string;
      const decodedArgs = decodeURIComponent(callArgs);

      expect(decodedArgs).toContain("min_start_time=" + mockNow.toISOString());
      // 7 days later
      const expected = new Date(mockNow);
      expected.setDate(mockNow.getDate() + 7);
      expect(decodedArgs).toContain("max_start_time=" + expected.toISOString());
    });

    it("applies status filter correctly", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({ collection: [] });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      await fetchBookings({ dateFilter: "all", statusFilter: "active" }, deps);

      const callArgs = mockCalendlyFetch.mock.calls[0][0] as string;
      expect(callArgs).toContain("status=active");
    });

    it("does not apply status filter when set to all", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({ collection: [] });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      await fetchBookings({ dateFilter: "all", statusFilter: "all" }, deps);

      const callArgs = mockCalendlyFetch.mock.calls[0][0] as string;
      expect(callArgs).not.toContain("status=");
    });

    it("handles user fetch failure", async () => {
      const deps: BookingsDeps = {
        calendlyFetch: vi.fn(),
        getCurrentUser: vi.fn().mockResolvedValue({
          success: false,
          error: "Authentication failed",
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchBookings(undefined, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Authentication failed");
      }
    });

    it("handles invitee fetch failure gracefully", async () => {
      const mockCalendlyFetch = vi.fn()
        .mockResolvedValueOnce({
          collection: [{
            uri: "https://api.calendly.com/scheduled_events/EVENT123",
            start_time: "2025-10-20T10:00:00Z",
            end_time: "2025-10-20T11:00:00Z",
            name: "Initial Consultation",
            status: "active",
            event_memberships: [{ user_name: "Dr. Sarah" }],
            location: { location: "Online", join_url: "https://meet.google.com/abc" },
          }],
        })
        .mockRejectedValueOnce(new Error("Invitee fetch failed"));

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn().mockReturnValue(12345),
        now: () => new Date("2025-10-15T12:00:00Z"),
      };

      const result = await fetchBookings(undefined, deps);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data[0].invitee).toMatchObject({
          name: "Unknown",
          email: "unknown@example.com",
        });
      }
    });
  });

  describe("cancelBooking", () => {
    it("cancels booking successfully", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({});

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn(),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await cancelBooking("EVENT123", deps);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Meeting canceled successfully");
      expect(mockCalendlyFetch).toHaveBeenCalledWith(
        "/scheduled_events/EVENT123/cancellation",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reason: "Canceled by admin" }),
        })
      );
    });

    it("handles cancellation failure", async () => {
      const mockCalendlyFetch = vi.fn().mockRejectedValue(new Error("API error"));

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn(),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await cancelBooking("EVENT123", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("API error");
      }
    });
  });

  describe("generateBookingLink", () => {
    it("generates booking link for valid event type", async () => {
      const mockCalendlyFetch = vi.fn()
        .mockResolvedValueOnce({
          collection: [
            { name: "Initial Consultation", uri: "https://api.calendly.com/event_types/ET123" },
            { name: "Follow-up", uri: "https://api.calendly.com/event_types/ET456" },
          ],
        })
        .mockResolvedValueOnce({
          resource: {
            booking_url: "https://calendly.com/booking/abc123",
          },
        });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await generateBookingLink("Initial Consultation", deps);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.link).toBe("https://calendly.com/booking/abc123");
      }

      expect(mockCalendlyFetch).toHaveBeenCalledWith(
        "/scheduling_links",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("ET123"),
        })
      );
    });

    it("returns error for non-existent event type", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({
        collection: [
          { name: "Initial Consultation", uri: "https://api.calendly.com/event_types/ET123" },
        ],
      });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await generateBookingLink("Nonexistent Event", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("handles user fetch failure", async () => {
      const deps: BookingsDeps = {
        calendlyFetch: vi.fn(),
        getCurrentUser: vi.fn().mockResolvedValue({
          success: false,
          error: "Auth error",
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await generateBookingLink("Initial Consultation", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Auth error");
      }
    });

    it("handles error during scheduling link creation", async () => {
      const mockCalendlyFetch = vi.fn()
        .mockResolvedValueOnce({
          collection: [
            { name: "Initial Consultation", uri: "https://api.calendly.com/event_types/ET123" },
          ],
        })
        .mockRejectedValueOnce(new Error("Scheduling link creation failed"));

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await generateBookingLink("Initial Consultation", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Scheduling link creation failed");
      }
    });
  });

  describe("fetchHosts", () => {
    it("extracts unique hosts from events", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({
        collection: [
          { event_memberships: [{ user_name: "Dr. Sarah" }] },
          { event_memberships: [{ user_name: "Dr. John" }] },
          { event_memberships: [{ user_name: "Dr. Sarah" }] }, // Duplicate
        ],
      });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchHosts(deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(["Dr. John", "Dr. Sarah"]); // Sorted, unique
      }
    });

    it("handles empty events list", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({
        collection: [],
      });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchHosts(deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("handles user fetch failure", async () => {
      const deps: BookingsDeps = {
        calendlyFetch: vi.fn(),
        getCurrentUser: vi.fn().mockResolvedValue({
          success: false,
          error: "User auth failed",
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchHosts(deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User auth failed");
      }
    });

    it("handles API fetch failure", async () => {
      const deps: BookingsDeps = {
        calendlyFetch: vi.fn().mockRejectedValue(new Error("API down")),
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchHosts(deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("API down");
      }
    });

    it("skips events without host names", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({
        collection: [
          { event_memberships: [{ user_name: "Dr. Sarah" }] },
          { event_memberships: [] }, // No membership
          { event_memberships: [{}] }, // No user_name
          { event_memberships: [{ user_name: "Dr. John" }] },
        ],
      });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchHosts(deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(["Dr. John", "Dr. Sarah"]);
      }
    });
  });

  describe("fetchEventTypes", () => {
    it("fetches active event types", async () => {
      const mockCalendlyFetch = vi.fn().mockResolvedValue({
        collection: [
          { name: "Initial Consultation", active: true },
          { name: "Follow-up", active: true },
          { name: "Inactive Event", active: false }, // Should be filtered out
        ],
      });

      const deps: BookingsDeps = {
        calendlyFetch: mockCalendlyFetch,
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchEventTypes(deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(["Initial Consultation", "Follow-up"]);
        expect(result.data).not.toContain("Inactive Event");
      }
    });

    it("handles user fetch failure", async () => {
      const deps: BookingsDeps = {
        calendlyFetch: vi.fn(),
        getCurrentUser: vi.fn().mockResolvedValue({
          success: false,
          error: "Auth failed",
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchEventTypes(deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Auth failed");
      }
    });

    it("handles fetch failure", async () => {
      const deps: BookingsDeps = {
        calendlyFetch: vi.fn().mockRejectedValue(new Error("Network error")),
        getCurrentUser: vi.fn().mockResolvedValue({
          success: true,
          data: { uri: "https://api.calendly.com/users/USER123" },
        }),
        uuidToNumber: vi.fn(),
        now: () => new Date(),
      };

      const result = await fetchEventTypes(deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Network error");
      }
    });
  });
});
