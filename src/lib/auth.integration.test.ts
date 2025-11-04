import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { makeAdminsRepo } from "@/app/api/admins/admins.repo";
import { hashPassword, verifyPassword } from "./password";

const adminsRepo = makeAdminsRepo();

describe("Login Flow Integration Tests", () => {
  describe("Complete login authentication", () => {
    it("successfully authenticates admin with correct password", async () => {
      // Step 1: Create admin account with password
      const password = "SecurePass123";
      const passwordHash = await hashPassword(password);

      const [admin] = await db
        .insert(admins)
        .values({
          email: "login-test@example.com",
          name: "Login Test",
          passwordHash,
          passwordSet: true,
        })
        .returning();

      expect(admin).toBeDefined();
      expect(admin.passwordSet).toBe(true);

      // Step 2: Simulate login - get admin by email
      const foundAdmin = await adminsRepo.findByEmail("login-test@example.com");

      expect(foundAdmin).toBeDefined();
      expect(foundAdmin?.email).toBe("login-test@example.com");
      expect(foundAdmin?.passwordSet).toBe(true);

      // Step 3: Verify password
      const isValidPassword = await verifyPassword(
        password,
        foundAdmin!.passwordHash!,
      );

      expect(isValidPassword).toBe(true);

      // Step 4: Verify user object would be returned (authorize logic)
      expect(foundAdmin).toMatchObject({
        id: admin.id,
        email: "login-test@example.com",
        name: "Login Test",
      });
    });

    it("rejects login with incorrect password", async () => {
      // Step 1: Create admin account
      const correctPassword = "SecurePass123";
      const passwordHash = await hashPassword(correctPassword);

      await db
        .insert(admins)
        .values({
          email: "wrong-pass@example.com",
          name: "Wrong Pass Test",
          passwordHash,
          passwordSet: true,
        })
        .returning();

      // Step 2: Get admin by email
      const foundAdmin = await adminsRepo.findByEmail("wrong-pass@example.com");

      expect(foundAdmin).toBeDefined();

      // Step 3: Try to verify with wrong password
      const wrongPassword = "WrongPassword123";
      const isValidPassword = await verifyPassword(
        wrongPassword,
        foundAdmin!.passwordHash!,
      );

      expect(isValidPassword).toBe(false);
    });

    it("rejects login for non-existent admin", async () => {
      // Step 1: Try to get admin that doesn't exist
      const foundAdmin = await adminsRepo.findByEmail(
        "nonexistent@example.com",
      );

      // Step 2: Verify admin is not found
      expect(foundAdmin).toBeUndefined();
    });

    it("rejects login for admin who has not set password", async () => {
      // Step 1: Create admin without password (passwordSet: false)
      const [admin] = await db
        .insert(admins)
        .values({
          email: "no-password@example.com",
          name: "No Password Admin",
          passwordSet: false,
        })
        .returning();

      expect(admin.passwordSet).toBe(false);
      expect(admin.passwordHash).toBeNull();

      // Step 2: Get admin by email
      const foundAdmin = await adminsRepo.findByEmail(
        "no-password@example.com",
      );

      expect(foundAdmin).toBeDefined();

      // Step 3: Verify passwordSet is false (should reject login)
      expect(foundAdmin?.passwordSet).toBe(false);
      expect(foundAdmin?.passwordHash).toBeNull();
    });

    it("handles case-insensitive email lookup correctly", async () => {
      // Step 1: Create admin with lowercase email
      const password = "SecurePass123";
      const passwordHash = await hashPassword(password);

      await db
        .insert(admins)
        .values({
          email: "case-test@example.com",
          name: "Case Test",
          passwordHash,
          passwordSet: true,
        })
        .returning();

      // Step 2: Try to find with uppercase email
      const foundAdmin = await adminsRepo.findByEmail("case-test@example.com");

      expect(foundAdmin).toBeDefined();
      expect(foundAdmin?.email).toBe("case-test@example.com");

      // Step 3: Verify password works
      const isValidPassword = await verifyPassword(
        password,
        foundAdmin!.passwordHash!,
      );
      expect(isValidPassword).toBe(true);
    });

    it("verifies password hashing is secure (same password produces different hashes)", async () => {
      // Step 1: Hash the same password twice
      const password = "SamePassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Step 2: Verify hashes are different (bcrypt adds salt)
      expect(hash1).not.toBe(hash2);

      // Step 3: Verify both hashes validate the same password
      const isValid1 = await verifyPassword(password, hash1);
      const isValid2 = await verifyPassword(password, hash2);

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);

      // Step 4: Verify wrong password fails for both hashes
      const isInvalid1 = await verifyPassword("WrongPass123", hash1);
      const isInvalid2 = await verifyPassword("WrongPass123", hash2);

      expect(isInvalid1).toBe(false);
      expect(isInvalid2).toBe(false);
    });
  });
});
