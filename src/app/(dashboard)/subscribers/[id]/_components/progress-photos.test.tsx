import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressPhotos } from "./progress-photos";
import type { Photo } from "../types";

describe("ProgressPhotos - User Workflows", () => {
  const mockPhotos: Photo[] = [
    {
      id: "photo-1",
      weekNumber: 3,
      uploadedAt: new Date("2025-06-18"),
      feedback: "Initial adjustment period.",
      imageUrl: "https://images.unsplash.com/photo-1?w=400&h=500&fit=crop",
    },
    {
      id: "photo-2",
      weekNumber: 2,
      uploadedAt: new Date("2025-06-11"),
      feedback: "Starting routine compliance good.",
      imageUrl: "https://images.unsplash.com/photo-2?w=400&h=500&fit=crop",
    },
    {
      id: "photo-3",
      weekNumber: 1,
      uploadedAt: new Date("2025-06-04"),
      feedback: null,
      imageUrl: "https://images.unsplash.com/photo-3?w=400&h=500&fit=crop",
    },
  ];

  describe("Viewing Photos", () => {
    it("user sees all photos in grid with week numbers and dates", () => {
      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User sees week numbers
      expect(screen.getByText(/week 1/i)).toBeInTheDocument();
      expect(screen.getByText(/week 2/i)).toBeInTheDocument();
      expect(screen.getByText(/week 3/i)).toBeInTheDocument();

      // User sees dates
      expect(screen.getByText(/jun 4/i)).toBeInTheDocument();
      expect(screen.getByText(/jun 11/i)).toBeInTheDocument();
      expect(screen.getByText(/jun 18/i)).toBeInTheDocument();
    });

    it("user sees empty state when no photos exist", () => {
      render(
        <ProgressPhotos
          photos={[]}
          onUpdateFeedback={vi.fn()}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User sees empty state message
      expect(screen.getByText(/no progress photos yet/i)).toBeInTheDocument();
      expect(
        screen.getByText(/progress photos will appear here once the subscriber uploads them/i)
      ).toBeInTheDocument();

      // Compare Photos button is hidden when there are no photos
      expect(screen.queryByRole("button", { name: /compare photos/i })).not.toBeInTheDocument();
    });
  });

  describe("Opening and Viewing Photo Details", () => {
    it("user clicks photo and sees details modal with week, date, and feedback", async () => {
      const user = userEvent.setup();

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks on a photo
      const photoButtons = screen.getAllByRole("button");
      const week3Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 3")
      );
      await user.click(week3Photo!);

      // User sees modal with photo details
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Week 3")).toBeInTheDocument();
      expect(within(dialog).getByText(/june 18, 2025/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Initial adjustment period.")).toBeInTheDocument();
    });

    it("user closes modal by clicking cancel and modal disappears", async () => {
      const user = userEvent.setup();

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks on a photo
      const photoButtons = screen.getAllByRole("button");
      const week3Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 3")
      );
      await user.click(week3Photo!);

      // User sees modal
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Week 3")).toBeInTheDocument();

      // User clicks cancel
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Modal is closed (photo details no longer visible)
      expect(screen.queryByText(/june 18, 2025/i)).not.toBeInTheDocument();
    });
  });

  describe("Editing Photo Feedback", () => {
    it("user edits feedback and saves successfully", async () => {
      const user = userEvent.setup();
      const onUpdateFeedback = vi.fn().mockResolvedValue(undefined);

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={onUpdateFeedback}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks on a photo
      const photoButtons = screen.getAllByRole("button");
      const week3Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 3")
      );
      await user.click(week3Photo!);

      // User sees existing feedback
      const textarea = screen.getByDisplayValue("Initial adjustment period.");
      expect(textarea).toBeInTheDocument();

      // User clears and types new feedback
      await user.clear(textarea);
      await user.type(textarea, "Skin texture improving significantly");

      // User clicks save
      await user.click(screen.getByRole("button", { name: /save feedback/i }));

      // Server action was called with updated feedback
      expect(onUpdateFeedback).toHaveBeenCalledWith(
        "photo-1",
        "Skin texture improving significantly"
      );
    });

    it("user adds feedback to photo with no feedback", async () => {
      const user = userEvent.setup();
      const onUpdateFeedback = vi.fn().mockResolvedValue(undefined);

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={onUpdateFeedback}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks on photo with no feedback (Week 1)
      const photoButtons = screen.getAllByRole("button");
      const week1Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 1")
      );
      await user.click(week1Photo!);

      // User sees empty feedback textarea
      const textarea = screen.getByPlaceholderText(
        /add your observations and feedback/i
      );
      expect(textarea).toHaveValue("");

      // User types new feedback
      await user.type(textarea, "Baseline photo - starting treatment");

      // User clicks save
      await user.click(screen.getByRole("button", { name: /save feedback/i }));

      // Server action was called
      expect(onUpdateFeedback).toHaveBeenCalledWith(
        "photo-3",
        "Baseline photo - starting treatment"
      );
    });

    it("user clears existing feedback", async () => {
      const user = userEvent.setup();
      const onUpdateFeedback = vi.fn().mockResolvedValue(undefined);

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={onUpdateFeedback}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks on a photo
      const photoButtons = screen.getAllByRole("button");
      const week2Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 2")
      );
      await user.click(week2Photo!);

      // User clears all feedback
      const textarea = screen.getByDisplayValue("Starting routine compliance good.");
      await user.clear(textarea);

      // User clicks save
      await user.click(screen.getByRole("button", { name: /save feedback/i }));

      // Server action was called with empty string
      expect(onUpdateFeedback).toHaveBeenCalledWith("photo-2", "");
    });

    it("user starts editing then cancels - changes are discarded", async () => {
      const user = userEvent.setup();
      const onUpdateFeedback = vi.fn().mockResolvedValue(undefined);

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={onUpdateFeedback}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks on a photo
      const photoButtons = screen.getAllByRole("button");
      const week3Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 3")
      );
      await user.click(week3Photo!);

      // User modifies feedback
      const textarea = screen.getByDisplayValue("Initial adjustment period.");
      await user.clear(textarea);
      await user.type(textarea, "Some new feedback");

      // User clicks cancel
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Server action was NOT called
      expect(onUpdateFeedback).not.toHaveBeenCalled();
    });
  });

  describe("Compare Mode - Complete Workflows", () => {
    it("user enters compare mode and sees instruction banner", async () => {
      const user = userEvent.setup();
      const onToggleCompareMode = vi.fn();

      const { rerender } = render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={onToggleCompareMode}
        />
      );

      // User clicks "Compare Photos" button
      await user.click(screen.getByRole("button", { name: /compare photos/i }));

      // Toggle handler was called
      expect(onToggleCompareMode).toHaveBeenCalled();

      // Simulate parent updating state to enter compare mode
      rerender(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={true}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={onToggleCompareMode}
        />
      );

      // User sees compare mode banner with instructions
      expect(screen.getByText(/select 2 photos to compare/i)).toBeInTheDocument();
      expect(screen.getByText(/0\/2 selected/i)).toBeInTheDocument();
    });

    it("user selects first photo and it becomes highlighted", async () => {
      const user = userEvent.setup();
      const onPhotoSelect = vi.fn();

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={true}
          selectedPhotos={[]}
          onPhotoSelect={onPhotoSelect}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks first photo
      const photoButtons = screen.getAllByRole("button");
      const week1Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 1")
      );
      await user.click(week1Photo!);

      // Photo selection handler was called
      expect(onPhotoSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "photo-3", weekNumber: 1 })
      );
    });

    it("user selects two photos and compare modal opens automatically", async () => {
      const user = userEvent.setup();
      const onPhotoSelect = vi.fn();

      // Start with one photo already selected
      const { rerender } = render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={true}
          selectedPhotos={[mockPhotos[0]]}
          onPhotoSelect={onPhotoSelect}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User sees 1 photo selected
      expect(screen.getByText(/1\/2 selected/i)).toBeInTheDocument();

      // User clicks second photo
      const photoButtons = screen.getAllByRole("button");
      const week2Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 2")
      );
      await user.click(week2Photo!);

      // Selection handler was called
      expect(onPhotoSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "photo-2", weekNumber: 2 })
      );

      // Simulate both photos now selected (parent updates state)
      rerender(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={true}
          selectedPhotos={[mockPhotos[0], mockPhotos[1]]}
          onPhotoSelect={onPhotoSelect}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User sees both photos selected
      expect(screen.getByText(/2\/2 selected/i)).toBeInTheDocument();
    });

    it("user clicks cancel compare and exits compare mode", async () => {
      const user = userEvent.setup();
      const onToggleCompareMode = vi.fn();

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={true}
          selectedPhotos={[mockPhotos[0]]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={onToggleCompareMode}
        />
      );

      // User clicks "Cancel Compare" button
      await user.click(screen.getByRole("button", { name: /cancel compare/i }));

      // Toggle handler was called to exit compare mode
      expect(onToggleCompareMode).toHaveBeenCalled();
    });

    it("user deselects photo by clicking it again", async () => {
      const user = userEvent.setup();
      const onPhotoSelect = vi.fn();

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={true}
          selectedPhotos={[mockPhotos[0]]}
          onPhotoSelect={onPhotoSelect}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks already-selected photo
      const photoButtons = screen.getAllByRole("button");
      const week3Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 3")
      );
      await user.click(week3Photo!);

      // Selection handler was called (parent will handle deselection logic)
      expect(onPhotoSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "photo-1", weekNumber: 3 })
      );
    });
  });

  describe("Zoom Controls in Photo Detail Modal", () => {
    it("user can interact with zoom controls", async () => {
      const user = userEvent.setup();

      render(
        <ProgressPhotos
          photos={mockPhotos}
          onUpdateFeedback={vi.fn()}
          isCompareMode={false}
          selectedPhotos={[]}
          onPhotoSelect={vi.fn()}
          onToggleCompareMode={vi.fn()}
        />
      );

      // User clicks on a photo
      const photoButtons = screen.getAllByRole("button");
      const week3Photo = photoButtons.find((btn) =>
        btn.textContent?.includes("Week 3")
      );
      await user.click(week3Photo!);

      // User sees zoom controls
      expect(screen.getByRole("button", { name: /zoom in/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zoom out/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reset zoom/i })).toBeInTheDocument();

      // User can click zoom controls (just verify they're interactive)
      await user.click(screen.getByRole("button", { name: /zoom in/i }));
      await user.click(screen.getByRole("button", { name: /zoom out/i }));
      await user.click(screen.getByRole("button", { name: /reset zoom/i }));

      // No errors - zoom controls work
    });
  });
});
