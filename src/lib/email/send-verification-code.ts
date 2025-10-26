import { resend, FROM_EMAIL } from './resend';
import { VerificationCodeEmail } from './templates/verification-code-email';

interface SendVerificationCodeParams {
  to: string;
  code: string;
}

export async function sendVerificationCode({
  to,
  code,
}: SendVerificationCodeParams): Promise<{ success: boolean; error?: string }> {
  console.log('\x1b[36m=== SENDING EMAIL ===\x1b[0m');
  console.log(`To: ${to}`);
  console.log(`From: ${FROM_EMAIL}`);
  console.log(`Code: ${code}`);

  const startTime = performance.now();

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reset Your SkinBestie Admin Password',
      react: VerificationCodeEmail({ code }),
    });

    const duration = Math.round(performance.now() - startTime);
    console.log(`\x1b[32m✅ Email sent successfully in ${duration}ms\x1b[0m`);
    console.log('Resend response:', result);

    return { success: true };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    console.error(`\x1b[31m❌ Email failed after ${duration}ms\x1b[0m`);
    console.error('Error details:', error);

    // Log specific error types
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
