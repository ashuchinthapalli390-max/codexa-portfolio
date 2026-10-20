const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/codexa-training-2026-2027.json', 'utf8'));

console.log('=== RUNNING COMPREHENSIVE TIMETABLE VALIDATION ===\n');

let errors = [];
let warnings = [];

// 1. Total counts
if (data.calendar.length !== 273) errors.push(`Expected 273 dates, got ${data.calendar.length}`);
const classes = data.calendar.filter(d => d.hasLiveClass);
const offDays = data.calendar.filter(d => !d.hasLiveClass);
if (classes.length !== 231) errors.push(`Expected 231 classes, got ${classes.length}`);
if (offDays.length !== 42) errors.push(`Expected 42 off-days, got ${offDays.length}`);

// 2. Continuous date sequence from 2026-10-24 to 2027-07-23
let curr = new Date('2026-10-24T00:00:00Z');
for (let i = 0; i < data.calendar.length; i++) {
  const item = data.calendar[i];
  const expectedDate = curr.toISOString().split('T')[0];
  if (item.date !== expectedDate) {
    errors.push(`Date sequence mismatch at index ${i}: expected ${expectedDate}, got ${item.date}`);
  }
  curr.setUTCDate(curr.getUTCDate() + 1);
}

// 3. Class validation
const seenDates = new Set();
const seenKeys = new Set();

classes.forEach((c, idx) => {
  // Uniqueness
  if (seenDates.has(c.date)) errors.push(`Duplicate class date: ${c.date}`);
  seenDates.add(c.date);

  if (seenKeys.has(c.sourceKey)) errors.push(`Duplicate source key: ${c.sourceKey}`);
  seenKeys.add(c.sourceKey);

  // Expected key format
  const expectedKey = `CXA-LIVE-${String(idx + 1).padStart(3, '0')}`;
  if (c.sourceKey !== expectedKey) errors.push(`Key mismatch: expected ${expectedKey}, got ${c.sourceKey}`);

  // Sunday check
  const dayOfWeek = new Date(c.date + 'T00:00:00Z').getUTCDay();
  if (dayOfWeek === 0) errors.push(`Class scheduled on a Sunday: ${c.date} (${c.sourceKey})`);

  // Time check
  if (c.startTimeIST !== '19:30' || c.endTimeIST !== '21:30') {
    errors.push(`Invalid class time: ${c.startTimeIST}-${c.endTimeIST} for ${c.sourceKey}`);
  }

  // Common phase check
  if (idx < 14) {
    if (!c.isCommon) errors.push(`Class ${c.sourceKey} should be marked common`);
    if (c.domainCodes.length !== 12) {
      errors.push(`Common class ${c.sourceKey} should have all 12 domains, got ${c.domainCodes.length}`);
    }
  }

  // Goals check
  if (!c.learningGoals || c.learningGoals.length < 3) {
    errors.push(`Class ${c.sourceKey} has fewer than 3 learning goals (${c.learningGoals?.length})`);
  }

  // Demo check
  if (!c.trainerDemo || c.trainerDemo.length < 10) {
    errors.push(`Class ${c.sourceKey} missing trainer demo`);
  }

  // Assignment check
  if (!c.assignment || !c.assignment.instructions || !c.assignment.evidenceRequired) {
    errors.push(`Class ${c.sourceKey} missing assignment instructions or evidence`);
  }

  // Domain deadlines check
  c.domainCodes.forEach(dc => {
    const dInfo = data.domains[dc];
    if (dInfo && c.date > dInfo.deadline) {
      errors.push(`Class ${c.sourceKey} on ${c.date} exceeds domain ${dc} official deadline ${dInfo.deadline}`);
    }
  });
});

console.log(`Validation completed.`);
console.log(`Total Errors: ${errors.length}`);
console.log(`Total Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.error('\nERRORS FOUND:');
  errors.slice(0, 15).forEach(e => console.error(' - ' + e));
  process.exit(1);
} else {
  console.log('\nALL 273 CALENDAR DATES & 231 LIVE CLASSES PASSED 100% VALIDATION CHECKS!');
}
