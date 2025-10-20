/**
 * Seed script to populate user profiles with realistic data
 *
 * Usage: npm run seed:profiles
 *
 * IMPORTANT: This script is IDEMPOTENT - it will delete existing data for each
 * profile before seeding. Safe to re-run multiple times.
 *
 * For each profile ID, creates:
 * - Updates profile with occupation and bio
 * - 5 goals
 * - 1 routine from first template (started 5 months ago)
 * - ~150 days of compliance data (steps marked as completed/late/missed)
 * - 20 weekly progress photos with coach feedback
 * - 10 coach notes spread over 5 months
 */

import { subMonths, subWeeks, format } from "date-fns";
import { db } from "@/lib/db";
import {
  userProfiles,
  progressPhotos,
  routineTemplates,
  skincareGoals,
  skincareRoutines,
  skincareRoutineProducts,
  routineStepCompletions,
  coachNotes,
  admins,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createGoal } from "@/app/(dashboard)/subscribers/[id]/goal-actions/actions";
import { copyTemplateToUser } from "@/app/(dashboard)/routine-management/template-actions/copy-template";
import { publishRoutine } from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/actions";
import { makeRoutineStepCompletionsRepo } from "@/app/(dashboard)/subscribers/[id]/compliance-actions/routine-step-completions.repo";
import {
  markStepComplete,
  markOverdueAsMissed,
} from "@/app/(dashboard)/subscribers/[id]/compliance-actions/actions";
import { createCoachNote } from "@/app/(dashboard)/subscribers/[id]/coach-notes-actions/actions";

// Profile IDs to seed
const PROFILE_IDS = [
  "047b8de6-6a42-4013-b155-349d90b20615",
  "13ca97f7-f27f-429e-9fe5-61c06ce42a0f",
  "2954a599-3448-4fc4-bdf7-abb13ce7220d",
];

// Sample data pools
const OCCUPATIONS = [
  "Marketing Manager",
  "Software Engineer",
  "Teacher",
  "Healthcare Professional",
  "Business Owner",
  "Designer",
  "Consultant",
];

const BIOS = [
  "Dealing with adult acne and hyperpigmentation. Looking for a consistent routine to improve skin texture.",
  "Focused on anti-aging and maintaining healthy, glowing skin in my 30s.",
  "Sensitive skin type, working on reducing redness and building a stronger skin barrier.",
  "Combination skin with occasional breakouts. Goal is to achieve balanced, clear skin.",
  "Dry skin struggles, especially in winter. Want to find the right moisturizing routine.",
];

const GOALS = [
  {
    name: "Clear Acne",
    description: "Reduce active breakouts and prevent new acne",
    timeframe: "3 months",
  },
  {
    name: "Even Skin Tone",
    description: "Fade hyperpigmentation and even out skin tone",
    timeframe: "6 months",
  },
  {
    name: "Improve Texture",
    description: "Improve skin texture and minimize pores",
    timeframe: "4 months",
  },
  {
    name: "Anti-Aging",
    description: "Reduce fine lines and prevent premature aging",
    timeframe: "6 months",
  },
  {
    name: "Routine Consistency",
    description: "Build consistent skincare routine and track progress",
    timeframe: "2 months",
  },
];

const COACH_FEEDBACK = [
  "Great baseline photo! Let's track your progress over the coming weeks.",
  "Skin is looking clearer already. Keep up the routine!",
  "Notice some improvement in texture. Continue current products.",
  "Excellent progress! Redness has reduced significantly.",
  "Some breakouts this week - monitor and let me know if it persists.",
  "Really consistent work! Skin barrier looks healthier.",
  "Amazing transformation! Your dedication is paying off.",
  "Continue current routine. Hyperpigmentation is fading nicely.",
  "Looking good! Let's reassess in 2 more weeks.",
  "Slight irritation visible. Did you change anything?",
  "Perfect! Skin tone is evening out.",
  "Notice the glow! Your hard work is showing.",
  "Texture improvements are visible. Stay consistent!",
  "Some dryness showing - let's adjust moisturizer.",
];

