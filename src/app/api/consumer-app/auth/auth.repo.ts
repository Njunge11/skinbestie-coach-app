import { db as defaultDb } from "@/lib/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

export type UserWithProfile = {
  user: {
    id: string;
    email: string;
    emailVerified: Date | null;
    name: string | null;
    image: string | null;
  };
  profile: {
    id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: Date;
    onboardingComplete: boolean;
  } | null;
};

export type VerificationToken = {
  identifier: string;
  token: string;
  expires: Date;
};

export type VerificationCode = {
  identifier: string;
  code: string;
  expires: Date;
};

export interface IAuthRepository {
  getUserByEmail(email: string): Promise<UserWithProfile | null>;
  getUserById(id: string): Promise<UserWithProfile | null>;
  createVerificationToken(data: VerificationToken): Promise<VerificationToken>;
  createVerificationCode(data: VerificationCode): Promise<VerificationCode>;
  findVerificationTokensByIdentifier(
    identifier: string,
  ): Promise<VerificationToken[]>;
  deleteVerificationToken(identifier: string, token: string): Promise<boolean>;
  useVerificationToken(
    identifier: string,
    token: string,
  ): Promise<VerificationToken | null>;
  useVerificationCode(
    identifier: string,
    code: string,
  ): Promise<VerificationCode | null>;
}

// For dependency injection in tests
export type AuthRepoDeps = {
  db?:
    | typeof defaultDb
    | PostgresJsDatabase<typeof schema>
    | PgliteDatabase<typeof schema>;
};

export function createAuthRepository(deps: AuthRepoDeps = {}): IAuthRepository {
  const db = deps.db || defaultDb;

  return {
    async getUserByEmail(email: string): Promise<UserWithProfile | null> {
      try {
        // Find user by email (case-insensitive)
        const [user] = await db
          .select()
          .from(schema.users)
          .where(sql`LOWER(${schema.users.email}) = LOWER(${email})`);

        if (!user) {
          return null;
        }

        // Find profile by userId
        const [profile] = await db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, user.id));

        // Calculate onboardingComplete if profile exists
        const profileWithOnboarding = profile
          ? {
              id: profile.id,
              userId: profile.userId!,
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              phoneNumber: profile.phoneNumber,
              dateOfBirth: profile.dateOfBirth,
              onboardingComplete:
                profile.isCompleted === true &&
                profile.hasCompletedBooking === true,
            }
          : null;

        return {
          user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
            image: user.image,
          },
          profile: profileWithOnboarding,
        };
      } catch {
        return null;
      }
    },

    async getUserById(id: string): Promise<UserWithProfile | null> {
      try {
        // Find user by ID
        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, id));

        if (!user) {
          return null;
        }

        // Find profile by userId
        const [profile] = await db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, user.id));

        // Calculate onboardingComplete if profile exists
        const profileWithOnboarding = profile
          ? {
              id: profile.id,
              userId: profile.userId!,
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              phoneNumber: profile.phoneNumber,
              dateOfBirth: profile.dateOfBirth,
              onboardingComplete:
                profile.isCompleted === true &&
                profile.hasCompletedBooking === true,
            }
          : null;

        return {
          user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
            image: user.image,
          },
          profile: profileWithOnboarding,
        };
      } catch {
        return null;
      }
    },

    async createVerificationToken(
      data: VerificationToken,
    ): Promise<VerificationToken> {
      const [token] = await db
        .insert(schema.verificationTokens)
        .values({
          identifier: data.identifier,
          token: data.token,
          expires: data.expires,
        })
        .returning();

      return {
        identifier: token.identifier,
        token: token.token,
        expires: token.expires,
      };
    },

    async createVerificationCode(
      data: VerificationCode,
    ): Promise<VerificationCode> {
      const [code] = await db
        .insert(schema.verificationTokens)
        .values({
          identifier: data.identifier,
          token: data.code, // Store code in token column
          expires: data.expires,
        })
        .returning();

      return {
        identifier: code.identifier,
        code: code.token,
        expires: code.expires,
      };
    },

    async findVerificationTokensByIdentifier(
      identifier: string,
    ): Promise<VerificationToken[]> {
      const tokens = await db
        .select()
        .from(schema.verificationTokens)
        .where(eq(schema.verificationTokens.identifier, identifier));

      return tokens.map((t) => ({
        identifier: t.identifier,
        token: t.token,
        expires: t.expires,
      }));
    },

    async deleteVerificationToken(
      identifier: string,
      token: string,
    ): Promise<boolean> {
      try {
        const result = await db
          .delete(schema.verificationTokens)
          .where(
            and(
              eq(schema.verificationTokens.identifier, identifier),
              eq(schema.verificationTokens.token, token),
            ),
          )
          .returning();

        return result.length > 0;
      } catch {
        return false;
      }
    },

    async useVerificationToken(
      identifier: string,
      token: string,
    ): Promise<VerificationToken | null> {
      try {
        // Find and delete the token in one operation (consume it)
        const [deletedToken] = await db
          .delete(schema.verificationTokens)
          .where(
            and(
              eq(schema.verificationTokens.identifier, identifier),
              eq(schema.verificationTokens.token, token),
            ),
          )
          .returning();

        if (!deletedToken) {
          return null;
        }

        return {
          identifier: deletedToken.identifier,
          token: deletedToken.token,
          expires: deletedToken.expires,
        };
      } catch {
        return null;
      }
    },

    async useVerificationCode(
      identifier: string,
      code: string,
    ): Promise<VerificationCode | null> {
      try {
        // Find and delete the code in one operation (consume it)
        const [deletedCode] = await db
          .delete(schema.verificationTokens)
          .where(
            and(
              eq(schema.verificationTokens.identifier, identifier),
              eq(schema.verificationTokens.token, code),
            ),
          )
          .returning();

        if (!deletedCode) {
          return null;
        }

        return {
          identifier: deletedCode.identifier,
          code: deletedCode.token,
          expires: deletedCode.expires,
        };
      } catch {
        return null;
      }
    },
  };
}
