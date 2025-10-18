import { getUserProfile } from "./profile-header-actions/actions";
import { getGoals } from "./goal-actions/actions";
import { getRoutineProducts } from "./routine-actions/actions";
import { getRoutine } from "./routine-info-actions/actions";
import { getCoachNotes } from "./coach-notes-actions/actions";
import { getProgressPhotos } from "./progress-photos-actions/actions";
import { getTemplates } from "@/app/(dashboard)/routine-management/template-actions/actions";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ClientPageWrapper } from "./_components/client-page-wrapper";
import type { Client, Photo, Goal, RoutineProduct, CoachNote, Routine } from "./types";

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

  // Fetch routine for this user
  const routineResult = await getRoutine(id);
  const initialRoutine: Routine | null = routineResult.success ? routineResult.data : null;

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

  // Fetch templates
  const templatesResult = await getTemplates();
  const initialTemplates = templatesResult.success ? templatesResult.data : [];

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
    hasRoutine: initialRoutine !== null,
  };

  return (
    <ClientPageWrapper
      initialClient={initialClient}
      initialPhotos={initialPhotos}
      initialGoals={initialGoals}
      initialRoutine={initialRoutine}
      initialRoutineProducts={initialRoutineProducts}
      initialCoachNotes={initialCoachNotes}
      initialTemplates={initialTemplates}
      userId={id}
      adminId={adminId}
    />
  );
}
