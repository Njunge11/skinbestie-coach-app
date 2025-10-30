// Repository for admins table
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { type AdminRow, type AdminInsert } from "@/lib/db/types";

// Repository-specific types derived from centralized types (TYPE_SYSTEM_GUIDE.md)
export type Admin = AdminRow;
export type NewAdmin = Pick<
  AdminInsert,
  "email" | "name" | "passwordSet" | "role"
>;

export function makeAdminsRepo() {
  return {
    async create(data: NewAdmin): Promise<Admin> {
      const [admin] = await db.insert(admins).values(data).returning();
      return admin;
    },
  };
}
