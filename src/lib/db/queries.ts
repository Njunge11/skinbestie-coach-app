import { eq } from 'drizzle-orm';
import { db, admins, type Admin } from './index';

/**
 * Get admin by email
 */
export async function getAdminByEmail(email: string): Promise<Admin | undefined> {
  const result = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  return result[0];
}
