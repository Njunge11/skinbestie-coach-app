import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { verificationCodeSchema, type VerificationCodeInput } from "@/lib/validations/auth";

interface VerificationCodeStateProps {
  onContinue: () => void;
  onResendCode: () => Promise<void>;
  onSubmit?: (data: VerificationCodeInput) => Promise<void>;
}

export function VerificationCodeState({
  onContinue,
  onResendCode,
  onSubmit,
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
      setServerError(error instanceof Error ? error.message : "An error occurred");
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
      setServerError(error instanceof Error ? error.message : "Failed to resend code");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Enter verification code</h1>
          <p className="text-muted-foreground text-balance">
            We&apos;ve sent a 6-digit code to your email address
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="verification-code">Verification code</FieldLabel>
          <Input
            id="verification-code"
            type="text"
            placeholder="000000"
            maxLength={6}
            className="border-[#030303] border-[0.5px]"
            {...register("code")}
          />
          {errors.code && (
            <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
          )}
          {serverError && (
            <p className="text-sm text-red-600 mt-1">{serverError}</p>
          )}
          {resendMessage && (
            <p className="text-sm text-green-600 mt-1">{resendMessage}</p>
          )}
        </Field>
        <Field>
          <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Continue"}
          </Button>
        </Field>
        <div className="text-center">
          <button
            type="button"
            onClick={handleResendClick}
            className="text-sm underline-offset-2 hover:underline"
          >
            Resend code
          </button>
        </div>
      </FieldGroup>
    </form>
  );
}
