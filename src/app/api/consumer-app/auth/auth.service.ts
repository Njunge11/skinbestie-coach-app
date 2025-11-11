import type { IAuthRepository, UserWithProfile } from "./auth.repo";
import { createAuthRepository } from "./auth.repo";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendConsumerVerificationCode } from "@/lib/email/send-consumer-verification-code";

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CreateVerificationTokenResult = {
  token: string; // Plain token for sending in email
  expires: Date;
};

export type CreateVerificationTokenDeps = {
  now?: () => Date;
};

export type UseVerificationTokenResult = {
  identifier: string;
};

export type UseVerificationTokenDeps = {
  now?: () => Date;
};

export type CreateVerificationCodeResult = {
  message: string;
  expires: Date;
};

export type CreateVerificationCodeDeps = {
  now?: () => Date;
};

export type VerifyCodeResult = {
  identifier: string;
};

export type VerifyCodeDeps = {
  now?: () => Date;
};

export interface IAuthService {
  getUserByEmail(email: string): Promise<ServiceResult<UserWithProfile>>;
  getUserById(id: string): Promise<ServiceResult<UserWithProfile>>;
  createVerificationToken(
    identifier: string,
    deps?: CreateVerificationTokenDeps,
  ): Promise<ServiceResult<CreateVerificationTokenResult>>;
  createVerificationCode(
    identifier: string,
    deps?: CreateVerificationCodeDeps,
  ): Promise<ServiceResult<CreateVerificationCodeResult>>;
  useVerificationToken(
    identifier: string,
    token: string,
    deps?: UseVerificationTokenDeps,
  ): Promise<ServiceResult<UseVerificationTokenResult>>;
  verifyCode(
    identifier: string,
    code: string,
    deps?: VerifyCodeDeps,
  ): Promise<ServiceResult<VerifyCodeResult>>;
}

