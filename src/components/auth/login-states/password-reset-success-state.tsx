import { CheckCircle2 } from "lucide-react";

interface PasswordResetSuccessStateProps {
  onBackToLogin: () => void;
}

export function PasswordResetSuccessState({
  onBackToLogin,
}: PasswordResetSuccessStateProps) {
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
          Password reset successful
        </h2>
        <p className="text-base text-[#3F4548] max-w-md">
          Your password has been updated successfully. You can now sign in with
          your new password.
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={onBackToLogin}
        className="w-full bg-skinbestie-landing-blue text-white py-3 px-6 rounded font-semibold hover:bg-skinbestie-landing-blue/90 transition-colors"
      >
        Back to login
      </button>
    </div>
  );
}
