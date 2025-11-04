// Repository for admins table
import { db } from "@/lib/db";
import { admins, type NewAdmin as NewAdminBase } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Repository-specific types derived from centralized types (TYPE_SYSTEM_GUIDE.md)
export type { Admin } from "@/lib/db/schema";
export type NewAdmin = Pick<
  NewAdminBase,
  "email" | "name" | "passwordSet" | "role"
>;

export function makeAdminsRepo() {
  return {
    async create(data: NewAdmin) {
      const [admin] = await db.insert(admins).values(data).returning();
      return admin;
    },

    async findByEmail(email: string) {
      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.email, email))
        .limit(1);
      return admin;
    },
  };
}
