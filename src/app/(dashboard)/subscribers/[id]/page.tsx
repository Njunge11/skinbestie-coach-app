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
  try {
    console.log("\x1b[36m=== SUBSCRIBER PAGE LOAD START ===\x1b[0m");

    const { id } = await params;
    console.log(`Loading subscriber: ${id}`);

  // Get the current admin session
  console.log("🔐 Checking auth...");
  const session = await auth();
  console.log("🔐 Auth result:", session?.user?.id ? "authenticated" : "not authenticated");

  if (!session?.user?.id) {
    console.log("🔐 No session, redirecting to login");
    redirect("/login");
  }
  const adminId = session.user.id;
  console.log("🔐 Admin ID:", adminId);

  // Fetch user profile from database
  console.log("📋 Fetching user profile...");
  const profileResult = await getUserProfile(id);
  console.log("📋 Profile result:", profileResult.success ? "success" : "failed");

  if (!profileResult.success) {
    // Handle error - redirect to subscribers list
    console.error("❌ getUserProfile failed:", profileResult.error);
    redirect("/subscribers");
  }

  console.log("✅ getUserProfile succeeded");

  const profileData = profileResult.data;

  // Fetch all data in parallel for better performance
  console.log("🔄 Fetching all data in parallel...");

  const [
    goalsResult,
    routineResult,
    routineProductsResult,
    coachNotesResult,
    photosResult,
    templatesResult,
  ] = await Promise.all([
    getGoals(id).then(r => { console.log("✅ getGoals done"); return r; }),
    getRoutine(id).then(r => { console.log("✅ getRoutine done"); return r; }),
    getRoutineProducts(id).then(r => { console.log("✅ getRoutineProducts done"); return r; }),
    getCoachNotes(id).then(r => { console.log("✅ getCoachNotes done"); return r; }).catch(e => { console.error("❌ getCoachNotes error:", e); throw e; }),
    getProgressPhotos(id).then(r => { console.log("✅ getProgressPhotos done"); return r; }).catch(e => { console.error("❌ getProgressPhotos error:", e); throw e; }),
    getTemplates().then(r => { console.log("✅ getTemplates done"); return r; }),
  ]);

  console.log("✅ Parallel fetch completed");

  const initialGoals: Goal[] = goalsResult.success ? goalsResult.data : [];
  const initialRoutine: Routine | null = routineResult.success ? routineResult.data : null;
  const initialRoutineProducts: RoutineProduct[] = routineProductsResult.success
    ? routineProductsResult.data
    : [];
  const initialCoachNotes: CoachNote[] = coachNotesResult.success
    ? coachNotesResult.data
    : [];
  const initialPhotos: Photo[] = photosResult.success ? photosResult.data : [];
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
  } catch (error) {
    console.error("❌❌❌ PAGE LOAD ERROR:", error);
    throw error;
  }
}
