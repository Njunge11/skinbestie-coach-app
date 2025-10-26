import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { setNewPasswordSchema, type SetNewPasswordInput } from "@/lib/validations/auth";

interface SetNewPasswordStateProps {
  onContinue: () => void;
  onSubmit?: (data: SetNewPasswordInput) => Promise<void>;
}

export function SetNewPasswordState({ onContinue, onSubmit }: SetNewPasswordStateProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetNewPasswordInput>({
    resolver: zodResolver(setNewPasswordSchema),
    mode: "onTouched",
  });

  const handleFormSubmit = async (data: SetNewPasswordInput) => {
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
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-muted-foreground text-balance">
            Choose a strong password for your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              className="border-[#030303] border-[0.5px] pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              className="border-[#030303] border-[0.5px] pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
          )}
          {serverError && (
            <p className="text-sm text-red-600 mt-1">{serverError}</p>
          )}
        </Field>
        <Field>
          <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Continue"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
