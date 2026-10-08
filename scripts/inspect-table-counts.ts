import { db } from "../src/lib/db";

async function main() {
  const tables = [
    'scheduled_classes',
    'class_questions',
    'assignments',
    'assignment_submissions',
    'id_card_photo_submissions',
    'ai_access_requests'
  ];

  for (const t of tables) {
    const res = await db.$queryRawUnsafe<any[]>(`SELECT count(*) as count FROM ${t}`);
    console.log(`${t} count:`, res[0]?.count);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
