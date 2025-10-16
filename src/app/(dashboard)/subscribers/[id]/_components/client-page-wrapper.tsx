"use client";

import { useState } from "react";
import { ProfileHeader } from "./profile-header";
import { ProgressPhotos } from "./progress-photos";
import { GoalsSection } from "./goals-section";
import { RoutineSection } from "./routine-section";
import { ComplianceSection } from "./compliance-section";
import { CoachNotes } from "./coach-notes";
import { updateUserProfile } from "../profile-header-actions/actions";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  reorderGoals as reorderGoalsAction,
} from "../goal-actions/actions";
import {
  createRoutineProduct,
  updateRoutineProduct,
  deleteRoutineProduct,
  reorderRoutineProducts as reorderRoutineProductsAction,
} from "../routine-actions/actions";
import {
  createCoachNote,
  updateCoachNote,
  deleteCoachNote,
} from "../coach-notes-actions/actions";
import { updatePhotoFeedback } from "../progress-photos-actions/actions";
import type {
  Client,
  Goal,
  Photo,
  RoutineProduct,
  CoachNote,
  EditableClientData,
  GoalFormData,
  RoutineProductFormData,
} from "../types";

interface ClientPageWrapperProps {
  initialClient: Client;
  initialPhotos: Photo[];
  initialGoals: Goal[];
  initialRoutineProducts: RoutineProduct[];
  initialCoachNotes: CoachNote[];
  userId: string;
  adminId: string;
}

