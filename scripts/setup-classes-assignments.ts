import { db } from "../src/lib/db";

async function main() {
  console.log("Setting up Scheduled Classes & Assignments tables in PostgreSQL...");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS scheduled_classes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT 'All Domains',
      batch TEXT NOT NULL DEFAULT 'Batch-2026',
      topic TEXT NOT NULL,
      subtopics JSONB DEFAULT '[]'::jsonb,
      instructor_id TEXT,
      instructor_name TEXT NOT NULL DEFAULT 'CodeXa Lead Instructor',
      class_date DATE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration TEXT NOT NULL DEFAULT '1h 30m',
      status TEXT NOT NULL DEFAULT 'UPCOMING',
      mode TEXT NOT NULL DEFAULT 'ONLINE',
      meeting_link TEXT,
      learning_objectives TEXT,
      resources JSONB DEFAULT '[]'::jsonb,
      recording_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Table scheduled_classes verified.");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS class_questions (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES scheduled_classes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL DEFAULT 'INTERN',
      question TEXT NOT NULL,
      answer TEXT,
      answered_at TIMESTAMPTZ,
      answered_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Table class_questions verified.");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      assigned_by TEXT,
      assigned_by_name TEXT NOT NULL DEFAULT 'CodeXa Technical Lead',
      domain TEXT NOT NULL DEFAULT 'All Domains',
      class_id TEXT,
      project_id TEXT,
      submission_type TEXT NOT NULL DEFAULT 'BOTH',
      due_date TIMESTAMPTZ NOT NULL,
      late_cutoff TIMESTAMPTZ,
      requirements TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Table assignments verified.");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL DEFAULT 'INTERN',
      intern_id TEXT,
      submission_type TEXT NOT NULL DEFAULT 'TEXT',
      text_content TEXT,
      repository_url TEXT,
      branch TEXT,
      commit_sha TEXT,
      notes TEXT,
      revision INT NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      grade TEXT,
      feedback TEXT,
      reviewer_id TEXT,
      reviewer_name TEXT,
      reviewed_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_user_assignment_rev UNIQUE(assignment_id, user_id, revision)
    );
  `);
  console.log("Table assignment_submissions verified.");

  console.log("Scheduled Classes & Assignments tables ready (no dummy data seeded).");
}

main().catch(err => {
  console.error("Setup error:", err);
  process.exit(1);
});
