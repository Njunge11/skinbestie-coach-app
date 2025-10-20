"use server";

import type { BookingFilters } from "./types";

const CALENDLY_API_BASE = "https://api.calendly.com";
const CALENDLY_TOKEN = process.env.CALENDLY_TOKEN;

if (!CALENDLY_TOKEN) {
  throw new Error("CALENDLY_TOKEN is not set in environment variables");
}

// Dependencies interface for testing
export interface BookingsDeps {
  calendlyFetch: (endpoint: string, options?: RequestInit) => Promise<unknown>;
  getCurrentUser: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  uuidToNumber: (uuid: string) => number;
  now: () => Date;
}

// Helper to make Calendly API requests
async function calendlyFetch(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${CALENDLY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CALENDLY_TOKEN}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Calendly API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Helper to generate numeric ID from UUID string
function uuidToNumber(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get current user info (needed for fetching events)
async function getCurrentUser() {
  try {
    const data = await calendlyFetch("/users/me");
    return { success: true, data: data.resource };
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user info",
    };
  }
}

// Default dependencies
const defaultDeps: BookingsDeps = {
  calendlyFetch,
  getCurrentUser,
  uuidToNumber,
  now: () => new Date(),
};

export async function fetchBookings(filters?: BookingFilters, deps: BookingsDeps = defaultDeps) {
  try {
    // Get current user to retrieve their URI
    const userResult = await deps.getCurrentUser();
    if (!userResult.success) {
      return { success: false, error: userResult.error };
    }

    const userUri = (userResult.data as Record<string, unknown>).uri as string;

    // Build query parameters
    const params = new URLSearchParams({
      user: userUri,
      count: "100", // Maximum allowed per request
    });

    // Apply date filters
    if (filters?.dateFilter === "upcoming") {
      // Show only future meetings
      const now = deps.now();
      params.append("min_start_time", now.toISOString());
    } else if (filters?.dateFilter === "today") {
      const today = deps.now();
      // Use UTC methods to avoid timezone issues
      const todayStart = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        0, 0, 0, 0
      ));
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

      params.append("min_start_time", todayStart.toISOString());
      params.append("max_start_time", tomorrowStart.toISOString());
    } else if (filters?.dateFilter === "next7days") {
      const today = deps.now();
      const nextWeek = new Date(today);  // FIX: Use mocked time, not real time
      nextWeek.setDate(today.getDate() + 7);

      params.append("min_start_time", today.toISOString());
      params.append("max_start_time", nextWeek.toISOString());
    }

    // Apply status filter
    if (filters?.statusFilter && filters.statusFilter !== "all") {
      params.append("status", filters.statusFilter);
    }

    // Fetch scheduled events
    const data = await deps.calendlyFetch(`/scheduled_events?${params.toString()}`) as Record<string, unknown>;

    // Fetch invitees for each event
    const events = await Promise.all(
      (data.collection as Array<Record<string, unknown>>).map(async (event: Record<string, unknown>) => {
        try {
          const inviteeData = await deps.calendlyFetch(
            `/scheduled_events/${(event.uri as string).split("/").pop()}/invitees`
          ) as Record<string, unknown>;

          const invitee = (inviteeData.collection as Array<Record<string, unknown>>)[0]; // Get first invitee
          const eventUuid = (event.uri as string).split("/").pop() || "";

          // Parse Q&A if exists
          const qa = (invitee?.questions_and_answers as Array<Record<string, unknown>>)?.map((item) => ({
            question: item.question as string,
            answer: item.answer as string,
          })) || [];

          return {
            id: deps.uuidToNumber(eventUuid), // Generate numeric ID from UUID for display
            uuid: eventUuid, // Store actual UUID for API calls
            start: new Date(event.start_time as string),
            end: new Date(event.end_time as string),
            title: event.name as string,
            host: ((event.event_memberships as Array<Record<string, unknown>>)[0]?.user_name as string) || "Unknown",
            location: ((event.location as Record<string, unknown>)?.location as string) || "Online",
            meetingUrl: ((event.location as Record<string, unknown>)?.join_url as string) || "",
            status: event.status === "active" ? "Active" as const : "Canceled" as const,
            invitee: {
              name: (invitee?.name as string) || "Unknown",
              email: (invitee?.email as string) || "unknown@example.com",
              timezone: (invitee?.timezone as string) || "UTC",
            },
            qa,
            rescheduleUrl: (invitee?.reschedule_url as string) || "",
            cancelUrl: (invitee?.cancel_url as string) || "",
          };
        } catch (error) {
          console.error(`Failed to fetch invitees for event ${event.uri}:`, error);
          const eventUuid = (event.uri as string).split("/").pop() || "";
          // Return event without invitee data if fetch fails
          return {
            id: deps.uuidToNumber(eventUuid),
            uuid: eventUuid,
            start: new Date(event.start_time as string),
            end: new Date(event.end_time as string),
            title: event.name as string,
            host: ((event.event_memberships as Array<Record<string, unknown>>)[0]?.user_name as string) || "Unknown",
            location: ((event.location as Record<string, unknown>)?.location as string) || "Online",
            meetingUrl: ((event.location as Record<string, unknown>)?.join_url as string) || "",
            status: event.status === "active" ? "Active" as const : "Canceled" as const,
            invitee: {
              name: "Unknown",
              email: "unknown@example.com",
              timezone: "UTC",
            },
            qa: [],
            rescheduleUrl: "",
            cancelUrl: "",
          };
        }
      })
    );

    return { success: true, data: events };
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch bookings",
    };
  }
}

