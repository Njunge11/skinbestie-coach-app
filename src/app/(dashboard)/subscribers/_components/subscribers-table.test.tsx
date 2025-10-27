import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname, type ReadonlyURLSearchParams } from "next/navigation";
import { SubscribersTable } from "./subscribers-table";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock the server actions
vi.mock("../actions", () => ({
  getUserProfiles: vi.fn(),
}));

describe("SubscribersTable - UI Tests", () => {
  let queryClient: QueryClient;
  let mockPush: ReturnType<typeof vi.fn>;
  let mockSearchParams: URLSearchParams;

  // Mock subscriber data
  const mockProfiles = [
    {
      id: "profile-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      skinType: ["oily"],
      concerns: ["acne"],
      hasAllergies: false,
      allergyDetails: null,
      occupation: null,
      bio: null,
      timezone: "UTC",
      isSubscribed: true,
      hasCompletedBooking: true,
      completedSteps: ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES", "SUBSCRIBE", "BOOKING"],
      isCompleted: true,
      completedAt: new Date("2025-01-15"),
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-15"),
    },
    {
      id: "profile-2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phoneNumber: "+0987654321",
      dateOfBirth: new Date("1985-05-15"),
      skinType: ["dry", "sensitive"],
      concerns: ["wrinkles"],
      hasAllergies: true,
      allergyDetails: "Fragrance allergies",
      occupation: null,
      bio: null,
      timezone: "UTC",
      isSubscribed: false,
      hasCompletedBooking: false,
      completedSteps: ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES"],
      isCompleted: false,
      completedAt: null,
      createdAt: new Date("2025-01-10"),
      updatedAt: new Date("2025-01-12"),
    },
    {
      id: "profile-3",
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob@example.com",
      phoneNumber: "+1122334455",
      dateOfBirth: new Date("1995-08-20"),
      skinType: null,
      concerns: null,
      hasAllergies: null,
      allergyDetails: null,
      occupation: null,
      bio: null,
      timezone: "UTC",
      isSubscribed: null,
      hasCompletedBooking: null,
      completedSteps: ["PERSONAL"],
      isCompleted: false,
      completedAt: null,
      createdAt: new Date("2025-01-14"),
      updatedAt: new Date("2025-01-14"),
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

    // Setup navigation mocks
    mockPush = vi.fn();
    mockSearchParams = new URLSearchParams();

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });

    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReadonlyURLSearchParams);
    vi.mocked(usePathname).mockReturnValue("/subscribers");

    // Setup default mock implementation
    const { getUserProfiles } = await import("../actions");
    vi.mocked(getUserProfiles).mockResolvedValue({
      success: true,
      data: {
        profiles: mockProfiles,
        totalCount: 3,
        page: 0,
        pageSize: 20,
        totalPages: 1,
      },
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

  it("user sees list of subscribers", async () => {
    renderWithProviders(<SubscribersTable />);

    // User sees subscribers table with data
    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();

    // User sees pagination info
    expect(screen.getByText(/showing 1 to 3 of 3 results/i)).toBeInTheDocument();
  });

  it("user searches for subscribers by name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubscribersTable />);

    // Wait for subscribers to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User types in search box
    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    await user.type(searchInput, "Jane");

    // Wait for the 500ms debounce to trigger URL update
    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("search=Jane"),
        expect.objectContaining({ scroll: false })
      );
    }, { timeout: 1000 });
  });

  it("user searches for subscribers by email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubscribersTable />);

    // Wait for subscribers to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User searches by email
    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    await user.type(searchInput, "bob");

    // Wait for the 500ms debounce to trigger URL update
    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("search=bob"),
        expect.objectContaining({ scroll: false })
      );
    }, { timeout: 1000 });
  });

  it("user filters by completion status triggering API call", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SubscribersTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User changes completion status filter
    const completionStatusSection = screen.getByText("Completion Status").closest("div");
    const statusFilterButton = within(completionStatusSection!).getByRole("combobox");
    await user.click(statusFilterButton);

    // Wait for dropdown and select option
    const completedOption = await screen.findByRole("option", { name: /^completed$/i });
    await user.click(completedOption);

    // This should update URL with status param
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("status=completed"),
      expect.objectContaining({ scroll: false })
    );
  });

  it("user filters by subscription status triggering API call", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubscribersTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User changes subscription filter
    const subscriptionSection = screen.getByText("Subscription").closest("div");
    const subscriptionFilterButton = within(subscriptionSection!).getByRole("combobox");
    await user.click(subscriptionFilterButton);

    // Wait for dropdown and select option - exact match
    const subscribedOption = await screen.findByRole("option", { name: /^subscribed$/i });
    await user.click(subscribedOption);

    // URL should update with subscription param
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("subscription=subscribed"),
      expect.objectContaining({ scroll: false })
    );
  });

  it("user filters by date range triggering API call", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubscribersTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User changes date range filter
    const dateRangeSection = screen.getByText("Date Range").closest("div");
    const dateFilterButton = within(dateRangeSection!).getByRole("combobox");
    await user.click(dateFilterButton);

    // Wait for dropdown and select option
    const recentOption = await screen.findByRole("option", { name: /last 7 days/i });
    await user.click(recentOption);

    // URL should update with dateRange param
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("dateRange=recent"),
      expect.objectContaining({ scroll: false })
    );
  });

  it("user sees progress indicators for each subscriber", async () => {
    renderWithProviders(<SubscribersTable />);

    // Wait for subscribers to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User sees progress for completed profile (6/6)
    const johnRow = screen.getByText("John Doe").closest("tr");
    expect(within(johnRow!).getByText("6/6")).toBeInTheDocument();

    // User sees progress for incomplete profile (4/6)
    const janeRow = screen.getByText("Jane Smith").closest("tr");
    expect(within(janeRow!).getByText("4/6")).toBeInTheDocument();

    // User sees progress for minimal profile (1/6)
    const bobRow = screen.getByText("Bob Johnson").closest("tr");
    expect(within(bobRow!).getByText("1/6")).toBeInTheDocument();
  });

  it("user sees status badges for subscribers", async () => {
    renderWithProviders(<SubscribersTable />);

    // Wait for subscribers to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User sees "Complete" status for John
    const johnRow = screen.getByText("John Doe").closest("tr");
    expect(within(johnRow!).getByText("Complete")).toBeInTheDocument();

    // User sees "Incomplete" status for Jane and Bob
    const janeRow = screen.getByText("Jane Smith").closest("tr");
    expect(within(janeRow!).getByText("Incomplete")).toBeInTheDocument();
  });

  it("user clicks on a subscriber row to view details", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubscribersTable />);

    // Wait for subscribers to load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User clicks on John's row
    const johnRow = screen.getByText("John Doe").closest("tr");
    await user.click(johnRow!);

    // User is navigated to detail page
    expect(mockPush).toHaveBeenCalledWith("/subscribers/profile-1");
  });

  it("user navigates to next page", async () => {
    const { getUserProfiles } = await import("../actions");

    // Mock more than 20 profiles to enable pagination
    const manyProfiles = Array.from({ length: 25 }, (_, i) => ({
      ...mockProfiles[0],
      id: `profile-${i}`,
      firstName: `User${i}`,
      email: `user${i}@example.com`,
    }));

    vi.mocked(getUserProfiles).mockResolvedValue({
      success: true,
      data: {
        profiles: manyProfiles.slice(0, 20),
        totalCount: 25,
        page: 0,
        pageSize: 20,
        totalPages: 2,
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<SubscribersTable />);

    // Wait for initial load
    expect(await screen.findByText(/showing 1 to 20 of 25 results/i)).toBeInTheDocument();

    // User clicks Next button
    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    // URL should update with page=1
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
      expect.objectContaining({ scroll: false })
    );
  });

  it("user applies multiple filters and sees URL with all params", async () => {
    const user = userEvent.setup();

    // Start with search already in URL
    mockSearchParams = new URLSearchParams("search=test");
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReadonlyURLSearchParams);

    renderWithProviders(<SubscribersTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User applies completion status filter
    const completionStatusSection = screen.getByText("Completion Status").closest("div");
    const statusFilterButton = within(completionStatusSection!).getByRole("combobox");
    await user.click(statusFilterButton);
    const completedOption = await screen.findByRole("option", { name: /^completed$/i });
    await user.click(completedOption);

    // URL should have both params (page=0 is omitted since it's the default)
    const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1];
    expect(lastCall[0]).toContain("search=test");
    expect(lastCall[0]).toContain("status=completed");
    // page=0 is removed from URL since it's the default value
  });

  it("user sees empty state when no subscribers match filters", async () => {
    const { getUserProfiles } = await import("../actions");

    vi.mocked(getUserProfiles).mockResolvedValue({
      success: true,
      data: {
        profiles: [],
        totalCount: 0,
        page: 0,
        pageSize: 20,
        totalPages: 0,
      },
    });

    renderWithProviders(<SubscribersTable />);

    // User sees empty state
    expect(await screen.findByText(/no subscribers found/i)).toBeInTheDocument();
  });

  it("handles API errors gracefully when fetching subscribers", async () => {
    const { getUserProfiles } = await import("../actions");

    vi.mocked(getUserProfiles).mockResolvedValue({
      success: false,
      error: "Failed to fetch profiles",
    });

    renderWithProviders(<SubscribersTable />);

    // User should see empty state with no subscribers
    expect(await screen.findByText(/no subscribers found/i)).toBeInTheDocument();
  });

  it("reads filters from URL query params on load", async () => {
    const { getUserProfiles } = await import("../actions");

    // Mock URL with query params
    mockSearchParams = new URLSearchParams("search=John&status=completed&page=1");
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReadonlyURLSearchParams);

    renderWithProviders(<SubscribersTable />);

    // Wait for component to render and make API call
    await screen.findByPlaceholderText(/search by name or email/i);

    // API should be called with params from URL
    expect(getUserProfiles).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQuery: "John",
        completionStatus: "completed",
      }),
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      }),
      expect.any(Object)
    );
  });

  it("cleans up URL by removing default values", async () => {
    const user = userEvent.setup();

    // Start with some filters in URL
    mockSearchParams = new URLSearchParams("search=test&status=completed");
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReadonlyURLSearchParams);

    renderWithProviders(<SubscribersTable />);

    // Wait for initial load
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // User resets status filter to "All"
    const completionStatusSection = screen.getByText("Completion Status").closest("div");
    const statusFilterButton = within(completionStatusSection!).getByRole("combobox");
    await user.click(statusFilterButton);
    const allOption = await screen.findByRole("option", { name: /^all$/i });
    await user.click(allOption);

    // URL should remove status param (since "all" is default)
    const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1];
    expect(lastCall[0]).toContain("search=test");
    expect(lastCall[0]).not.toContain("status=");
  });
});
