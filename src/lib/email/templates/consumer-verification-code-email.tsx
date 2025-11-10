import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from "@react-email/components";

interface ConsumerVerificationCodeEmailProps {
  code: string;
}

export const ConsumerVerificationCodeEmail = ({
  code,
}: ConsumerVerificationCodeEmailProps) => (
  <Html>
    <Head />
    <Preview>Your SkinBestie verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://skinbestie.co/SkinBESTIE.png"
          alt="SkinBestie"
          width="160"
          height="auto"
          style={logo}
        />

        <Text style={text}>
          Welcome back! Use the verification code below to log in:
        </Text>

        <Container style={codeContainer}>
          <Text style={codeText}>{code}</Text>
        </Container>

        <Text style={expiryText}>This code will expire in 15 minutes.</Text>

        <Text style={warningText}>
          If you didn&apos;t try to log in, you can safely ignore this email.
        </Text>

        <Text style={footer}>
          © {new Date().getFullYear()} SkinBestie. All rights reserved.
        </Text>
      </Container>
    </Body>
  </Html>
);

ConsumerVerificationCodeEmail.PreviewProps = {
  code: "123456",
} as ConsumerVerificationCodeEmailProps;

export default ConsumerVerificationCodeEmail;

// Styles based on SkinBestie brand colors
const main = {
  backgroundColor: "#fffdf4", // skinbestie brand background
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#F4F2EB",
  margin: "0 auto",
  padding: "40px 20px 48px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const logo = {
  margin: "0 auto 32px",
  display: "block",
};

const text = {
  color: "#323232", // skinbestie-landing-black
  fontSize: "16px",
  lineHeight: "26px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const codeContainer = {
  background: "#FFFFFF",
  borderRadius: "12px",
  margin: "32px auto",
  padding: "24px 32px",
  width: "fit-content",
};

const codeText = {
  color: "#323232", // skinbestie-landing-black
  fontSize: "32px",
  fontWeight: "bold" as const,
  letterSpacing: "8px",
  margin: "0",
  textAlign: "center" as const,
  fontFamily: "monospace",
};

const expiryText = {
  color: "#323232", // skinbestie-landing-black
  fontSize: "14px",
  lineHeight: "22px",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const warningText = {
  color: "#B3B2AD", // skinbestie-landing-gray-form
  fontSize: "14px",
  lineHeight: "22px",
  textAlign: "center" as const,
  margin: "32px 0 0",
  borderTop: "1px solid #f1f2f3", // skinbestie-neutral-border
  paddingTop: "24px",
};

const footer = {
  color: "#B3B2AD", // skinbestie-landing-gray-form
  fontSize: "12px",
  lineHeight: "18px",
  textAlign: "center" as const,
  marginTop: "32px",
};
