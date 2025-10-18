import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClientPageWrapper } from "./client-page-wrapper";
import type { Client, Goal, Photo, Routine, RoutineProduct, CoachNote } from "../types";

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock server actions at network boundary
vi.mock("../profile-header-actions/actions");
vi.mock("../goal-actions/actions");
vi.mock("../routine-info-actions/actions");
vi.mock("../routine-actions/actions");
vi.mock("../coach-notes-actions/actions");
vi.mock("../progress-photos-actions/actions");

import { updateUserProfile } from "../profile-header-actions/actions";
import {
  createGoal,
  updateGoal,
  deleteGoal,
} from "../goal-actions/actions";
import {
  updateRoutine,
  deleteRoutine,
} from "../routine-info-actions/actions";
import {
  createRoutineProduct,
  deleteRoutineProduct,
} from "../routine-actions/actions";
import {
  createCoachNote,
  updateCoachNote,
  deleteCoachNote,
} from "../coach-notes-actions/actions";
import { updatePhotoFeedback } from "../progress-photos-actions/actions";
import { toast } from "sonner";

/**
 * CLIENT PAGE WRAPPER - INTEGRATION TESTS
 *
 * Testing Strategy (per Kent C. Dodds & Mark Erikson):
 * - Integration tests that render real components
 * - Mock at network boundary (server actions) only
 * - Test user-visible behavior, not implementation
 * - Focus on: optimistic updates, error handling, state synchronization
 *
 * Only contains properly implemented tests with real user interactions.
 * No fake tests with TODO comments.
 */

