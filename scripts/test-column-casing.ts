import { db } from "../src/lib/db";

async function main() {
  try {
    const res = await db.$queryRawUnsafe(`
      SELECT 
        s.id, s.user_id, s.image_url,
        u."fullName", u.username, u.email, u.role
      FROM id_card_photo_submissions s
      JOIN "User" u ON u.id = s.user_id
      LIMIT 1
    `);
    console.log("Success with camelCase u.\"fullName\":", res);
  } catch (err: any) {
    console.log("Error:", err.message);
  }

  try {
    const res2 = await db.$queryRawUnsafe(`
      SELECT 
        u.full_name
      FROM "User" u
      LIMIT 1
    `);
    console.log("Success with u.full_name:", res2);
  } catch (err: any) {
    console.log("Error with snake_case u.full_name:", err.message);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
