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

  // Check if there are default classes or assignments; if none, seed initial real scheduled classes
  const existingClasses = await db.$queryRawUnsafe<any[]>(`SELECT id FROM scheduled_classes LIMIT 1`);
  if (existingClasses.length === 0) {
    console.log("Seeding initial agency scheduled classes...");
    const today = new Date().toISOString().split("T")[0];
    await db.$executeRawUnsafe(`
      INSERT INTO scheduled_classes (
        id, title, domain, batch, topic, subtopics, instructor_name, class_date, start_time, end_time, duration, status, mode, meeting_link, learning_objectives, resources
      ) VALUES 
      (
        'class_live_arch',
        'Enterprise Mobile Architecture & Realtime State',
        'Mobile App Development',
        'Batch-2026',
        'Flutter Riverpod & Supabase Realtime Synchronization',
        '["Monotonic Read Markers", "Offline Outbox Architecture", "Optimistic State Reconciliation", "Private Storage & Signed URLs"]'::jsonb,
        'CodeXa Principal Architect',
        $1::date,
        '11:00 AM',
        '12:30 PM',
        '1h 30m',
        'UPCOMING',
        'ONLINE',
        'https://meet.google.com/cdx-arch-team',
        'Master production-grade offline state, idempotency keys, and multi-device push delivery synchronization.',
        '[{"title": "Architecture Blueprint", "url": "https://codxa-agency.online/docs/architecture.pdf"}]'::jsonb
      ),
      (
        'class_fullstack_scale',
        'High-Throughput API Design & Production Security',
        'Full Stack',
        'Batch-2026',
        'Postgres Connection Pooling & Supabase Realtime Channels',
        '["Transaction Isolation", "Monotonic Sequences", "WebSocket Subscription Limits", "Zero-Trust RBAC"]'::jsonb,
        'CodeXa CTO & Lead Engineer',
        $1::date,
        '03:00 PM',
        '04:30 PM',
        '1h 30m',
        'UPCOMING',
        'ONLINE',
        'https://meet.google.com/cdx-scale-team',
        'Build and benchmark fault-tolerant endpoints with strict rate limiting and transaction rollbacks.',
        '[{"title": "API Specification", "url": "https://codxa-agency.online/docs/api-specs.pdf"}]'::jsonb
      );
    `, today);
    console.log("Initial classes seeded.");
  }

  const existingAssignments = await db.$queryRawUnsafe<any[]>(`SELECT id FROM assignments LIMIT 1`);
  if (existingAssignments.length === 0) {
    console.log("Seeding initial assignments...");
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.$executeRawUnsafe(`
      INSERT INTO assignments (
        id, title, description, assigned_by_name, domain, submission_type, due_date, requirements, status
      ) VALUES
      (
        'asg_realtime_sync',
        'Implement Idempotent Outgoing Queue & Read Boundary',
        'Build a client-side monotonic read boundary and offline queue reconciliation algorithm.',
        'CodeXa Technical Lead',
        'Mobile App Development',
        'BOTH',
        $1::timestamptz,
        '1. Ensure all outgoing packets include clientMessageId.\n2. Handle duplicate packet drops.\n3. Implement viewport-aware read boundary marking.',
        'ACTIVE'
      ),
      (
        'asg_api_bench',
        'Resilient Webhook & Notification Dispatcher',
        'Develop an asynchronous worker that dispatches background notifications without blocking the primary persistence transaction.',
        'CodeXa Backend Lead',
        'Full Stack',
        'REPOSITORY',
        $1::timestamptz,
        'Repository must contain working Dockerfile, test suite with 95%+ coverage, and non-blocking retry mechanism.',
        'ACTIVE'
      );
    `, nextWeek);
    console.log("Initial assignments seeded.");
  }

  console.log("Scheduled Classes & Assignments setup complete!");
}

main().catch(err => {
  console.error("Setup error:", err);
  process.exit(1);
});
