"use server";

import { db } from "@/lib/db";
import {
  userProfiles,
  skincareGoals,
  skincareRoutines,
  skincareRoutineProducts,
  coachNotes,
  progressPhotos,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Goal, Routine, RoutineProduct, CoachNote, Photo } from "../types";

type SubscriberData = {
  profile: {
    id: string;
    name: string;
    age: number;
    email: string;
    mobile: string;
    occupation: string | null;
    bio: string | null;
    skinType: string[];
    concerns: string[];
  };
  goals: Goal[];
  routine: Routine | null;
  routineProducts: RoutineProduct[];
  coachNotes: CoachNote[];
  progressPhotos: Photo[];
};

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Fetch ALL subscriber data in a SINGLE database query using JSON aggregation
 * This reduces 6 queries to 1, cutting network roundtrips dramatically
 */
export async function getSubscriberData(
  userId: string
): Promise<Result<SubscriberData>> {

  try {
    // Single query that fetches everything using LATERAL joins and JSON aggregation
    const result = await db
      .select({
        // User profile fields
        profileId: userProfiles.id,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: userProfiles.email,
        phoneNumber: userProfiles.phoneNumber,
        dateOfBirth: userProfiles.dateOfBirth,
        occupation: userProfiles.occupation,
        bio: userProfiles.bio,
        skinType: userProfiles.skinType,
        concerns: userProfiles.concerns,

        // Aggregated goals as JSON array (renamed to avoid collision with schema import)
        goalsData: sql<Goal[]>`(
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', g.id,
              'name', g.name,
              'description', g.description,
              'timeframe', g.timeframe,
              'complete', g.complete,
              'order', g."order"
            ) ORDER BY g."order"
          ), '[]'::json)
          FROM ${skincareGoals} g
          WHERE g.user_profile_id = ${userProfiles.id}
        )`,

        // Aggregated routine (single object or null)
        routineData: sql<Routine | null>`(
          SELECT json_build_object(
            'id', r.id,
            'userProfileId', r.user_profile_id,
            'name', r.name,
            'startDate', r.start_date,
            'endDate', r.end_date,
            'status', r.status
          )
          FROM ${skincareRoutines} r
          WHERE r.user_profile_id = ${userProfiles.id}
          LIMIT 1
        )`,

        // Aggregated routine products as JSON array
        routineProductsData: sql<RoutineProduct[]>`(
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', rp.id,
              'routineId', rp.routine_id,
              'userProfileId', rp.user_profile_id,
              'routineStep', rp.routine_step,
              'productName', rp.product_name,
              'productUrl', rp.product_url,
              'instructions', rp.instructions,
              'frequency', rp.frequency,
              'days', rp.days,
              'timeOfDay', rp.time_of_day,
              'order', rp."order"
            ) ORDER BY rp.time_of_day, rp."order"
          ), '[]'::json)
          FROM ${skincareRoutineProducts} rp
          WHERE rp.user_profile_id = ${userProfiles.id}
        )`,

        // Aggregated coach notes as JSON array
        coachNotesData: sql<CoachNote[]>`(
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', cn.id,
              'userProfileId', cn.user_profile_id,
              'adminId', cn.admin_id,
              'content', cn.content,
              'createdAt', cn.created_at,
              'updatedAt', cn.updated_at
            ) ORDER BY cn.created_at DESC
          ), '[]'::json)
          FROM ${coachNotes} cn
          WHERE cn.user_profile_id = ${userProfiles.id}
        )`,

        // Aggregated progress photos as JSON array
        progressPhotosData: sql<Photo[]>`(
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pp.id,
              'userProfileId', pp.user_profile_id,
              'imageUrl', pp.image_url,
              'weekNumber', pp.week_number,
              'uploadedAt', pp.uploaded_at,
              'feedback', pp.feedback
            ) ORDER BY pp.uploaded_at DESC
          ), '[]'::json)
          FROM ${progressPhotos} pp
          WHERE pp.user_profile_id = ${userProfiles.id}
        )`,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    if (!result || result.length === 0) {
      return { success: false, error: "User not found" };
    }

    const row = result[0];

    // Calculate age from date of birth
    const today = new Date();
    const birthDate = new Date(row.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Data is already parsed by postgres-js (JSON types are auto-converted)
    const goals = row.goalsData || [];
    const routine = row.routineData || null;
    const routineProducts = row.routineProductsData || [];
    const coachNotesArray = row.coachNotesData || [];
    const progressPhotosArray = row.progressPhotosData || [];

    const data: SubscriberData = {
      profile: {
        id: row.profileId,
        name: `${row.firstName} ${row.lastName}`,
        age,
        email: row.email,
        mobile: row.phoneNumber,
        occupation: row.occupation,
        bio: row.bio,
        skinType: row.skinType || [],
        concerns: row.concerns || [],
      },
      goals,
      routine,
      routineProducts,
      coachNotes: coachNotesArray,
      progressPhotos: progressPhotosArray,
    };

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching subscriber data:", error);
    return { success: false, error: "Failed to fetch subscriber data" };
  }
}
