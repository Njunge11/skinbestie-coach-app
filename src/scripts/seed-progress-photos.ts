import { db } from "../lib/db";
import { progressPhotos } from "../lib/db/schema";

const userId = "fa45293b-9896-44b0-ac7a-f60029ea37a1";

const photos = [
  {
    weekNumber: 20,
    date: "2025-10-15",
    feedback: "Significant reduction in active breakouts. Texture improving nicely.",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 19,
    date: "2025-10-08",
    feedback: "Purging phase complete. Starting to see results from tretinoin.",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 18,
    date: "2025-10-01",
    feedback: "Baseline photos. Active acne on forehead and chin areas.",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 17,
    date: "2025-09-24",
    feedback: "Slight irritation from new product introduction.",
    imageUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 16,
    date: "2025-09-17",
    feedback: "Good progress with hydration levels.",
    imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 15,
    date: "2025-09-10",
    feedback: "Texture smoothing out well.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 14,
    date: "2025-09-03",
    feedback: "Dark spots beginning to fade.",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 13,
    date: "2025-08-27",
    feedback: "Overall skin tone improving.",
    imageUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 12,
    date: "2025-08-20",
    feedback: "Reduced redness in cheek area.",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 11,
    date: "2025-08-13",
    feedback: "Client reports less sensitivity.",
    imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 10,
    date: "2025-08-06",
    feedback: "Pores appear smaller.",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 9,
    date: "2025-07-30",
    feedback: "Good barrier function recovery.",
    imageUrl: "https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 8,
    date: "2025-07-23",
    feedback: "Breakout frequency decreasing.",
    imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 7,
    date: "2025-07-16",
    feedback: "Glow starting to show through.",
    imageUrl: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 6,
    date: "2025-07-09",
    feedback: "Skin bounce improving.",
    imageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 5,
    date: "2025-07-02",
    feedback: "Less oiliness in T-zone.",
    imageUrl: "https://images.unsplash.com/photo-1521310192545-4ac7951413f0?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 4,
    date: "2025-06-25",
    feedback: "Makeup application smoother.",
    imageUrl: "https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 3,
    date: "2025-06-18",
    feedback: "Initial adjustment period.",
    imageUrl: "https://images.unsplash.com/photo-1546967191-fdfb13ed6b1e?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 2,
    date: "2025-06-11",
    feedback: "Starting routine compliance good.",
    imageUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=500&fit=crop",
  },
  {
    weekNumber: 1,
    date: "2025-06-04",
    feedback: "Baseline documentation complete.",
    imageUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&h=500&fit=crop",
  },
];

async function seedProgressPhotos() {
  console.log(`Seeding progress photos for user: ${userId}`);

  try {
    for (const photo of photos) {
      const uploadedAt = new Date(photo.date);
      const now = new Date();

      await db.insert(progressPhotos).values({
        userProfileId: userId,
        imageUrl: photo.imageUrl,
        weekNumber: photo.weekNumber,
        uploadedAt,
        feedback: photo.feedback,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`✓ Seeded week ${photo.weekNumber}`);
    }

    console.log(`\n✅ Successfully seeded ${photos.length} progress photos!`);
  } catch (error) {
    console.error("❌ Error seeding progress photos:", error);
    throw error;
  }
}

// Run the seeder
seedProgressPhotos()
  .then(() => {
    console.log("\n🎉 Seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seeding failed:", error);
    process.exit(1);
  });
