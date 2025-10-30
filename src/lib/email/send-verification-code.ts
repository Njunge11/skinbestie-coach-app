import { resend, FROM_EMAIL } from "./resend";
import { VerificationCodeEmail } from "./templates/verification-code-email";

interface SendVerificationCodeParams {
  to: string;
  code: string;
}

export async function sendVerificationCode({
  to,
  code,
}: SendVerificationCodeParams): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Reset Your SkinBestie Admin Password",
      react: VerificationCodeEmail({ code }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending verification email:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
