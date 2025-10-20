import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookingsTable } from "./bookings-table";

// Mock the server actions
vi.mock("../actions", () => ({
  fetchBookings: vi.fn(),
  fetchHosts: vi.fn(),
  cancelBooking: vi.fn(),
  generateBookingLink: vi.fn(),
  fetchEventTypes: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BookingsTable - UI Tests", () => {
  let queryClient: QueryClient;

  // Mock booking data
  const mockBookings = [
    {
      id: 1,
      uuid: "event-uuid-1",
      start: new Date("2025-10-20T10:00:00Z"),
      end: new Date("2025-10-20T11:00:00Z"),
      title: "Initial Skin Consultation",
      host: "Dr. Sarah Smith",
      location: "Online",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      status: "Active" as const,
      invitee: {
        name: "John Doe",
        email: "john@example.com",
        timezone: "America/New_York",
      },
      qa: [
        { question: "What is your main concern?", answer: "Acne treatment" },
      ],
      rescheduleUrl: "https://calendly.com/reschedule/123",
      cancelUrl: "https://calendly.com/cancel/123",
    },
    {
      id: 2,
      uuid: "event-uuid-2",
      start: new Date("2025-10-21T14:00:00Z"),
      end: new Date("2025-10-21T15:00:00Z"),
      title: "Follow-up Consultation",
      host: "Dr. Sarah Smith",
      location: "Online",
      meetingUrl: "https://meet.google.com/xyz-abcd-efg",
      status: "Active" as const,
      invitee: {
        name: "Jane Smith",
        email: "jane@example.com",
        timezone: "America/Los_Angeles",
      },
      qa: [],
      rescheduleUrl: "https://calendly.com/reschedule/456",
      cancelUrl: "https://calendly.com/cancel/456",
    },
    {
      id: 3,
      uuid: "event-uuid-3",
      start: new Date("2025-09-15T09:00:00Z"),
      end: new Date("2025-09-15T10:00:00Z"),
      title: "Past Consultation",
      host: "Dr. Sarah Smith",
      location: "Online",
      meetingUrl: "",
      status: "Canceled" as const,
      invitee: {
        name: "Bob Johnson",
        email: "bob@example.com",
        timezone: "UTC",
      },
      qa: [],
      rescheduleUrl: "",
      cancelUrl: "",
    },
  ];

  beforeEach(async () => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Setup default mock implementations
    // By default, return only upcoming bookings (first 2) not the past/canceled one
    const { fetchBookings, fetchHosts } = await import("../actions");
    vi.mocked(fetchBookings).mockResolvedValue({
      success: true,
      data: [mockBookings[0], mockBookings[1]], // Only upcoming bookings
    });
    vi.mocked(fetchHosts).mockResolvedValue({
      success: true,
      data: ["Dr. Sarah Smith"],
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it("user sees list of upcoming bookings by default", async () => {
    renderWithProviders(<BookingsTable />);

    // User sees the page heading
    expect(screen.getByRole("heading", { name: /your meetings/i })).toBeInTheDocument();

    // User sees the bookings table with data
    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();

    // User should NOT see past/canceled bookings by default (upcoming filter)
    expect(screen.queryByText("Bob Johnson")).not.toBeInTheDocument();
  });

  it("user searches for bookings by client name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingsTable />);

    // Wait for bookings to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();

    // User types in search box
    const searchInput = screen.getByPlaceholderText(/search by client name or email/i);
    await user.type(searchInput, "Jane");

    // User sees only matching results (client-side filter, instant)
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("user searches for bookings by email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingsTable />);

    // Wait for bookings to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User searches by email
    const searchInput = screen.getByPlaceholderText(/search by client name or email/i);
    await user.type(searchInput, "john@example.com");

    // User sees only matching results
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
  });

  it("user filters bookings by date range triggering API call", async () => {
    const user = userEvent.setup();
    const { fetchBookings } = await import("../actions");

    renderWithProviders(<BookingsTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // Clear mock call count
    vi.mocked(fetchBookings).mockClear();

    // User changes date filter to "Today"
    // Find the select by finding the button that's inside the Date Range label section
    const dateRangeSection = screen.getByText("Date Range").closest("div");
    const dateFilterButton = within(dateRangeSection!).getByRole("combobox");
    await user.click(dateFilterButton);

    // Wait for dropdown and select option
    const todayOption = await screen.findByText("Today");
    await user.click(todayOption);

    // This SHOULD trigger an API call (server-side filter)
    await vi.waitFor(() => {
      expect(fetchBookings).toHaveBeenCalledWith({
        dateFilter: "today",
        statusFilter: "all",
      });
    });
  });

  it("user filters bookings by status triggering API call", async () => {
    const user = userEvent.setup();
    const { fetchBookings } = await import("../actions");

    renderWithProviders(<BookingsTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // Clear mock call count
    vi.mocked(fetchBookings).mockClear();

    // User changes status filter - find all Status labels and pick the filter one (inside the filters section)
    const statusLabels = screen.getAllByText("Status");
    const statusFilterLabel = statusLabels.find(
      (label) => label.tagName === "LABEL"
    );
    const statusSection = statusFilterLabel!.closest("div");
    const statusFilterButton = within(statusSection!).getByRole("combobox");
    await user.click(statusFilterButton);

    // Wait for dropdown and select option - use getByRole to get the option from dropdown
    const activeOption = await screen.findByRole("option", { name: /active/i });
    await user.click(activeOption);

    // This SHOULD trigger an API call (server-side filter)
    await vi.waitFor(() => {
      expect(fetchBookings).toHaveBeenCalledWith({
        dateFilter: "upcoming",
        statusFilter: "active",
      });
    });
  });

  it("user filters bookings by host without triggering API call", async () => {
    const user = userEvent.setup();
    const { fetchBookings } = await import("../actions");

    renderWithProviders(<BookingsTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // Clear mock call count
    vi.mocked(fetchBookings).mockClear();

    // User changes host filter - find all Host labels and pick the filter one
    const hostLabels = screen.getAllByText("Host");
    const hostFilterLabel = hostLabels.find((label) => label.tagName === "LABEL");
    const hostSection = hostFilterLabel!.closest("div");
    const hostFilterButton = within(hostSection!).getByRole("combobox");
    await user.click(hostFilterButton);

    // Wait for dropdown and select option - use getByRole to get option from dropdown
    const hostOption = await screen.findByRole("option", { name: /dr. sarah smith/i });
    await user.click(hostOption);

    // This should NOT trigger an API call (client-side filter)
    expect(fetchBookings).not.toHaveBeenCalled();

    // User should still see filtered results
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("user refreshes bookings and sees loading state", async () => {
    const user = userEvent.setup();
    const { fetchBookings } = await import("../actions");

    renderWithProviders(<BookingsTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User clicks refresh button
    const refreshButton = screen.getByRole("button", { name: /refresh/i });

    // Refresh button should not be disabled initially
    expect(refreshButton).not.toBeDisabled();

    // Mock a slow API call
    vi.mocked(fetchBookings).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ success: true, data: mockBookings }),
            100
          )
        )
    );

    await user.click(refreshButton);

    // User sees loading state (button disabled with spinning icon)
    expect(refreshButton).toBeDisabled();

    // Wait for refresh to complete
    await vi.waitFor(() => {
      expect(refreshButton).not.toBeDisabled();
    });
  });

  it("user views booking details in drawer", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingsTable />);

    // Wait for bookings to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User clicks on actions menu
    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    await user.click(actionButtons[0]);

    // User clicks View
    await user.click(screen.getByRole("menuitem", { name: /^view$/i }));

    // User sees booking details drawer
    expect(await screen.findByRole("heading", { name: /event details/i })).toBeInTheDocument();

    // Verify reschedule URL is visible in drawer (unique to drawer, not in table)
    expect(screen.getByText("Reschedule URL")).toBeInTheDocument();

    // Verify Join Now link is visible for active meeting
    expect(screen.getByRole("link", { name: /join now/i })).toBeInTheDocument();
  });

  it("user joins an active meeting", async () => {
    const user = userEvent.setup();
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderWithProviders(<BookingsTable />);

    // Wait for bookings to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User clicks on actions menu for active booking with meeting URL
    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    await user.click(actionButtons[0]);

    // User clicks Join Meeting
    const joinButton = screen.getByRole("menuitem", { name: /join meeting/i });
    await user.click(joinButton);

    // User's browser opens the meeting URL in new tab
    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://meet.google.com/abc-defg-hij",
      "_blank"
    );

    windowOpenSpy.mockRestore();
  });

  it("user cancels a booking and sees confirmation modal", async () => {
    const user = userEvent.setup();
    const { cancelBooking } = await import("../actions");
    vi.mocked(cancelBooking).mockResolvedValue({
      success: true,
      message: "Meeting canceled successfully",
    });

    renderWithProviders(<BookingsTable />);

    // Wait for bookings to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User clicks on actions menu
    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    await user.click(actionButtons[0]);

    // User clicks Cancel
    await user.click(screen.getByRole("menuitem", { name: /cancel/i }));

    // User sees confirmation modal
    expect(await screen.findByRole("heading", { name: /cancel meeting/i })).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to cancel this meeting/i)
    ).toBeInTheDocument();

    // User confirms cancellation
    await user.click(screen.getByRole("button", { name: /yes, cancel/i }));

    // User sees success message
    const { toast } = await import("sonner");
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Meeting canceled successfully");
    });
  });

  it("user cancels a booking but decides to keep it", async () => {
    const user = userEvent.setup();
    const { cancelBooking } = await import("../actions");

    renderWithProviders(<BookingsTable />);

    // Wait for bookings to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User opens cancel modal
    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    await user.click(actionButtons[0]);
    await user.click(screen.getByRole("menuitem", { name: /cancel/i }));

    // User sees confirmation modal
    expect(await screen.findByRole("heading", { name: /cancel meeting/i })).toBeInTheDocument();

    // User clicks "Keep Meeting"
    await user.click(screen.getByRole("button", { name: /keep meeting/i }));

    // Modal closes and no API call was made
    expect(screen.queryByRole("heading", { name: /cancel meeting/i })).not.toBeInTheDocument();
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("user opens invite booking modal to generate a link", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingsTable />);

    // Wait for page to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User clicks "Invite to book" button
    await user.click(screen.getByRole("button", { name: /invite to book/i }));

    // User sees invite modal - exact heading is "Invite to Book"
    expect(await screen.findByRole("heading", { name: /invite to book/i })).toBeInTheDocument();
  });

  it("user applies multiple filters and sees combined results", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingsTable />);

    // Wait for bookings to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();

    // User applies host filter (client-side)
    const hostLabels = screen.getAllByText("Host");
    const hostFilterLabel = hostLabels.find((label) => label.tagName === "LABEL");
    const hostSection = hostFilterLabel!.closest("div");
    const hostFilterButton = within(hostSection!).getByRole("combobox");
    await user.click(hostFilterButton);

    // Wait for dropdown and select option - use getByRole to get option from dropdown
    const hostOption = await screen.findByRole("option", { name: /dr. sarah smith/i });
    await user.click(hostOption);

    // Both results still visible (same host)
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();

    // User adds search filter (client-side)
    const searchInput = screen.getByPlaceholderText(/search by client name or email/i);
    await user.type(searchInput, "Jane");

    // Only Jane visible now
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("user sees empty state when no bookings match filters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingsTable />);

    // Wait for bookings to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User searches for non-existent client
    const searchInput = screen.getByPlaceholderText(/search by client name or email/i);
    await user.type(searchInput, "NonExistentPerson");

    // User sees empty state
    expect(screen.getByText(/no bookings found/i)).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("user cannot join or cancel past meetings", async () => {
    const { fetchBookings } = await import("../actions");
    vi.mocked(fetchBookings).mockResolvedValueOnce({
      success: true,
      data: [mockBookings[2]], // Past canceled booking
    });

    const user = userEvent.setup();
    renderWithProviders(<BookingsTable />);

    // Wait for canceled booking to load
    expect(await screen.findByText("Bob Johnson")).toBeInTheDocument();

    // User opens actions menu
    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    await user.click(actionButtons[0]);

    // User should NOT see Join Meeting or Cancel options (only View)
    expect(screen.getByRole("menuitem", { name: /^view$/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /join meeting/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("handles API errors gracefully when fetching bookings", async () => {
    const { fetchBookings } = await import("../actions");
    vi.mocked(fetchBookings).mockResolvedValueOnce({
      success: false,
      error: "Failed to fetch bookings",
    });

    renderWithProviders(<BookingsTable />);

    // User should see empty state with no bookings
    expect(await screen.findByText(/no bookings found/i)).toBeInTheDocument();
  });
});
