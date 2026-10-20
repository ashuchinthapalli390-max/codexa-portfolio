const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STATEMENTS = [
  // 1. Columns for scheduled_classes
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS source_key VARCHAR(64)`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS sequence_number INT`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS attending_domains JSONB`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS learning_goals JSONB`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS trainer_demo TEXT`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS time_zone VARCHAR(64) DEFAULT 'Asia/Kolkata'`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS instructor_notes TEXT`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`,
  `ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_classes_source_key ON scheduled_classes(source_key)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_classes_class_date ON scheduled_classes(class_date)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_classes_status ON scheduled_classes(status)`,

  // 2. Columns for assignments
  `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS source_key VARCHAR(64)`,
  `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS evidence_required TEXT`,
  `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ`,
  `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`,
  `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attending_domains JSONB`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_assignments_source_key ON assignments(source_key)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status)`,

  // 3. training_class_attendance table
  `CREATE TABLE IF NOT EXISTS training_class_attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    class_id TEXT NOT NULL REFERENCES scheduled_classes(id) ON DELETE CASCADE,
    intern_id TEXT NOT NULL,
    user_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    recorded_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_class_intern_attendance UNIQUE (class_id, intern_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tca_intern_id ON training_class_attendance(intern_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tca_class_id ON training_class_attendance(class_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tca_status ON training_class_attendance(status)`,

  // 4. student_exam_blackouts table
  `CREATE TABLE IF NOT EXISTS student_exam_blackouts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    college TEXT NOT NULL,
    year_batch INT NOT NULL,
    exam_start_date DATE NOT NULL,
    exam_end_date DATE NOT NULL,
    blackout_start DATE NOT NULL,
    blackout_end DATE NOT NULL,
    verified_by TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_seb_college_year ON student_exam_blackouts(college, year_batch)`,
  `CREATE INDEX IF NOT EXISTS idx_seb_blackout_dates ON student_exam_blackouts(blackout_start, blackout_end)`,

  // 5. training_makeup_queue table
  `CREATE TABLE IF NOT EXISTS training_makeup_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    original_class_id TEXT NOT NULL REFERENCES scheduled_classes(id) ON DELETE CASCADE,
    intern_id TEXT NOT NULL,
    user_id TEXT,
    reason TEXT NOT NULL DEFAULT 'SEMESTER_EXAM_EXCUSED',
    status TEXT NOT NULL DEFAULT 'PENDING',
    makeup_class_id TEXT REFERENCES scheduled_classes(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_orig_class_intern_makeup UNIQUE (original_class_id, intern_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tmq_intern_id ON training_makeup_queue(intern_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tmq_status ON training_makeup_queue(status)`,

  // 6. training_change_audit table
  `CREATE TABLE IF NOT EXISTS training_change_audit (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    actor_id TEXT,
    actor_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before JSONB,
    after JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tcaudit_entity ON training_change_audit(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tcaudit_action ON training_change_audit(action)`
];

async function migrate() {
  console.log('=== EXECUTING SAFE ADDITIVE TRAINING DDL STATEMENTS ===\n');

  for (let i = 0; i < STATEMENTS.length; i++) {
    const stmt = STATEMENTS[i];
    console.log(`[${i + 1}/${STATEMENTS.length}] Executing: ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`);
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`     OK.`);
    } catch (err) {
      console.error(`     Error on statement: ${stmt}`, err.message);
      throw err;
    }
  }

  console.log('\n=== ALL STATEMENTS EXECUTED SUCCESSFULLY ===');
}

migrate()
  .catch(err => {
    console.error('Migration aborted:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
