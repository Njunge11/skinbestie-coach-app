import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfileHeader } from "./profile-header";
import type { Client } from "../types";

// Mock server actions
vi.mock("@/app/(dashboard)/actions", () => ({
  fetchEventTypes: vi.fn(),
  generateBookingLink: vi.fn(),
}));

import {
  fetchEventTypes,
  generateBookingLink,
} from "@/app/(dashboard)/actions";

// Helper to render with QueryClient
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ProfileHeader - UI Tests", () => {
  const mockClient: Client = {
    id: "1",
    name: "Sarah Chen",
    nickname: null,
    age: 28,
    email: "sarah@example.com",
    mobile: "+254712345678",
    occupation: "Software Engineer",
    bio: "Passionate about skincare and wellness",
    skinType: "Combination",
    concerns: ["Acne", "Dark Spots", "Texture"],
    planWeeks: 12,
    currentWeek: 1,
    startDate: "2025-10-15",
    hasRoutine: true,
    tags: [],
    createdAt: new Date("2025-01-01"),
  };

  const mockClientWithoutRoutine: Client = {
    ...mockClient,
    hasRoutine: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetchEventTypes to return event types
    vi.mocked(fetchEventTypes).mockResolvedValue({
      success: true,
      data: ["30 Minute Meeting", "Discovery Call"],
    });
  });

  it("user views profile information", () => {
    renderWithQueryClient(<ProfileHeader client={mockClient} />);

    // User sees client name
    expect(
      screen.getByRole("heading", { name: /sarah chen/i }),
    ).toBeInTheDocument();

    // User sees contact info
    expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
    expect(screen.getByText("+254712345678")).toBeInTheDocument();

    // User sees week progress
    expect(screen.getByText(/week 1 of 12/i)).toBeInTheDocument();
  });

  it("user does not see week progress when client has no routine", () => {
    renderWithQueryClient(<ProfileHeader client={mockClientWithoutRoutine} />);

    // User sees client name and contact info
    expect(
      screen.getByRole("heading", { name: /sarah chen/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("sarah@example.com")).toBeInTheDocument();

    // User does not see week progress
    expect(screen.queryByText(/week/i)).not.toBeInTheDocument();
  });

  it("user sees Booking Link and Message buttons", () => {
    renderWithQueryClient(<ProfileHeader client={mockClient} />);

    // User sees Booking Link button (both desktop and mobile versions)
    const bookingButtons = screen.getAllByRole("button", {
      name: /booking link/i,
    });
    expect(bookingButtons.length).toBeGreaterThan(0);

    // User sees Message link (both desktop and mobile versions)
    const messageLinks = screen.getAllByRole("link", { name: /message/i });
    expect(messageLinks.length).toBeGreaterThan(0);
    expect(messageLinks[0]).toHaveAttribute(
      "href",
      "https://wa.me/254712345678",
    );
  });

  it("user opens WhatsApp to message client", async () => {
    renderWithQueryClient(<ProfileHeader client={mockClient} />);

    // User sees Message button
    const messageLinks = screen.getAllByRole("link", { name: /message/i });
    expect(messageLinks[0]).toBeInTheDocument();

    // User sees correct WhatsApp link (with + removed from phone number)
    expect(messageLinks[0]).toHaveAttribute(
      "href",
      "https://wa.me/254712345678",
    );
    expect(messageLinks[0]).toHaveAttribute("target", "_blank");
    expect(messageLinks[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("user generates booking link for client", async () => {
    const user = userEvent.setup();

    // Mock successful booking link generation
    vi.mocked(generateBookingLink).mockResolvedValue({
      success: true,
      data: { link: "https://calendly.com/example/meeting-abc123" },
    });

    renderWithQueryClient(<ProfileHeader client={mockClient} />);

    // User clicks Booking Link button (using first one - desktop)
    const bookingLinkButtons = screen.getAllByRole("button", {
      name: /booking link/i,
    });
    await user.click(bookingLinkButtons[0]);

    // User sees modal
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /invite to book/i }),
      ).toBeInTheDocument();
    });

    // User sees event type dropdown with options
    expect(await screen.findByText("30 Minute Meeting")).toBeInTheDocument();

    // User clicks Generate Link button
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // User sees generated link
    expect(
      await screen.findByText("https://calendly.com/example/meeting-abc123"),
    ).toBeInTheDocument();

    // User sees Copy and Open buttons
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open/i })).toBeInTheDocument();
  });

  it("user copies booking link to clipboard", async () => {
    const user = userEvent.setup();

    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
    });

    // Mock successful booking link generation
    vi.mocked(generateBookingLink).mockResolvedValue({
      success: true,
      data: { link: "https://calendly.com/example/meeting-xyz789" },
    });

    renderWithQueryClient(<ProfileHeader client={mockClient} />);

    // User opens booking link modal
    const bookingLinkButtons = screen.getAllByRole("button", {
      name: /booking link/i,
    });
    await user.click(bookingLinkButtons[0]);

    // User generates link
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /generate link/i }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // User sees generated link
    await waitFor(() => {
      expect(
        screen.getByText("https://calendly.com/example/meeting-xyz789"),
      ).toBeInTheDocument();
    });

    // User clicks Copy button
    await user.click(screen.getByRole("button", { name: /copy/i }));

    // Clipboard API was called with the link
    expect(writeTextMock).toHaveBeenCalledWith(
      "https://calendly.com/example/meeting-xyz789",
    );
  });

  it("user closes booking link modal", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<ProfileHeader client={mockClient} />);

    // User clicks Booking Link button
    const bookingLinkButtons = screen.getAllByRole("button", {
      name: /booking link/i,
    });
    await user.click(bookingLinkButtons[0]);

    // User sees modal
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /invite to book/i }),
      ).toBeInTheDocument();
    });

    // User closes modal (by clicking close button or outside)
    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    // Modal is no longer visible
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /invite to book/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("user sees avatar with first letter of name", () => {
    renderWithQueryClient(<ProfileHeader client={mockClient} />);

    // User sees avatar with first letter 'S'
    const avatar = screen.getByText("S");
    expect(avatar).toBeInTheDocument();
  });
});
