import { db } from "../src/lib/db";

async function main() {
  const where = {
    role: "INTERN",
    OR: [
      { isActive: true },
      { employmentProfile: { status: "ACTIVE" } },
    ],
  };

  const [filteredCount, filteredUsers] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true,
        role: true,
        orgRole: true,
        employmentProfile: {
          select: {
            employeeId: true,
            status: true,
            internshipDomain: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  console.log(`Filtered count: ${filteredCount}`);
  console.log(`Filtered users fetched: ${filteredUsers.length}`);

  const allInterns = await db.user.findMany({
    where: {
      OR: [{ role: "INTERN" }, { orgRole: "INTERN" }],
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      isActive: true,
      role: true,
      orgRole: true,
      employmentProfile: {
        select: {
          employeeId: true,
          status: true,
          internshipDomain: true,
        },
      },
    },
  });

  console.log(`All interns in DB: ${allInterns.length}`);

  const missing = allInterns.filter(a => !filteredUsers.some(u => u.id === a.id));
  console.log(`Missing count: ${missing.length}`);
  if (missing.length > 0) {
    console.log("Missing records:", JSON.stringify(missing, null, 2));
  }
  const roleCounts = await db.user.groupBy({
    by: ["role"],
    _count: { id: true },
  });
  console.log("Users grouped by role:", JSON.stringify(roleCounts, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
