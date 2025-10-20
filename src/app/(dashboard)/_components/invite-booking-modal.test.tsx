import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InviteBookingModal } from "./invite-booking-modal";

// Mock the server actions
vi.mock("../actions", () => ({
  fetchEventTypes: vi.fn(),
  generateBookingLink: vi.fn(),
}));

describe("InviteBookingModal - UI Tests", () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();
  const mockOnCopyLink = vi.fn();

  const mockEventTypes = [
    "Initial Consultation",
    "Follow-up Session",
    "Skin Analysis",
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
    const { fetchEventTypes, generateBookingLink } = await import("../actions");
    vi.mocked(fetchEventTypes).mockResolvedValue({
      success: true,
      data: mockEventTypes,
    });
    vi.mocked(generateBookingLink).mockResolvedValue({
      success: true,
      data: {
        link: "https://calendly.com/booking/abc123",
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    );
  };

  it("user opens modal and sees available event types to choose from", async () => {
    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // User sees modal heading
    expect(screen.getByRole("heading", { name: /invite to book/i })).toBeInTheDocument();

    // Wait for event types to load
    expect(await screen.findByRole("combobox")).toBeInTheDocument();

    // User opens dropdown to see available options
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));

    // User sees all available event types
    expect(screen.getByRole("option", { name: /initial consultation/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /follow-up session/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /skin analysis/i })).toBeInTheDocument();
  });

  it("user selects event type and generates booking link", async () => {
    const user = userEvent.setup();
    const { generateBookingLink } = await import("../actions");

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Wait for event types to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // User opens event type dropdown
    await user.click(screen.getByRole("combobox"));

    // User selects an event type
    await user.click(screen.getByRole("option", { name: /follow-up session/i }));

    // User clicks generate link button
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // API is called with selected event type
    await waitFor(() => {
      expect(generateBookingLink).toHaveBeenCalledWith("Follow-up Session");
    });

    // User sees the generated link
    expect(await screen.findByText(/one-time booking url/i)).toBeInTheDocument();
    expect(screen.getByText("https://calendly.com/booking/abc123")).toBeInTheDocument();
  });

  it("user copies the generated booking link", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Wait for event types to load and generate link
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /initial consultation/i }));
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // Wait for link to be generated
    expect(await screen.findByText(/one-time booking url/i)).toBeInTheDocument();

    // User clicks copy button
    await user.click(screen.getByRole("button", { name: /copy/i }));

    // Copy callback is called
    expect(mockOnCopyLink).toHaveBeenCalledWith(
      "https://calendly.com/booking/abc123",
      "Booking link copied"
    );
  });

  it("user opens the generated booking link in new tab", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Wait for event types to load and generate link
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /initial consultation/i }));
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // Wait for link to be generated
    expect(await screen.findByText(/one-time booking url/i)).toBeInTheDocument();

    // User sees the Open link button
    const openLink = screen.getByRole("link", { name: /open/i });
    expect(openLink).toHaveAttribute("href", "https://calendly.com/booking/abc123");
    expect(openLink).toHaveAttribute("target", "_blank");
    expect(openLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("user cannot generate link without selecting event type", async () => {
    const { fetchEventTypes } = await import("../actions");
    vi.mocked(fetchEventTypes).mockResolvedValueOnce({
      success: true,
      data: [],
    });

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Wait for modal to render
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /invite to book/i })).toBeInTheDocument();
    });

    // Generate button should be disabled (no event types available)
    const generateButton = screen.getByRole("button", { name: /generate link/i });
    expect(generateButton).toBeDisabled();
  });

  it("user sees loading state while generating link", async () => {
    const user = userEvent.setup();
    const { generateBookingLink } = await import("../actions");

    // Mock slow API response
    vi.mocked(generateBookingLink).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: { link: "https://calendly.com/booking/xyz789" },
              }),
            100
          )
        )
    );

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Wait for event types to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // User selects event type and clicks generate
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /initial consultation/i }));
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // User sees loading state
    expect(screen.getByRole("button", { name: /generating.../i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generating.../i })).toBeDisabled();

    // Wait for link generation to complete
    expect(await screen.findByText(/one-time booking url/i)).toBeInTheDocument();
  });

  it("user closes modal and state resets", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Wait for event types to load and generate link
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /initial consultation/i }));
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // Wait for link to be generated
    expect(await screen.findByText(/one-time booking url/i)).toBeInTheDocument();

    // User closes modal
    await user.click(screen.getByRole("button", { name: /close/i }));

    // onClose callback is called
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("user completes full workflow: select event, generate link, copy, and close", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Step 1: User sees modal
    expect(screen.getByRole("heading", { name: /invite to book/i })).toBeInTheDocument();

    // Step 2: User waits for event types to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Step 3: User selects event type
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /skin analysis/i }));

    // Step 4: User generates link
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // Step 5: User sees generated link
    expect(await screen.findByText(/one-time booking url/i)).toBeInTheDocument();
    expect(screen.getByText("https://calendly.com/booking/abc123")).toBeInTheDocument();

    // Step 6: User copies link
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(mockOnCopyLink).toHaveBeenCalledWith(
      "https://calendly.com/booking/abc123",
      "Booking link copied"
    );

    // Step 7: User closes modal
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("handles API error gracefully when fetching event types", async () => {
    const { fetchEventTypes } = await import("../actions");
    vi.mocked(fetchEventTypes).mockResolvedValueOnce({
      success: false,
      error: "Failed to fetch event types",
    });

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Modal should still render but with no event types
    expect(screen.getByRole("heading", { name: /invite to book/i })).toBeInTheDocument();

    // Generate button should be disabled (no event type selected)
    await waitFor(() => {
      const generateButton = screen.getByRole("button", { name: /generate link/i });
      expect(generateButton).toBeDisabled();
    });
  });

  it("handles API error gracefully when generating link", async () => {
    const user = userEvent.setup();
    const { generateBookingLink } = await import("../actions");
    vi.mocked(generateBookingLink).mockResolvedValueOnce({
      success: false,
      error: "Failed to generate link",
    });

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Wait for event types to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // User tries to generate link
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /initial consultation/i }));
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // User should not see the generated link view (mutation fails)
    await waitFor(() => {
      expect(screen.queryByText(/one-time booking url/i)).not.toBeInTheDocument();
    });
  });

  it("user can generate link immediately after modal opens without selecting event type", async () => {
    const user = userEvent.setup();
    const { generateBookingLink } = await import("../actions");

    renderWithProviders(
      <InviteBookingModal
        isOpen={true}
        onClose={mockOnClose}
        onCopyLink={mockOnCopyLink}
      />
    );

    // Wait for modal to be ready
    expect(await screen.findByRole("combobox")).toBeInTheDocument();

    // User can immediately click generate (first event type is pre-selected)
    const generateButton = screen.getByRole("button", { name: /generate link/i });
    await user.click(generateButton);

    // Link is generated successfully
    expect(await screen.findByText(/one-time booking url/i)).toBeInTheDocument();
    expect(generateBookingLink).toHaveBeenCalledWith("Initial Consultation");
  });
});
