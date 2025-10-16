"use client";

import { useState } from "react";
import { ProfileHeader } from "./profile-header";
import { ProgressPhotos } from "./progress-photos";
import { GoalsSection } from "./goals-section";
import { RoutineSection } from "./routine-section";
import { ComplianceSection } from "./compliance-section";
import { CoachNotes } from "./coach-notes";
import { updateUserProfile } from "../profile-header-actions/actions";
import type {
  Client,
  Goal,
  Photo,
  EditableClientData,
  GoalFormData,
} from "../types";

interface ClientPageWrapperProps {
  initialClient: Client;
  initialPhotos: Photo[];
  userId: string;
}

export function ClientPageWrapper({
  initialClient,
  initialPhotos,
  userId,
}: ClientPageWrapperProps) {
  const [client, setClient] = useState<Client>(initialClient);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [goals, setGoals] = useState<Goal[]>([]);
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

  const handleUpdatePhotoFeedback = (id: number, feedback: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, feedback } : p))
    );
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

  const handleAddGoal = (data: GoalFormData) => {
    const newGoal: Goal = {
      id: Date.now(),
      ...data,
      complete: false,
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const handleUpdateGoal = (id: number, data: GoalFormData) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...data } : g)));
  };

  const handleToggleGoal = (id: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, complete: !g.complete } : g))
    );
  };

  const handleDeleteGoal = (id: number) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleReorderGoals = (reorderedGoals: Goal[]) => {
    setGoals(reorderedGoals);
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

          <RoutineSection />

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
          <CoachNotes />
        </div>
      </div>
    </div>
  );
}
