"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { LoginFormState } from "@/components/auth/login-states/login-form-state";
import { ForgotPasswordEmailState } from "@/components/auth/login-states/forgot-password-email-state";
import { VerificationCodeState } from "@/components/auth/login-states/verification-code-state";
import { SetNewPasswordState } from "@/components/auth/login-states/set-new-password-state";
import { PasswordResetSuccessState } from "@/components/auth/login-states/password-reset-success-state";
import type {
  LoginInput,
  ForgotPasswordEmailInput,
  VerificationCodeInput,
  SetNewPasswordInput,
} from "@/lib/validations/auth";

type FormState = "login" | "forgot-password" | "verification" | "new-password" | "success";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
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
      // Redirect to dashboard on successful login
      window.location.href = "/dashboard";
    }
  };

  const handleForgotPasswordSubmit = async (data: ForgotPasswordEmailInput) => {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send verification code");
    }

    // Store email for subsequent steps
    setEmail(data.email);
  };

  const handleVerificationCodeSubmit = async (data: VerificationCodeInput) => {
    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: data.code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Invalid verification code");
    }

    // Store verification code for password reset
    setVerificationCode(data.code);
  };

  const handleSetNewPasswordSubmit = async (data: SetNewPasswordInput) => {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: verificationCode,
        password: data.password,
        confirmPassword: data.confirmPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to reset password");
    }
  };

  const handleResendCode = async () => {
    if (!email) return;

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to resend verification code");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 bg-[#F3ECC7]">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            {formState === "login" && (
              <LoginFormState
                onForgotPassword={() => setFormState("forgot-password")}
                onSubmit={handleLoginSubmit}
                error={loginError}
              />
            )}
            {formState === "forgot-password" && (
              <ForgotPasswordEmailState
                onContinue={() => setFormState("verification")}
                onBackToLogin={resetToLogin}
                onSubmit={handleForgotPasswordSubmit}
              />
            )}
            {formState === "verification" && (
              <VerificationCodeState
                onContinue={() => setFormState("new-password")}
                onResendCode={handleResendCode}
                onSubmit={handleVerificationCodeSubmit}
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
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/login.png"
              width={"767"}
              height={"784"}
              alt="login image"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