export async function cancelBooking(eventUuid: string, deps: BookingsDeps = defaultDeps) {
  try {
    await deps.calendlyFetch(`/scheduled_events/${eventUuid}/cancellation`, {
      method: "POST",
      body: JSON.stringify({
        reason: "Canceled by admin",
      }),
    });

    return {
      success: true,
      message: "Meeting canceled successfully",
    };
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel booking",
    };
  }
}

export async function generateBookingLink(eventType: string, deps: BookingsDeps = defaultDeps) {
  try {
    // Get current user
    const userResult = await deps.getCurrentUser();
    if (!userResult.success) {
      return { success: false, error: userResult.error };
    }

    const userUri = (userResult.data as Record<string, unknown>).uri as string;

    // Fetch user's event types to find the matching one
    const eventTypesData = await deps.calendlyFetch(`/event_types?user=${userUri}`) as Record<string, unknown>;

    const matchingEventType = (eventTypesData.collection as Array<Record<string, unknown>>).find(
      (et) => et.name === eventType
    );

    if (!matchingEventType) {
      return {
        success: false,
        error: `Event type "${eventType}" not found`,
      };
    }

    // Create single-use scheduling link
    const response = await deps.calendlyFetch("/scheduling_links", {
      method: "POST",
      body: JSON.stringify({
        max_event_count: 1,
        owner: (matchingEventType as Record<string, unknown>).uri,
        owner_type: "EventType",
      }),
    }) as Record<string, unknown>;

    return {
      success: true,
      data: {
        link: ((response.resource as Record<string, unknown>).booking_url as string),
      },
    };
  } catch (error) {
    console.error("Failed to generate booking link:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate booking link",
    };
  }
}

export async function fetchHosts(deps: BookingsDeps = defaultDeps) {
  try {
    // Get current user
    const userResult = await deps.getCurrentUser();
    if (!userResult.success) {
      return { success: false, error: userResult.error };
    }

    const userUri = (userResult.data as Record<string, unknown>).uri as string;

    // Fetch scheduled events to extract unique hosts
    const data = await deps.calendlyFetch(`/scheduled_events?user=${userUri}&count=100`) as Record<string, unknown>;

    const hosts = new Set<string>();
    (data.collection as Array<Record<string, unknown>>).forEach((event) => {
      const eventMemberships = event.event_memberships as Array<Record<string, unknown>>;
      const hostName = eventMemberships?.[0]?.user_name;
      if (hostName) {
        hosts.add(hostName as string);
      }
    });

    return {
      success: true,
      data: Array.from(hosts).sort(),
    };
  } catch (error) {
    console.error("Failed to fetch hosts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch hosts",
    };
  }
}

export async function fetchEventTypes(deps: BookingsDeps = defaultDeps) {
  try {
    // Get current user
    const userResult = await deps.getCurrentUser();
    if (!userResult.success) {
      return { success: false, error: userResult.error };
    }

    const userUri = (userResult.data as Record<string, unknown>).uri as string;

    // Fetch event types
    const data = await deps.calendlyFetch(`/event_types?user=${userUri}`) as Record<string, unknown>;

    const eventTypes = (data.collection as Array<Record<string, unknown>>)
      .filter((et) => et.active) // Only active event types
      .map((et) => et.name as string);

    return {
      success: true,
      data: eventTypes,
    };
  } catch (error) {
    console.error("Failed to fetch event types:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch event types",
    };
  }
}
