import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoachNotes } from "./coach-notes";
import type { CoachNote } from "../types";

describe("CoachNotes - User Workflows", () => {
  const mockAdminId = "550e8400-e29b-41d4-a716-446655440000";

  const mockNotes: CoachNote[] = [
    {
      id: "note-1",
      content: "Client is responding well to tretinoin",
      createdAt: new Date("2025-10-15T10:30:00Z"),
      adminId: mockAdminId,
    },
    {
      id: "note-2",
      content: "Reduced frequency due to irritation",
      createdAt: new Date("2025-10-14T14:20:00Z"),
      adminId: mockAdminId,
    },
  ];

  it("user creates a new coach note", async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(undefined);

    render(
      <CoachNotes
        notes={mockNotes}
        adminId={mockAdminId}
        onAddNote={onAddNote}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    // User sees existing notes
    expect(screen.getByText("Client is responding well to tretinoin")).toBeInTheDocument();

    // User clicks add button
    await user.click(screen.getByRole("button", { name: /add note/i }));

    // User sees the textarea to add a note
    const textarea = screen.getByPlaceholderText(/add a note/i);
    expect(textarea).toBeInTheDocument();

    // User types a new note
    await user.type(textarea, "Increased hydration in evening routine");

    // User clicks save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action was called with correct data
    expect(onAddNote).toHaveBeenCalledWith(
      mockAdminId,
      "Increased hydration in evening routine"
    );
  });

  it("user edits an existing coach note", async () => {
    const user = userEvent.setup();
    const onUpdateNote = vi.fn().mockResolvedValue(undefined);

    render(
      <CoachNotes
        notes={mockNotes}
        adminId={mockAdminId}
        onAddNote={vi.fn()}
        onUpdateNote={onUpdateNote}
        onDeleteNote={vi.fn()}
      />
    );

    // User sees the note they want to edit
    const noteText = screen.getByText("Reduced frequency due to irritation");
    expect(noteText).toBeInTheDocument();

    // User clicks on the note to edit it
    await user.click(noteText);

    // User sees the textarea with current content
    const textarea = screen.getByDisplayValue("Reduced frequency due to irritation");
    expect(textarea).toBeInTheDocument();

    // User modifies the content
    await user.clear(textarea);
    await user.type(textarea, "Reduced frequency to every other day");

    // User clicks save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action was called with correct data
    expect(onUpdateNote).toHaveBeenCalledWith(
      "note-2",
      "Reduced frequency to every other day"
    );
  });

  it("user deletes a coach note", async () => {
    const user = userEvent.setup();
    const onDeleteNote = vi.fn().mockResolvedValue(undefined);

    render(
      <CoachNotes
        notes={mockNotes}
        adminId={mockAdminId}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={onDeleteNote}
      />
    );

    // User sees the note they want to delete
    expect(screen.getByText("Client is responding well to tretinoin")).toBeInTheDocument();

    // User clicks delete button for first note
    const deleteButtons = screen.getAllByRole("button", { name: /delete note/i });
    await user.click(deleteButtons[0]);

    // Server action was called with correct note ID
    expect(onDeleteNote).toHaveBeenCalledWith("note-1");
  });

  it("user cancels adding a note without saving", async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(undefined);

    render(
      <CoachNotes
        notes={mockNotes}
        adminId={mockAdminId}
        onAddNote={onAddNote}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    // User clicks add button
    await user.click(screen.getByRole("button", { name: /add note/i }));

    // User types some content
    const textarea = screen.getByPlaceholderText(/add a note/i);
    await user.type(textarea, "Some note content");

    // User clicks cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Add form is no longer visible
    expect(screen.queryByPlaceholderText(/add a note/i)).not.toBeInTheDocument();

    // Server action was NOT called
    expect(onAddNote).not.toHaveBeenCalled();
  });

  it("user cancels editing a note without saving changes", async () => {
    const user = userEvent.setup();
    const onUpdateNote = vi.fn().mockResolvedValue(undefined);

    render(
      <CoachNotes
        notes={mockNotes}
        adminId={mockAdminId}
        onAddNote={vi.fn()}
        onUpdateNote={onUpdateNote}
        onDeleteNote={vi.fn()}
      />
    );

    // User clicks on note to edit
    const noteText = screen.getByText("Reduced frequency due to irritation");
    await user.click(noteText);

    // User modifies the content
    const textarea = screen.getByDisplayValue("Reduced frequency due to irritation");
    await user.clear(textarea);
    await user.type(textarea, "Different content");

    // User clicks cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Edit form is no longer visible
    expect(screen.queryByDisplayValue("Different content")).not.toBeInTheDocument();

    // Original note text is still visible
    expect(screen.getByText("Reduced frequency due to irritation")).toBeInTheDocument();

    // Server action was NOT called
    expect(onUpdateNote).not.toHaveBeenCalled();
  });

  it("user cannot save note with only whitespace", async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(undefined);

    render(
      <CoachNotes
        notes={[]}
        adminId={mockAdminId}
        onAddNote={onAddNote}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    // User sees empty state
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();

    // User clicks add button
    await user.click(screen.getByRole("button", { name: /add note/i }));

    // User types only spaces
    const textarea = screen.getByPlaceholderText(/add a note/i);
    await user.type(textarea, "   ");

    // User clicks save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Server action was NOT called (because trim() returns empty string)
    expect(onAddNote).not.toHaveBeenCalled();

    // Form is still visible (user needs to provide content or cancel)
    expect(textarea).toBeInTheDocument();
  });

  it("user sees formatted timestamp for notes", () => {
    render(
      <CoachNotes
        notes={mockNotes}
        adminId={mockAdminId}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    // User sees formatted dates for their notes
    // The format is: "Weekday, DDth Month, YYYY HH:MM"
    // We don't check exact times due to timezone conversions in test environment
    expect(screen.getByText(/15th oct, 2025 \d{2}:\d{2}/i)).toBeInTheDocument();
    expect(screen.getByText(/14th oct, 2025 \d{2}:\d{2}/i)).toBeInTheDocument();
  });

  it("user sees empty state when no notes exist", () => {
    render(
      <CoachNotes
        notes={[]}
        adminId={mockAdminId}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    // User sees helpful empty state message
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
    expect(screen.getByText(/add notes to track observations and changes/i)).toBeInTheDocument();

    // User can still add notes
    expect(screen.getByRole("button", { name: /add note/i })).toBeInTheDocument();
  });

  it("user completes full workflow: add, edit, then delete a note", async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(undefined);
    const onUpdateNote = vi.fn().mockResolvedValue(undefined);
    const onDeleteNote = vi.fn().mockResolvedValue(undefined);

    // Start with one existing note
    const initialNotes = [mockNotes[0]];

    const { rerender } = render(
      <CoachNotes
        notes={initialNotes}
        adminId={mockAdminId}
        onAddNote={onAddNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
      />
    );

    // ===== STEP 1: User adds a new note =====
    await user.click(screen.getByRole("button", { name: /add note/i }));
    await user.type(screen.getByPlaceholderText(/add a note/i), "New observation");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onAddNote).toHaveBeenCalledWith(mockAdminId, "New observation");

    // Simulate server updating the notes list
    const notesAfterAdd = [
      ...initialNotes,
      {
        id: "note-3",
        content: "New observation",
        createdAt: new Date("2025-10-16T09:00:00Z"),
        adminId: mockAdminId,
      },
    ];

    rerender(
      <CoachNotes
        notes={notesAfterAdd}
        adminId={mockAdminId}
        onAddNote={onAddNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
      />
    );

    // User sees the new note
    expect(screen.getByText("New observation")).toBeInTheDocument();

    // ===== STEP 2: User edits the note they just added =====
    await user.click(screen.getByText("New observation"));
    const textarea = screen.getByDisplayValue("New observation");
    await user.clear(textarea);
    await user.type(textarea, "Updated observation");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onUpdateNote).toHaveBeenCalledWith("note-3", "Updated observation");

    // Simulate server updating the note
    const notesAfterEdit = [
      initialNotes[0],
      {
        id: "note-3",
        content: "Updated observation",
        createdAt: new Date("2025-10-16T09:00:00Z"),
        adminId: mockAdminId,
      },
    ];

    rerender(
      <CoachNotes
        notes={notesAfterEdit}
        adminId={mockAdminId}
        onAddNote={onAddNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
      />
    );

    // User sees the updated content
    expect(screen.getByText("Updated observation")).toBeInTheDocument();
    expect(screen.queryByText("New observation")).not.toBeInTheDocument();

    // ===== STEP 3: User deletes the note =====
    const deleteButtons = screen.getAllByRole("button", { name: /delete note/i });
    await user.click(deleteButtons[1]); // Delete the second note (the one they added)

    expect(onDeleteNote).toHaveBeenCalledWith("note-3");
  });
});
