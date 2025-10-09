import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
} from '@react-email/components';

interface VerificationCodeEmailProps {
  code: string;
}

export function VerificationCodeEmail({ code }: VerificationCodeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your verification code to reset your password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>SkinBestie Admin</Heading>

          <Text style={text}>
            Use the verification code below to reset your password:
          </Text>

          <Section style={codeContainer}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={text}>This code will expire in 15 minutes.</Text>

          <Text style={warningText}>
            If you didn't request a password reset, you can safely ignore this email.
          </Text>

          <Text style={footer}>
            © {new Date().getFullYear()} SkinBestie. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default VerificationCodeEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'center' as const,
  padding: '0 40px',
};

const codeContainer = {
  background: '#f4f4f4',
  borderRadius: '8px',
  margin: '32px auto',
  padding: '24px',
  width: 'fit-content',
};

const codeText = {
  color: '#000',
  fontSize: '48px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  margin: '0',
  textAlign: 'center' as const,
  fontFamily: 'monospace',
};

const warningText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  padding: '0 40px',
  marginTop: '32px',
};

const footer = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  marginTop: '48px',
};
