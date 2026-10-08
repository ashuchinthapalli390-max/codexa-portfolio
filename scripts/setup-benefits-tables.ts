import { db } from "../src/lib/db";

async function main() {
  console.log("Setting up ID Card Photo Submissions & AI Access Requests tables in PostgreSQL...");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS id_card_photo_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      payment_request_id TEXT,
      storage_path TEXT NOT NULL,
      image_url TEXT NOT NULL,
      mime_type TEXT DEFAULT 'image/jpeg',
      file_size INT,
      version INT NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      rejection_reason TEXT,
      reviewed_by TEXT,
      reviewed_by_name TEXT,
      reviewed_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Table id_card_photo_submissions verified.");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ai_access_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      payment_request_id TEXT,
      resource_type TEXT NOT NULL DEFAULT 'GEMINI_PRO_ACCESS',
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
      reviewer_decision TEXT,
      reviewer_notes TEXT,
      reviewed_by TEXT,
      reviewed_by_name TEXT,
      reviewed_at TIMESTAMPTZ,
      provisioning_status TEXT DEFAULT 'PENDING',
      provisioned_at TIMESTAMPTZ,
      provisioned_by TEXT,
      activation_instructions TEXT,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Table ai_access_requests verified.");

  // Query leadership emails for request alerts
  const leaders = await db.user.findMany({
    where: {
      role: { in: ["FOUNDER", "CO_FOUNDER", "OWNER", "ADMIN"] },
      isActive: true,
    },
    select: { id: true, email: true, fullName: true, role: true },
  });
  console.log("Leadership users for notifications:", leaders);

  console.log("Benefits database setup complete!");
}

main().catch(err => {
  console.error("Setup error:", err);
  process.exit(1);
});
