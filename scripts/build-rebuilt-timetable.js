const fs = require('fs');
const path = require('path');

// Domain code to full name mapping
const DOMAIN_MAP = {
  FS_AI: { name: 'Full-Stack Development with AI', durationMonths: 3, deadline: '2027-01-23' },
  PY: { name: 'Programming Full Stack - Python', durationMonths: 6, deadline: '2027-04-23' },
  AIML: { name: 'AI & Machine Learning', durationMonths: 6, deadline: '2027-04-23' },
  CY2: { name: 'Cybersecurity', durationMonths: 2, deadline: '2026-12-23' },
  PENTEST: { name: 'Cybersecurity - Ethical Hacking + Penetration Testing', durationMonths: 9, deadline: '2027-07-23' },
  AI9: { name: 'AI & Machine Learning + Generative AI & AI Agents', durationMonths: 9, deadline: '2027-07-23' },
  ETH: { name: 'Ethical Hacking', durationMonths: 6, deadline: '2027-04-23' },
  AG3: { name: 'Generative AI & AI Agents', durationMonths: 3, deadline: '2027-01-23' },
  MOBILE: { name: 'Mobile App Development', durationMonths: 3, deadline: '2027-01-23' },
  JAVA: { name: 'Programming Full Stack - Java', durationMonths: 6, deadline: '2027-04-23' },
  UIUX: { name: 'UI/UX Design', durationMonths: 3, deadline: '2027-01-23' },
  WEB: { name: 'Web Development', durationMonths: 6, deadline: '2027-04-23' }
};

// Exam blackout periods (with 4 calendar days buffer before start)
const EXAM_BLACKOUTS = [
  {
    college: 'NEC',
    yearBatch: 3,
    label: 'NEC 2024 batch, third year',
    examStart: '2026-11-05',
    examEnd: '2026-11-21',
    blackoutStart: '2026-11-01',
    blackoutEnd: '2026-11-21'
  },
  {
    college: 'NEC',
    yearBatch: 2,
    label: 'NEC 2025 batch, second year',
    examStart: '2026-11-19',
    examEnd: '2026-12-05',
    blackoutStart: '2026-11-15',
    blackoutEnd: '2026-12-05'
  },
  {
    college: 'JNTUK',
    yearBatch: 1,
    label: 'JNTUK 2026 batch, first year',
    examStart: '2026-12-27',
    examEnd: '2027-01-13',
    blackoutStart: '2026-12-23',
    blackoutEnd: '2027-01-13'
  },
  {
    college: 'NEC',
    yearBatch: 2, // and 3
    label: 'NEC second and third years',
    examStart: '2027-04-22',
    examEnd: '2027-05-08',
    blackoutStart: '2027-04-18',
    blackoutEnd: '2027-05-08'
  },
  {
    college: 'JNTUK',
    yearBatch: 1,
    label: 'JNTUK 2026 batch, first year',
    examStart: '2027-05-13',
    examEnd: '2027-05-29',
    blackoutStart: '2027-05-09',
    blackoutEnd: '2027-05-29'
  }
];

function getExamWarningsForDate(dateStr) {
  const matches = [];
  for (const eb of EXAM_BLACKOUTS) {
    if (dateStr >= eb.blackoutStart && dateStr <= eb.blackoutEnd) {
      matches.push(eb.label);
    }
  }
  return [...new Set(matches)];
}

function calculateDueDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 2);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} 23:59 IST`;
}

function build() {
  const text = fs.readFileSync('data/codexa-training-2026-2027.txt', 'utf8');

  // Parse Section F
  const secFIndex = text.indexOf('SECTION F — DATE + NAME QUICK INDEX');
  const secGIndex = text.indexOf('SECTION G — COMPLETE DATE-WISE CLASS DETAILS');
  const secFText = text.substring(secFIndex, secGIndex !== -1 ? secGIndex : undefined);
  const fLines = secFText.split('\n').map(l => l.trim()).filter(l => /^\d{4}-\d{2}-\d{2}\s*\|/.test(l));

  // Parse Section G
  const secGText = secGIndex !== -1 ? text.substring(secGIndex) : '';
  const classBlocks = secGText.split(/----------------------------------------------------------------------------------------------------------------\r?\n/).slice(1);
  const parsedG = {};

  classBlocks.forEach((block) => {
    const match = block.match(/^(CXA-LIVE-\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\r\n]+)/);
    if (!match) return;
    const key = match[1];

    const classNameMatch = block.match(/CLASS NAME:\s*([^\r\n]+)/);
    const title = classNameMatch ? classNameMatch[1].trim() : '';

    const goals = [];
    const goalsMatch = block.match(/YOU WILL LEARN:\r?\n([\s\S]*?)(?=LIVE TRAINER DEMONSTRATION:)/);
    if (goalsMatch) {
      const lines = goalsMatch[1].split('\n').map(l => l.trim()).filter(l => /^\d+\.\s*/.test(l));
      lines.forEach(l => goals.push(l.replace(/^\d+\.\s*/, '')));
    }

    const demoMatch = block.match(/LIVE TRAINER DEMONSTRATION:\s*([^\r\n]+(?:\r?\n(?![A-Z\s]{4,}:)[^\r\n]+)*)/);
    const demo = demoMatch ? demoMatch[1].trim().replace(/\r?\n/g, ' ') : '';

    const assignMatch = block.match(/AFTER-CLASS ASSIGNMENT[^:]*:\s*([^\r\n]+(?:\r?\n(?![A-Z\s]{4,}:)[^\r\n]+)*)/);
    const assignment = assignMatch ? assignMatch[1].trim().replace(/\r?\n/g, ' ') : '';

    const submitMatch = block.match(/WHAT TO SUBMIT:\s*([^\r\n]+)/);
    const submit = submitMatch ? submitMatch[1].trim() : '';

    const deadlineMatch = block.match(/SUGGESTED DEADLINE:\s*([^\r\n]+)/);
    const deadline = deadlineMatch ? deadlineMatch[1].trim() : '';

    const examMatch = block.match(/EXAM WARNING[^:]*:\s*([^\r\n]+(?:\r?\n(?![A-Z\s]{4,}:)[^\r\n]+)*)/);
    const examWarning = examMatch ? examMatch[1].trim().replace(/\r?\n/g, ' ') : '';

    parsedG[key] = {
      title,
      goals,
      demo,
      assignment,
      submit,
      deadline,
      examWarning
    };
  });

  const calendarDays = [];
  let seq = 1;

  for (const line of fLines) {
    const parts = line.split('|').map(p => p.trim());
    const date = parts[0];

    if (parts[1] === 'NO CLASS') {
      const reason = parts[2];
      calendarDays.push({
        date,
        type: 'OFF_DAY',
        reason,
        isSunday: reason.toLowerCase().includes('sunday'),
        isHoliday: !reason.toLowerCase().includes('sunday'),
        hasLiveClass: false
      });
    } else {
      const sourceKey = parts[1];
      const title = parts[2];
      const domainCodes = parts[3] ? parts[3].split(',').map(d => d.trim()).filter(Boolean) : [];
      const isCommon = seq <= 14;

      const gData = parsedG[sourceKey];

      let goals = gData?.goals && gData.goals.length >= 3 ? gData.goals : [];
      if (goals.length === 0) {
        // Deterministic synthesis based on title and domain
        goals = [
          `Understand core concepts of ${title} and why it matters in real projects.`,
          `Learn practical implementation techniques with live instructor walk-through.`,
          `Identify common pitfalls, edge cases, and best practices for this topic.`
        ];
      }

      let demo = gData?.demo || `Demonstrate practical implementation of ${title} in live code environment.`;
      let assignment = gData?.assignment || `Apply what was demonstrated in class: build a working exercise for ${title} and test thoroughly.`;
      let submit = gData?.submit || `Source code repository link, execution screenshots and 3 key takeaways.`;
      let deadline = gData?.deadline || calculateDueDate(date);

      const activeWarnings = getExamWarningsForDate(date);
      let examWarningText = gData?.examWarning || '';
      if (activeWarnings.length > 0 && !examWarningText) {
        examWarningText = `EXAM WARNING — verify college/year before assigning attendance: ${activeWarnings.join('; ')}. Matching affected students are EXCUSED; their missed topic requires a future LIVE make-up.`;
      }

      calendarDays.push({
        date,
        type: 'CLASS',
        sequenceNumber: seq,
        sourceKey,
        title,
        isCommon,
        groupCode: isCommon ? 'COMMON' : domainCodes.join('_'),
        domainCodes,
        domainNames: domainCodes.map(c => DOMAIN_MAP[c]?.name || c),
        startTimeIST: '19:30',
        endTimeIST: '21:30',
        startAtUTC: `${date}T14:00:00.000Z`,
        endAtUTC: `${date}T16:00:00.000Z`,
        releaseAtIST: `${date} 21:35 IST`,
        releaseAtUTC: `${date}T16:05:00.000Z`,
        suggestedDeadline: deadline,
        learningGoals: goals,
        trainerDemo: demo,
        assignment: {
          title: `Assignment: ${title}`,
          instructions: assignment,
          evidenceRequired: submit,
          releaseAtUTC: `${date}T16:05:00.000Z`,
          dueAtIST: deadline,
          status: 'DRAFT'
        },
        examWarnings: activeWarnings,
        examWarningNote: examWarningText,
        hasLiveClass: true,
        status: 'DRAFT'
      });

      seq++;
    }
  }

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      authoritativeSource: 'CodeXa_REBUILT_Complete_Beginner_To_Advanced_Live_Class_Timetable_2026_2027.txt',
      totalCalendarDates: calendarDays.length,
      totalClasses: calendarDays.filter(d => d.hasLiveClass).length,
      totalOffDays: calendarDays.filter(d => !d.hasLiveClass).length,
      totalSundays: calendarDays.filter(d => d.isSunday).length,
      totalHolidays: calendarDays.filter(d => d.isHoliday).length,
      commonClassesCount: 14,
      domainsCovered: Object.keys(DOMAIN_MAP),
      scheduleWindow: {
        startDate: '2026-10-24',
        endDate: '2027-07-23'
      }
    },
    examBlackouts: EXAM_BLACKOUTS,
    domains: DOMAIN_MAP,
    calendar: calendarDays
  };

  fs.writeFileSync('data/codexa-training-2026-2027.json', JSON.stringify(output, null, 2), 'utf8');
  console.log('Successfully generated data/codexa-training-2026-2027.json');
  console.log('Summary:', output.metadata);
}

build();
