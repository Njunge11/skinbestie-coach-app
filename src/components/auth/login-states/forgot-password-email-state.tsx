import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordEmailSchema,
  type ForgotPasswordEmailInput,
} from "@/lib/validations/auth";

interface ForgotPasswordEmailStateProps {
  onContinue: () => void;
  onSubmit?: (data: ForgotPasswordEmailInput) => Promise<void>;
}

export function ForgotPasswordEmailState({
  onContinue,
  onSubmit,
}: ForgotPasswordEmailStateProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordEmailInput>({
    resolver: zodResolver(forgotPasswordEmailSchema),
  });

  const handleFormSubmit = async (data: ForgotPasswordEmailInput) => {
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

  return (
    <>
      <h1 className="font-[family-name:var(--font-anton)] text-center text-[2rem] uppercase text-[#222118]">
        Reset Password
      </h1>
      <p className="text-center text-lg font-medium text-[#3F4548] pt-2">
        Enter your email address and we&apos;ll send you a code to reset your
        password
      </p>

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="mt-6 space-y-4"
      >
        {serverError && (
          <div
            className="p-3 bg-red-50 border border-red-200 rounded-md"
            role="alert"
          >
            <p className="text-sm text-red-800">{serverError}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="reset-email"
            className="block text-sm font-medium text-[#272B2D] mb-2"
          >
            Email address
          </label>
          <Input
            type="email"
            id="reset-email"
            placeholder="you@example.com"
            style={{ border: "0.5px solid #828282" }}
            className="w-full px-4 py-3 rounded bg-white text-[#272B2D] placeholder:text-[#878481] focus:outline-none focus:ring-2 focus:ring-[#030303] focus:border-transparent"
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-skinbestie-landing-blue text-white py-3 px-6 rounded font-semibold hover:bg-skinbestie-landing-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Sending..." : "Continue"}
        </button>
      </form>
    </>
  );
}
