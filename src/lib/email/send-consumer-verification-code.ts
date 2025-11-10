import { resend, FROM_EMAIL } from "./resend";
import { ConsumerVerificationCodeEmail } from "./templates/consumer-verification-code-email";

interface SendConsumerVerificationCodeParams {
  to: string;
  code: string;
}

export async function sendConsumerVerificationCode({
  to,
  code,
}: SendConsumerVerificationCodeParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Your SkinBestie Login Code",
      react: ConsumerVerificationCodeEmail({ code }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending consumer verification email:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
