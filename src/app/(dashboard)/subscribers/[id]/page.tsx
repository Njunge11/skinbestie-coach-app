import { getUserProfile } from "./profile-header-actions/actions";
import { getGoals } from "./goal-actions/actions";
import { redirect } from "next/navigation";
import { ClientPageWrapper } from "./_components/client-page-wrapper";
import type { Client, Photo, Goal } from "./types";

interface SubscriberDetailPageProps {
  params: Promise<{ id: string }>;
}

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

export default async function SubscriberDetailPage({
  params,
}: SubscriberDetailPageProps) {
  const { id } = await params;

  // Fetch user profile from database
  const profileResult = await getUserProfile(id);

  if (!profileResult.success) {
    // Handle error - redirect to subscribers list
    redirect("/subscribers");
  }

  const profileData = profileResult.data;

  // Fetch goals for this user
  const goalsResult = await getGoals(id);
  const initialGoals: Goal[] = goalsResult.success ? goalsResult.data : [];

  // Transform server data to Client type
  const initialClient: Client = {
    id: profileData.id,
    name: profileData.name,
    age: profileData.age,
    email: profileData.email,
    mobile: profileData.mobile,
    occupation: profileData.occupation,
    bio: profileData.bio,
    skinType: profileData.skinType,
    concerns: profileData.concerns,
    planWeeks: 12,
    currentWeek: 1,
    startDate: "2025-10-15",
    hasRoutine: false,
  };

  return (
    <ClientPageWrapper
      initialClient={initialClient}
      initialPhotos={initialPhotos}
      initialGoals={initialGoals}
      userId={id}
    />
  );
}
