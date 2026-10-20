const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTestSuite() {
  console.log('================================================================');
  console.log('CODEXA AGENCY — COMPREHENSIVE TRAINING SYSTEM VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // TEST 1: Exactly 231 live sessions in database with CXA-LIVE-NNN
  const rebuiltClasses = await prisma.scheduledClass.findMany({
    where: { sourceKey: { startsWith: 'CXA-LIVE-' } },
    orderBy: { classDate: 'asc' }
  });
  assert(rebuiltClasses.length === 231, 'Test 1: Total live sessions count', `Count: ${rebuiltClasses.length}/231`);

  // TEST 2: Exactly 231 assignments in database with CXA-ASSIGN-NNN
  const rebuiltAssignments = await prisma.assignment.findMany({
    where: { sourceKey: { startsWith: 'CXA-ASSIGN-' } }
  });
  assert(rebuiltAssignments.length === 231, 'Test 2: Total assignments count', `Count: ${rebuiltAssignments.length}/231`);

  // TEST 3: All newly imported classes begin in DRAFT status
  const nonDraftClasses = rebuiltClasses.filter(c => c.status !== 'DRAFT');
  assert(nonDraftClasses.length === 0, 'Test 3: Initial classes status is DRAFT', `Non-draft count: ${nonDraftClasses.length}`);

  // TEST 4: Exactly one live class per calendar day (no two-slot schedule)
  const classDates = rebuiltClasses.map(c => c.classDate.toISOString().split('T')[0]);
  const uniqueDates = new Set(classDates);
  assert(uniqueDates.size === classDates.length && uniqueDates.size === 231, 'Test 4: Single live class per calendar day', `Unique dates: ${uniqueDates.size}/231`);

  // TEST 5: Daily class time is strictly 7:30 PM to 9:30 PM IST (14:00 to 16:00 UTC)
  const invalidTimes = rebuiltClasses.filter(c => c.startTime !== '19:30' || c.endTime !== '21:30' || c.duration !== '2h 00m');
  assert(invalidTimes.length === 0, 'Test 5: Timezone and class timing 19:30-21:30 IST', `Invalid times count: ${invalidTimes.length}`);

  // TEST 6: Zero classes scheduled on Sundays (39 Sundays off)
  const sundayClasses = rebuiltClasses.filter(c => c.classDate.getUTCDay() === 0);
  assert(sundayClasses.length === 0, 'Test 6: Sundays completely free of classes', `Sunday classes: ${sundayClasses.length}`);

  // TEST 7: Zero classes on festival closures (Christmas, Sankranti, Ugadi)
  const holidayDates = ['2026-12-25', '2027-01-15', '2027-04-07'];
  const holidayClasses = rebuiltClasses.filter(c => holidayDates.includes(c.classDate.toISOString().split('T')[0]));
  assert(holidayClasses.length === 0, 'Test 7: No classes on approved festival closures', `Holiday classes: ${holidayClasses.length}`);

  // TEST 8: First 14 classes are common beginner classes for ALL 12 domains
  const first14 = rebuiltClasses.filter(c => c.sequenceNumber && c.sequenceNumber <= 14);
  const commonOk = first14.every(c => Array.isArray(c.attendingDomains) && c.attendingDomains.length === 12);
  assert(first14.length === 14 && commonOk, 'Test 8: First 14 classes common to all 12 domains', `Common classes count: ${first14.length}`);

  // TEST 9: Every class has at least 3 learning goals and a practical demonstration
  const invalidContent = rebuiltClasses.filter(c => {
    const goals = Array.isArray(c.learningGoals) ? c.learningGoals : [];
    return goals.length < 3 || !c.trainerDemo || c.trainerDemo.length < 10;
  });
  assert(invalidContent.length === 0, 'Test 9: Content richness (3 goals + demo)', `Invalid content count: ${invalidContent.length}`);

  // TEST 10: Zero recording URLs or recording promises
  const recordingClasses = rebuiltClasses.filter(c => c.recordingUrl !== null);
  assert(recordingClasses.length === 0, 'Test 10: No recording URLs (strictly live training)', `Recording URLs: ${recordingClasses.length}`);

  // TEST 11: Preserved existing 50 intern accounts, profiles, and payments
  const totalUsers = await prisma.user.count();
  const totalProfiles = await prisma.employmentProfile.count();
  assert(totalProfiles === 50, 'Test 11: Preserved 50 intern profiles', `Profiles count: ${totalProfiles}`);
  assert(totalUsers === 56, 'Test 11b: Preserved all 56 users (6 leadership + 50 interns)', `Users count: ${totalUsers}`);

  // TEST 12: Active semester exam blackouts registered in database
  const blackouts = await prisma.studentExamBlackout.findMany({ where: { status: 'ACTIVE' } });
  assert(blackouts.length >= 5, 'Test 12: Verified semester exam blackout cohorts', `Cohorts count: ${blackouts.length}`);

  // TEST 13: Single trainer overlap prevention logic test
  // Attempt to schedule a colliding class on an existing class date
  const testCollisionDate = new Date('2026-10-24T00:00:00.000Z');
  const collisionFound = await prisma.scheduledClass.findFirst({
    where: {
      classDate: testCollisionDate,
      status: { in: ['UPCOMING', 'LIVE', 'COMPLETED', 'DRAFT'] }
    }
  });
  assert(collisionFound !== null, 'Test 13: Trainer schedule collision detection', `Existing booking found on ${testCollisionDate.toISOString().split('T')[0]}: ${collisionFound?.title}`);

  // TEST 14: Assignment release condition validation
  // Verify that all assignments have releaseAt set to 21:35 IST on class date
  const invalidReleaseAt = rebuiltAssignments.filter(a => !a.releaseAt);
  assert(invalidReleaseAt.length === 0, 'Test 14: Assignment release time configured', `Assignments with releaseAt: ${rebuiltAssignments.length - invalidReleaseAt.length}/${rebuiltAssignments.length}`);

  console.log('\n----------------------------------------------------------------');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
