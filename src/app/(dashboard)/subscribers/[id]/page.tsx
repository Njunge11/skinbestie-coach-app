import { getUserProfile } from "./profile-header-actions/actions";
import { getGoals } from "./goal-actions/actions";
import { getRoutineProducts } from "./routine-actions/actions";
import { getCoachNotes } from "./coach-notes-actions/actions";
import { getProgressPhotos } from "./progress-photos-actions/actions";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ClientPageWrapper } from "./_components/client-page-wrapper";
import type { Client, Photo, Goal, RoutineProduct, CoachNote } from "./types";

interface SubscriberDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubscriberDetailPage({
  params,
}: SubscriberDetailPageProps) {
  const { id } = await params;

  // Get the current admin session
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const adminId = session.user.id;

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

  // Fetch routine products for this user
  const routineProductsResult = await getRoutineProducts(id);
  const initialRoutineProducts: RoutineProduct[] = routineProductsResult.success
    ? routineProductsResult.data
    : [];

  // Fetch coach notes for this user
  const coachNotesResult = await getCoachNotes(id);
  const initialCoachNotes: CoachNote[] = coachNotesResult.success
    ? coachNotesResult.data
    : [];

  // Fetch progress photos for this user
  const photosResult = await getProgressPhotos(id);
  const initialPhotos: Photo[] = photosResult.success ? photosResult.data : [];

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
      initialRoutineProducts={initialRoutineProducts}
      initialCoachNotes={initialCoachNotes}
      userId={id}
      adminId={adminId}
    />
  );
}
