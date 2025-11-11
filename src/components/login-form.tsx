"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { LoginFormState } from "@/components/auth/login-states/login-form-state";
import { ForgotPasswordEmailState } from "@/components/auth/login-states/forgot-password-email-state";
import { VerificationCodeState } from "@/components/auth/login-states/verification-code-state";
import { SetNewPasswordState } from "@/components/auth/login-states/set-new-password-state";
import { PasswordResetSuccessState } from "@/components/auth/login-states/password-reset-success-state";
import LoginMarketing from "@/components/auth/login-marketing";
import {
  forgotPasswordAction,
  verifyCodeAction,
  resetPasswordAction,
} from "@/actions/auth";
import type {
  LoginInput,
  ForgotPasswordEmailInput,
  VerificationCodeInput,
  SetNewPasswordInput,
} from "@/lib/validations/auth";

type FormState =
  | "login"
  | "forgot-password"
  | "verification"
  | "new-password"
  | "success";

export function LoginForm() {
  const [formState, setFormState] = useState<FormState>("login");
  const [email, setEmail] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const resetToLogin = () => {
    setFormState("login");
    setEmail("");
    setVerificationCode("");
    setLoginError(null);
  };

  const handleBack = () => {
    if (formState === "login") {
      window.location.href = "/";
    } else {
      resetToLogin();
    }
  };

  const handleLoginSubmit = async (data: LoginInput) => {
    setLoginError(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setLoginError("Invalid email or password");
      throw new Error("Invalid email or password");
    }

    if (result?.ok) {
      // Redirect to home on successful login
      window.location.href = "/";
    }
  };

  const handleForgotPasswordSubmit = async (data: ForgotPasswordEmailInput) => {
    const result = await forgotPasswordAction(data.email);

    if (!result.success) {
      throw new Error(result.error || "Failed to send verification code");
    }

    // Store email for subsequent steps
    setEmail(data.email);
  };

  const handleVerificationCodeSubmit = async (data: VerificationCodeInput) => {
    const result = await verifyCodeAction(email, data.code);

    if (!result.success) {
      throw new Error(result.error || "Invalid verification code");
    }

    // Store verification code for password reset
    setVerificationCode(data.code);
  };

  const handleSetNewPasswordSubmit = async (data: SetNewPasswordInput) => {
    const result = await resetPasswordAction(
      email,
      verificationCode,
      data.password,
      data.confirmPassword,
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to reset password");
    }
  };

  const handleResendCode = async () => {
    if (!email) return;

    const result = await forgotPasswordAction(email);

    if (!result.success) {
      throw new Error(result.error || "Failed to resend verification code");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 md:h-[784px]">
        <LoginMarketing />
        <div className="flex flex-col pt-5 pb-5 px-4 md:px-[30px] bg-skinbestie-landing-white">
          {/* Top bar */}
          <div className="flex justify-start items-baseline">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={24} className="text-[#222118]" />
              <span className="font-[family-name:var(--font-anton)] text-2xl font-normal leading-none tracking-tight uppercase text-[#222118]">
                Back
              </span>
            </button>
          </div>

          {/* Card */}
          <div className="mt-8 mx-auto w-full max-w-[440px] bg-skinbestie-landing-gray p-6 rounded-lg">
            {formState === "login" && (
              <LoginFormState
                onForgotPassword={() => setFormState("forgot-password")}
                onSubmit={handleLoginSubmit}
                error={loginError}
                onClearError={() => setLoginError(null)}
              />
            )}
            {formState === "forgot-password" && (
              <ForgotPasswordEmailState
                onContinue={() => setFormState("verification")}
                onSubmit={handleForgotPasswordSubmit}
              />
            )}
            {formState === "verification" && (
              <VerificationCodeState
                onContinue={() => setFormState("new-password")}
                onResendCode={handleResendCode}
                onSubmit={handleVerificationCodeSubmit}
                email={email}
              />
            )}
            {formState === "new-password" && (
              <SetNewPasswordState
                onContinue={() => setFormState("success")}
                onSubmit={handleSetNewPasswordSubmit}
              />
            )}
            {formState === "success" && (
              <PasswordResetSuccessState onBackToLogin={resetToLogin} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