const COACH_NOTES = [
  "Initial consultation completed. Client is motivated and ready to start. Discussed realistic expectations.",
  "Week 2 check-in: Client reports slight purging phase. Explained this is normal with active ingredients. Will monitor closely.",
  "Routine compliance is excellent so far! Very impressed with dedication.",
  "Client mentioned some dryness around mouth area. Recommended adding extra moisturizer to that zone.",
  "Progress is steady. Breakouts reducing noticeably. Client is very happy with results so far.",
  "Discussed importance of SPF reapplication. Client committed to being more consistent with sun protection.",
  "Week 8: Significant improvement in skin texture and tone. Client confidence has improved dramatically.",
  "Adjusted PM routine - reduced retinol frequency to 3x per week due to sensitivity.",
  "Client traveled this week, compliance dropped slightly. Discussed travel-friendly routine adaptations.",
  "Milestone achieved! Hyperpigmentation has faded significantly. Client is thrilled with progress.",
];

// 20 Unsplash portrait images (reused for all profiles)
const UNSPLASH_PHOTOS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
  "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=800",
  "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800",
  "https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?w=800",
  "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800",
  "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=800",
];

// Random helper
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

async function cleanupProfileData(profileId: string) {
  console.log("  → Cleaning up existing data...");

  // Delete in correct order (respecting foreign keys)
  // 1. Delete routine step completions
  await db
    .delete(routineStepCompletions)
    .where(eq(routineStepCompletions.userProfileId, profileId));

  // 2. Delete routine products (for routines belonging to this user)
  await db
    .delete(skincareRoutineProducts)
    .where(eq(skincareRoutineProducts.userProfileId, profileId));

  // 3. Delete routines
  await db
    .delete(skincareRoutines)
    .where(eq(skincareRoutines.userProfileId, profileId));

  // 4. Delete progress photos
  await db
    .delete(progressPhotos)
    .where(eq(progressPhotos.userProfileId, profileId));

  // 5. Delete goals
  await db
    .delete(skincareGoals)
    .where(eq(skincareGoals.userProfileId, profileId));

  // 6. Delete coach notes
  await db.delete(coachNotes).where(eq(coachNotes.userProfileId, profileId));

  console.log("  → Cleanup complete");
}

