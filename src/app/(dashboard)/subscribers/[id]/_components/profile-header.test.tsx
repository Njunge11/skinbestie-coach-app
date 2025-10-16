import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ProfileHeader } from "./profile-header";
import type { Client } from "../types";

describe("ProfileHeader - UI Tests", () => {
  const mockClient: Client = {
    id: "1",
    name: "Sarah Chen",
    age: 28,
    email: "sarah@example.com",
    mobile: "+1 (415) 555-0123",
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

  it("user views profile information", () => {
    render(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User sees client name
    expect(screen.getByRole("heading", { name: /sarah chen/i })).toBeInTheDocument();

    // User sees occupation
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();

    // User sees bio
    expect(screen.getByText("Passionate about skincare and wellness")).toBeInTheDocument();

    // User sees contact info
    expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
    expect(screen.getByText("+1 (415) 555-0123")).toBeInTheDocument();

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
    render(<ProfileHeader client={mockClientEmpty} onUpdate={vi.fn()} />);

    expect(screen.getByText(/no occupation set/i)).toBeInTheDocument();
    expect(screen.getByText(/no bio added/i)).toBeInTheDocument();
  });

  it("user edits occupation and bio successfully", async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();

    const { rerender } = render(<ProfileHeader client={mockClient} onUpdate={mockOnUpdate} />);

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
    rerender(<ProfileHeader client={updatedClient} onUpdate={mockOnUpdate} />);

    // User sees updated occupation and bio (no longer in edit mode)
    expect(screen.getByText("Product Designer")).toBeInTheDocument();
    expect(screen.getByText("Love clean beauty products")).toBeInTheDocument();

    // Edit button is visible again
    expect(screen.getAllByRole("button", { name: /edit/i })[0]).toBeInTheDocument();
  });

  it("user cancels editing without saving changes", async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();

    render(<ProfileHeader client={mockClient} onUpdate={mockOnUpdate} />);

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

    render(<ProfileHeader client={mockClient} onUpdate={mockOnUpdate} />);

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

    render(<ProfileHeader client={mockClient} onUpdate={mockOnUpdate} />);

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

    render(<ProfileHeader client={mockClientEmpty} onUpdate={mockOnUpdate} />);

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

  it("user sees Schedule and Message buttons in view mode", () => {
    render(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User sees Schedule button
    expect(screen.getAllByRole("button", { name: /schedule/i })[0]).toBeInTheDocument();

    // User sees Message button
    expect(screen.getAllByRole("button", { name: /message/i })[0]).toBeInTheDocument();
  });

  it("user does not see Schedule and Message buttons in edit mode", async () => {
    const user = userEvent.setup();

    render(<ProfileHeader client={mockClient} onUpdate={vi.fn()} />);

    // User clicks Edit
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    // Schedule and Message buttons should not be visible
    expect(screen.queryByRole("button", { name: /schedule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message/i })).not.toBeInTheDocument();

    // Save and Cancel buttons should be visible instead
    expect(screen.getAllByRole("button", { name: /save/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /cancel/i }).length).toBeGreaterThan(0);
  });
});
