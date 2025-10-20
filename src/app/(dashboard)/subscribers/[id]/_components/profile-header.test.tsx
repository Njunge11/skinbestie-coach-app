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

import { fetchEventTypes, generateBookingLink } from "@/app/(dashboard)/actions";

// Helper to render with QueryClient
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("ProfileHeader - UI Tests", () => {
  const mockClient: Client = {
    id: "1",
    name: "Sarah Chen",
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
    hasRoutine: false,
  };

  const mockClientEmpty: Client = {
    ...mockClient,
    occupation: "",
    bio: "",
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
    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User sees client name
    expect(screen.getByRole("heading", { name: /sarah chen/i })).toBeInTheDocument();

    // User sees occupation
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();

    // User sees bio
    expect(screen.getByText("Passionate about skincare and wellness")).toBeInTheDocument();

    // User sees contact info
    expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
    expect(screen.getByText("+254712345678")).toBeInTheDocument();

    // User sees age badge
    expect(screen.getByText("28 years old")).toBeInTheDocument();

    // User sees skin type badge
    expect(screen.getByText("Combination")).toBeInTheDocument();

    // User sees concern badges
    expect(screen.getByText("Acne")).toBeInTheDocument();
    expect(screen.getByText("Dark Spots")).toBeInTheDocument();
    expect(screen.getByText("Texture")).toBeInTheDocument();
  });

  it("user sees placeholder text when occupation and bio are empty", () => {
    renderWithQueryClient(<ProfileHeader client={mockClientEmpty} onUpdate={vi.fn()} />);

    expect(screen.getByText(/no occupation set/i)).toBeInTheDocument();
    expect(screen.getByText(/no bio added/i)).toBeInTheDocument();
  });

  it("user edits occupation and bio successfully", async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();

    const { rerender } = renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={mockOnUpdate} />);

    // User clicks Edit button (desktop version - using getAllByRole and selecting first)
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // User sees input fields
    const occupationInput = screen.getByPlaceholderText(/occupation/i);
    const bioTextarea = screen.getByPlaceholderText(/bio/i);

    expect(occupationInput).toHaveValue("Software Engineer");
    expect(bioTextarea).toHaveValue("Passionate about skincare and wellness");

    // User updates occupation
    await user.clear(occupationInput);
    await user.type(occupationInput, "Product Designer");

    // User updates bio
    await user.clear(bioTextarea);
    await user.type(bioTextarea, "Love clean beauty products");

    // User clicks Save button
    const saveButtons = screen.getAllByRole("button", { name: /save/i });
    await user.click(saveButtons[0]);

    // onUpdate callback is called with new data
    expect(mockOnUpdate).toHaveBeenCalledWith({
      occupation: "Product Designer",
      bio: "Love clean beauty products",
    });

    // Simulate parent component updating props (like it would in real usage)
    const updatedClient = {
      ...mockClient,
      occupation: "Product Designer",
      bio: "Love clean beauty products",
    };
    const queryClient = new QueryClient();
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProfileHeader client={updatedClient} onUpdate={mockOnUpdate} />
      </QueryClientProvider>
    );

    // User sees updated occupation and bio (no longer in edit mode)
    expect(screen.getByText("Product Designer")).toBeInTheDocument();
    expect(screen.getByText("Love clean beauty products")).toBeInTheDocument();

    // Edit button is visible again
    expect(screen.getAllByRole("button", { name: /edit/i })[0]).toBeInTheDocument();
  });

  it("user cancels editing without saving changes", async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();

    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={mockOnUpdate} />);

    // User clicks Edit button
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // User types new values
    const occupationInput = screen.getByPlaceholderText(/occupation/i);
    const bioTextarea = screen.getByPlaceholderText(/bio/i);

    await user.clear(occupationInput);
    await user.type(occupationInput, "New Occupation");

    await user.clear(bioTextarea);
    await user.type(bioTextarea, "New Bio");

    // User clicks Cancel button
    const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
    await user.click(cancelButtons[0]);

    // onUpdate is NOT called
    expect(mockOnUpdate).not.toHaveBeenCalled();

    // User sees original values (changes were discarded)
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Passionate about skincare and wellness")).toBeInTheDocument();

    // Edit button is visible again
    expect(screen.getAllByRole("button", { name: /edit/i })[0]).toBeInTheDocument();
  });

  it("user edits only occupation", async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();

    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={mockOnUpdate} />);

    // User clicks Edit
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // User updates occupation only
    const occupationInput = screen.getByPlaceholderText(/occupation/i);
    await user.clear(occupationInput);
    await user.type(occupationInput, "UX Designer");

    // User clicks Save
    const saveButtons = screen.getAllByRole("button", { name: /save/i });
    await user.click(saveButtons[0]);

    // onUpdate is called with updated occupation + existing bio
    expect(mockOnUpdate).toHaveBeenCalledWith({
      occupation: "UX Designer",
      bio: "Passionate about skincare and wellness",
    });
  });

  it("user edits only bio", async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();

    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={mockOnUpdate} />);

    // User clicks Edit
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // User updates bio only
    const bioTextarea = screen.getByPlaceholderText(/bio/i);
    await user.clear(bioTextarea);
    await user.type(bioTextarea, "Exploring Korean skincare");

    // User clicks Save
    const saveButtons = screen.getAllByRole("button", { name: /save/i });
    await user.click(saveButtons[0]);

    // onUpdate is called with existing occupation + updated bio
    expect(mockOnUpdate).toHaveBeenCalledWith({
      occupation: "Software Engineer",
      bio: "Exploring Korean skincare",
    });
  });

  it("user edits from empty occupation and bio", async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();

    renderWithQueryClient(<ProfileHeader client={mockClientEmpty} onUpdate={mockOnUpdate} />);

    // User sees placeholders
    expect(screen.getByText(/no occupation set/i)).toBeInTheDocument();
    expect(screen.getByText(/no bio added/i)).toBeInTheDocument();

    // User clicks Edit
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // User fills in occupation and bio
    await user.type(screen.getByPlaceholderText(/occupation/i), "Nurse");
    await user.type(screen.getByPlaceholderText(/bio/i), "Healthcare professional");

    // User clicks Save
    const saveButtons = screen.getAllByRole("button", { name: /save/i });
    await user.click(saveButtons[0]);

    // onUpdate is called with new data
    expect(mockOnUpdate).toHaveBeenCalledWith({
      occupation: "Nurse",
      bio: "Healthcare professional",
    });
  });

  it("user sees Booking Link and Message buttons in view mode", () => {
    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User sees Booking Link button
    expect(screen.getAllByRole("button", { name: /booking link/i })[0]).toBeInTheDocument();

    // User sees Message link
    const messageLinks = screen.getAllByRole("link", { name: /message/i });
    expect(messageLinks[0]).toBeInTheDocument();
    expect(messageLinks[0]).toHaveAttribute("href", "https://wa.me/254712345678");
  });

  it("user does not see Booking Link and Message buttons in edit mode", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User clicks Edit
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // Booking Link and Message buttons should not be visible
    expect(screen.queryByRole("button", { name: /booking link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /message/i })).not.toBeInTheDocument();

    // Save and Cancel buttons should be visible instead
    expect(screen.getAllByRole("button", { name: /save/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /cancel/i }).length).toBeGreaterThan(0);
  });

  it("user opens WhatsApp to message client", async () => {
    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User sees Message button
    const messageLinks = screen.getAllByRole("link", { name: /message/i });
    expect(messageLinks[0]).toBeInTheDocument();

    // User sees correct WhatsApp link (with + removed from phone number)
    expect(messageLinks[0]).toHaveAttribute("href", "https://wa.me/254712345678");
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

    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User clicks Booking Link button
    const bookingLinkButtons = screen.getAllByRole("button", { name: /booking link/i });
    await user.click(bookingLinkButtons[0]);

    // User sees modal
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /invite to book/i })).toBeInTheDocument();
    });

    // User sees event type dropdown with options
    expect(await screen.findByText("30 Minute Meeting")).toBeInTheDocument();

    // User clicks Generate Link button
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // User sees generated link
    expect(await screen.findByText("https://calendly.com/example/meeting-abc123")).toBeInTheDocument();

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

    renderWithQueryClient(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User opens booking link modal
    const bookingLinkButtons = screen.getAllByRole("button", { name: /booking link/i });
    await user.click(bookingLinkButtons[0]);

    // User generates link
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /generate link/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /generate link/i }));

    // User sees generated link
    await waitFor(() => {
      expect(screen.getByText("https://calendly.com/example/meeting-xyz789")).toBeInTheDocument();
    });

    // User clicks Copy button
    await user.click(screen.getByRole("button", { name: /copy/i }));

    // Clipboard API was called with the link
    expect(writeTextMock).toHaveBeenCalledWith("https://calendly.com/example/meeting-xyz789");

    // User sees success toast (we're just verifying the copy happened, toast is tested elsewhere)
  });
});