async function seedProfile(profileId: string, index: number) {
  console.log(`\n📝 Seeding profile ${index + 1}/3: ${profileId}`);

  try {
    // 0. Clean up existing data first
    await cleanupProfileData(profileId);

    // 1. Update profile with occupation and bio
    console.log("  → Updating profile (occupation, bio)...");
    await db
      .update(userProfiles)
      .set({
        occupation: OCCUPATIONS[index % OCCUPATIONS.length],
        bio: BIOS[index % BIOS.length],
      })
      .where(eq(userProfiles.id, profileId));

    // 2. Create 5 goals
    console.log("  → Creating 5 goals...");
    for (const goal of GOALS) {
      const result = await createGoal(profileId, goal);
      if (!result.success) {
        throw new Error(
          `Failed to create goal "${goal.name}": ${result.error}`
        );
      }
    }

    // 3. Get first template
    console.log("  → Fetching first template...");
    const templates = await db.select().from(routineTemplates).limit(1);
    if (templates.length === 0) {
      throw new Error("No templates found. Please create a template first.");
    }
    const template = templates[0];

    // 4. Create routine from template (started 5 months ago)
    const startDate = subMonths(new Date(), 5);
    const routineName = `${template.name} - Custom Routine`;

    console.log(
      `  → Creating routine from template (started ${format(startDate, "MMM d, yyyy")})...`
    );
    const routineResult = await copyTemplateToUser(template.id, profileId, {
      name: routineName,
      startDate,
      endDate: null, // Ongoing
    });

    if (!routineResult.success) {
      throw new Error(`Failed to create routine: ${routineResult.error}`);
    }

    const routine = routineResult.data.routine;
    const routineProducts = routineResult.data.products;

    console.log(`  → Routine created: ${routine.id}`);
    console.log(`  → Products: ${routineProducts.length}`);

    // 5. Publish routine (generates steps from 5 months ago to future)
    console.log("  → Publishing routine (generates steps)...");
    const publishResult = await publishRoutine(routine.id);

    if (!publishResult.success) {
      throw new Error(`Failed to publish routine: ${publishResult.error}`);
    }

    // 6. Mark historical steps as completed/late/missed
    console.log("  → Marking historical steps...");
    const completionsRepo = makeRoutineStepCompletionsRepo();

    // Get all steps for this user from 5 months ago to now
    const fiveMonthsAgo = subMonths(new Date(), 5);
    const today = new Date();

    const allSteps = await completionsRepo.findByUserAndDateRange(
      profileId,
      fiveMonthsAgo,
      today
    );

    console.log(`  → Found ${allSteps.length} historical steps to mark`);

    // Mark steps with realistic pattern
    let onTimeCount = 0;
    let lateCount = 0;
    let missedCount = 0;

    for (const step of allSteps) {
      if (step.status !== "pending") continue; // Skip already marked steps

      // Calculate "week number" from start (week 1 = high compliance, later weeks = lower)
      const weeksSinceStart = Math.floor(
        (step.scheduledDate.getTime() - fiveMonthsAgo.getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      );

      // Compliance patterns
      let onTimeProbability = 0.85; // Start at 85%
      if (weeksSinceStart > 2) onTimeProbability = 0.75; // Weeks 3-6: 75%
      if (weeksSinceStart > 6) onTimeProbability = 0.7; // After week 6: 70%

      // Morning steps have better compliance
      if (step.scheduledTimeOfDay === "morning") {
        onTimeProbability += 0.05;
      }

      // Weekend steps have slightly worse compliance
      const dayOfWeek = step.scheduledDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        onTimeProbability -= 0.05;
      }

      // Decide if completed, and if so, on-time or late
      const shouldComplete = randomBool(onTimeProbability + 0.15); // Total ~85-90% completion

      if (shouldComplete) {
        const isOnTime = randomBool(
          onTimeProbability / (onTimeProbability + 0.15)
        );

        if (isOnTime) {
          // Mark as on-time (completed before deadline)
          const completedAt = new Date(
            step.onTimeDeadline.getTime() - Math.random() * 2 * 60 * 60 * 1000
          ); // Random time before deadline
          await markStepComplete(step.id, profileId, completedAt);
          onTimeCount++;
        } else {
          // Mark as late (completed after deadline but within grace period)
          const completedAt = new Date(
            step.onTimeDeadline.getTime() + Math.random() * 12 * 60 * 60 * 1000
          ); // Random time after deadline but before grace end
          await markStepComplete(step.id, profileId, completedAt);
          lateCount++;
        }
      } else {
        // Leave as missed (we'll mark as missed by cron, but for seed just leave as pending)
        missedCount++;
      }
    }

    console.log(
      `  → Marked: ${onTimeCount} on-time, ${lateCount} late, ${missedCount} left as pending`
    );

    // Now mark all pending steps past their grace period as missed
    console.log("  → Marking overdue steps as missed...");
    const missedResult = await markOverdueAsMissed(profileId);
    if (missedResult.success) {
      console.log(
        `  → Marked ${missedResult.data.count} overdue steps as missed`
      );
    }

    // 7. Create 20 weekly progress photos
    console.log("  → Creating 20 weekly progress photos...");

    for (let week = 0; week < 20; week++) {
      const photoDate = subWeeks(new Date(), 19 - week); // Start from 19 weeks ago
      const imageUrl = UNSPLASH_PHOTOS[week];

      // 60% chance of coach feedback
      const feedback = randomBool(0.6) ? randomItem(COACH_FEEDBACK) : null;

      await db.insert(progressPhotos).values({
        userProfileId: profileId,
        imageUrl,
        weekNumber: week + 1, // Week 1 to 20
        uploadedAt: photoDate,
        feedback,
      });
    }

    // 8. Create 10 coach notes spread over 5 months
    console.log("  → Creating 10 coach notes...");

    // Get first admin
    const adminList = await db.select().from(admins).limit(1);
    if (adminList.length === 0) {
      throw new Error("No admins found. Please create an admin first.");
    }
    const adminId = adminList[0].id;

    // Create notes spread over 5 months
    for (let i = 0; i < COACH_NOTES.length; i++) {
      const noteContent = COACH_NOTES[i];

      const noteResult = await createCoachNote(profileId, adminId, noteContent);
      if (!noteResult.success) {
        throw new Error(`Failed to create coach note: ${noteResult.error}`);
      }
    }

    console.log(`✅ Profile ${profileId} seeded successfully!`);
  } catch (error) {
    console.error(`❌ Error seeding profile ${profileId}:`, error);
    throw error;
  }
}

async function main() {
  console.log("🌱 Starting profile seeding...");
  console.log(`📋 Seeding ${PROFILE_IDS.length} profiles\n`);

  for (let i = 0; i < PROFILE_IDS.length; i++) {
    await seedProfile(PROFILE_IDS[i], i);
  }

  console.log("\n✨ All profiles seeded successfully!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