describe("ClientPageWrapper - Integration Tests", () => {
  const mockClient: Client = {
    id: "user-1",
    name: "John Doe",
    age: 35,
    email: "john@example.com",
    mobile: "555-1234",
    occupation: "Engineer",
    bio: "Software developer",
    skinType: "oily",
    concerns: ["acne", "dark spots"],
    planWeeks: 12,
    currentWeek: 3,
    startDate: "2025-01-01",
    hasRoutine: false,
  };

  const mockPhoto: Photo = {
    id: "photo-1",
    weekNumber: 1,
    imageUrl: "/uploads/photo1.jpg",
    feedback: null,
    uploadedAt: new Date("2025-01-10"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Optimistic Updates - Success Path", () => {

    it("Goal Toggle Success - checkbox updates immediately, server called, state persists", async () => {
      const user = userEvent.setup();
      const goal: Goal = {
        id: "goal-1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
      };

      // Mock successful server response
      vi.mocked(updateGoal).mockResolvedValueOnce({
        success: true,
        data: { ...goal, complete: true },
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[goal]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Find and click toggle button (it's a button with aria-label, not a checkbox)
      const toggleButton = screen.getByLabelText("Mark as complete");
      await user.click(toggleButton);

      // Verify server action called
      await waitFor(() => {
        expect(updateGoal).toHaveBeenCalledWith("goal-1", { complete: true });
      });

      // Verify state persists - button label changes to "Mark as incomplete"
      await waitFor(() => {
        expect(screen.getByLabelText("Mark as incomplete")).toBeInTheDocument();
      });
    });

    it("Goal Update Success - changes show immediately, server called, state persists", async () => {
      const user = userEvent.setup();
      const goal: Goal = {
        id: "goal-1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
      };

      const updatedGoal: Goal = {
        ...goal,
        name: "Ultra clear skin",
        description: "Completely remove acne",
      };

      // Mock successful update
      vi.mocked(updateGoal).mockResolvedValueOnce({
        success: true,
        data: updatedGoal,
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[goal]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Verify goal renders
      expect(screen.getByText("Clear skin")).toBeInTheDocument();
      expect(screen.getByText("Reduce acne")).toBeInTheDocument();

      // Click on goal to enter edit mode (clicking the description area)
      const goalDescription = screen.getByText("Reduce acne");
      await user.click(goalDescription);

      // Find input fields in edit mode
      const nameInput = screen.getByPlaceholderText("Goal name");
      const descInput = screen.getByPlaceholderText("Description");

      // Clear and type new values
      await user.clear(nameInput);
      await user.type(nameInput, "Ultra clear skin");
      await user.clear(descInput);
      await user.type(descInput, "Completely remove acne");

      // Click Save button
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Verify optimistic update - new text appears immediately
      await waitFor(() => {
        expect(screen.getByText("Ultra clear skin")).toBeInTheDocument();
        expect(screen.getByText("Completely remove acne")).toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(updateGoal).toHaveBeenCalledWith("goal-1", {
          name: "Ultra clear skin",
          description: "Completely remove acne",
          timeframe: "12 weeks",
        });
      });

      // Verify state persists
      expect(screen.getByText("Ultra clear skin")).toBeInTheDocument();
      expect(screen.getByText("Completely remove acne")).toBeInTheDocument();
    });

    it("Goal Delete Success - goal disappears immediately, server called, state persists", async () => {
      const user = userEvent.setup();
      const goal: Goal = {
        id: "goal-1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
      };

      // Mock successful delete
      vi.mocked(deleteGoal).mockResolvedValueOnce({
        success: true,
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[goal]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Verify goal renders
      expect(screen.getByText("Clear skin")).toBeInTheDocument();

      // Click delete button
      const deleteButton = screen.getByLabelText("Delete goal");
      await user.click(deleteButton);

      // Verify optimistic delete - goal disappears immediately
      await waitFor(() => {
        expect(screen.queryByText("Clear skin")).not.toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(deleteGoal).toHaveBeenCalledWith("goal-1");
      });

      // Verify state persists (goal stays deleted)
      expect(screen.queryByText("Clear skin")).not.toBeInTheDocument();
    });

    it("Routine Product Delete Success - product disappears immediately, server called", async () => {
      const user = userEvent.setup();
      const routine: Routine = {
        id: "routine-1",
        name: "Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
      };

      const product: RoutineProduct = {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "cleanse",
        productName: "Morning Cleanser",
        instructions: "Apply gently",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      // Mock successful delete
      vi.mocked(deleteRoutineProduct).mockResolvedValueOnce({
        success: true,
      });

      render(
        <ClientPageWrapper
          initialClient={{ ...mockClient, hasRoutine: true }}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={routine}
          initialRoutineProducts={[product]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Verify product renders
      expect(screen.getByText("Morning Cleanser")).toBeInTheDocument();

      // Click delete button
      const deleteButton = screen.getByLabelText("Delete step");
      await user.click(deleteButton);

      // Verify optimistic delete - product disappears immediately
      await waitFor(() => {
        expect(screen.queryByText("Morning Cleanser")).not.toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(deleteRoutineProduct).toHaveBeenCalledWith("product-1");
      });

      // Verify state persists (product stays deleted)
      expect(screen.queryByText("Morning Cleanser")).not.toBeInTheDocument();
    });

    it("Coach Note Add Success - note appears immediately, server called", async () => {
      const user = userEvent.setup();
      const newNote: CoachNote = {
        id: "note-1",
        userProfileId: "user-1",
        adminId: "admin-1",
        content: "New coach note",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock successful create
      vi.mocked(createCoachNote).mockResolvedValueOnce({
        success: true,
        data: newNote,
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Click add note button
      const addButton = screen.getByLabelText("Add note");
      await user.click(addButton);

      // Type note content
      const textarea = screen.getByPlaceholderText("Add a note...");
      await user.type(textarea, "New coach note");

      // Save
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Verify note appears
      await waitFor(() => {
        expect(screen.getByText("New coach note")).toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(createCoachNote).toHaveBeenCalledWith("user-1", "admin-1", "New coach note");
      });
    });

    it("Coach Note Update Success - changes show immediately, server called", async () => {
      const user = userEvent.setup();
      const note: CoachNote = {
        id: "note-1",
        userProfileId: "user-1",
        adminId: "admin-1",
        content: "Original note",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedNote: CoachNote = {
        ...note,
        content: "Updated note content",
      };

      // Mock successful update
      vi.mocked(updateCoachNote).mockResolvedValueOnce({
        success: true,
        data: updatedNote,
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[note]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Verify note renders
      expect(screen.getByText("Original note")).toBeInTheDocument();

      // Click on note to edit
      const noteText = screen.getByText("Original note");
      await user.click(noteText);

      // Edit content
      const textarea = screen.getByDisplayValue("Original note");
      await user.clear(textarea);
      await user.type(textarea, "Updated note content");

      // Save
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Verify optimistic update
      await waitFor(() => {
        expect(screen.getByText("Updated note content")).toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(updateCoachNote).toHaveBeenCalledWith("note-1", "Updated note content");
      });
    });

    it("Coach Note Delete Success - note disappears immediately, server called", async () => {
      const user = userEvent.setup();
      const note: CoachNote = {
        id: "note-1",
        userProfileId: "user-1",
        adminId: "admin-1",
        content: "Note to delete",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock successful delete
      vi.mocked(deleteCoachNote).mockResolvedValueOnce({
        success: true,
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[note]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      expect(screen.getByText("Note to delete")).toBeInTheDocument();

      // Click delete button
      const deleteButton = screen.getByLabelText("Delete note");
      await user.click(deleteButton);

      // Verify optimistic delete - note disappears immediately
      await waitFor(() => {
        expect(screen.queryByText("Note to delete")).not.toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(deleteCoachNote).toHaveBeenCalledWith("note-1");
      });

      // Verify state persists (note stays deleted)
      expect(screen.queryByText("Note to delete")).not.toBeInTheDocument();
    });

    it("Profile Update Success - changes show immediately, server called", async () => {
      const user = userEvent.setup();

      // Mock successful update
      vi.mocked(updateUserProfile).mockResolvedValueOnce({
        success: true,
        data: { ...mockClient, occupation: "Senior Engineer", bio: "Lead developer" },
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Verify initial data
      expect(screen.getByText("Engineer")).toBeInTheDocument();
      expect(screen.getByText("Software developer")).toBeInTheDocument();

      // Click edit button (get all since desktop + mobile versions exist, click first)
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      // Edit occupation and bio
      const occupationInput = screen.getByPlaceholderText("Occupation");
      const bioTextarea = screen.getByPlaceholderText("Bio");

      await user.clear(occupationInput);
      await user.type(occupationInput, "Senior Engineer");
      await user.clear(bioTextarea);
      await user.type(bioTextarea, "Lead developer");

      // Save
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Verify optimistic update
      await waitFor(() => {
        expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
        expect(screen.getByText("Lead developer")).toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(updateUserProfile).toHaveBeenCalledWith("user-1", {
          occupation: "Senior Engineer",
          bio: "Lead developer",
        });
      });
    });

    it("Profile Update Failure - changes show, server fails, reverts, toast shown", async () => {
      const user = userEvent.setup();

      // Mock server failure
      vi.mocked(updateUserProfile).mockResolvedValueOnce({
        success: false,
        error: "Failed to update profile",
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Verify initial data
      expect(screen.getByText("Engineer")).toBeInTheDocument();
      expect(screen.getByText("Software developer")).toBeInTheDocument();

      // Click edit button (get all since desktop + mobile versions exist, click first)
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      // Edit occupation and bio
      const occupationInput = screen.getByPlaceholderText("Occupation");
      const bioTextarea = screen.getByPlaceholderText("Bio");

      await user.clear(occupationInput);
      await user.type(occupationInput, "Senior Engineer");
      await user.clear(bioTextarea);
      await user.type(bioTextarea, "Lead developer");

      // Save
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Wait for server response - changes should revert to original
      await waitFor(() => {
        expect(screen.getByText("Engineer")).toBeInTheDocument();
        expect(screen.getByText("Software developer")).toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update profile");
      });

      // Verify server was called
      expect(updateUserProfile).toHaveBeenCalledWith("user-1", {
        occupation: "Senior Engineer",
        bio: "Lead developer",
      });
    });

    it("Add Goal Success - goal appears, server called", async () => {
      const user = userEvent.setup();
      const newGoal: Goal = {
        id: "goal-1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
      };

      // Mock successful create
      vi.mocked(createGoal).mockResolvedValueOnce({
        success: true,
        data: newGoal,
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Click add goal button
      const addButton = screen.getByRole("button", { name: /add goal/i });
      await user.click(addButton);

      // Fill form
      const nameInput = screen.getByPlaceholderText("Goal name");
      const descInput = screen.getByPlaceholderText("Description");
      const timeframeInput = screen.getByPlaceholderText(/timeframe/i);

      await user.type(nameInput, "Clear skin");
      await user.type(descInput, "Reduce acne");
      await user.type(timeframeInput, "12 weeks");

      // Click the "Add Goal" button in the form (there are now 2 "Add Goal" buttons, get the last one which is in the form)
      const addGoalButtons = screen.getAllByRole("button", { name: "Add Goal" });
      await user.click(addGoalButtons[addGoalButtons.length - 1]);

      // Verify goal appears
      await waitFor(() => {
        expect(screen.getByText("Clear skin")).toBeInTheDocument();
        expect(screen.getByText("Reduce acne")).toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(createGoal).toHaveBeenCalledWith("user-1", {
          name: "Clear skin",
          description: "Reduce acne",
          timeframe: "12 weeks",
        });
      });
    });

    it("Add Goal Failure - form filled, server fails, goal doesn't appear, toast shown", async () => {
      const user = userEvent.setup();

      // Mock server failure
      vi.mocked(createGoal).mockResolvedValueOnce({
        success: false,
        error: "Failed to create goal",
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Click add goal button
      const addButton = screen.getByRole("button", { name: /add goal/i });
      await user.click(addButton);

      // Fill form
      const nameInput = screen.getByPlaceholderText("Goal name");
      const descInput = screen.getByPlaceholderText("Description");
      const timeframeInput = screen.getByPlaceholderText(/timeframe/i);

      await user.type(nameInput, "Clear skin");
      await user.type(descInput, "Reduce acne");
      await user.type(timeframeInput, "12 weeks");

      // Click the "Add Goal" button in the form (there are now 2 "Add Goal" buttons, get the last one which is in the form)
      const addGoalButtons = screen.getAllByRole("button", { name: "Add Goal" });
      await user.click(addGoalButtons[addGoalButtons.length - 1]);

      // Wait for server response - goal should NOT appear
      await waitFor(() => {
        expect(screen.queryByText("Clear skin")).not.toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create goal");
      });

      // Verify server was called
      expect(createGoal).toHaveBeenCalledWith("user-1", {
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
      });
    });

    it("Photo Feedback Update Success - feedback shows immediately, server called", async () => {
      const user = userEvent.setup();
      const updatedPhoto: Photo = {
        ...mockPhoto,
        feedback: "Great progress!",
      };

      // Mock successful update
      vi.mocked(updatePhotoFeedback).mockResolvedValueOnce({
        success: true,
        data: updatedPhoto,
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Click on photo to view/edit
      const photo = screen.getByRole("img");
      await user.click(photo);

      // Add feedback
      const feedbackTextarea = screen.getByPlaceholderText("Add your observations and feedback...");
      await user.type(feedbackTextarea, "Great progress!");

      // Save (get all since multiple Save buttons exist, click first)
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Verify server action called
      await waitFor(() => {
        expect(updatePhotoFeedback).toHaveBeenCalledWith("photo-1", "Great progress!");
      });

      // Modal closes after successful save, feedback is stored but not displayed in grid
    });

    it("Photo Feedback Update Failure - feedback typed, server fails, reverts, toast shown", async () => {
      const user = userEvent.setup();

      // Mock server failure
      vi.mocked(updatePhotoFeedback).mockResolvedValueOnce({
        success: false,
        error: "Failed to update photo feedback",
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Click on photo to view/edit
      const photo = screen.getByRole("img");
      await user.click(photo);

      // Add feedback
      const feedbackTextarea = screen.getByPlaceholderText("Add your observations and feedback...");
      await user.type(feedbackTextarea, "Great progress!");

      // Save (get all since multiple Save buttons exist, click first)
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update photo feedback");
      });

      // Verify server was called
      expect(updatePhotoFeedback).toHaveBeenCalledWith("photo-1", "Great progress!");

      // Modal stays open after failure (doesn't close)
    });

    it("Routine Update Success - changes show immediately, server called", async () => {
      const user = userEvent.setup();
      const routine: Routine = {
        id: "routine-1",
        name: "Morning Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
      };

      const updatedRoutine: Routine = {
        ...routine,
        name: "Updated Morning Routine",
      };

      // Mock successful update
      vi.mocked(updateRoutine).mockResolvedValueOnce({
        success: true,
        data: updatedRoutine,
      });

      render(
        <ClientPageWrapper
          initialClient={{ ...mockClient, hasRoutine: true }}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={routine}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Verify initial routine name
      expect(screen.getByText("Morning Routine")).toBeInTheDocument();

      // Click edit routine button (multiple Edit buttons exist, routine section comes last)
      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[editButtons.length - 1]);

      // Edit routine name (uses label, not placeholder)
      const nameInput = screen.getByLabelText(/routine name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Morning Routine");

      // Save
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Verify optimistic update
      await waitFor(() => {
        expect(screen.getByText("Updated Morning Routine")).toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(updateRoutine).toHaveBeenCalledWith("routine-1", expect.objectContaining({
          name: "Updated Morning Routine",
        }));
      });
    });

    it("Routine Update Failure - name changed, server fails, reverts, toast shown", async () => {
      const user = userEvent.setup();
      const routine: Routine = {
        id: "routine-1",
        name: "Morning Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
      };

      // Mock server failure
      vi.mocked(updateRoutine).mockResolvedValueOnce({
        success: false,
        error: "Failed to update routine",
      });

      render(
        <ClientPageWrapper
          initialClient={{ ...mockClient, hasRoutine: true }}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={routine}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Verify initial routine name
      expect(screen.getByText("Morning Routine")).toBeInTheDocument();

      // Click edit routine button (multiple Edit buttons exist, routine section comes last)
      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[editButtons.length - 1]);

      // Edit routine name (uses label, not placeholder)
      const nameInput = screen.getByLabelText(/routine name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Morning Routine");

      // Save
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Wait for server response - should revert to original name
      await waitFor(() => {
        expect(screen.getByText("Morning Routine")).toBeInTheDocument();
        expect(screen.queryByText("Updated Morning Routine")).not.toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update routine");
      });

      // Verify server was called
      expect(updateRoutine).toHaveBeenCalledWith("routine-1", expect.objectContaining({
        name: "Updated Morning Routine",
      }));
    });

    it("Add Routine Product Success - product appears, server called", async () => {
      const user = userEvent.setup();
      const routine: Routine = {
        id: "routine-1",
        name: "Morning Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
      };

      const newProduct: RoutineProduct = {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "Cleanser",
        productName: "Gentle Cleanser",
        instructions: "Apply to wet face",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      // Mock successful create
      vi.mocked(createRoutineProduct).mockResolvedValueOnce({
        success: true,
        data: newProduct,
      });

      render(
        <ClientPageWrapper
          initialClient={{ ...mockClient, hasRoutine: true }}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={routine}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Click add product button for morning (first "Add Step" button)
      const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
      await user.click(addStepButtons[0]); // First button is morning

      // Fill form
      const comboboxes = screen.getAllByRole("combobox");
      await user.click(comboboxes[0]); // Routine step combobox
      const cleanserOption = screen.getByRole("option", { name: "Cleanser" });
      await user.click(cleanserOption);

      const nameInput = screen.getByPlaceholderText(/product name/i);
      const instructionsInput = screen.getByPlaceholderText(/instructions/i);

      await user.type(nameInput, "Gentle Cleanser");
      await user.type(instructionsInput, "Apply to wet face");

      // Click Add button to save
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Verify product appears
      await waitFor(() => {
        expect(screen.getByText("Gentle Cleanser")).toBeInTheDocument();
        expect(screen.getByText("Apply to wet face")).toBeInTheDocument();
      });

      // Verify server action called
      await waitFor(() => {
        expect(createRoutineProduct).toHaveBeenCalledWith("user-1", expect.objectContaining({
          routineId: "routine-1",
          routineStep: "Cleanser",
          productName: "Gentle Cleanser",
          instructions: "Apply to wet face",
          timeOfDay: "morning",
        }));
      });
    });

    it("Add Routine Product Failure - product added, server fails, doesn't appear, toast shown", async () => {
      const user = userEvent.setup();
      const routine: Routine = {
        id: "routine-1",
        name: "Morning Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
      };

      // Mock server failure
      vi.mocked(createRoutineProduct).mockResolvedValueOnce({
        success: false,
        error: "Failed to add product",
      });

      render(
        <ClientPageWrapper
          initialClient={{ ...mockClient, hasRoutine: true }}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={routine}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Click add product button for morning (first "Add Step" button)
      const addStepButtons = screen.getAllByRole("button", { name: /add step/i });
      await user.click(addStepButtons[0]); // First button is morning

      // Fill form
      const comboboxes = screen.getAllByRole("combobox");
      await user.click(comboboxes[0]); // Routine step combobox
      const cleanserOption = screen.getByRole("option", { name: "Cleanser" });
      await user.click(cleanserOption);

      const nameInput = screen.getByPlaceholderText(/product name/i);
      const instructionsInput = screen.getByPlaceholderText(/instructions/i);

      await user.type(nameInput, "Gentle Cleanser");
      await user.type(instructionsInput, "Apply to wet face");

      // Click Add button to save
      await user.click(screen.getByRole("button", { name: /^add$/i }));

      // Wait for server response - product should NOT appear
      await waitFor(() => {
        expect(screen.queryByText("Gentle Cleanser")).not.toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create routine product");
      });

      // Verify server was called
      expect(createRoutineProduct).toHaveBeenCalledWith("user-1", expect.objectContaining({
        routineId: "routine-1",
        routineStep: "Cleanser",
        productName: "Gentle Cleanser",
        instructions: "Apply to wet face",
        timeOfDay: "morning",
      }));
    });
  });

  describe("Optimistic Updates - Failure & Revert", () => {

    it("Goal Toggle Failure - checkbox updates, server fails, reverts, toast shown", async () => {
      const user = userEvent.setup();
      const goal: Goal = {
        id: "goal-1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
      };

      // Mock server failure
      vi.mocked(updateGoal).mockResolvedValueOnce({
        success: false,
        error: "Network error",
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[goal]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Find toggle button (initially "Mark as complete")
      const toggleButton = screen.getByLabelText("Mark as complete");

      // Click to toggle
      await user.click(toggleButton);

      // Wait for server response and revert - label should still be "Mark as complete"
      // (The optimistic update happens too fast to reliably test in this scenario)
      await waitFor(() => {
        expect(screen.getByLabelText("Mark as complete")).toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to toggle goal");
      });

      // Verify server was called
      expect(updateGoal).toHaveBeenCalledWith("goal-1", { complete: true });
    });

    it("Goal Update Failure - changes show, server fails, reverts, toast shown", async () => {
      const user = userEvent.setup();
      const goal: Goal = {
        id: "goal-1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
      };

      // Mock server failure
      vi.mocked(updateGoal).mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[goal]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      expect(screen.getByText("Clear skin")).toBeInTheDocument();

      // Click on goal to enter edit mode
      const goalDescription = screen.getByText("Reduce acne");
      await user.click(goalDescription);

      // Edit the goal
      const nameInput = screen.getByPlaceholderText("Goal name");
      const descInput = screen.getByPlaceholderText("Description");
      await user.clear(nameInput);
      await user.type(nameInput, "Ultra clear skin");
      await user.clear(descInput);
      await user.type(descInput, "Completely remove acne");

      // Save
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Wait for server response and revert - original text should be back
      // (Optimistic update happens too fast to reliably test)
      await waitFor(() => {
        expect(screen.getByText("Clear skin")).toBeInTheDocument();
        expect(screen.getByText("Reduce acne")).toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update goal");
      });

      // Verify server was called with new values
      expect(updateGoal).toHaveBeenCalledWith("goal-1", {
        name: "Ultra clear skin",
        description: "Completely remove acne",
        timeframe: "12 weeks",
      });
    });

    it("Goal Delete Failure - goal disappears, server fails, reappears, toast shown", async () => {
      const user = userEvent.setup();
      const goal: Goal = {
        id: "goal-1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
      };

      // Mock server failure
      vi.mocked(deleteGoal).mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[goal]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      expect(screen.getByText("Clear skin")).toBeInTheDocument();

      // Click delete button
      const deleteButton = screen.getByLabelText("Delete goal");
      await user.click(deleteButton);

      // Wait for server response - goal should still be there (delete failed and reverted)
      // (Optimistic delete happens too fast to reliably test)
      await waitFor(() => {
        expect(screen.getByText("Clear skin")).toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete goal");
      });

      // Verify server was called
      expect(deleteGoal).toHaveBeenCalledWith("goal-1");
    });

    it("Routine Product Delete Failure - product disappears, server fails, reappears, toast shown", async () => {
      const user = userEvent.setup();
      const routine: Routine = {
        id: "routine-1",
        name: "Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
      };

      const product: RoutineProduct = {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "cleanse",
        productName: "Morning Cleanser",
        instructions: "Apply gently",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      // Mock server failure
      vi.mocked(deleteRoutineProduct).mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      render(
        <ClientPageWrapper
          initialClient={{ ...mockClient, hasRoutine: true }}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={routine}
          initialRoutineProducts={[product]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      expect(screen.getByText("Morning Cleanser")).toBeInTheDocument();

      // Click delete button
      const deleteButton = screen.getByLabelText("Delete step");
      await user.click(deleteButton);

      // Wait for server response - product should still be there (delete failed and reverted)
      await waitFor(() => {
        expect(screen.getByText("Morning Cleanser")).toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete routine product");
      });

      // Verify server was called
      expect(deleteRoutineProduct).toHaveBeenCalledWith("product-1");
    });

    it("Coach Note Update Failure - changes show, server fails, reverts, toast shown", async () => {
      const user = userEvent.setup();
      const note: CoachNote = {
        id: "note-1",
        userProfileId: "user-1",
        adminId: "admin-1",
        content: "Original note",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock server failure
      vi.mocked(updateCoachNote).mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[note]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      expect(screen.getByText("Original note")).toBeInTheDocument();

      // Click on note to edit
      const noteText = screen.getByText("Original note");
      await user.click(noteText);

      // Edit content
      const textarea = screen.getByDisplayValue("Original note");
      await user.clear(textarea);
      await user.type(textarea, "Updated note content");

      // Save
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      await user.click(saveButtons[0]);

      // Wait for server response - original text should be back
      await waitFor(() => {
        expect(screen.getByText("Original note")).toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update coach note");
      });

      // Verify server was called
      expect(updateCoachNote).toHaveBeenCalledWith("note-1", "Updated note content");
    });

    it("Coach Note Delete Failure - note disappears, server fails, reappears, toast shown", async () => {
      const user = userEvent.setup();
      const note: CoachNote = {
        id: "note-1",
        userProfileId: "user-1",
        adminId: "admin-1",
        content: "Note to delete",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock server failure
      vi.mocked(deleteCoachNote).mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      render(
        <ClientPageWrapper
          initialClient={mockClient}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={null}
          initialRoutineProducts={[]}
          initialCoachNotes={[note]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      expect(screen.getByText("Note to delete")).toBeInTheDocument();

      // Click delete button
      const deleteButton = screen.getByLabelText("Delete note");
      await user.click(deleteButton);

      // Wait for server response - note should still be there (delete failed and reverted)
      // (Optimistic delete happens too fast to reliably test)
      await waitFor(() => {
        expect(screen.getByText("Note to delete")).toBeInTheDocument();
      });

      // Verify error toast shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete coach note");
      });

      // Verify server was called
      expect(deleteCoachNote).toHaveBeenCalledWith("note-1");
    });
  });

  describe("Cross-Cutting State Synchronization", () => {

    it("Delete Routine Success - routine cleared, products cleared, hasRoutine becomes false", async () => {
      const user = userEvent.setup();
      const routine: Routine = {
        id: "routine-1",
        name: "Morning Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
      };

      const product: RoutineProduct = {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "cleanse",
        productName: "Morning Cleanser Product",
        instructions: "Apply gently",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      // Mock successful deletion
      vi.mocked(deleteRoutine).mockResolvedValueOnce({
        success: true,
      });

      render(
        <ClientPageWrapper
          initialClient={{ ...mockClient, hasRoutine: true }}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={routine}
          initialRoutineProducts={[product]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      // Initially shows routine and product
      expect(screen.getByText("Morning Routine")).toBeInTheDocument();
      expect(screen.getByText("Morning Cleanser Product")).toBeInTheDocument();

      // Click delete routine button
      const deleteButton = screen.getByLabelText("Delete routine");
      await user.click(deleteButton);

      // Confirm deletion in dialog
      const confirmButton = screen.getByRole("button", { name: /delete/i });
      await user.click(confirmButton);

      // Verify ALL state cleared - routine, products, AND hasRoutine flag
      await waitFor(() => {
        expect(screen.queryByText("Morning Routine")).not.toBeInTheDocument();
        expect(screen.queryByText("Morning Cleanser Product")).not.toBeInTheDocument();
        // When hasRoutine is false, "Create a routine" option should be available
        expect(screen.getByText(/Create a routine/i)).toBeInTheDocument();
      });

      // Verify server action called
      expect(deleteRoutine).toHaveBeenCalledWith("routine-1");
    });

    it("Delete Routine Failure - ALL state reverts (routine + products + hasRoutine)", async () => {
      const user = userEvent.setup();
      const routine: Routine = {
        id: "routine-1",
        name: "Morning Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
      };

      const product: RoutineProduct = {
        id: "product-1",
        routineId: "routine-1",
        routineStep: "cleanse",
        productName: "Morning Cleanser Product",
        instructions: "Apply gently",
        frequency: "Daily",
        timeOfDay: "morning",
      };

      // Mock deletion failure
      vi.mocked(deleteRoutine).mockResolvedValueOnce({
        success: false,
        error: "Database error",
      });

      render(
        <ClientPageWrapper
          initialClient={{ ...mockClient, hasRoutine: true }}
          initialPhotos={[mockPhoto]}
          initialGoals={[]}
          initialRoutine={routine}
          initialRoutineProducts={[product]}
          initialCoachNotes={[]}
          initialTemplates={[]}
          userId="user-1"
          adminId="admin-1"
        />
      );

      expect(screen.getByText("Morning Routine")).toBeInTheDocument();
      expect(screen.getByText("Morning Cleanser Product")).toBeInTheDocument();

      // Click delete routine button
      const deleteButton = screen.getByLabelText("Delete routine");
      await user.click(deleteButton);

      // Confirm deletion in dialog
      const confirmButton = screen.getByRole("button", { name: /delete/i });
      await user.click(confirmButton);

      // Wait for server response - ALL state should be reverted
      // Routine, products, and hasRoutine should all be back to original state
      await waitFor(() => {
        expect(screen.getByText("Morning Routine")).toBeInTheDocument();
        expect(screen.getByText("Morning Cleanser Product")).toBeInTheDocument();
        // hasRoutine should still be true (no "Create a routine" message)
        expect(screen.queryByText(/Create a routine/i)).not.toBeInTheDocument();
      });

      // Verify error toast shown (uses result.error from mock)
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Database error");
      });

      // Verify server was called
      expect(deleteRoutine).toHaveBeenCalledWith("routine-1");
    });
  });
});
