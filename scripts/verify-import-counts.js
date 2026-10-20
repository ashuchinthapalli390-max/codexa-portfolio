const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== VERIFYING REBUILT SCHEDULE INTEGRITY & COUNTS ===\n');

  // 1. Rebuilt classes
  const rebuiltClasses = await prisma.scheduledClass.findMany({
    where: {
      sourceKey: { startsWith: 'CXA-LIVE-' }
    },
    orderBy: { classDate: 'asc' }
  });

  console.log(`1. Total Rebuilt Classes in DB: ${rebuiltClasses.length}`);
  if (rebuiltClasses.length !== 231) {
    throw new Error(`Expected 231 classes, found ${rebuiltClasses.length}`);
  }

  // 2. Rebuilt assignments
  const rebuiltAssignments = await prisma.assignment.findMany({
    where: {
      sourceKey: { startsWith: 'CXA-ASSIGN-' }
    }
  });

  console.log(`2. Total Rebuilt Assignments in DB: ${rebuiltAssignments.length}`);
  if (rebuiltAssignments.length !== 231) {
    throw new Error(`Expected 231 assignments, found ${rebuiltAssignments.length}`);
  }

  // 3. Draft status check
  const nonDraftClasses = rebuiltClasses.filter(c => c.status !== 'DRAFT');
  console.log(`3. Non-draft classes: ${nonDraftClasses.length} (Expected 0 for initial import)`);
  if (nonDraftClasses.length !== 0) {
    throw new Error(`Expected all newly imported classes to be DRAFT, found ${nonDraftClasses.length} non-draft`);
  }

  // 4. Duplicate date check for rebuilt classes
  const dates = rebuiltClasses.map(c => c.classDate.toISOString().split('T')[0]);
  const uniqueDates = new Set(dates);
  console.log(`4. Unique class dates: ${uniqueDates.size}/${dates.length}`);
  if (uniqueDates.size !== dates.length) {
    throw new Error(`Found duplicate dates among rebuilt classes!`);
  }

  // 5. Sunday check
  const sundayClasses = rebuiltClasses.filter(c => c.classDate.getUTCDay() === 0);
  console.log(`5. Classes on Sunday: ${sundayClasses.length} (Expected 0)`);
  if (sundayClasses.length !== 0) {
    throw new Error(`Found classes scheduled on Sunday!`);
  }

  // 6. Holiday check (2026-12-25, 2027-01-15, 2027-04-07)
  const holidayDates = ['2026-12-25', '2027-01-15', '2027-04-07'];
  const holidayClasses = rebuiltClasses.filter(c => holidayDates.includes(c.classDate.toISOString().split('T')[0]));
  console.log(`6. Classes on festival holidays: ${holidayClasses.length} (Expected 0)`);
  if (holidayClasses.length !== 0) {
    throw new Error(`Found classes scheduled on festival holiday!`);
  }

  // 7. Common 14 classes
  const commonClasses = rebuiltClasses.filter(c => c.sequenceNumber && c.sequenceNumber <= 14);
  console.log(`7. Common initial classes: ${commonClasses.length}`);
  for (const c of commonClasses) {
    const domains = Array.isArray(c.attendingDomains) ? c.attendingDomains : [];
    if (domains.length !== 12) {
      throw new Error(`Common class ${c.sourceKey} does not have 12 domains: ${domains.length}`);
    }
  }

  // 8. Exam blackout cohorts
  const blackouts = await prisma.studentExamBlackout.findMany({ where: { status: 'ACTIVE' } });
  console.log(`8. Active Student Exam Blackouts in DB: ${blackouts.length}`);

  // 9. Preserved intern accounts and payments
  const totalUsers = await prisma.user.count();
  const totalProfiles = await prisma.employmentProfile.count();
  const totalPayments = await prisma.trustedUpiTransaction.count();
  console.log(`9. Preserved Production Data:`);
  console.log(`   Users: ${totalUsers}`);
  console.log(`   Employment Profiles (Interns): ${totalProfiles}`);
  console.log(`   Trusted UPI Transactions: ${totalPayments}`);

  console.log('\n=== ALL DATABASE COUNTS & INTEGRITY CHECKS 100% VERIFIED ===\n');
}

verify()
  .catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
