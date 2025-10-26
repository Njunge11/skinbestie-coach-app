import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordEmailSchema, type ForgotPasswordEmailInput } from "@/lib/validations/auth";

interface ForgotPasswordEmailStateProps {
  onContinue: () => void;
  onBackToLogin: () => void;
  onSubmit?: (data: ForgotPasswordEmailInput) => Promise<void>;
}

export function ForgotPasswordEmailState({
  onContinue,
  onBackToLogin,
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
      setServerError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-muted-foreground text-balance">
            Enter your email address and we&apos;ll send you a code to reset your password
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="reset-email">Email</FieldLabel>
          <Input
            id="reset-email"
            type="email"
            placeholder="m@example.com"
            className="border-[#030303] border-[0.5px]"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
          {serverError && (
            <p className="text-sm text-red-600 mt-1">{serverError}</p>
          )}
        </Field>
        <Field>
          <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Continue"}
          </Button>
        </Field>
        <div className="text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm underline-offset-2 hover:underline"
          >
            Back to login
          </button>
        </div>
      </FieldGroup>
    </form>
  );
}
