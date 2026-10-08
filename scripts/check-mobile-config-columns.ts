import { db } from "../src/lib/db";

async function main() {
  const columns = await db.$queryRawUnsafe<any[]>(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'MobileAppConfig'
    ORDER BY ordinal_position;
  `);
  console.log("Columns currently in MobileAppConfig table in DB:");
  columns.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));
}

main().catch(console.error).finally(() => db.$disconnect());
