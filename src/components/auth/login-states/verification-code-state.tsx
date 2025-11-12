import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  verificationCodeSchema,
  type VerificationCodeInput,
} from "@/lib/validations/auth";

interface VerificationCodeStateProps {
  onContinue: () => void;
  onResendCode: () => Promise<void>;
  onSubmit?: (data: VerificationCodeInput) => Promise<void>;
  email?: string;
}

export function VerificationCodeState({
  onContinue,
  onResendCode,
  onSubmit,
  email,
}: VerificationCodeStateProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerificationCodeInput>({
    resolver: zodResolver(verificationCodeSchema),
  });

  const handleFormSubmit = async (data: VerificationCodeInput) => {
    try {
      setServerError(null);
      await onSubmit?.(data);
      onContinue();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  const handleResendClick = async () => {
    try {
      setServerError(null);
      setResendMessage(null);
      await onResendCode();
      setResendMessage("Verification code resent successfully");
      setTimeout(() => setResendMessage(null), 3000);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Failed to resend code",
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[21rem] space-y-6">
      {/* Success Icon */}
      <div className="relative">
        <CheckCircle2
          className="w-16 h-16 text-green-600"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>

      {/* Title and Description */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-[#272B2D]">
          Check your email
        </h2>
        <p className="text-base text-[#3F4548] max-w-md">
          We&apos;ve sent a 6-digit code to {email && <strong>{email}</strong>}
        </p>
        <p className="text-sm text-[#3F4548]">
          Enter your code below to continue
        </p>
      </div>

      {/* Code Input Form */}
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="w-full space-y-4"
      >
        <div>
          <label
            htmlFor="verification-code"
            className="block text-sm font-medium text-[#272B2D] mb-2 text-center"
          >
            Verification Code
          </label>
          <Input
            type="text"
            id="verification-code"
            maxLength={6}
            placeholder="123456"
            style={{
              border: serverError
                ? "1.5px solid #DC2626"
                : "0.5px solid #828282",
            }}
            className="w-full px-4 py-3 rounded bg-white text-[#272B2D] text-center text-2xl tracking-widest placeholder:text-[#878481] focus:outline-none focus:ring-2 focus:ring-[#030303] focus:border-transparent"
            disabled={isSubmitting}
            aria-invalid={serverError ? "true" : "false"}
            aria-describedby={serverError ? "code-error" : undefined}
            {...register("code")}
          />
          {errors.code && (
            <p className="text-sm text-red-600 mt-2 text-center">
              {errors.code.message}
            </p>
          )}
          {serverError && (
            <p
              id="code-error"
              className="mt-2 text-sm text-red-600 text-center"
              role="alert"
            >
              {serverError}
            </p>
          )}
        </div>

        {resendMessage && (
          <p className="text-sm text-green-600 text-center animate-in fade-in slide-in-from-top-2 duration-300">
            {resendMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-skinbestie-landing-blue text-white py-3 px-6 rounded font-semibold hover:bg-skinbestie-landing-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Verifying..." : "Verify Code"}
        </button>
      </form>

      {/* Resend Link */}
      <div className="text-center">
        <span className="text-sm text-[#3F4548]">Didn&apos;t receive it? </span>
        <button
          type="button"
          onClick={handleResendClick}
          className="text-sm text-[#030303] font-semibold underline hover:text-[#222118] transition-colors"
        >
          Resend email
        </button>
      </div>
    </div>
  );
}
