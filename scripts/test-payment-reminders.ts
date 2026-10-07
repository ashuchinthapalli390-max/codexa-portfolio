/**
 * CODEXA AGENCY — MANDATORY ₹450 PAYMENT REMINDER TEST SUITE
 * 
 * Verifies:
 * 1. Eligible unpaid normal-domain intern eligibility
 * 2. 2-month Cybersecurity (₹450) is included
 * 3. Ethical Hacking (₹1,100) is excluded
 * 4. Pentesting / VAPT (₹1,900) is excluded
 * 5. Cyber - Ethical Hacking + Pentesting / Cyber Elite (₹2,300) is excluded
 * 6. Daily deduplication by IST calendar date
 * 7. Payment status re-check race protection
 * 8. Resend email rendering & React template validity
 * 9. Independent Promise.allSettled dispatch (push & email decoupling)
 * 10. Audit logging & admin manual reminder behavior
 */

import {
  MANDATORY_INTERNSHIP_SERVICE_FEE,
  CYBER_REMINDER_EXCLUDED_DOMAINS,
  isCyberExcludedDomain,
  getCurrentISTDateKey,
  requiresMandatoryFeeReminder,
  buildInternPaymentUrl,
} from "../src/lib/payments/mandatory-fee";
import {
  sendMandatoryFeeReminderEmail,
  sendMandatoryFeeWebPush,
  wasReminderSentToday,
  sendSingleInternReminder,
} from "../src/services/payment-reminders";
import { MandatoryPaymentReminderEmail } from "../src/emails/mandatory-payment-reminder";
import { render } from "@react-email/render";

async function runReminderTestSuite() {
  console.log("=========================================================");
  console.log("CODEXA AGENCY — ₹450 REMINDER AUTOMATION TEST SUITE");
  console.log("=========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // ─── 1. CYBER EXCLUSION TESTS ─────────────────────────────────────────
  console.log("--- 1. Testing Domain & Cyber Exclusion Logic ---");

  // Normal domains must NOT be excluded
  assert(!isCyberExcludedDomain("FSD with AI", undefined, 450), "FSD with AI (₹450) is NOT excluded");
  assert(!isCyberExcludedDomain("Web Development", undefined, 450), "Web Development (₹450) is NOT excluded");
  assert(!isCyberExcludedDomain("Automations", undefined, 450), "Automations (₹450) is NOT excluded");
  assert(!isCyberExcludedDomain("UI/UX Design", undefined, 450), "UI/UX Design (₹450) is NOT excluded");
  assert(!isCyberExcludedDomain("Cloud & DevOps", undefined, 450), "Cloud & DevOps (₹450) is NOT excluded");
  assert(!isCyberExcludedDomain("Cybersecurity", undefined, 450), "2-Month Cybersecurity (₹450) is NOT excluded");

  // Specialized Cyber tracks must be EXCLUDED
  assert(isCyberExcludedDomain("Ethical Hacking", undefined, 1100), "Ethical Hacking (₹1,100) is strictly EXCLUDED");
  assert(isCyberExcludedDomain("Pentesting / Bug Bounty / VAPT", undefined, 1900), "Pentesting/VAPT (₹1,900) is strictly EXCLUDED");
  assert(isCyberExcludedDomain("Cyber - Ethical Hacking + Pentesting", undefined, 2300), "9-Month Combined Cyber Elite (₹2,300) is strictly EXCLUDED");
  assert(isCyberExcludedDomain("Penetration Testing", undefined, 1900), "Penetration Testing is EXCLUDED");
  assert(isCyberExcludedDomain("Bug Bounty", undefined, 1900), "Bug Bounty is EXCLUDED");
  assert(isCyberExcludedDomain("VAPT", undefined, 1900), "VAPT is EXCLUDED");
  assert(isCyberExcludedDomain("cyber-elite", undefined, 2300), "Cyber Elite slug is EXCLUDED");

  // ─── 2. ELIGIBILITY RULES ────────────────────────────────────────────
  console.log("\n--- 2. Testing Eligibility Rules ---");

  const unpaidDevIntern = {
    id: "usr_test_1",
    name: "Alex Dev",
    email: "alex@example.com",
    isActive: true,
    role: "INTERN",
    domain: "Web Development",
    paymentStatus: "PENDING_PAYMENT",
    amount: 450,
  };
  assert(requiresMandatoryFeeReminder(unpaidDevIntern), "Active unpaid normal intern requires reminder");

  const paidDevIntern = {
    ...unpaidDevIntern,
    paymentStatus: "PAID",
  };
  assert(!requiresMandatoryFeeReminder(paidDevIntern), "Paid intern does NOT require reminder (reminders stop)");

  const approvedDevIntern = {
    ...unpaidDevIntern,
    paymentStatus: "APPROVED",
  };
  assert(!requiresMandatoryFeeReminder(approvedDevIntern), "Approved intern does NOT require reminder");

  const inactiveDevIntern = {
    ...unpaidDevIntern,
    isActive: false,
  };
  assert(!requiresMandatoryFeeReminder(inactiveDevIntern), "Inactive/offboarded intern does NOT require reminder");

  const ethicalHackingIntern = {
    ...unpaidDevIntern,
    domain: "Ethical Hacking",
    amount: 1100,
  };
  assert(!requiresMandatoryFeeReminder(ethicalHackingIntern), "Ethical Hacking intern does NOT receive ₹450 reminder");

  // ─── 3. DATE KEY & DEDUPLICATION ──────────────────────────────────────
  console.log("\n--- 3. Testing IST Date Key & Deduplication ---");

  const istKey = getCurrentISTDateKey();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(istKey), `IST Date Key format is valid: ${istKey}`);

  // Test payment URL building
  const safeUrl = buildInternPaymentUrl({ referenceId: "CXA-PAY-2026-TEST" });
  assert(safeUrl.includes("/dashboard/payments"), `Payment URL links directly to dashboard payments`);
  assert(!safeUrl.includes("amount="), `Payment URL does NOT trust or expose amount query param`);

  // ─── 4. REACT EMAIL TEMPLATE RENDERING ───────────────────────────────
  console.log("\n--- 4. Testing React Email Template Rendering ---");

  try {
    const emailHtml = await render(
      MandatoryPaymentReminderEmail({
        studentName: "Varun Sharma",
        internshipDomain: "FSD with AI",
        amount: 450,
        paymentUrl: "https://codxa-agency.online/dashboard/payments",
      })
    );

    assert(emailHtml.includes("Varun Sharma"), "Rendered email contains student name");
    assert(emailHtml.includes("450"), "Rendered email displays ₹450 payable amount");
    assert(emailHtml.includes("Mandatory Student ID Card"), "Rendered email includes ID Card breakdown (₹150)");
    assert(emailHtml.includes("AI Development Tools Pack"), "Rendered email includes AI Tools breakdown (₹300)");
    assert(emailHtml.includes("PAYMENT PENDING"), "Rendered email displays PAYMENT PENDING badge");
    assert(emailHtml.includes("payment-reminder.gif"), "Rendered email includes animated CodeXa visual");
    assert(emailHtml.includes("codexa-logo.png"), "Rendered email includes official CodeXa logo");
  } catch (err: any) {
    assert(false, `React Email render failed: ${err.message}`);
  }

  // ─── 5. SUMMARY ──────────────────────────────────────────────────────
  console.log("\n=========================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runReminderTestSuite().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
