/**
 * Seed script to populate user profiles with realistic data
 *
 * Usage: npm run seed:profiles
 *
 * IMPORTANT: This script is IDEMPOTENT - it will delete existing data for each
 * profile before seeding. Safe to re-run multiple times.
 *
 * Prerequisites:
 * - At least one admin account must exist
 * - At least one user profile must exist (creates data for first 3 profiles found)
 *
 * The script creates:
 * - 1 routine template with morning and evening routines (if none exist)
 *
 * For each of the first 3 user profiles, creates:
 * - Updates profile with occupation and bio
 * - 5 goals
 * - 1 routine from template (started 5 months ago)
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
  routineTemplateProducts,
  skincareGoals,
  skinGoalsTemplate,
  skincareRoutines,
  skincareRoutineProducts,
  routineStepCompletions,
  coachNotes,
  admins,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { copyTemplateToUser } from "@/app/(dashboard)/routine-management/template-actions/copy-template";
import { publishRoutine } from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/actions";
import { makeRoutineStepCompletionsRepo } from "@/app/(dashboard)/subscribers/[id]/compliance-actions/routine-step-completions.repo";
import { markOverdueAsMissed } from "@/app/(dashboard)/subscribers/[id]/compliance-actions/actions";
import { createTemplate } from "@/app/(dashboard)/routine-management/template-actions/actions";

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

async function createRoutineTemplates(adminId: string) {
  console.log("\n🎨 Creating routine templates...");

  // Check if templates already exist
  const existingTemplates = await db.select().from(routineTemplates).limit(1);
  if (existingTemplates.length > 0) {
    console.log("  → Templates already exist, skipping creation");
    return;
  }

  // Create "Complete Daily Routine" template
  const templateResult = await createTemplate(adminId, {
    name: "Complete Daily Routine",
    description:
      "A comprehensive morning and evening skincare routine for acne-prone skin",
  });

  if (!templateResult.success) {
    throw new Error(`Failed to create template: ${templateResult.error}`);
  }

  const template = templateResult.data;
  console.log(`  → Created template: ${template.name}`);

  // Morning routine products
  const morningProducts = [
    {
      routineStep: "Cleanse",
      productName: "CeraVe Foaming Facial Cleanser",
      productUrl:
        "https://www.cerave.com/skincare/cleansers/foaming-facial-cleanser",
      instructions:
        "Wet face, apply cleanser, massage gently for 60 seconds, rinse with lukewarm water",
      frequency: "daily",
      days: null,
      timeOfDay: "morning" as const,
    },
    {
      routineStep: "Toner",
      productName: "Paula's Choice 2% BHA Liquid Exfoliant",
      productUrl:
        "https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201.html",
      instructions:
        "Apply to cotton pad or hands, gently swipe across face. Do not rinse",
      frequency: "daily",
      days: null,
      timeOfDay: "morning" as const,
    },
    {
      routineStep: "Treat",
      productName: "The Ordinary Niacinamide 10% + Zinc 1%",
      productUrl:
        "https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100411.html",
      instructions: "Apply 2-3 drops to entire face. Wait for absorption",
      frequency: "daily",
      days: null,
      timeOfDay: "morning" as const,
    },
    {
      routineStep: "Moisturise",
      productName: "CeraVe AM Facial Moisturizing Lotion SPF 30",
      productUrl:
        "https://www.cerave.com/skincare/moisturizers/am-facial-moisturizing-lotion-with-sunscreen",
      instructions: "Apply generously to face and neck. Use as last step",
      frequency: "daily",
      days: null,
      timeOfDay: "morning" as const,
    },
  ];

  // Evening routine products
  const eveningProducts = [
    {
      routineStep: "Cleanse",
      productName: "CeraVe Hydrating Facial Cleanser",
      productUrl:
        "https://www.cerave.com/skincare/cleansers/hydrating-facial-cleanser",
      instructions:
        "Wet face, apply cleanser, massage gently for 60 seconds, rinse with lukewarm water",
      frequency: "daily",
      days: null,
      timeOfDay: "evening" as const,
    },
    {
      routineStep: "Treatment",
      productName: "Differin Adapalene Gel 0.1%",
      productUrl: "https://www.differin.com/shop/differin-gel",
      instructions:
        "Apply pea-sized amount to entire face. Start 3x per week, gradually increase",
      frequency: "specific_days",
      days: ["Monday", "Wednesday", "Friday"],
      timeOfDay: "evening" as const,
    },
    {
      routineStep: "Moisturise",
      productName: "CeraVe PM Facial Moisturizing Lotion",
      productUrl:
        "https://www.cerave.com/skincare/moisturizers/pm-facial-moisturizing-lotion",
      instructions: "Apply generously to face and neck. Use as last step",
      frequency: "daily",
      days: null,
      timeOfDay: "evening" as const,
    },
  ];

  // Add all products (batch insert)
  console.log(
    `  → Adding ${morningProducts.length + eveningProducts.length} products (morning & evening)...`,
  );
  const allProducts = [...morningProducts, ...eveningProducts];
  const productValues = allProducts.map((product) => ({
    templateId: template.id,
    routineStep: product.routineStep,
    productName: product.productName,
    productUrl: product.productUrl,
    instructions: product.instructions,
    frequency: product.frequency as
      | "daily"
      | "2x per week"
      | "3x per week"
      | "specific_days",
    days: product.days,
    timeOfDay: product.timeOfDay,
    order:
      product.timeOfDay === "morning"
        ? morningProducts.findIndex((p) => p === product)
        : eveningProducts.findIndex((p) => p === product),
  }));
  await db.insert(routineTemplateProducts).values(productValues);

  console.log("  ✅ Templates created successfully!");
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

  // 5. Delete goals (via template)
  const template = await db
    .select()
    .from(skinGoalsTemplate)
    .where(eq(skinGoalsTemplate.userId, profileId))
    .limit(1);

  if (template[0]) {
    await db
      .delete(skincareGoals)
      .where(eq(skincareGoals.templateId, template[0].id));

    await db
      .delete(skinGoalsTemplate)
      .where(eq(skinGoalsTemplate.id, template[0].id));
  }

  // 6. Delete coach notes
  await db.delete(coachNotes).where(eq(coachNotes.userProfileId, profileId));

  console.log("  → Cleanup complete");
}

async function seedProfile(
  profile: { id: string; firstName: string; lastName: string },
  index: number,
) {
  console.log(
    `\n📝 Seeding profile ${index + 1}/3: ${profile.firstName} ${profile.lastName}`,
  );
  const profileId = profile.id;

  try {
    // 1. Clean up existing data first
    await cleanupProfileData(profileId);

    // 2. Update profile with occupation and bio
    console.log("  → Updating profile (occupation, bio)...");
    await db
      .update(userProfiles)
      .set({
        occupation: OCCUPATIONS[index % OCCUPATIONS.length],
        bio: BIOS[index % BIOS.length],
      })
      .where(eq(userProfiles.id, profileId));

    // 3. Create goals template and goals
    console.log("  → Creating goals template and 5 goals...");

    // Get the first admin for createdBy/updatedBy
    const [firstAdmin] = await db.select().from(admins).limit(1);
    if (!firstAdmin) {
      throw new Error("No admin found. Create an admin first.");
    }

    // Create template
    const [goalsTemplate] = await db
      .insert(skinGoalsTemplate)
      .values({
        userId: profileId,
        status: "published",
        createdBy: firstAdmin.id,
        updatedBy: firstAdmin.id,
      })
      .returning();

    // Create goals linked to template
    const goalValues = GOALS.map((goal, index) => ({
      templateId: goalsTemplate.id,
      description: goal.description,
      priority: "none" as const,
      complete: false,
      order: index,
    }));
    await db.insert(skincareGoals).values(goalValues);

    // 4. Get first template
    console.log("  → Fetching first template...");
    const templates = await db.select().from(routineTemplates).limit(1);
    if (templates.length === 0) {
      throw new Error("No templates found. Please create a template first.");
    }
    const template = templates[0];

    // 5. Create routine from template (started 5 months ago)
    const startDate = subMonths(new Date(), 5);
    const routineName = `${template.name} - Custom Routine`;

    console.log(
      `  → Creating routine from template (started ${format(startDate, "MMM d, yyyy")})...`,
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

    // 6. Publish routine (generates steps from 5 months ago to future)
    console.log("  → Publishing routine (generates steps)...");
    const publishResult = await publishRoutine(routine.id);

    if (!publishResult.success) {
      throw new Error(`Failed to publish routine: ${publishResult.error}`);
    }

    // 7. Mark historical steps as completed/late/missed
    console.log("  → Marking historical steps...");
    const completionsRepo = makeRoutineStepCompletionsRepo();

    // Get all steps for this user from 5 months ago to now
    const fiveMonthsAgo = subMonths(new Date(), 5);
    const today = new Date();

    const allSteps = await completionsRepo.findByUserAndDateRange(
      profileId,
      fiveMonthsAgo,
      today,
    );

    console.log(`  → Found ${allSteps.length} historical steps to mark`);

    // Mark steps with realistic pattern - BATCH PROCESSING FOR SPEED
    let onTimeCount = 0;
    let lateCount = 0;
    let pendingCount = 0;

    // Collect all updates in batches
    const BATCH_SIZE = 100;
    const updates: Array<{
      id: string;
      completedAt: Date;
      status: "on-time" | "late";
    }> = [];

    for (const step of allSteps) {
      if (step.status !== "pending") continue; // Skip already marked steps

      // Calculate "week number" from start (week 1 = high compliance, later weeks = lower)
      const weeksSinceStart = Math.floor(
        (step.scheduledDate.getTime() - fiveMonthsAgo.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );

      // Compliance patterns: completion rate (separate from on-time rate)
      let completionRate = 0.9; // Start at 90% completion
      if (weeksSinceStart > 2) completionRate = 0.87; // Weeks 3-6: 87%
      if (weeksSinceStart > 6) completionRate = 0.85; // After week 6: 85%

      // On-time rate (when completed)
      let onTimeRate = 0.85; // 85% of completed steps are on-time

      // Morning steps have better compliance
      if (step.scheduledTimeOfDay === "morning") {
        completionRate += 0.03;
        onTimeRate += 0.03;
      }

      // Weekend steps have slightly worse compliance
      const dayOfWeek = step.scheduledDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        completionRate -= 0.05;
        onTimeRate -= 0.05;
      }

      // Decide if completed, and if so, on-time or late
      const shouldComplete = randomBool(completionRate);

      if (shouldComplete) {
        const isOnTime = randomBool(onTimeRate);

        if (isOnTime) {
          // Mark as on-time (completed before deadline)
          const completedAt = new Date(
            step.onTimeDeadline.getTime() - Math.random() * 2 * 60 * 60 * 1000,
          ); // Random time before deadline
          updates.push({ id: step.id, completedAt, status: "on-time" });
          onTimeCount++;
        } else {
          // Mark as late (completed after deadline but within grace period)
          const gracePeriodDuration =
            step.gracePeriodEnd.getTime() - step.onTimeDeadline.getTime();
          const completedAt = new Date(
            step.onTimeDeadline.getTime() + Math.random() * gracePeriodDuration,
          ); // Random time within actual 24-hour grace period
          updates.push({ id: step.id, completedAt, status: "late" });
          lateCount++;
        }
      } else {
        // Leave as pending
        pendingCount++;
      }
    }

    // Apply updates in batches using raw SQL for maximum speed
    console.log(
      `  → Applying ${updates.length} completions in batches of ${BATCH_SIZE}...`,
    );

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);

      // Build CASE statements for batch update
      const completedAtCases = batch
        .map((u) => `WHEN '${u.id}' THEN '${u.completedAt.toISOString()}'`)
        .join(" ");

      const statusCases = batch
        .map((u) => `WHEN '${u.id}' THEN '${u.status}'`)
        .join(" ");

      const ids = batch.map((u) => `'${u.id}'`).join(", ");

      await db.execute(
        sql.raw(`
        UPDATE routine_step_completions
        SET
          status = (CASE id ${statusCases} END)::completion_status,
          completed_at = (CASE id ${completedAtCases} END)::timestamp,
          updated_at = NOW()
        WHERE id IN (${ids})
      `),
      );

      console.log(
        `  → Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updates.length / BATCH_SIZE)} complete`,
      );
    }

    console.log(
      `  → Marked: ${onTimeCount} on-time, ${lateCount} late, ${pendingCount} left as pending`,
    );

    // Now mark all pending steps past their grace period as missed
    console.log("  → Marking overdue steps as missed...");
    const missedResult = await markOverdueAsMissed(profileId);
    if (missedResult.success) {
      console.log(
        `  → Marked ${missedResult.data.count} overdue steps as missed`,
      );
    }

    // 8. Create 20 weekly progress photos (batch insert)
    console.log("  → Creating 20 weekly progress photos...");
    const photoValues = [];
    for (let week = 0; week < 20; week++) {
      const photoDate = subWeeks(new Date(), 19 - week); // Start from 19 weeks ago
      const imageUrl = UNSPLASH_PHOTOS[week];
      const feedback = randomBool(0.6) ? randomItem(COACH_FEEDBACK) : null;

      photoValues.push({
        userProfileId: profileId,
        imageUrl,
        weekNumber: week + 1, // Week 1 to 20
        uploadedAt: photoDate,
        feedback,
      });
    }
    await db.insert(progressPhotos).values(photoValues);

    // 9. Create 10 coach notes spread over 5 months (batch insert)
    console.log("  → Creating 10 coach notes...");

    // Get first admin
    const adminList = await db.select().from(admins).limit(1);
    if (adminList.length === 0) {
      throw new Error("No admins found. Please create an admin first.");
    }
    const adminId = adminList[0].id;

    // Create notes in batch
    const noteValues = COACH_NOTES.map((content) => ({
      userProfileId: profileId,
      adminId: adminId,
      content,
    }));
    await db.insert(coachNotes).values(noteValues);

    console.log(
      `✅ Profile ${profile.firstName} ${profile.lastName} seeded successfully!`,
    );
    return profile;
  } catch (error) {
    console.error(
      `❌ Error seeding profile ${profile.firstName} ${profile.lastName}:`,
      error,
    );
    throw error;
  }
}

async function main() {
  console.log("🌱 Starting profile seeding...");

  // 1. Ensure admin exists (needed for creating templates)
  console.log("\n👤 Checking for admin...");
  const adminList = await db.select().from(admins).limit(1);

  let admin;
  if (adminList.length === 0) {
    console.log("  → No admin found, creating one...");
    const newAdmin = await db
      .insert(admins)
      .values({
        email: "admin@skinbestie.com",
        name: "Admin User",
        passwordSet: false,
        role: "admin",
      })
      .returning();
    admin = newAdmin[0];
    console.log(`  → Created admin: ${admin.email}`);
  } else {
    admin = adminList[0];
    console.log(`  → Found admin: ${admin.email}`);
  }

  // 2. Create routine templates
  await createRoutineTemplates(admin.id);

  // 3. Get first 3 user profiles
  console.log("\n👥 Fetching user profiles...");
  const profiles = await db
    .select({
      id: userProfiles.id,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
    })
    .from(userProfiles)
    .orderBy(userProfiles.createdAt)
    .limit(3);

  if (profiles.length === 0) {
    throw new Error(
      "No user profiles found. Please create at least one user profile first.",
    );
  }

  console.log(`  → Found ${profiles.length} profile(s) to seed\n`);

  // 4. Seed each profile
  const seededProfiles: Array<{ firstName: string; lastName: string }> = [];
  for (let i = 0; i < profiles.length; i++) {
    const seededProfile = await seedProfile(profiles[i], i);
    seededProfiles.push(seededProfile);
  }

  // 5. Print summary
  console.log("\n✨ All profiles seeded successfully!");
  console.log("\n📊 Seeded profiles:");
  seededProfiles.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.firstName} ${p.lastName}`);
  });

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
