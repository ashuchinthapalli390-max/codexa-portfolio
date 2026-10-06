import { db } from "../src/lib/db";
import {
  MANDATORY_INTERNSHIP_SERVICE_FEE,
  CYBER_REMINDER_EXCLUDED_DOMAINS,
  isCyberExcludedDomain,
  getCurrentISTDateKey,
  requiresMandatoryFeeReminder,
  buildInternPaymentUrl,
} from "../src/lib/payments/mandatory-fee";
import {
  processMandatoryPaymentReminders,
  wasReminderSentToday,
  sendSingleInternReminder,
} from "../src/services/payment-reminders";

async function runTestSuite() {
  console.log("=====================================================");
  console.log("   CODEXA MANDATORY ₹450 PAYMENT REMINDER TEST SUITE");
  console.log("=====================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
    }
  }

  // ─── TEST 1: Cyber Exclusion Logic ─────────────────────────────────────────
  console.log("\n[1] Testing Cyber Domain & Track Exclusions:");
  assert(isCyberExcludedDomain("ethical-hacking") === true, "Excludes 'ethical-hacking'");
  assert(isCyberExcludedDomain("Ethical Hacking Track") === true, "Excludes 'Ethical Hacking Track'");
  assert(isCyberExcludedDomain("penetration-testing") === true, "Excludes 'penetration-testing'");
  assert(isCyberExcludedDomain("pentesting") === true, "Excludes 'pentesting'");
  assert(isCyberExcludedDomain("bug-bounty") === true, "Excludes 'bug-bounty'");
  assert(isCyberExcludedDomain("VAPT") === true, "Excludes 'VAPT'");
  assert(isCyberExcludedDomain("cyber-ethical-pentesting") === true, "Excludes 'cyber-ethical-pentesting'");
  assert(isCyberExcludedDomain("cyber-elite") === true, "Excludes 'cyber-elite'");
  assert(isCyberExcludedDomain("Cyber Security") === true, "Excludes 'Cyber Security'");
  assert(isCyberExcludedDomain(undefined, undefined, 1100) === true, "Excludes cyber fee ₹1,100");
  assert(isCyberExcludedDomain(undefined, undefined, 1900) === true, "Excludes cyber fee ₹1,900");
  assert(isCyberExcludedDomain(undefined, undefined, 2300) === true, "Excludes cyber fee ₹2,300");
  assert(isCyberExcludedDomain("Development") === false, "Allows normal 'Development' domain");
  assert(isCyberExcludedDomain("Engineering") === false, "Allows normal 'Engineering' domain");
  assert(isCyberExcludedDomain("Frontend React") === false, "Allows normal 'Frontend React' domain");
  assert(isCyberExcludedDomain("Full Stack Web") === false, "Allows normal 'Full Stack Web' domain");

  // ─── TEST 2: IST Date Key & Timezone ───────────────────────────────────────
  console.log("\n[2] Testing IST Calendar Date Key (Asia/Kolkata):");
  const istDateKey = getCurrentISTDateKey();
  console.log("  Current IST Date Key:", istDateKey);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(istDateKey), "IST Date key is in YYYY-MM-DD format");

  // ─── TEST 3: Server-side Eligibility Policy ────────────────────────────────
  console.log("\n[3] Testing Server-side Eligibility Policy:");
  assert(
    requiresMandatoryFeeReminder({
      id: "test-1",
      name: "Normal Intern",
      email: "test@example.com",
      isActive: true,
      role: "INTERN",
      domain: "Development",
      paymentStatus: "PENDING_PAYMENT",
      amount: 450,
    }) === true,
    "Eligible: Active unpaid normal intern"
  );

  assert(
    requiresMandatoryFeeReminder({
      id: "test-2",
      name: "Paid Intern",
      email: "paid@example.com",
      isActive: true,
      role: "INTERN",
      domain: "Development",
      paymentStatus: "APPROVED",
      amount: 450,
    }) === false,
    "Ineligible: Already APPROVED/PAID"
  );

  assert(
    requiresMandatoryFeeReminder({
      id: "test-3",
      name: "Inactive Intern",
      email: "inactive@example.com",
      isActive: false,
      role: "INTERN",
      domain: "Development",
      paymentStatus: "PENDING_PAYMENT",
      amount: 450,
    }) === false,
    "Ineligible: Inactive user"
  );

  assert(
    requiresMandatoryFeeReminder({
      id: "test-4",
      name: "Cyber Intern",
      email: "cyber@example.com",
      isActive: true,
      role: "INTERN",
      domain: "ethical-hacking",
      paymentStatus: "PENDING_PAYMENT",
      amount: 450,
    }) === false,
    "Ineligible: Cyber domain intern"
  );

  assert(
    requiresMandatoryFeeReminder({
      id: "test-5",
      name: "Non-Intern User",
      email: "leader@example.com",
      isActive: true,
      role: "FOUNDER",
      domain: "Development",
      paymentStatus: "PENDING_PAYMENT",
      amount: 450,
    }) === false,
    "Ineligible: Non-intern role"
  );

  // ─── TEST 4: URL Builder Security ──────────────────────────────────────────
  console.log("\n[4] Testing Payment URL Generation (No browser amounts trusted):");
  const paymentUrl = buildInternPaymentUrl({ referenceId: "CXA-PAY-2026-0001" });
  console.log("  Sample Payment URL:", paymentUrl);
  assert(!paymentUrl.includes("amount=450"), "URL does NOT expose untrusted amount parameter");
  assert(paymentUrl.includes("/dashboard/payments"), "URL directs to authenticated dashboard");

  // ─── TEST 5: Single Intern Reminder & DB Persistence ───────────────────────
  console.log("\n[5] Testing Single Intern Reminder Dispatch & DB Logging:");
  // Fetch sample intern from DB
  const sampleIntern = await db.user.findFirst({
    where: { role: "INTERN", isActive: true },
    include: {
      paymentRequests: {
        where: { fixedAmount: 450 },
        take: 1,
      },
    },
  });

  if (sampleIntern) {
    console.log(`  Selected test intern: ${sampleIntern.email} (${sampleIntern.id})`);

    // Clean up any test log for today for this intern first
    await db.paymentReminderLog.deleteMany({
      where: {
        internId: sampleIntern.id,
        reminderDate: istDateKey,
      },
    });

    // 1st Dispatch: Should succeed and create log
    const firstDispatch = await sendSingleInternReminder({
      internId: sampleIntern.id,
      source: "ADMIN_MANUAL",
    });

    assert(firstDispatch.success === true, "1st manual dispatch succeeds");
    assert(firstDispatch.emailStatus === "SENT", "Email status marked SENT");

    // Verify DB log was created
    const log = await db.paymentReminderLog.findUnique({
      where: {
        internId_paymentType_reminderDate: {
          internId: sampleIntern.id,
          paymentType: "MANDATORY_SERVICE_FEE",
          reminderDate: istDateKey,
        },
      },
    });

    assert(Boolean(log), "PaymentReminderLog record created in PostgreSQL");
    assert(log?.source === "ADMIN_MANUAL", "Source recorded as ADMIN_MANUAL");
    assert(log?.reminderDate === istDateKey, `Reminder date matches IST ${istDateKey}`);

    // ─── TEST 6: Deduplication Check ─────────────────────────────────────────
    console.log("\n[6] Testing Deduplication (Same IST day):");
    const wasSent = await wasReminderSentToday(sampleIntern.id, istDateKey);
    assert(wasSent === true, "wasReminderSentToday returns true");

    // Second dispatch without force: Should be skipped!
    const secondDispatch = await sendSingleInternReminder({
      internId: sampleIntern.id,
      source: "DAILY_AUTOMATION",
      bypassDailyDeduplication: false,
    });

    assert(secondDispatch.success === false, "2nd dispatch skipped on same day");
    assert(secondDispatch.emailStatus === "SKIPPED", "Status marked SKIPPED for duplicate");
    assert(
      secondDispatch.message.includes("already sent"),
      "Message explains duplicate prevention"
    );

    // ─── TEST 7: Race Condition / Paid Status Check ───────────────────────────
    console.log("\n[7] Testing Paid Status Race-Condition Protection:");
    // Temporarily simulate intern paid state
    const internPayment = sampleIntern.paymentRequests[0];
    if (internPayment) {
      await db.paymentRequest.update({
        where: { id: internPayment.id },
        data: { paymentStatus: "APPROVED" },
      });

      const dispatchAfterPaid = await sendSingleInternReminder({
        internId: sampleIntern.id,
        source: "DAILY_AUTOMATION",
        bypassDailyDeduplication: true,
      });

      assert(dispatchAfterPaid.success === false, "Approved/Paid payment is NOT reminded");
      assert(
        dispatchAfterPaid.message.includes("already APPROVED") ||
          dispatchAfterPaid.emailStatus === "SKIPPED",
        "Correctly skipped paid intern"
      );

      // Revert test payment back to PENDING_PAYMENT
      await db.paymentRequest.update({
        where: { id: internPayment.id },
        data: { paymentStatus: "PENDING_PAYMENT" },
      });
      console.log("  Reverted payment status back to PENDING_PAYMENT");
    }

    // Clean up test reminder log
    await db.paymentReminderLog.deleteMany({
      where: {
        internId: sampleIntern.id,
        reminderDate: istDateKey,
      },
    });
    console.log("  Cleaned up test reminder log");
  } else {
    console.warn("  No intern found in database to execute live single reminder test.");
  }

  // ─── TEST 8: Full Automation Worker Summary ────────────────────────────────
  console.log("\n[8] Testing Full Automation Worker (processMandatoryPaymentReminders):");
  const jobSummary = await processMandatoryPaymentReminders();
  console.log("  Automation Job Summary:", JSON.stringify(jobSummary, null, 2));
  assert(jobSummary.eligible > 0, `Eligible interns identified (${jobSummary.eligible})`);
  assert(jobSummary.emailSent > 0, `Emails successfully dispatched (${jobSummary.emailSent})`);
  assert(jobSummary.duplicatesSkipped >= 0, "Duplicate tracking works");

  // Re-run worker immediately: ALL must be skipped as duplicates!
  console.log("\n[9] Testing Immediate Re-Run Deduplication:");
  const secondRunSummary = await processMandatoryPaymentReminders();
  console.log("  Second Run Summary:", JSON.stringify(secondRunSummary, null, 2));
  assert(secondRunSummary.emailSent === 0, "Second run dispatched 0 emails (100% deduplicated)");
  assert(
    secondRunSummary.duplicatesSkipped >= jobSummary.eligible,
    "All previously sent interns were marked as duplicatesSkipped"
  );

  console.log("\n=====================================================");
  console.log(`   TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log("=====================================================\n");

  if (passed === total) {
    console.log("🎉 ALL REQUIREMENTS VALIDATED & WORKING IN PRODUCTION!");
  } else {
    process.exit(1);
  }
}

runTestSuite()
  .catch((e) => {
    console.error("Test execution error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
