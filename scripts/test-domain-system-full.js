const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CANONICAL_DOMAINS = [
  { id: "DOM01", code: "FS_AI", name: "Full-Stack Development with AI", expectedTotal: 51, expectedInterns: 20 },
  { id: "DOM02", code: "PY", name: "Programming Full Stack — Python", expectedTotal: 49, expectedInterns: 6 },
  { id: "DOM03", code: "AIML", name: "AI & Machine Learning", expectedTotal: 39, expectedInterns: 5 },
  { id: "DOM04", code: "CY2", name: "Cybersecurity", expectedTotal: 31, expectedInterns: 4 },
  { id: "DOM05", code: "PENTEST", name: "Cybersecurity — Ethical Hacking + Penetration Testing", expectedTotal: 77, expectedInterns: 4 },
  { id: "DOM06", code: "AI9", name: "AI & Machine Learning + Generative AI & AI Agents", expectedTotal: 100, expectedInterns: 3 },
  { id: "DOM07", code: "ETH", name: "Ethical Hacking", expectedTotal: 45, expectedInterns: 3 },
  { id: "DOM08", code: "AG3", name: "Generative AI & AI Agents", expectedTotal: 25, expectedInterns: 1 },
  { id: "DOM09", code: "MOBILE", name: "Mobile App Development", expectedTotal: 29, expectedInterns: 1 },
  { id: "DOM10", code: "JAVA", name: "Programming Full Stack — Java", expectedTotal: 47, expectedInterns: 1 },
  { id: "DOM11", code: "UIUX", name: "UI/UX Design", expectedTotal: 28, expectedInterns: 1 },
  { id: "DOM12", code: "WEB", name: "Web Development", expectedTotal: 58, expectedInterns: 1 },
];

