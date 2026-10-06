import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface PaymentConfirmationEmailProps {
  studentName: string;
  internshipDomain: string;
  amount?: number;
  transactionId?: string;
  paidDate?: string;
  dashboardUrl: string;
  appUrl?: string;
}

export function PaymentConfirmationEmail({
  studentName,
  internshipDomain,
  amount = 450,
  transactionId = "CXA-CONFIRMED",
  paidDate = new Date().toLocaleDateString("en-IN"),
  dashboardUrl,
  appUrl,
}: PaymentConfirmationEmailProps) {
  const baseUrl =
    appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://codxa-agency.online");

  return (
    <Html>
      <Head />
      <Preview>
        {`Payment Confirmed: CodeXa Internship Service Fee (₹${amount})`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandSection}>
            <Img
              src={`${baseUrl}/email-assets/codexa-logo.png`}
              width="135"
              alt="CodeXa Agency"
              style={logo}
            />
          </Section>

          <Section style={hero}>
            <Img
              src={`${baseUrl}/email-assets/payment-success.png`}
              width="500"
              alt="Payment Received"
              style={heroImage}
            />
            <div style={{ textAlign: "center" }}>
              <span style={confirmedBadge}>PAYMENT CONFIRMED</span>
            </div>
            <Heading style={heading}>Payment Received &amp; Verified</Heading>
            <Text style={hello}>Hi {studentName},</Text>
            <Text style={paragraph}>
              Your mandatory internship service payment has been successfully recorded and
              verified. Your student ID and development access credentials are now active.
            </Text>
          </Section>

          <Section style={receiptCard}>
            <Text style={receiptHeading}>OFFICIAL RECEIPT DETAILS</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={item}>Student Name</td>
                  <td style={value}>{studentName}</td>
                </tr>
                <tr>
                  <td style={item}>Track / Domain</td>
                  <td style={value}>{internshipDomain || "Engineering Track"}</td>
                </tr>
                <tr>
                  <td style={item}>Transaction Reference</td>
                  <td style={monoValue}>{transactionId}</td>
                </tr>
                <tr>
                  <td style={item}>Payment Date</td>
                  <td style={value}>{paidDate}</td>
                </tr>
                <tr>
                  <td style={item}>Mandatory Student ID Card</td>
                  <td style={value}>₹150</td>
                </tr>
                <tr>
                  <td style={item}>AI Development Tools Pack</td>
                  <td style={value}>₹300</td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <Hr style={divider} />
                  </td>
                </tr>
                <tr>
                  <td style={totalLabel}>Total Paid</td>
                  <td style={totalPrice}>₹{amount}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={buttonSection}>
            <Button href={dashboardUrl} style={button}>
              Access Student Dashboard
            </Button>
            <Text style={secureText}>
              All automated daily payment reminders have been stopped permanently.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={{ padding: "0 10px" }}>
            <Text style={footer}>
              CodeXa Agency &bull; Enterprise Developer Platform
              <br />
              Building Solutions. Creating Futures.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default PaymentConfirmationEmail;

const main: React.CSSProperties = {
  backgroundColor: "#080808",
  fontFamily: "Arial, Helvetica, sans-serif",
  padding: "32px 12px",
};

const container: React.CSSProperties = {
  maxWidth: "620px",
  margin: "0 auto",
  backgroundColor: "#101010",
  borderRadius: "20px",
  overflow: "hidden",
  border: "1px solid #272727",
};

const brandSection: React.CSSProperties = {
  padding: "28px 32px 15px",
  textAlign: "center",
};

const logo: React.CSSProperties = {
  margin: "0 auto",
  display: "block",
  borderRadius: "8px",
};

const hero: React.CSSProperties = {
  padding: "10px 34px 20px",
  textAlign: "center",
};

const heroImage: React.CSSProperties = {
  width: "100%",
  maxWidth: "500px",
  borderRadius: "14px",
  marginBottom: "22px",
  display: "block",
  margin: "0 auto 22px auto",
  border: "1px solid #26262a",
};

const confirmedBadge: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#0c2b18",
  color: "#22c55e",
  border: "1px solid #166534",
  borderRadius: "999px",
  padding: "7px 16px",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "1.2px",
  textTransform: "uppercase",
};

const heading: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "26px",
  lineHeight: "34px",
  margin: "18px 0 10px",
  fontWeight: 800,
};

const hello: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "17px",
  textAlign: "left",
  fontWeight: 600,
  marginTop: "16px",
};

const paragraph: React.CSSProperties = {
  color: "#a9a9a9",
  fontSize: "14px",
  lineHeight: "22px",
  textAlign: "left",
};

const receiptCard: React.CSSProperties = {
  margin: "16px 32px 24px",
  padding: "22px",
  backgroundColor: "#151515",
  border: "1px solid #292929",
  borderRadius: "14px",
};

const receiptHeading: React.CSSProperties = {
  color: "#fff",
  fontWeight: 700,
  fontSize: "13px",
  letterSpacing: "1px",
  margin: "0 0 12px 0",
};

const item: React.CSSProperties = {
  color: "#888899",
  padding: "8px 0",
  fontSize: "13px",
};

const value: React.CSSProperties = {
  color: "#ffffff",
  textAlign: "right",
  fontWeight: 600,
  fontSize: "13px",
};

const monoValue: React.CSSProperties = {
  color: "#22c55e",
  textAlign: "right",
  fontWeight: 600,
  fontSize: "12px",
  fontFamily: "monospace",
};

const totalLabel: React.CSSProperties = {
  color: "#fff",
  fontWeight: 700,
  paddingTop: "12px",
  fontSize: "15px",
};

const totalPrice: React.CSSProperties = {
  color: "#22c55e",
  textAlign: "right",
  fontWeight: 800,
  fontSize: "18px",
  paddingTop: "12px",
};

const divider: React.CSSProperties = {
  borderColor: "#282828",
  margin: "12px 0",
};

const buttonSection: React.CSSProperties = {
  padding: "0 32px 25px",
  textAlign: "center",
};

const button: React.CSSProperties = {
  backgroundColor: "#16a34a",
  borderRadius: "10px",
  color: "#fff",
  display: "inline-block",
  fontWeight: 700,
  fontSize: "14px",
  padding: "14px 32px",
  textDecoration: "none",
  letterSpacing: "0.5px",
};

const secureText: React.CSSProperties = {
  color: "#777",
  fontSize: "11px",
  marginTop: "12px",
};

const footer: React.CSSProperties = {
  color: "#666",
  fontSize: "11px",
  lineHeight: "18px",
  padding: "10px 32px 28px",
  textAlign: "center",
};
