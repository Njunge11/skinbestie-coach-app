"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  createRoutine as createRoutineAction,
  updateRoutine as updateRoutineAction,
  deleteRoutine as deleteRoutineAction,
  publishRoutine as publishRoutineAction,
} from "../routine-info-actions/actions";
import { copyTemplateToUser } from "@/app/(dashboard)/routine-management/template-actions/copy-template";
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
  Routine,
  RoutineProduct,
  CoachNote,
  EditableClientData,
  GoalFormData,
  RoutineFormData,
  RoutineProductFormData,
} from "../types";

interface Template {
  id: string;
  name: string;
  description: string | null;
}

interface ClientPageWrapperProps {
  initialClient: Client;
  initialPhotos: Photo[];
  initialGoals: Goal[];
  initialRoutine: Routine | null;
  initialRoutineProducts: RoutineProduct[];
  initialCoachNotes: CoachNote[];
  initialTemplates: Template[];
  userId: string;
  adminId: string;
}

export function ClientPageWrapper({
  initialClient,
  initialPhotos,
  initialGoals,
  initialRoutine,
  initialRoutineProducts,
  initialCoachNotes,
  initialTemplates,
  userId,
  adminId,
}: ClientPageWrapperProps) {
  const [client, setClient] = useState<Client>(initialClient);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [routine, setRoutine] = useState<Routine | null>(initialRoutine);
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
      toast.error("Failed to update profile");
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
      toast.error("Failed to update photo feedback");
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

  const handleAddGoal = async (data: GoalFormData) => {
    // Call server action
    const result = await createGoal(userId, data);

    if (result.success) {
      // Add to UI
      setGoals((prev) => [...prev, result.data]);
    } else {
      console.error("Failed to create goal:", result.error);
      toast.error("Failed to create goal");
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
      toast.error("Failed to update goal");
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
      toast.error("Failed to toggle goal");
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
      toast.error("Failed to delete goal");
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
      toast.error("Failed to reorder goals");
    }
  };

  const handleUpdateRoutine = async (data: RoutineFormData) => {
    if (!routine) return;

    // Optimistically update UI
    const previousRoutine = routine;
    setRoutine((prev) => (prev ? { ...prev, ...data } : prev));

    // Call server action
    const result = await updateRoutineAction(routine.id, data);

    if (!result.success) {
      // Revert on error
      setRoutine(previousRoutine);
      console.error("Failed to update routine:", result.error);
      toast.error(result.error || "Failed to update routine");
    } else {
      setRoutine(result.data);
    }
  };

  const handlePublishRoutine = async () => {
    if (!routine) return;

    // Optimistically update UI
    const previousRoutine = routine;
    setRoutine((prev) => (prev ? { ...prev, status: "published" } : prev));

    // Call server action
    const result = await publishRoutineAction(routine.id);

    if (!result.success) {
      // Revert on error
      setRoutine(previousRoutine);
      console.error("Failed to publish routine:", result.error);
      toast.error(result.error || "Failed to publish routine");
    } else {
      setRoutine(result.data);
      toast.success("Routine published successfully");
    }
  };

  const handleCreateRoutineFromTemplate = async (
    templateId: string,
    routineName: string,
    startDate: Date,
    endDate: Date | null
  ) => {
    // Call server action
    const result = await copyTemplateToUser(templateId, userId, {
      name: routineName,
      startDate,
      endDate,
    });

    if (result.success) {
      // Update routine and products in state
      setRoutine(result.data.routine);
      setRoutineProducts(result.data.products.map(p => ({
        ...p,
        productUrl: p.productUrl ?? undefined,
        days: p.days ?? undefined,
        timeOfDay: p.timeOfDay as "morning" | "evening",
      })));
      // Update client hasRoutine flag
      setClient((prev) => ({ ...prev, hasRoutine: true }));
      toast.success("Routine created successfully");
    } else {
      console.error("Failed to create routine from template:", result.error);
      toast.error(result.error || "Failed to create routine");
    }
  };

  const handleCreateBlankRoutine = async (
    routineName: string,
    startDate: Date,
    endDate: Date | null
  ) => {
    // Call server action
    const result = await createRoutineAction(userId, {
      name: routineName,
      startDate,
      endDate,
    });

    if (result.success) {
      // Update routine in state
      setRoutine(result.data);
      // Update client hasRoutine flag
      setClient((prev) => ({ ...prev, hasRoutine: true }));
      toast.success("Routine created successfully");
    } else {
      console.error("Failed to create blank routine:", result.error);
      toast.error(result.error || "Failed to create routine");
    }
  };

  const handleDeleteRoutine = async () => {
    if (!routine) return;

    // Optimistically update UI
    const previousRoutine = routine;
    const previousProducts = routineProducts;
    setRoutine(null);
    setRoutineProducts([]);
    setClient((prev) => ({ ...prev, hasRoutine: false }));

    // Call server action
    const result = await deleteRoutineAction(routine.id);

    if (!result.success) {
      // Revert on error
      setRoutine(previousRoutine);
      setRoutineProducts(previousProducts);
      setClient((prev) => ({ ...prev, hasRoutine: true }));
      console.error("Failed to delete routine:", result.error);
      toast.error(result.error || "Failed to delete routine");
    } else {
      toast.success("Routine deleted successfully");
    }
  };

  const handleAddRoutineProduct = async (
    timeOfDay: "morning" | "evening",
    data: RoutineProductFormData
  ) => {
    if (!routine) {
      toast.error("No routine exists. Please create a routine first.");
      return;
    }

    // Call server action with routineId
    const result = await createRoutineProduct(userId, {
      ...data,
      routineId: routine.id,
      timeOfDay,
    });

    if (result.success) {
      // Add to UI
      setRoutineProducts((prev) => [...prev, result.data]);
      toast.success("Product added successfully");
    } else {
      console.error("Failed to create routine product:", result.error);
      toast.error("Failed to create routine product");
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
      toast.error("Failed to update routine product");
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
      toast.error("Failed to delete routine product");
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
      toast.error("Failed to reorder routine products");
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
      toast.error("Failed to create coach note");
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
      toast.error("Failed to update coach note");
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
      toast.error("Failed to delete coach note");
    }
  };

  return (
    <div className="space-y-6">
      <ProfileHeader client={client} onUpdate={handleUpdateClient} />

      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <ComplianceSection userId={userId} />

          <GoalsSection
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onToggleGoal={handleToggleGoal}
            onDeleteGoal={handleDeleteGoal}
            onReorderGoals={handleReorderGoals}
          />

          <RoutineSection
            routine={routine}
            products={routineProducts}
            templates={initialTemplates}
            onCreateFromTemplate={handleCreateRoutineFromTemplate}
            onCreateBlank={handleCreateBlankRoutine}
            onUpdateRoutine={handleUpdateRoutine}
            onPublishRoutine={handlePublishRoutine}
            onDeleteRoutine={handleDeleteRoutine}
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
