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

interface SubscriberDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubscriberDetailPage({
  params,
}: SubscriberDetailPageProps) {
  const { id } = await params;

  // Auth check (must complete before anything else)
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const adminId = session.user.id;

  // Fetch profile (critical - must complete before rendering)
  const profileResult = await getUserProfile(id);
  if (!profileResult.success) {
    redirect("/subscribers");
  }
  const profileData = profileResult.data;

  // Transform to Client type
  const initialClient = {
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
    hasRoutine: false, // Will be updated when routine loads
  };

  // Start all data fetches in parallel (don't await yet!)
  const goalsPromise = getGoals(id);
  const routinePromise = getRoutine(id);
  const routineProductsPromise = getRoutineProducts(id);
  const coachNotesPromise = getCoachNotes(id);
  const photosPromise = getProgressPhotos(id);
  const templatesPromise = getTemplates();

  // Wait for critical data (routine) to determine hasRoutine flag
  const routineResult = await routinePromise;
  const initialRoutine = routineResult.success ? routineResult.data : null;
  initialClient.hasRoutine = initialRoutine !== null;

  // Await remaining data
  const [goalsResult, routineProductsResult, coachNotesResult, photosResult, templatesResult] =
    await Promise.all([
      goalsPromise,
      routineProductsPromise,
      coachNotesPromise,
      photosPromise,
      templatesPromise,
    ]);

  const initialGoals = goalsResult.success ? goalsResult.data : [];
  const initialRoutineProducts = routineProductsResult.success ? routineProductsResult.data : [];
  const initialCoachNotes = coachNotesResult.success ? coachNotesResult.data : [];
  const initialPhotos = photosResult.success ? photosResult.data : [];
  const initialTemplates = templatesResult.success ? templatesResult.data : [];

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
