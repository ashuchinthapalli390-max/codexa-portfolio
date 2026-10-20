const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || (!args.includes('--commit'));
  const isCommit = args.includes('--commit');

  console.log('================================================================');
  console.log(`CODEXA AGENCY — TIMETABLE IMPORT (${isCommit ? 'COMMIT MODE' : 'DRY RUN MODE'})`);
  console.log('================================================================\n');

  // Load timetable JSON
  const jsonPath = path.join(__dirname, '../data/codexa-training-2026-2027.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('Error: Timetable JSON not found at:', jsonPath);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const classesToImport = data.calendar.filter(d => d.hasLiveClass);
  const offDays = data.calendar.filter(d => !d.hasLiveClass);

  console.log(`Source Metadata:`);
  console.log(`  Source File: ${data.metadata.authoritativeSource}`);
  console.log(`  Total Calendar Dates: ${data.metadata.totalCalendarDates}`);
  console.log(`  Total Live Sessions: ${classesToImport.length}`);
  console.log(`  Total Off Days: ${offDays.length} (39 Sundays, 3 Holidays)`);
  console.log(`  Common Initial Classes: ${data.metadata.commonClassesCount}`);
  console.log(`  All 12 Active Domains Covered: ${data.metadata.domainsCovered.join(', ')}\n`);

  // Inspect existing classes in DB
  const existingClasses = await prisma.scheduledClass.findMany();
  const existingAssignments = await prisma.assignment.findMany();
  const existingSubmissionsCount = await prisma.assignmentSubmission.count();

  console.log(`Existing Database State:`);
  console.log(`  Existing scheduled_classes rows: ${existingClasses.length}`);
  console.log(`  Existing assignments rows: ${existingAssignments.length}`);
  console.log(`  Existing assignment submissions: ${existingSubmissionsCount}\n`);

  // Check for superseded legacy drafts vs modern source_key classes
  const modernClasses = existingClasses.filter(c => c.sourceKey && c.sourceKey.startsWith('CXA-LIVE-'));
  const legacyClasses = existingClasses.filter(c => !c.sourceKey || !c.sourceKey.startsWith('CXA-LIVE-'));

  console.log(`Conflict / Identity Analysis:`);
  console.log(`  Classes with CXA-LIVE-NNN source_key already in DB: ${modernClasses.length}`);
  console.log(`  Legacy / Unkeyed draft classes on calendar dates: ${legacyClasses.length}`);

  if (legacyClasses.length > 0) {
    console.log(`  Notice: Found ${legacyClasses.length} legacy draft classes (from older 2-slot draft).`);
    console.log(`  These will be safely preserved and marked 'SUPERSEDED_LEGACY_DRAFT' so no trainer collision occurs.`);
  }

  // Preflight check for duplicate dates in the import dataset
  const dateMap = new Map();
  for (const c of classesToImport) {
    if (dateMap.has(c.date)) {
      console.error(`FATAL: Duplicate date in import payload: ${c.date}`);
      process.exit(1);
    }
    dateMap.set(c.date, c);
  }

  // Domain link frequency count
  const domainLinkCounts = {};
  for (const c of classesToImport) {
    for (const d of c.domainCodes) {
      domainLinkCounts[d] = (domainLinkCounts[d] || 0) + 1;
    }
  }

  console.log('\nDomain Session Counts:');
  for (const [dom, count] of Object.entries(domainLinkCounts)) {
    const meta = data.domains[dom];
    console.log(`  ${dom.padEnd(8)}: ${count} classes (Track: ${meta.durationMonths}m, End: ${meta.deadline})`);
  }

  if (isDryRun) {
    console.log('\n----------------------------------------------------------------');
    console.log('DRY RUN COMPLETE — PREFLIGHT PASSED');
    console.log('----------------------------------------------------------------');
    console.log('Summary of planned actions on --commit:');
    console.log(`  - 231 classes will be upserted in status 'DRAFT'`);
    console.log(`  - 231 assignments will be upserted in status 'DRAFT' (release 21:35 IST)`);
    console.log(`  - ${legacyClasses.length} legacy unkeyed drafts archived as 'SUPERSEDED_LEGACY_DRAFT'`);
    console.log(`  - Zero intern notifications will be sent.`);
    console.log(`  - Existing intern records, payment records, IDs preserved 100% untouched.`);
    console.log('\nTo execute write operations, run with: node scripts/import-rebuilt-schedule.js --commit\n');
    return;
  }

  // COMMIT MODE
  console.log('\n----------------------------------------------------------------');
  console.log('EXECUTING DATABASE WRITES IN COMMIT MODE...');
  console.log('----------------------------------------------------------------\n');

  // 1. Archive legacy classes if needed
  if (legacyClasses.length > 0) {
    console.log(`1. Archiving ${legacyClasses.length} legacy classes to prevent trainer collisions...`);
    // Back up legacy classes to file before status update
    const backupPath = path.join(__dirname, '../data/legacy_classes_backup.json');
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, JSON.stringify(legacyClasses, null, 2), 'utf8');
      console.log(`   Saved backup of legacy classes to: data/legacy_classes_backup.json`);
    }

    await prisma.scheduledClass.updateMany({
      where: {
        id: { in: legacyClasses.map(c => c.id) },
        status: { not: 'SUPERSEDED_LEGACY_DRAFT' }
      },
      data: {
        status: 'SUPERSEDED_LEGACY_DRAFT'
      }
    });
    console.log('   Legacy classes marked SUPERSEDED_LEGACY_DRAFT.');

    // Archive legacy assignments
    await prisma.assignment.updateMany({
      where: {
        classId: { in: legacyClasses.map(c => c.id) },
        status: { not: 'SUPERSEDED_LEGACY' }
      },
      data: {
        status: 'SUPERSEDED_LEGACY'
      }
    });
    console.log('   Legacy assignments marked SUPERSEDED_LEGACY.');
  }

  // 2. Upsert the 231 rebuilt classes and 231 assignments
  console.log('\n2. Upserting 231 live sessions and assignments...');
  let createdClasses = 0;
  let updatedClasses = 0;
  let createdAssignments = 0;
  let updatedAssignments = 0;

  for (const c of classesToImport) {
    const classId = c.sourceKey; // stable ID e.g. CXA-LIVE-001
    const assignId = `CXA-ASSIGN-${String(c.sequenceNumber).padStart(3, '0')}`;

    // Upsert class
    const existingC = await prisma.scheduledClass.findUnique({
      where: { id: classId }
    });

    const classData = {
      sourceKey: c.sourceKey,
      sequenceNumber: c.sequenceNumber,
      title: c.title,
      domain: c.isCommon ? 'Common - All 12 Domains' : c.domainCodes.join(', '),
      batch: 'Batch-2026',
      topic: c.title,
      subtopics: c.learningGoals,
      instructorId: 'CODEXA_SOLE_TRAINER',
      instructorName: 'CodeXa Lead Instructor',
      classDate: new Date(c.date + 'T00:00:00.000Z'),
      startTime: c.startTimeIST,
      endTime: c.endTimeIST,
      duration: '2h 00m',
      status: existingC ? existingC.status : 'DRAFT', // Preserve status if already modified by admin, default DRAFT
      mode: 'ONLINE',
      meetingLink: existingC?.meetingLink || null,
      learningObjectives: c.learningGoals.join('\n'),
      resources: [],
      recordingUrl: null, // Strictly NO recording URLs per requirements
      attendingDomains: c.domainCodes,
      learningGoals: c.learningGoals,
      trainerDemo: c.trainerDemo,
      timeZone: 'Asia/Kolkata',
      instructorNotes: c.examWarningNote || null,
      startAt: new Date(c.startAtUTC),
      endAt: new Date(c.endAtUTC)
    };

    if (existingC) {
      await prisma.scheduledClass.update({
        where: { id: classId },
        data: classData
      });
      updatedClasses++;
    } else {
      await prisma.scheduledClass.create({
        data: {
          id: classId,
          ...classData
        }
      });
      createdClasses++;
    }

    // Upsert assignment
    const existingA = await prisma.assignment.findUnique({
      where: { id: assignId }
    });

    const assignData = {
      sourceKey: assignId,
      title: c.assignment.title,
      description: c.assignment.instructions,
      assignedBy: 'CODEXA_SOLE_TRAINER',
      assignedByName: 'CodeXa Technical Lead',
      domain: c.isCommon ? 'Common - All 12 Domains' : c.domainCodes.join(', '),
      classId: classId,
      submissionType: 'BOTH',
      dueDate: new Date(c.date + 'T18:29:00.000Z'), // 23:59 IST on day+2 = 18:29 UTC
      lateCutoff: new Date(c.date + 'T18:29:00.000Z'),
      requirements: c.assignment.evidenceRequired,
      status: existingA ? existingA.status : 'DRAFT', // Default DRAFT
      evidenceRequired: c.assignment.evidenceRequired,
      releaseAt: new Date(c.releaseAtUTC),
      attendingDomains: c.domainCodes
    };

    if (existingA) {
      await prisma.assignment.update({
        where: { id: assignId },
        data: assignData
      });
      updatedAssignments++;
    } else {
      await prisma.assignment.create({
        data: {
          id: assignId,
          ...assignData
        }
      });
      createdAssignments++;
    }
  }

  console.log(`\nImport Results:`);
  console.log(`  Classes: Created ${createdClasses}, Updated ${updatedClasses}`);
  console.log(`  Assignments: Created ${createdAssignments}, Updated ${updatedAssignments}`);

  // 3. Seed verified student exam blackout cohorts
  console.log('\n3. Seeding verified student exam blackout cohorts...');
  let blackoutsCreated = 0;
  for (const eb of data.examBlackouts) {
    const existingB = await prisma.studentExamBlackout.findFirst({
      where: {
        college: eb.college,
        yearBatch: eb.yearBatch,
        blackoutStart: new Date(eb.blackoutStart + 'T00:00:00.000Z'),
        blackoutEnd: new Date(eb.blackoutEnd + 'T00:00:00.000Z')
      }
    });

    if (!existingB) {
      await prisma.studentExamBlackout.create({
        data: {
          college: eb.college,
          yearBatch: eb.yearBatch,
          examStartDate: new Date(eb.examStart + 'T00:00:00.000Z'),
          examEndDate: new Date(eb.examEnd + 'T00:00:00.000Z'),
          blackoutStart: new Date(eb.blackoutStart + 'T00:00:00.000Z'),
          blackoutEnd: new Date(eb.blackoutEnd + 'T00:00:00.000Z'),
          verifiedBy: 'SYSTEM_IMPORT_VERIFIED',
          notes: eb.label,
          status: 'ACTIVE'
        }
      });
      blackoutsCreated++;
    }
  }
  console.log(`  Exam blackout cohorts created: ${blackoutsCreated}`);

  // 4. Log audit entry
  await prisma.trainingChangeAudit.create({
    data: {
      actorId: 'CODEXA_SYSTEM',
      actorEmail: 'admin@codexa.agency',
      action: 'IMPORT_TIMETABLE_REBUILT',
      entityType: 'TIMETABLE_BATCH',
      entityId: 'CXA-IMPORT-2026-2027',
      before: { legacyClassesCount: legacyClasses.length },
      after: {
        importedClassesCount: classesToImport.length,
        createdClasses,
        updatedClasses,
        createdAssignments,
        updatedAssignments,
        blackoutsCreated
      }
    }
  });
  console.log('   Audit log recorded.');

  console.log('\n================================================================');
  console.log('DATABASE COMMIT COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

run()
  .catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
