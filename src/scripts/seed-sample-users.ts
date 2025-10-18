import { db } from "../lib/db/index";
import { userProfiles } from "../lib/db/schema";

// Sample data arrays
const firstNames = [
  "Emma", "Olivia", "Ava", "Isabella", "Sophia", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn",
  "Liam", "Noah", "Oliver", "Elijah", "William", "James", "Benjamin", "Lucas", "Henry", "Alexander",
  "Emily", "Madison", "Abigail", "Ella", "Avery", "Scarlett", "Grace", "Chloe", "Victoria", "Riley",
  "Michael", "Ethan", "Daniel", "Matthew", "Jackson", "David", "Carter", "Jayden", "Logan", "Mason",
  "Sofia", "Aria", "Zoe", "Lily", "Hannah", "Layla", "Addison", "Natalie", "Luna", "Savannah",
  "Samuel", "Sebastian", "Jack", "Aiden", "Owen", "Gabriel", "Julian", "Mateo", "Anthony", "Jaxon",
  "Camila", "Penelope", "Elizabeth", "Nora", "Hazel", "Ellie", "Violet", "Aurora", "Lucy", "Stella",
  "Wyatt", "John", "Luke", "Grayson", "Isaac", "Levi", "Nathan", "Caleb", "Ryan", "Christian",
  "Bella", "Paisley", "Audrey", "Skylar", "Brooklyn", "Claire", "Aaliyah", "Anna", "Caroline", "Sarah",
  "Christopher", "Andrew", "Joshua", "Adrian", "Asher", "Thomas", "Charles", "Ezra", "Isaiah", "Hudson"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
  "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes",
  "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper",
  "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
  "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
  "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross", "Foster", "Jimenez"
];

const skinTypes = [
  ["oily"],
  ["dry"],
  ["combination"],
  ["sensitive"],
  ["normal"],
  ["oily", "sensitive"],
  ["dry", "sensitive"],
  ["combination", "sensitive"],
];

const skinConcerns = [
  ["acne"],
  ["wrinkles"],
  ["dark-spots"],
  ["redness"],
  ["pores"],
  ["acne", "pores"],
  ["wrinkles", "dark-spots"],
  ["redness", "sensitive"],
  ["acne", "dark-spots"],
  ["wrinkles", "redness"],
];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const providers = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com"];
  const name = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index > 50 ? index : ""}`;
  return `${name}@${randomItem(providers)}`;
}

function generatePhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${prefix}${lineNumber}`;
}

async function seed() {
  console.log("🌱 Seeding user profiles...");

  const profiles = [];

  for (let i = 0; i < 100; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const email = generateEmail(firstName, lastName, i);
    const phoneNumber = generatePhone();
    const dateOfBirth = randomDate(new Date("1970-01-01"), new Date("2005-12-31"));

    // Randomly determine completion status
    const completionRandom = Math.random();
    let completedSteps: string[];
    let skinType: string[] | null = null;
    let concerns: string[] | null = null;
    let hasAllergies: boolean | null = null;
    let allergyDetails: string | null = null;
    let isSubscribed: boolean | null = null;
    let hasCompletedBooking: boolean | null = null;
    let isCompleted = false;
    let completedAt: Date | null = null;

    if (completionRandom < 0.2) {
      // 20% - Only completed personal info (step 1)
      completedSteps = ["PERSONAL"];
    } else if (completionRandom < 0.4) {
      // 20% - Completed through skin type (steps 1-2)
      completedSteps = ["PERSONAL", "SKIN_TYPE"];
      skinType = randomItem(skinTypes);
    } else if (completionRandom < 0.6) {
      // 20% - Completed through concerns (steps 1-3)
      completedSteps = ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS"];
      skinType = randomItem(skinTypes);
      concerns = randomItem(skinConcerns);
    } else if (completionRandom < 0.8) {
      // 20% - Completed through allergies (steps 1-4)
      completedSteps = ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES"];
      skinType = randomItem(skinTypes);
      concerns = randomItem(skinConcerns);
      hasAllergies = Math.random() > 0.5;
      allergyDetails = hasAllergies ? randomItem([
        "Fragrance allergies",
        "Nut allergies",
        "Latex sensitivity",
        "Sulfate sensitivity",
        "None specific",
      ]) : null;
    } else {
      // 20% - Fully completed (all steps)
      completedSteps = ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS", "ALLERGIES", "SUBSCRIBE", "BOOKING"];
      skinType = randomItem(skinTypes);
      concerns = randomItem(skinConcerns);
      hasAllergies = Math.random() > 0.5;
      allergyDetails = hasAllergies ? randomItem([
        "Fragrance allergies",
        "Nut allergies",
        "Latex sensitivity",
        "Sulfate sensitivity",
        "None specific",
      ]) : null;
      isSubscribed = Math.random() > 0.3; // 70% subscribed
      hasCompletedBooking = Math.random() > 0.4; // 60% completed booking
      isCompleted = true;
      completedAt = randomDate(new Date("2024-01-01"), new Date());
    }

    profiles.push({
      firstName,
      lastName,
      email,
      phoneNumber,
      dateOfBirth,
      skinType,
      concerns,
      hasAllergies,
      allergyDetails,
      isSubscribed,
      hasCompletedBooking,
      completedSteps,
      isCompleted,
      completedAt,
    });
  }

  // Insert in batches of 20 for better performance
  const batchSize = 20;
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);
    await db.insert(userProfiles).values(batch);
    console.log(`✅ Inserted profiles ${i + 1}-${Math.min(i + batchSize, profiles.length)}`);
  }

  console.log("🎉 Seeding complete! 100 user profiles created.");
  console.log("\nBreakdown:");
  console.log("  ~20 profiles: Step 1 only (Personal info)");
  console.log("  ~20 profiles: Steps 1-2 (+ Skin type)");
  console.log("  ~20 profiles: Steps 1-3 (+ Concerns)");
  console.log("  ~20 profiles: Steps 1-4 (+ Allergies)");
  console.log("  ~20 profiles: All steps complete");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
