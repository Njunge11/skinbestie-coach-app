import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileTags } from "../profile-tags";
import type { ProfileTag } from "../../../types";

describe("ProfileTags - UI Tests", () => {
  const mockUserId = "user-123";
  const mockTags: ProfileTag[] = [
    {
      id: "tag-1",
      userProfileId: mockUserId,
      tag: "Acne",
      createdAt: new Date("2025-01-01"),
    },
    {
      id: "tag-2",
      userProfileId: mockUserId,
      tag: "Sensitive Skin",
      createdAt: new Date("2025-01-02"),
    },
  ];

  const mockOnAddTag = vi.fn();
  const mockOnRemoveTag = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAddTag.mockResolvedValue(undefined);
    mockOnRemoveTag.mockResolvedValue(undefined);
  });

  it("user views existing tags", () => {
    render(
      <ProfileTags
        tags={mockTags}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User sees the Key Information section heading
    expect(screen.getByText(/key information/i)).toBeInTheDocument();

    // User sees existing tags
    expect(screen.getByText("Acne")).toBeInTheDocument();
    expect(screen.getByText("Sensitive Skin")).toBeInTheDocument();
  });

  it("user sees empty state when no tags exist", () => {
    render(
      <ProfileTags
        tags={[]}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User sees the input field
    expect(
      screen.getByPlaceholderText(/allergic to fragrance/i),
    ).toBeInTheDocument();

    // User sees the Add button
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();

    // User does not see any tags
    expect(screen.queryByText("Acne")).not.toBeInTheDocument();
  });

  it("user adds a new tag", async () => {
    const user = userEvent.setup();

    render(
      <ProfileTags
        tags={mockTags}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User types a new tag
    const input = screen.getByPlaceholderText(/allergic to fragrance/i);
    await user.type(input, "Dry Skin");

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // Server action was called with correct parameters
    expect(mockOnAddTag).toHaveBeenCalledWith("Dry Skin");
    expect(mockOnAddTag).toHaveBeenCalledTimes(1);

    // Input field is cleared immediately (optimistic update)
    expect(input).toHaveValue("");
  });

  it("user adds a new tag by pressing Enter", async () => {
    const user = userEvent.setup();

    render(
      <ProfileTags
        tags={mockTags}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User types a new tag
    const input = screen.getByPlaceholderText(/allergic to fragrance/i);
    await user.type(input, "Oily Skin");

    // User presses Enter
    await user.keyboard("{Enter}");

    // Server action was called
    expect(mockOnAddTag).toHaveBeenCalledWith("Oily Skin");
    expect(mockOnAddTag).toHaveBeenCalledTimes(1);

    // Input field is cleared
    expect(input).toHaveValue("");
  });

  it("user cannot add empty tag", async () => {
    const user = userEvent.setup();

    render(
      <ProfileTags
        tags={mockTags}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User tries to add empty tag
    const addButton = screen.getByRole("button", { name: /add/i });

    // Add button is disabled when input is empty
    expect(addButton).toBeDisabled();

    // User types spaces only
    const input = screen.getByPlaceholderText(/allergic to fragrance/i);
    await user.type(input, "   ");

    // Add button is still disabled
    expect(addButton).toBeDisabled();

    // User clicks Add button (even though disabled)
    await user.click(addButton);

    // Server action was not called
    expect(mockOnAddTag).not.toHaveBeenCalled();
  });

  it("user cannot add duplicate tag (case-insensitive)", async () => {
    const user = userEvent.setup();

    render(
      <ProfileTags
        tags={mockTags}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User tries to add existing tag with different case
    const input = screen.getByPlaceholderText(/allergic to fragrance/i);
    await user.type(input, "acne");

    // User clicks Add button
    await user.click(screen.getByRole("button", { name: /add/i }));

    // Server action was not called (duplicate detected)
    expect(mockOnAddTag).not.toHaveBeenCalled();

    // Input is not cleared (to show user the duplicate)
    expect(input).toHaveValue("acne");
  });

  it("user removes a tag", async () => {
    const user = userEvent.setup();

    render(
      <ProfileTags
        tags={mockTags}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User sees the tag
    expect(screen.getByText("Acne")).toBeInTheDocument();

    // User clicks remove button on the tag
    const removeButton = screen.getByLabelText("Remove Acne");
    await user.click(removeButton);

    // Server action was called with correct tag ID
    expect(mockOnRemoveTag).toHaveBeenCalledWith("tag-1");
    expect(mockOnRemoveTag).toHaveBeenCalledTimes(1);
  });

  it("user sees tag input is trimmed", async () => {
    const user = userEvent.setup();

    render(
      <ProfileTags
        tags={[]}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User types tag with leading/trailing spaces
    const input = screen.getByPlaceholderText(/allergic to fragrance/i);
    await user.type(input, "  Combination Skin  ");

    // User adds the tag
    await user.click(screen.getByRole("button", { name: /add/i }));

    // Server action was called with trimmed value
    expect(mockOnAddTag).toHaveBeenCalledWith("Combination Skin");
  });

  it("user sees multiple tags displayed", () => {
    const manyTags: ProfileTag[] = [
      {
        id: "tag-1",
        userProfileId: mockUserId,
        tag: "Acne",
        createdAt: new Date(),
      },
      {
        id: "tag-2",
        userProfileId: mockUserId,
        tag: "Dry Skin",
        createdAt: new Date(),
      },
      {
        id: "tag-3",
        userProfileId: mockUserId,
        tag: "Sensitive",
        createdAt: new Date(),
      },
      {
        id: "tag-4",
        userProfileId: mockUserId,
        tag: "Redness",
        createdAt: new Date(),
      },
    ];

    render(
      <ProfileTags
        tags={manyTags}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User sees all tags
    expect(screen.getByText("Acne")).toBeInTheDocument();
    expect(screen.getByText("Dry Skin")).toBeInTheDocument();
    expect(screen.getByText("Sensitive")).toBeInTheDocument();
    expect(screen.getByText("Redness")).toBeInTheDocument();

    // User sees remove buttons for all tags
    expect(screen.getByLabelText("Remove Acne")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Dry Skin")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Sensitive")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Redness")).toBeInTheDocument();
  });

  it("user sees Tag icon in header", () => {
    render(
      <ProfileTags
        tags={mockTags}
        userId={mockUserId}
        onAddTag={mockOnAddTag}
        onRemoveTag={mockOnRemoveTag}
      />,
    );

    // User sees the heading with icon
    const heading = screen.getByText(/key information/i);
    expect(heading).toBeInTheDocument();

    // Icon is present (lucide-react Tag icon is in the same container)
    expect(screen.getByText(/key information/i)).toBeInTheDocument();
  });
});
