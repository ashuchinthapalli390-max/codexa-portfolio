import { db } from "../src/lib/db";

async function main() {
  const targetTables = [
    'scheduled_classes',
    'class_questions',
    'assignments',
    'assignment_submissions',
    'id_card_photo_submissions',
    'ai_access_requests'
  ];

  for (const table of targetTables) {
    const cols = await db.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, table);
    console.log(`\n=== TABLE: ${table} ===`);
    cols.forEach(c => {
      console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
    });
  }
}

main().catch(console.error).finally(() => db.$disconnect());
