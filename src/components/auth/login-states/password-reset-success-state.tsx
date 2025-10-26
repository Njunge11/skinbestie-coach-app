import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";

interface PasswordResetSuccessStateProps {
  onBackToLogin: () => void;
}

export function PasswordResetSuccessState({
  onBackToLogin,
}: PasswordResetSuccessStateProps) {
  return (
    <FieldGroup>
      <div className="flex flex-col items-center gap-6 text-center py-4">
        <svg
          className="h-16 w-16 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            strokeWidth={2}
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4"
          />
        </svg>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Password reset successful</h1>
          <p className="text-muted-foreground text-balance">
            Your password has been updated successfully
          </p>
        </div>
      </div>
      <Field>
        <Button type="button" className="w-full bg-black hover:bg-gray-800 text-white" onClick={onBackToLogin}>
          Back to login
        </Button>
      </Field>
    </FieldGroup>
  );
}
