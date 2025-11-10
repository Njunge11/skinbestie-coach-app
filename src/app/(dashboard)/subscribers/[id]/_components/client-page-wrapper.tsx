"use client";

import { useState, useOptimistic, startTransition } from "react";
import { toast } from "sonner";
import { ProfileHeader } from "./profile-header";
import { SkinProfileSection } from "./skin-profile-section";
import { ProgressPhotos } from "./progress-photos";
import { GoalsSection } from "./goals-section";
import { RoutineSection } from "./routine-section";
import { ComplianceSection } from "./compliance-section";
import { CoachNotesPanel } from "./coach-notes-panel";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  reorderGoals as reorderGoalsAction,
  toggleTemplatePublish,
  toggleGoalComplete,
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
  GoalsTemplate,
  Photo,
  Routine,
  RoutineProduct,
  CoachNote,
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
  initialGoalsTemplate: GoalsTemplate | null;
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
  initialGoalsTemplate,
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
  const [goalsTemplate, setGoalsTemplate] = useState<GoalsTemplate | null>(
    initialGoalsTemplate,
  );
  const [routine, setRoutine] = useState<Routine | null>(initialRoutine);
  const [routineProducts, setRoutineProducts] = useState<RoutineProduct[]>(
    initialRoutineProducts,
  );
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>(initialCoachNotes);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [isCoachNotesPanelOpen, setIsCoachNotesPanelOpen] = useState(false);

  // Optimistic state for drag-and-drop reordering
  const [optimisticGoals, setOptimisticGoals] = useOptimistic(
    goals,
    (_state, newGoals: Goal[]) => newGoals,
  );
  const [optimisticRoutineProducts, setOptimisticRoutineProducts] =
    useOptimistic(
      routineProducts,
      (_state, newProducts: RoutineProduct[]) => newProducts,
    );

  // Optimistic state for coach notes
  const [optimisticCoachNotes, setOptimisticCoachNotes] = useOptimistic(
    coachNotes,
    (_state, newNotes: CoachNote[]) => newNotes,
  );

  // Optimistic state for photos
  const [optimisticPhotos, setOptimisticPhotos] = useOptimistic(
    photos,
    (_state, newPhotos: Photo[]) => newPhotos,
  );

  const handleUpdatePhotoFeedback = async (id: string, feedback: string) => {
    // Optimistic update
    const newPhotos = photos.map((p) => (p.id === id ? { ...p, feedback } : p));
    startTransition(() => {
      setOptimisticPhotos(newPhotos);
    });

    // Call server action
    const result = await updatePhotoFeedback(id, feedback);

    if (result.success) {
      setPhotos(newPhotos);
    } else {
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
    // If marking as primary, unmark all other goals first
    let updatedGoals = goals;
    if (data.isPrimaryGoal) {
      updatedGoals = goals.map((g) => ({ ...g, isPrimaryGoal: false }));
    }

    // Create optimistic goal with temp ID
    const optimisticGoal: Goal = {
      id: `temp-${Date.now()}`,
      templateId: goalsTemplate?.id || "",
      description: data.description,
      timeline: null,
      isPrimaryGoal: data.isPrimaryGoal ?? false,
      complete: false,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      order: updatedGoals.length,
    };

    // Optimistic update
    const newGoals = [...updatedGoals, optimisticGoal];
    startTransition(() => {
      setOptimisticGoals(newGoals);
    });

    // Call server action (will create template if needed)
    const result = await createGoal(userId, data);

    if (result.success) {
      // If marking as primary, unmark all existing goals
      if (data.isPrimaryGoal) {
        setGoals((prev) => prev.map((g) => ({ ...g, isPrimaryGoal: false })));
      }
      // Replace temp goal with real one
      setGoals((prev) => [
        ...prev.filter((g) => !g.id.startsWith("temp-")),
        result.data,
      ]);
      // If this was the first goal, we now have a template
      if (!goalsTemplate) {
        // You might want to refetch the template here or update it
        // For now, we'll just mark that we have one
        setGoalsTemplate(
          (prev) =>
            prev || {
              id: result.data.templateId,
              userId,
              status: "unpublished",
              createdBy: adminId,
              updatedBy: adminId,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
        );
      }
    } else {
      console.error("Failed to create goal:", result.error);
      toast.error("Failed to create goal");
    }
  };

  const handleUpdateGoal = async (id: string, data: GoalFormData) => {
    // If marking as primary, unmark all other goals first
    let updatedGoals = goals;
    if (data.isPrimaryGoal) {
      updatedGoals = goals.map((g) =>
        g.id === id ? { ...g, ...data } : { ...g, isPrimaryGoal: false },
      );
    } else {
      updatedGoals = goals.map((g) => (g.id === id ? { ...g, ...data } : g));
    }

    // Optimistic update
    startTransition(() => {
      setOptimisticGoals(updatedGoals);
    });

    // Call server action
    const result = await updateGoal(id, data);

    if (result.success) {
      setGoals(updatedGoals);
    } else {
      console.error("Failed to update goal:", result.error);
      toast.error("Failed to update goal");
    }
  };

  const handleToggleGoal = async (id: string) => {
    // Find the goal to toggle
    const goalToToggle = goals.find((g) => g.id === id);
    if (!goalToToggle) return;

    // Optimistic update
    const newGoals = goals.map((g) =>
      g.id === id
        ? {
            ...g,
            complete: !g.complete,
            completedAt: !g.complete ? new Date() : null,
          }
        : g,
    );
    startTransition(() => {
      setOptimisticGoals(newGoals);
    });

    // Call server action
    const result = await toggleGoalComplete(id);

    if (result.success) {
      setGoals(newGoals);
    } else {
      console.error("Failed to toggle goal:", result.error);
      toast.error("Failed to toggle goal");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    // Optimistic update
    const newGoals = goals.filter((g) => g.id !== id);
    startTransition(() => {
      setOptimisticGoals(newGoals);
    });

    // Call server action
    const result = await deleteGoal(id);

    if (result.success) {
      setGoals(newGoals);
    } else {
      console.error("Failed to delete goal:", result.error);
      toast.error("Failed to delete goal");
    }
  };

  const handlePublishToggle = async () => {
    if (!goalsTemplate) return;

    const result = await toggleTemplatePublish(userId);

    if (result.success) {
      setGoalsTemplate(result.data);
      toast.success(
        result.data.status === "published"
          ? "Goals published successfully"
          : "Goals unpublished successfully",
      );
    } else {
      console.error("Failed to toggle publish status:", result.error);
      toast.error("Failed to update publish status");
    }
  };

  const handleReorderGoals = async (reorderedGoals: Goal[]) => {
    // Extract IDs in new order
    const reorderedIds = reorderedGoals.map((g) => g.id);

    // Optimistic update must be inside startTransition
    startTransition(() => {
      setOptimisticGoals(reorderedGoals);
    });

    // Call server action - needs templateId now
    if (!goalsTemplate) {
      console.error("Cannot reorder goals without template");
      toast.error("Cannot reorder goals");
      return;
    }
    const result = await reorderGoalsAction(goalsTemplate.id, reorderedIds);

    if (result.success) {
      // Update actual state on success
      setGoals(reorderedGoals);
    } else {
      // useOptimistic automatically reverts on error
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
    endDate: Date | null,
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
      setRoutineProducts(result.data.products as RoutineProduct[]);
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
    endDate: Date | null,
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
    data: RoutineProductFormData,
  ) => {
    if (!routine) {
      toast.error("No routine exists. Please create a routine first.");
      return;
    }

    // Create optimistic product with temp ID
    const sameTimeProducts = routineProducts.filter(
      (p) => p.timeOfDay === timeOfDay,
    );
    const optimisticProduct: RoutineProduct = {
      id: `temp-${Date.now()}`,
      routineId: routine.id,
      userProfileId: userId,
      ...data,
      productUrl: data.productUrl ?? null,
      productPurchaseInstructions: data.productPurchaseInstructions ?? null,
      days: data.days ?? null,
      timeOfDay,
      order: sameTimeProducts.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Optimistic update
    const newProducts = [...routineProducts, optimisticProduct];
    startTransition(() => {
      setOptimisticRoutineProducts(newProducts);
    });

    // Call server action with routineId
    const result = await createRoutineProduct(userId, {
      ...data,
      days: data.days ?? null,
      routineId: routine.id,
      timeOfDay,
    });

    if (result.success) {
      // Replace temp product with real one
      setRoutineProducts((prev) => [
        ...prev.filter((p) => !p.id.startsWith("temp-")),
        result.data,
      ]);
      toast.success("Product added successfully");
    } else {
      console.error("Failed to create routine product:", result.error);
      toast.error("Failed to create routine product");
    }
  };

  const handleUpdateRoutineProduct = async (
    id: string,
    data: RoutineProductFormData,
  ) => {
    // Optimistic update
    const newProducts = routineProducts.map((p) =>
      p.id === id ? { ...p, ...data } : p,
    );
    startTransition(() => {
      setOptimisticRoutineProducts(newProducts);
    });

    // Call server action
    const result = await updateRoutineProduct(id, data);

    if (result.success) {
      setRoutineProducts(newProducts);
    } else {
      console.error("Failed to update routine product:", result.error);
      toast.error("Failed to update routine product");
    }
  };

  const handleDeleteRoutineProduct = async (id: string) => {
    // Optimistic update
    const newProducts = routineProducts.filter((p) => p.id !== id);
    startTransition(() => {
      setOptimisticRoutineProducts(newProducts);
    });

    // Call server action
    const result = await deleteRoutineProduct(id);

    if (result.success) {
      setRoutineProducts(newProducts);
    } else {
      console.error("Failed to delete routine product:", result.error);
      toast.error("Failed to delete routine product");
    }
  };

  const handleReorderRoutineProducts = async (
    timeOfDay: "morning" | "evening",
    reorderedProducts: RoutineProduct[],
  ) => {
    // Replace products for this timeOfDay with reordered ones
    const otherTimeProducts = routineProducts.filter(
      (p) => p.timeOfDay !== timeOfDay,
    );
    const newProducts = [...otherTimeProducts, ...reorderedProducts];

    // Extract IDs in new order
    const reorderedIds = reorderedProducts.map((p) => p.id);

    // Optimistic update must be inside startTransition
    startTransition(() => {
      setOptimisticRoutineProducts(newProducts);
    });

    // Call server action
    const result = await reorderRoutineProductsAction(
      userId,
      timeOfDay,
      reorderedIds,
    );

    if (result.success) {
      // Update actual state on success
      setRoutineProducts(newProducts);
    } else {
      // useOptimistic automatically reverts on error
      console.error("Failed to reorder routine products:", result.error);
      toast.error("Failed to reorder routine products");
    }
  };

  const handleAddCoachNote = async (adminId: string, content: string) => {
    // Create optimistic note with temporary ID
    const optimisticNote: CoachNote = {
      id: `temp-${Date.now()}`,
      userProfileId: userId,
      adminId,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Optimistic update IMMEDIATELY (prepend to show newest first)
    const newNotes = [optimisticNote, ...coachNotes];
    startTransition(() => {
      setOptimisticCoachNotes(newNotes);
    });

    // Call server action (in background)
    const result = await createCoachNote(userId, adminId, content);

    if (result.success) {
      // Replace temp note with real one
      setCoachNotes((prev) => [result.data, ...prev]);
    } else {
      // Revert on error
      console.error("Failed to create coach note:", result.error);
      toast.error("Failed to create coach note");
    }
  };

  const handleUpdateCoachNote = async (noteId: string, content: string) => {
    // Optimistic update IMMEDIATELY
    const newNotes = coachNotes.map((n) =>
      n.id === noteId ? { ...n, content, updatedAt: new Date() } : n,
    );
    startTransition(() => {
      setOptimisticCoachNotes(newNotes);
    });

    // Call server action (in background)
    const result = await updateCoachNote(noteId, content);

    if (result.success) {
      setCoachNotes(newNotes);
    } else {
      // Optimistic state will revert automatically
      console.error("Failed to update coach note:", result.error);
      toast.error("Failed to update coach note");
    }
  };

  const handleDeleteCoachNote = async (noteId: string) => {
    // Optimistic update IMMEDIATELY
    const newNotes = coachNotes.filter((n) => n.id !== noteId);
    startTransition(() => {
      setOptimisticCoachNotes(newNotes);
    });

    // Call server action (in background)
    const result = await deleteCoachNote(noteId);

    if (result.success) {
      setCoachNotes(newNotes);
    } else {
      // Optimistic state will revert automatically
      console.error("Failed to delete coach note:", result.error);
      toast.error("Failed to delete coach note");
    }
  };

  return (
    <div className="space-y-6">
      <ProfileHeader client={client} />

      <SkinProfileSection
        skinType={client.skinType ? [client.skinType] : null}
        age={client.age}
        concerns={client.concerns}
        startedJourney={client.startDate}
      />

      {/* Main Content */}
      <div className="space-y-6">
        <ComplianceSection userId={userId} />

        <GoalsSection
          goals={optimisticGoals}
          template={goalsTemplate}
          onAddGoal={handleAddGoal}
          onUpdateGoal={handleUpdateGoal}
          onToggleGoal={handleToggleGoal}
          onDeleteGoal={handleDeleteGoal}
          onReorderGoals={handleReorderGoals}
          onPublishToggle={handlePublishToggle}
          showMainFocus={true}
          showCheckbox={false}
        />

        <RoutineSection
          routine={routine}
          products={optimisticRoutineProducts}
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
          photos={optimisticPhotos}
          onUpdateFeedback={handleUpdatePhotoFeedback}
          isCompareMode={isCompareMode}
          selectedPhotos={selectedPhotos}
          onPhotoSelect={handlePhotoSelect}
          onToggleCompareMode={handleToggleCompareMode}
        />
      </div>

      {/* Floating Action Button for Coach Notes */}
      <Button
        onClick={() => setIsCoachNotesPanelOpen(true)}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-30 p-0"
        aria-label="Open coach notes"
      >
        <div className="relative">
          <FileText className="w-5 h-5" />
          {coachNotes.length > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {coachNotes.length}
            </span>
          )}
        </div>
      </Button>

      {/* Coach Notes Side Panel */}
      <CoachNotesPanel
        isOpen={isCoachNotesPanelOpen}
        onClose={() => setIsCoachNotesPanelOpen(false)}
        notes={optimisticCoachNotes}
        adminId={adminId}
        onAddNote={handleAddCoachNote}
        onUpdateNote={handleUpdateCoachNote}
        onDeleteNote={handleDeleteCoachNote}
      />
    </div>
  );
}
