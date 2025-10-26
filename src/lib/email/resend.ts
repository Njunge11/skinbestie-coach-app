import { Resend } from 'resend';

console.log('\x1b[35m[EMAIL CONFIG]\x1b[0m Checking email configuration...');

if (!process.env.RESEND_API_KEY) {
  console.error('\x1b[31m❌ RESEND_API_KEY is not set!\x1b[0m');
  throw new Error('RESEND_API_KEY environment variable is not set');
}

const apiKeyPrefix = process.env.RESEND_API_KEY.substring(0, 7);
console.log(`\x1b[32m✅ RESEND_API_KEY is set (${apiKeyPrefix}...)\x1b[0m`);

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@skinbestie.com';
console.log(`\x1b[32m✅ FROM_EMAIL: ${FROM_EMAIL}\x1b[0m`);
