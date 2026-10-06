import { db } from "../src/lib/db";
import { generatePaymentReferenceId } from "../src/lib/cxa-ids";

async function main() {
  console.log("==> Initializing Manual UPI Payment Settings and Accounts...");

  // 1. Ensure Default Payment Settings
  const settings = await db.paymentSetting.upsert({
    where: { id: "cxa_payment_settings" },
    update: {
      upiDisplayName: "CodeXa Agency",
      defaultUpiId: "codexa@upi",
      paymentInstructions:
        "Scan the QR code or click your preferred UPI app (PhonePe, Google Pay, Paytm). Pay the exact amount and upload your transaction screenshot with UTR number.",
      proofUploadEnabled: true,
      isUtrRequired: false,
      allowResubmission: true,
    },
    create: {
      id: "cxa_payment_settings",
      upiDisplayName: "CodeXa Agency",
      defaultUpiId: "codexa@upi",
      paymentInstructions:
        "Scan the QR code or click your preferred UPI app (PhonePe, Google Pay, Paytm). Pay the exact amount and upload your transaction screenshot with UTR number.",
      proofUploadEnabled: true,
      isUtrRequired: false,
      allowResubmission: true,
      verificationRoles: ["FOUNDER", "CO_FOUNDER", "HR"],
    },
  });
  console.log("✓ Payment Settings initialized:", settings.id);

  // 2. Ensure Default Payment Account
  let defaultAccount = await db.paymentAccount.findFirst({
    where: { isDefault: true },
  });

  if (!defaultAccount) {
    defaultAccount = await db.paymentAccount.create({
      data: {
        name: "CodeXa Primary UPI",
        upiId: "codexa@upi",
        payeeName: "CodeXa Agency",
        isActive: true,
        isDefault: true,
        purpose: "ALL",
        instructions: "Pay to official CodeXa Agency UPI handle. Ensure payment reference is included in remarks if possible.",
      },
    });
    console.log("✓ Default Payment Account created:", defaultAccount.name, defaultAccount.upiId);
  } else {
    console.log("✓ Default Payment Account exists:", defaultAccount.name, defaultAccount.upiId);
  }

  // 3. Find interns and ensure they have the standard ₹450 Internship Service Bill
  const interns = await db.user.findMany({
    where: {
      OR: [
        { role: "INTERN" },
        { orgRole: "INTERN" },
      ],
    },
    include: {
      employmentProfile: true,
    },
  });

  console.log(`Found ${interns.length} interns. Checking for default Internship Service Bill...`);

  const billLineItems = [
    { item: "Mandatory ID Card", amount: 150 },
    {
      item: "AI Dev Tools Pack (Shared)",
      amount: 300,
      details: [
        "Nexa AI Access (Included)",
        "ChatGPT Astra (Included)",
        "Anthropic Fabel (Included)",
        "Gemini Pro (Included)",
        "More AI Models (Included)",
      ],
    },
  ];

  for (const intern of interns) {
    const existingBill = await db.paymentRequest.findFirst({
      where: {
        userId: intern.id,
        paymentPurpose: "INTERNSHIP_FEE",
      },
    });

    if (!existingBill) {
      const refId = await generatePaymentReferenceId();
      const created = await db.paymentRequest.create({
        data: {
          referenceId: refId,
          userId: intern.id,
          userName: intern.fullName || intern.username,
          userEmail: intern.email,
          userRole: "INTERN",
          internId: intern.employmentProfile?.employeeId || null,
          domain: intern.employmentProfile?.department || "Development",
          paymentPurpose: "INTERNSHIP_FEE",
          title: "Internship Service Fee",
          description: "Mandatory ID Card (₹150) + AI Dev Tools Pack (Shared) (₹300)",
          lineItems: billLineItems,
          fixedAmount: 450.0,
          currency: "INR",
          paymentStatus: "PENDING_PAYMENT",
          paymentAccountId: defaultAccount.id,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      });
      console.log(`✓ Created Internship Service Bill [${refId}] for ${intern.email} (₹450)`);
    } else {
      console.log(`- Intern ${intern.email} already has bill [${existingBill.referenceId}] (Status: ${existingBill.paymentStatus})`);
    }
  }

  console.log("==> Manual UPI Payment initialization completed successfully.");
}

main()
  .catch((e) => {
    console.error("Initialization failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
