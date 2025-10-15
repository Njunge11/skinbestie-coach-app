"use client";

import { useState } from "react";
import { ProfileHeader } from "./_components/profile-header";
import { ProgressPhotos } from "./_components/progress-photos";
import { GoalsSection } from "./_components/goals-section";
import { RoutineSection } from "./_components/routine-section";
import { ComplianceSection } from "./_components/compliance-section";
import { CoachNotes } from "./_components/coach-notes";
import type {
  Client,
  Goal,
  Photo,
  EditableClientData,
  GoalFormData,
} from "./types";

interface SubscriberDetailPageProps {
  params: { id: string };
}

// Dummy data
const initialClient: Client = {
  id: "1",
  name: "Sarah Chen",
  age: 28,
  email: "sarah.chen@email.com",
  mobile: "+1 (415) 555-0123",
  occupation: "",
  bio: "",
  skinType: "Combination",
  concerns: ["Acne", "Dark Spots", "Texture"],
  planWeeks: 12,
  currentWeek: 1,
  startDate: "2025-10-15",
  hasRoutine: false,
};

const initialPhotos: Photo[] = [
  {
    id: 1,
    date: "2025-10-15",
    month: "Week 20",
    feedback:
      "Significant reduction in active breakouts. Texture improving nicely.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
  },
  {
    id: 2,
    date: "2025-10-08",
    month: "Week 19",
    feedback: "Purging phase complete. Starting to see results from tretinoin.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop",
  },
  {
    id: 3,
    date: "2025-10-01",
    month: "Week 18",
    feedback: "Baseline photos. Active acne on forehead and chin areas.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop",
  },
  {
    id: 4,
    date: "2025-09-24",
    month: "Week 17",
    feedback: "Slight irritation from new product introduction.",
    image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop",
  },
  {
    id: 5,
    date: "2025-09-17",
    month: "Week 16",
    feedback: "Good progress with hydration levels.",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop",
  },
  {
    id: 6,
    date: "2025-09-10",
    month: "Week 15",
    feedback: "Texture smoothing out well.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
  },
  {
    id: 7,
    date: "2025-09-03",
    month: "Week 14",
    feedback: "Dark spots beginning to fade.",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop",
  },
  {
    id: 8,
    date: "2025-08-27",
    month: "Week 13",
    feedback: "Overall skin tone improving.",
    image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop",
  },
  {
    id: 9,
    date: "2025-08-20",
    month: "Week 12",
    feedback: "Reduced redness in cheek area.",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop",
  },
  {
    id: 10,
    date: "2025-08-13",
    month: "Week 11",
    feedback: "Client reports less sensitivity.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop",
  },
  {
    id: 11,
    date: "2025-08-06",
    month: "Week 10",
    feedback: "Pores appear smaller.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop",
  },
  {
    id: 12,
    date: "2025-07-30",
    month: "Week 9",
    feedback: "Good barrier function recovery.",
    image: "https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=400&h=500&fit=crop",
  },
  {
    id: 13,
    date: "2025-07-23",
    month: "Week 8",
    feedback: "Breakout frequency decreasing.",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop",
  },
  {
    id: 14,
    date: "2025-07-16",
    month: "Week 7",
    feedback: "Glow starting to show through.",
    image: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400&h=500&fit=crop",
  },
  {
    id: 15,
    date: "2025-07-09",
    month: "Week 6",
    feedback: "Skin bounce improving.",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=500&fit=crop",
  },
  {
    id: 16,
    date: "2025-07-02",
    month: "Week 5",
    feedback: "Less oiliness in T-zone.",
    image: "https://images.unsplash.com/photo-1521310192545-4ac7951413f0?w=400&h=500&fit=crop",
  },
  {
    id: 17,
    date: "2025-06-25",
    month: "Week 4",
    feedback: "Makeup application smoother.",
    image: "https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=400&h=500&fit=crop",
  },
  {
    id: 18,
    date: "2025-06-18",
    month: "Week 3",
    feedback: "Initial adjustment period.",
    image: "https://images.unsplash.com/photo-1546967191-fdfb13ed6b1e?w=400&h=500&fit=crop",
  },
  {
    id: 19,
    date: "2025-06-11",
    month: "Week 2",
    feedback: "Starting routine compliance good.",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=500&fit=crop",
  },
  {
    id: 20,
    date: "2025-06-04",
    month: "Week 1",
    feedback: "Baseline documentation complete.",
    image: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&h=500&fit=crop",
  },
];

export default function SubscriberDetailPage({
  params,
}: SubscriberDetailPageProps) {
  const [client, setClient] = useState<Client>(initialClient);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);

  const handleUpdateClient = (data: EditableClientData) => {
    setClient((prev) => ({ ...prev, ...data }));
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