export function ClientPageWrapper({
  initialClient,
  initialPhotos,
  initialGoals,
  initialRoutineProducts,
  initialCoachNotes,
  userId,
  adminId,
}: ClientPageWrapperProps) {
  const [client, setClient] = useState<Client>(initialClient);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [routineProducts, setRoutineProducts] = useState<RoutineProduct[]>(
    initialRoutineProducts
  );
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>(initialCoachNotes);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);

  const handleUpdateClient = async (data: EditableClientData) => {
    // Optimistically update UI
    setClient((prev) => ({ ...prev, ...data }));

    // Call server action
    const result = await updateUserProfile(userId, data);

    if (!result.success) {
      // Revert on error
      setClient(initialClient);
      console.error("Failed to update profile:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleUpdatePhotoFeedback = async (id: string, feedback: string) => {
    // Optimistically update UI
    const previousPhotos = photos;
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, feedback } : p))
    );

    // Call server action
    const result = await updatePhotoFeedback(id, feedback);

    if (!result.success) {
      // Revert on error
      setPhotos(previousPhotos);
      console.error("Failed to update photo feedback:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handlePhotoSelect = (photo: Photo) => {
    if (selectedPhotos.find((p) => p.id === photo.id)) {
      // Deselect
      setSelectedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } else if (selectedPhotos.length < 2) {
      // Select (max 2)
      setSelectedPhotos((prev) => [...prev, photo]);
    }
  };

  const handleToggleCompareMode = () => {
    setIsCompareMode(!isCompareMode);
    setSelectedPhotos([]);
  };

  const handleCloseComparison = () => {
    setSelectedPhotos([]);
    setIsCompareMode(false);
  };

  const handleAddGoal = async (data: GoalFormData) => {
    // Call server action
    const result = await createGoal(userId, data);

    if (result.success) {
      // Add to UI
      setGoals((prev) => [...prev, result.data]);
    } else {
      console.error("Failed to create goal:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleUpdateGoal = async (id: string, data: GoalFormData) => {
    // Optimistically update UI
    const previousGoals = goals;
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...data } : g)));

    // Call server action
    const result = await updateGoal(id, data);

    if (!result.success) {
      // Revert on error
      setGoals(previousGoals);
      console.error("Failed to update goal:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleToggleGoal = async (id: string) => {
    // Find the goal to toggle
    const goalToToggle = goals.find((g) => g.id === id);
    if (!goalToToggle) return;

    // Optimistically update UI
    const previousGoals = goals;
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, complete: !g.complete } : g))
    );

    // Call server action
    const result = await updateGoal(id, { complete: !goalToToggle.complete });

    if (!result.success) {
      // Revert on error
      setGoals(previousGoals);
      console.error("Failed to toggle goal:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleDeleteGoal = async (id: string) => {
    // Optimistically update UI
    const previousGoals = goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));

    // Call server action
    const result = await deleteGoal(id);

    if (!result.success) {
      // Revert on error
      setGoals(previousGoals);
      console.error("Failed to delete goal:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleReorderGoals = async (reorderedGoals: Goal[]) => {
    // Optimistically update UI
    const previousGoals = goals;
    setGoals(reorderedGoals);

    // Extract IDs in new order
    const reorderedIds = reorderedGoals.map((g) => g.id);

    console.log("Reordering goals:", reorderedIds);

    // Call server action
    const result = await reorderGoalsAction(userId, reorderedIds);

    console.log("Reorder result:", result);

    if (!result.success) {
      // Revert on error
      setGoals(previousGoals);
      console.error("Failed to reorder goals:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleAddRoutineProduct = async (
    timeOfDay: "morning" | "evening",
    data: RoutineProductFormData
  ) => {
    // Call server action
    const result = await createRoutineProduct(userId, { ...data, timeOfDay });

    if (result.success) {
      // Add to UI
      setRoutineProducts((prev) => [...prev, result.data]);
    } else {
      console.error("Failed to create routine product:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleUpdateRoutineProduct = async (
    id: string,
    data: RoutineProductFormData
  ) => {
    // Optimistically update UI
    const previousProducts = routineProducts;
    setRoutineProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    );

    // Call server action
    const result = await updateRoutineProduct(id, data);

    if (!result.success) {
      // Revert on error
      setRoutineProducts(previousProducts);
      console.error("Failed to update routine product:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleDeleteRoutineProduct = async (id: string) => {
    // Optimistically update UI
    const previousProducts = routineProducts;
    setRoutineProducts((prev) => prev.filter((p) => p.id !== id));

    // Call server action
    const result = await deleteRoutineProduct(id);

    if (!result.success) {
      // Revert on error
      setRoutineProducts(previousProducts);
      console.error("Failed to delete routine product:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleReorderRoutineProducts = async (
    timeOfDay: "morning" | "evening",
    reorderedProducts: RoutineProduct[]
  ) => {
    // Optimistically update UI
    const previousProducts = routineProducts;
    // Replace products for this timeOfDay with reordered ones
    const otherTimeProducts = routineProducts.filter(
      (p) => p.timeOfDay !== timeOfDay
    );
    setRoutineProducts([...otherTimeProducts, ...reorderedProducts]);

    // Extract IDs in new order
    const reorderedIds = reorderedProducts.map((p) => p.id);

    // Call server action
    const result = await reorderRoutineProductsAction(
      userId,
      timeOfDay,
      reorderedIds
    );

    if (!result.success) {
      // Revert on error
      setRoutineProducts(previousProducts);
      console.error("Failed to reorder routine products:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleAddCoachNote = async (adminId: string, content: string) => {
    // Call server action
    const result = await createCoachNote(userId, adminId, content);

    if (result.success) {
      // Add to UI (prepend to show newest first)
      setCoachNotes((prev) => [result.data, ...prev]);
    } else {
      console.error("Failed to create coach note:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleUpdateCoachNote = async (noteId: string, content: string) => {
    // Optimistically update UI
    const previousNotes = coachNotes;
    setCoachNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, content, updatedAt: new Date() } : n
      )
    );

    // Call server action
    const result = await updateCoachNote(noteId, content);

    if (!result.success) {
      // Revert on error
      setCoachNotes(previousNotes);
      console.error("Failed to update coach note:", result.error);
      // TODO: Show error toast to user
    }
  };

  const handleDeleteCoachNote = async (noteId: string) => {
    // Optimistically update UI
    const previousNotes = coachNotes;
    setCoachNotes((prev) => prev.filter((n) => n.id !== noteId));

    // Call server action
    const result = await deleteCoachNote(noteId);

    if (!result.success) {
      // Revert on error
      setCoachNotes(previousNotes);
      console.error("Failed to delete coach note:", result.error);
      // TODO: Show error toast to user
    }
  };

  return (
    <div className="space-y-6">
      <ProfileHeader client={client} onUpdate={handleUpdateClient} />

      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <ComplianceSection />

          <GoalsSection
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onToggleGoal={handleToggleGoal}
            onDeleteGoal={handleDeleteGoal}
            onReorderGoals={handleReorderGoals}
          />

          <RoutineSection
            products={routineProducts}
            onAddProduct={handleAddRoutineProduct}
            onUpdateProduct={handleUpdateRoutineProduct}
            onDeleteProduct={handleDeleteRoutineProduct}
            onReorderProducts={handleReorderRoutineProducts}
          />

          <ProgressPhotos
            photos={photos}
            onUpdateFeedback={handleUpdatePhotoFeedback}
            isCompareMode={isCompareMode}
            selectedPhotos={selectedPhotos}
            onPhotoSelect={handlePhotoSelect}
            onToggleCompareMode={handleToggleCompareMode}
          />
        </div>

        {/* Right Sidebar - full width on mobile/tablet, sidebar on desktop */}
        <div className="w-full xl:w-80">
          <CoachNotes
            notes={coachNotes}
            adminId={adminId}
            onAddNote={handleAddCoachNote}
            onUpdateNote={handleUpdateCoachNote}
            onDeleteNote={handleDeleteCoachNote}
          />
        </div>
      </div>
    </div>
  );
}
