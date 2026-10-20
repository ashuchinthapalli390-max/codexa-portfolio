const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying Safe DDL for Domain Master & Class-Domain Link Tables ---');

  // 1. Create training_domains table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "training_domains" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "display_name" TEXT NOT NULL,
      "duration_months" INTEGER NOT NULL,
      "description" TEXT,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "training_domains_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "training_domains_code_key" UNIQUE ("code"),
      CONSTRAINT "training_domains_name_key" UNIQUE ("name")
    );
  `);
  console.log('✓ Created/verified "training_domains" table');

  // 2. Create class_domains table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "class_domains" (
      "id" TEXT NOT NULL,
      "class_id" TEXT NOT NULL,
      "domain_id" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "class_domains_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "class_domains_class_id_domain_id_key" UNIQUE ("class_id", "domain_id"),
      CONSTRAINT "class_domains_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "scheduled_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "class_domains_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "training_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('✓ Created/verified "class_domains" table');

  // 3. Add indexes
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "class_domains_class_id_idx" ON "class_domains"("class_id");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "class_domains_domain_id_idx" ON "class_domains"("domain_id");
  `);
  console.log('✓ Created indexes on "class_domains"');

  // 4. Add domain_id column to EmploymentProfile
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "EmploymentProfile" 
    ADD COLUMN IF NOT EXISTS "domain_id" TEXT;
  `);
  console.log('✓ Added "domain_id" column to "EmploymentProfile"');

  console.log('--- Migration completed successfully ---');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
