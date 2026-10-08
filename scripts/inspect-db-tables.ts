import { db } from "../src/lib/db";

async function main() {
  const tables = await db.$queryRawUnsafe<any[]>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("Existing PostgreSQL tables:", tables.map(t => t.table_name));
}

main().catch(console.error).finally(() => db.$disconnect());