export function createAuthService(
  repository: IAuthRepository = createAuthRepository(),
): IAuthService {
  return {
    async getUserByEmail(
      email: string,
    ): Promise<ServiceResult<UserWithProfile>> {
      try {
        const result = await repository.getUserByEmail(email);

        if (!result) {
          return {
            success: false,
            error: "User not found",
          };
        }

        return { success: true, data: result };
      } catch (error) {
        console.error("Error retrieving user by email:", error);
        return {
          success: false,
          error: "Failed to retrieve user",
        };
      }
    },

    async getUserById(id: string): Promise<ServiceResult<UserWithProfile>> {
      try {
        // Validate UUID format
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          return {
            success: false,
            error: "Invalid user ID format",
          };
        }

        const result = await repository.getUserById(id);

        if (!result) {
          return {
            success: false,
            error: "User not found",
          };
        }

        return { success: true, data: result };
      } catch (error) {
        console.error("Error retrieving user by ID:", error);
        return {
          success: false,
          error: "Failed to retrieve user",
        };
      }
    },

    async createVerificationToken(
      identifier: string,
      deps: CreateVerificationTokenDeps = {},
    ): Promise<ServiceResult<CreateVerificationTokenResult>> {
      try {
        const { now = () => new Date() } = deps;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
          return {
            success: false,
            error: "Invalid email format",
          };
        }

        // Generate random URL-safe token (32 bytes = 43 base64url chars)
        const plainToken = crypto
          .randomBytes(32)
          .toString("base64url")
          .slice(0, 43);

        // Hash token for storage
        const hashedToken = await bcrypt.hash(plainToken, 10);

        // Set expiration (15 minutes from now)
        const currentTime = now();
        const expires = new Date(currentTime.getTime() + 15 * 60 * 1000);

        // Store hashed token in repository
        await repository.createVerificationToken({
          identifier,
          token: hashedToken,
          expires,
        });

        // Return plain token for sending in email
        return {
          success: true,
          data: {
            token: plainToken,
            expires,
          },
        };
      } catch (error) {
        console.error("Error creating verification token:", error);
        return {
          success: false,
          error: "Failed to create verification token",
        };
      }
    },

    async useVerificationToken(
      identifier: string,
      token: string,
      deps: UseVerificationTokenDeps = {},
    ): Promise<ServiceResult<UseVerificationTokenResult>> {
      try {
        const { now = () => new Date() } = deps;

        // Find all tokens for this identifier
        const tokens =
          await repository.findVerificationTokensByIdentifier(identifier);

        if (tokens.length === 0) {
          return {
            success: false,
            error: "Invalid or expired token",
          };
        }

        // Try to match the plain token against each hashed token
        for (const storedToken of tokens) {
          const isMatch = await bcrypt.compare(token, storedToken.token);

          if (isMatch) {
            // Check if token is expired
            const currentTime = now();
            if (storedToken.expires < currentTime) {
              // Delete expired token
              await repository.deleteVerificationToken(
                identifier,
                storedToken.token,
              );
              return {
                success: false,
                error: "Invalid or expired token",
              };
            }

            // Token is valid - delete it (one-time use)
            const deleted = await repository.deleteVerificationToken(
              identifier,
              storedToken.token,
            );

            if (!deleted) {
              return {
                success: false,
                error: "Invalid or expired token",
              };
            }

            return {
              success: true,
              data: {
                identifier,
              },
            };
          }
        }

        // No matching token found
        return {
          success: false,
          error: "Invalid or expired token",
        };
      } catch (error) {
        console.error("Error using verification token:", error);
        return {
          success: false,
          error: "Failed to use verification token",
        };
      }
    },

    async createVerificationCode(
      identifier: string,
      deps: CreateVerificationCodeDeps = {},
    ): Promise<ServiceResult<CreateVerificationCodeResult>> {
      try {
        const { now = () => new Date() } = deps;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
          return {
            success: false,
            error: "Invalid email format",
          };
        }

        // Generate random 6-digit numeric code
        const plainCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();

        // Hash code for storage
        const hashedCode = await bcrypt.hash(plainCode, 10);

        // Set expiration (15 minutes from now)
        const currentTime = now();
        const expires = new Date(currentTime.getTime() + 15 * 60 * 1000);

        // Store hashed code in repository
        await repository.createVerificationCode({
          identifier,
          code: hashedCode,
          expires,
        });

        // Send email (must await in serverless environments)
        await sendConsumerVerificationCode({
          to: identifier,
          code: plainCode,
        });

        // Return success message without exposing the code
        return {
          success: true,
          data: {
            message: "Verification code sent to your email",
            expires,
          },
        };
      } catch (error) {
        console.error("Error creating verification code:", error);
        return {
          success: false,
          error: "Failed to create verification code",
        };
      }
    },

    async verifyCode(
      identifier: string,
      code: string,
      deps: VerifyCodeDeps = {},
    ): Promise<ServiceResult<VerifyCodeResult>> {
      try {
        const { now = () => new Date() } = deps;

        // Find all codes for this identifier (reusing tokens table)
        const codes =
          await repository.findVerificationTokensByIdentifier(identifier);

        if (codes.length === 0) {
          return {
            success: false,
            error: "Invalid or expired code",
          };
        }

        // Try to match the plain code against each hashed code
        for (const storedCode of codes) {
          const isMatch = await bcrypt.compare(code, storedCode.token);

          if (isMatch) {
            // Check if code is expired
            const currentTime = now();
            if (storedCode.expires < currentTime) {
              // Delete expired code
              await repository.deleteVerificationToken(
                identifier,
                storedCode.token,
              );
              return {
                success: false,
                error: "Invalid or expired code",
              };
            }

            // Code is valid - delete it (one-time use)
            const deleted = await repository.deleteVerificationToken(
              identifier,
              storedCode.token,
            );

            if (!deleted) {
              return {
                success: false,
                error: "Invalid or expired code",
              };
            }

            return {
              success: true,
              data: {
                identifier,
              },
            };
          }
        }

        // No matching code found
        return {
          success: false,
          error: "Invalid or expired code",
        };
      } catch (error) {
        console.error("Error verifying code:", error);
        return {
          success: false,
          error: "Failed to verify code",
        };
      }
    },
  };
}
