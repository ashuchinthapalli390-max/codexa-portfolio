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

export interface MandatoryPaymentReminderEmailProps {
  studentName: string;
  internshipDomain: string;
  amount?: number;
  paymentUrl: string;
  appUrl?: string;
}

export function MandatoryPaymentReminderEmail({
  studentName,
  internshipDomain,
  amount = 450,
  paymentUrl,
  appUrl,
}: MandatoryPaymentReminderEmailProps) {
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
        {`Your mandatory CodeXa internship service payment of ₹${amount} is pending.`}
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
              src={`${baseUrl}/email-assets/payment-reminder.gif`}
              width="500"
              alt="CodeXa Payment Reminder"
              style={heroImage}
            />
            <div style={{ textAlign: "center" }}>
              <span style={pendingBadge}>PAYMENT PENDING</span>
            </div>
            <Heading style={heading}>Internship Service Payment</Heading>
            <Text style={hello}>Hi {studentName},</Text>
            <Text style={paragraph}>
              This is your daily reminder that the mandatory internship service payment
              associated with your CodeXa internship is still pending.
            </Text>
          </Section>

          <Section style={amountCard}>
            <Text style={amountLabel}>TOTAL PAYABLE</Text>
            <Text style={amountStyle}>₹{amount}</Text>
            <Text style={domain}>{internshipDomain || "Engineering Track"}</Text>
          </Section>

          <Section style={billCard}>
            <Text style={billHeading}>SERVICE BILL BREAKDOWN</Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={item}>Mandatory Student ID Card</td>
                  <td style={price}>₹150</td>
                </tr>
                <tr>
                  <td style={item}>AI Development Tools Pack</td>
                  <td style={price}>₹300</td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <Hr style={divider} />
                  </td>
                </tr>
                <tr>
                  <td style={totalLabel}>Total Payable</td>
                  <td style={totalPrice}>₹450</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={buttonSection}>
            <Button href={paymentUrl} style={button}>
              Complete Payment ₹450
            </Button>
            <Text style={secureText}>
              You will be redirected to your authenticated CodeXa dashboard.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={{ padding: "0 10px" }}>
            <Text style={note}>
              If your payment was completed recently, the status may still be processing. Once
              the payment is confirmed, these reminders will stop automatically.
            </Text>
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

export default MandatoryPaymentReminderEmail;

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

const pendingBadge: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#2b0b0b",
  color: "#ff5555",
  border: "1px solid #681d1d",
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

const amountCard: React.CSSProperties = {
  margin: "8px 32px 22px",
  padding: "24px",
  backgroundColor: "#170909",
  border: "1px solid #4a1515",
  borderRadius: "14px",
  textAlign: "center",
};

const amountLabel: React.CSSProperties = {
  color: "#a8a8a8",
  fontSize: "11px",
  letterSpacing: "1.5px",
  margin: "0 0 4px 0",
};

const amountStyle: React.CSSProperties = {
  color: "#ff3b3b",
  fontSize: "44px",
  fontWeight: 800,
  margin: "8px 0",
};

const domain: React.CSSProperties = {
  color: "#dedede",
  fontSize: "13px",
  letterSpacing: "0.5px",
};

const billCard: React.CSSProperties = {
  margin: "0 32px 24px",
  padding: "22px",
  backgroundColor: "#151515",
  border: "1px solid #292929",
  borderRadius: "14px",
};

const billHeading: React.CSSProperties = {
  color: "#fff",
  fontWeight: 700,
  fontSize: "13px",
  letterSpacing: "1px",
  margin: "0 0 12px 0",
};

const item: React.CSSProperties = {
  color: "#bdbdbd",
  padding: "10px 0",
  fontSize: "14px",
};

const price: React.CSSProperties = {
  color: "#fff",
  textAlign: "right",
  fontWeight: 600,
  fontSize: "14px",
};

const totalLabel: React.CSSProperties = {
  color: "#fff",
  fontWeight: 700,
  paddingTop: "12px",
  fontSize: "15px",
};

const totalPrice: React.CSSProperties = {
  color: "#ff3b3b",
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
  backgroundColor: "#e11d2e",
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

const note: React.CSSProperties = {
  color: "#8c8c8c",
  fontSize: "12px",
  lineHeight: "19px",
  padding: "0 32px",
  textAlign: "center",
};

const footer: React.CSSProperties = {
  color: "#666",
  fontSize: "11px",
  lineHeight: "18px",
  padding: "10px 32px 28px",
  textAlign: "center",
};