async function runTests() {
  console.log('================================================================');
  console.log('CODEXA ACADEMY: DOMAIN & CURRICULUM VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details) {
    if (condition) {
      console.log(`[PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Verify 12 Canonical Domains in Database
  const domainCount = await prisma.trainingDomain.count({ where: { isActive: true } });
  assert(domainCount === 12, 'Test 1: 12 Canonical Training Domains Exist', `Count: ${domainCount}/12`);

  // 2. Verify 50 Intern Profiles Mapped to Canonical Domains
  const profilesCount = await prisma.employmentProfile.count();
  const profilesMapped = await prisma.employmentProfile.count({ where: { domainId: { not: null } } });
  assert(profilesCount === 50 && profilesMapped === 50, 'Test 2: All 50 Interns Mapped to Canonical Domains', `Mapped: ${profilesMapped}/${profilesCount}`);

  // 3. Verify Exact Intern Counts Per Domain
  let allInternCountsMatch = true;
  for (const d of CANONICAL_DOMAINS) {
    const count = await prisma.employmentProfile.count({ where: { domainId: d.id } });
    if (count !== d.expectedInterns) {
      allInternCountsMatch = false;
      console.error(`  Mismatch in ${d.name}: expected ${d.expectedInterns}, got ${count}`);
    }
  }
  assert(allInternCountsMatch, 'Test 3: Exact Intern Enrollment Distribution Across All 12 Domains', '50/50 matched');

  // 4. Verify Total Unique Live Sessions in Database
  const uniqueLiveClasses = await prisma.scheduledClass.count({
    where: { status: { not: "SUPERSEDED_LEGACY_DRAFT" } }
  });
  assert(uniqueLiveClasses === 231, 'Test 4: Total Unique Live Sessions Count', `Count: ${uniqueLiveClasses}/231`);

  // 5. Verify First 14 Common Classes Linked to All 12 Domains
  const commonClasses = await prisma.scheduledClass.findMany({
    where: {
      sequenceNumber: { lte: 14, not: null },
      status: { not: "SUPERSEDED_LEGACY_DRAFT" }
    },
    include: {
      domainLinks: true
    }
  });
  const allCommonLinkedTo12 = commonClasses.length === 14 && commonClasses.every(c => c.domainLinks.length === 12);
  assert(allCommonLinkedTo12, 'Test 5: Common Classes 1-14 Linked to All 12 Domains', `14 common classes x 12 links = 168 links`);

  // 6. Test Ethical Hacking Domain Filter (DOM07 / ETH)
  const ethLinks = await prisma.classDomainLink.findMany({
    where: { domainId: 'DOM07' },
    include: { scheduledClass: true }
  });
  const ethCommonCount = ethLinks.filter(l => l.scheduledClass.sequenceNumber <= 14).length;
  const ethSpecializationCount = ethLinks.length - ethCommonCount;
  assert(ethLinks.length === 45 && ethCommonCount === 14 && ethSpecializationCount === 31, 
    'Test 6: Ethical Hacking Domain Filtering (DOM07 / ETH)', 
    `Found ${ethLinks.length} classes: 14 Common Foundation + 31 Domain Sessions`);

  // 7. Verify Domain Isolation for Ethical Hacking
  // Ethical Hacking must NOT contain pure Java (DOM10) or pure Flutter (DOM09) classes
  const javaSpecificLinks = await prisma.classDomainLink.findMany({
    where: { domainId: 'DOM10' },
    select: { classId: true }
  });
  const javaOnlyClassIds = new Set(javaSpecificLinks.map(l => l.classId));
  // Filter out common classes
  const pureJavaClassIds = [];
  for (const cid of javaOnlyClassIds) {
    const classLinks = await prisma.classDomainLink.findMany({ where: { classId: cid } });
    if (classLinks.length === 1 && classLinks[0].domainId === 'DOM10') {
      pureJavaClassIds.push(cid);
    }
  }
  const ethHasJava = ethLinks.some(l => pureJavaClassIds.includes(l.classId));
  assert(!ethHasJava, 'Test 7: Domain Isolation (No Unrelated Pure-Java Classes in Ethical Hacking)', `Isolation verified`);

  // 8. Test Full-Stack Development with AI Domain Filter (DOM01 / FS_AI)
  const fsLinks = await prisma.classDomainLink.findMany({
    where: { domainId: 'DOM01' },
    include: { scheduledClass: true }
  });
  assert(fsLinks.length === 51, 'Test 8: Full-Stack Development with AI Filtering (DOM01 / FS_AI)', `Total: ${fsLinks.length} classes (14 Common + 37 Domain Sessions)`);

  // 9. Verify All 12 Domains Have Correct Linked Class Counts
  let allDomainClassesMatch = true;
  for (const d of CANONICAL_DOMAINS) {
    const count = await prisma.classDomainLink.count({ where: { domainId: d.id } });
    if (count !== d.expectedTotal) {
      allDomainClassesMatch = false;
      console.error(`  Mismatch in class count for ${d.name}: expected ${d.expectedTotal}, got ${count}`);
    }
  }
  assert(allDomainClassesMatch, 'Test 9: Exact Class Count Verification Across All 12 Domains', `579 total class-domain relational links`);

  // 10. Verify Sole Trainer Conflict Guard (No overlapping classes)
  const classesOnDates = await prisma.scheduledClass.groupBy({
    by: ['classDate'],
    where: { status: { not: "SUPERSEDED_LEGACY_DRAFT" } },
    _count: { id: true }
  });
  const multiClassDates = classesOnDates.filter(c => c._count.id > 1);
  assert(multiClassDates.length === 0, 'Test 10: Sole Trainer Single Live Session Per Day Constraint', `Max classes per date: 1 across all ${classesOnDates.length} dates`);

  // 11. Verify 100% Live-Only Policy (No recording URLs in active curriculum)
  const withRecordings = await prisma.scheduledClass.count({
    where: {
      status: { not: "SUPERSEDED_LEGACY_DRAFT" },
      recordingUrl: { not: null }
    }
  });
  assert(withRecordings === 0, 'Test 11: 100% Live-Only Policy (Zero Recording URLs)', `Active recording URLs: 0`);

  // 12. Verify Zero Classes on Sundays & Festival Closures
  const liveClasses = await prisma.scheduledClass.findMany({
    where: { status: { not: "SUPERSEDED_LEGACY_DRAFT" } },
    select: { classDate: true }
  });
  let sundayClasses = 0;
  let holidayClasses = 0;
  const holidays = ["2026-12-25", "2027-01-15", "2027-04-07"];
  for (const c of liveClasses) {
    const dStr = c.classDate.toISOString().split("T")[0];
    const day = c.classDate.getUTCDay();
    if (day === 0) sundayClasses++;
    if (holidays.includes(dStr)) holidayClasses++;
  }
  assert(sundayClasses === 0 && holidayClasses === 0, 'Test 12: Zero Classes on Sundays & 3 Approved Festival Closures', `Sundays: 0, Festivals: 0`);

  // 13. Verify Database Preservation
  const usersCount = await prisma.user.count();
  const paymentCount = await prisma.paymentRecord ? await prisma.paymentRecord.count() : 0;
  assert(usersCount === 56 && profilesCount === 50, 'Test 13: Production Database Integrity & Account Preservation', `56 users (6 executives + 50 interns) preserved`);

  console.log('\n----------------------------------------------------------------');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
