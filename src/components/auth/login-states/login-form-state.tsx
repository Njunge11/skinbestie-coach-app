import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

interface LoginFormStateProps {
  onForgotPassword: () => void;
  onSubmit?: (data: LoginInput) => Promise<void>;
  error?: string | null;
  onClearError?: () => void;
}

export function LoginFormState({
  onForgotPassword,
  onSubmit,
  error,
  onClearError,
}: LoginFormStateProps) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const handleInputChange = () => {
    if (error && onClearError) {
      onClearError();
    }
  };

  const handleFormSubmit = async (data: LoginInput) => {
    await onSubmit?.(data);
  };

  return (
    <>
      <h1 className="font-[family-name:var(--font-anton)] text-center text-[2rem] uppercase text-[#222118]">
        Sign In
      </h1>
      <p className="text-center text-lg font-medium text-[#3F4548] pt-2">
        Access your admin dashboard
      </p>

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="mt-6 space-y-4"
      >
        {error && (
          <div
            className="p-3 bg-red-50 border border-red-200 rounded-md"
            role="alert"
          >
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#272B2D] mb-2"
          >
            Email address
          </label>
          <Input
            type="email"
            id="email"
            placeholder="you@example.com"
            style={{ border: "0.5px solid #828282" }}
            className="w-full px-4 py-3 rounded bg-white text-[#272B2D] placeholder:text-[#878481] focus:outline-none focus:ring-2 focus:ring-[#030303] focus:border-transparent"
            {...register("email", {
              onChange: handleInputChange,
            })}
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#272B2D]"
            >
              Password
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-[#030303] font-semibold underline hover:text-[#222118] transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              style={{ border: "0.5px solid #828282" }}
              className="w-full px-4 py-3 rounded bg-white text-[#272B2D] placeholder:text-[#878481] focus:outline-none focus:ring-2 focus:ring-[#030303] focus:border-transparent pr-10"
              {...register("password", {
                onChange: handleInputChange,
              })}
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
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-skinbestie-landing-blue text-white py-3 px-6 rounded font-semibold hover:bg-skinbestie-landing-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </>
  );
}
