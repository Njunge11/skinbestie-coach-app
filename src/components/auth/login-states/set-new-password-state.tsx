import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  setNewPasswordSchema,
  type SetNewPasswordInput,
} from "@/lib/validations/auth";

interface SetNewPasswordStateProps {
  onContinue: () => void;
  onSubmit?: (data: SetNewPasswordInput) => Promise<void>;
}

export function SetNewPasswordState({
  onContinue,
  onSubmit,
}: SetNewPasswordStateProps) {
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
      setServerError(
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  return (
    <>
      <h1 className="font-[family-name:var(--font-anton)] text-center text-[2rem] uppercase text-[#222118]">
        Set New Password
      </h1>
      <p className="text-center text-lg font-medium text-[#3F4548] pt-2">
        Choose a strong password for your account
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
            htmlFor="new-password"
            className="block text-sm font-medium text-[#272B2D] mb-2"
          >
            New password
          </label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              style={{ border: "0.5px solid #828282" }}
              className="w-full px-4 py-3 rounded bg-white text-[#272B2D] placeholder:text-[#878481] focus:outline-none focus:ring-2 focus:ring-[#030303] focus:border-transparent pr-10"
              disabled={isSubmitting}
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
            <p className="text-sm text-red-600 mt-1">
              {errors.password.message}
            </p>
          )}
          <p className="text-xs text-[#3F4548] mt-1">
            Must be at least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-[#272B2D] mb-2"
          >
            Confirm password
          </label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              style={{ border: "0.5px solid #828282" }}
              className="w-full px-4 py-3 rounded bg-white text-[#272B2D] placeholder:text-[#878481] focus:outline-none focus:ring-2 focus:ring-[#030303] focus:border-transparent pr-10"
              disabled={isSubmitting}
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
            <p className="text-sm text-red-600 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-skinbestie-landing-blue text-white py-3 px-6 rounded font-semibold hover:bg-skinbestie-landing-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Updating..." : "Reset Password"}
        </button>
      </form>
    </>
  );
}
