const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CANONICAL_DOMAINS = [
  { id: "DOM01", code: "FS_AI", name: "Full-Stack Development with AI", displayName: "Full-Stack Development with AI (3 Months)", durationMonths: 3, description: "AI-assisted practical building of websites, web applications, and app-like tools from idea to production." },
  { id: "DOM02", code: "PY", name: "Programming Full Stack — Python", displayName: "Programming Full Stack — Python (6 Months)", durationMonths: 6, description: "Complete full-stack engineering using Python, FastAPI, relational databases, and frontend interfaces." },
  { id: "DOM03", code: "AIML", name: "AI & Machine Learning", displayName: "AI & Machine Learning (6 Months)", durationMonths: 6, description: "Core machine learning, predictive modeling, data cleaning, neural networks, and model deployment." },
  { id: "DOM04", code: "CY2", name: "Cybersecurity", displayName: "Cybersecurity (2 Months)", durationMonths: 2, description: "Fundamental cybersecurity principles, network defense, account security, Linux permissions, and incident logging." },
  { id: "DOM05", code: "PENTEST", name: "Cybersecurity — Ethical Hacking + Penetration Testing", displayName: "Ethical Hacking + Penetration Testing (9 Months)", durationMonths: 9, description: "Advanced penetration testing, vulnerability assessment, lab setups, exploit prevention, and security audit reports." },
  { id: "DOM06", code: "AI9", name: "AI & Machine Learning + Generative AI & AI Agents", displayName: "AI & ML + Generative AI & AI Agents (9 Months)", durationMonths: 9, description: "Comprehensive 9-month journey spanning machine learning foundations, LLM orchestration, RAG, and autonomous AI agents." },
  { id: "DOM07", code: "ETH", name: "Ethical Hacking", displayName: "Ethical Hacking (6 Months)", durationMonths: 6, description: "Ethical hacking practices with explicit scope, web application security testing, network reconnaissance, and remediation." },
  { id: "DOM08", code: "AG3", name: "Generative AI & AI Agents", displayName: "Generative AI & AI Agents (3 Months)", durationMonths: 3, description: "Prompt engineering, structured outputs, multi-step agent workflows, tool-use integration, and safe agent execution." },
  { id: "DOM09", code: "MOBILE", name: "Mobile App Development", displayName: "Mobile App Development (3 Months)", durationMonths: 3, description: "Cross-platform mobile application development using Flutter, Dart, state management, and API connectivity." },
  { id: "DOM10", code: "JAVA", name: "Programming Full Stack — Java", displayName: "Programming Full Stack — Java (6 Months)", durationMonths: 6, description: "Enterprise backend and full-stack software development with Java, Spring Boot, OOP, and secure REST APIs." },
  { id: "DOM11", code: "UIUX", name: "UI/UX Design", displayName: "UI/UX Design (3 Months)", durationMonths: 3, description: "User research, wireframing, Figma design systems, interactive prototyping, usability testing, and mobile-first layouts." },
  { id: "DOM12", code: "WEB", name: "Web Development", displayName: "Web Development (6 Months)", durationMonths: 6, description: "Modern web standards, responsive design, semantic HTML, modern CSS, JavaScript, APIs, and client deployment." },
];

const CODE_TO_DOM_ID = {};
for (const d of CANONICAL_DOMAINS) {
  CODE_TO_DOM_ID[d.code] = d.id;
}

async function main() {
  console.log('================================================================');
  console.log('CODEXA DOMAIN MASTER DIRECTORY & FAST BULK CLASS-DOMAIN LINKER');
  console.log('================================================================');

  // 1. Ensure all 12 domains exist
  console.log('\n[1/3] Verifying 12 Canonical Training Domains...');
  for (const dom of CANONICAL_DOMAINS) {
    await prisma.trainingDomain.upsert({
      where: { id: dom.id },
      update: {
        code: dom.code,
        name: dom.name,
        displayName: dom.displayName,
        durationMonths: dom.durationMonths,
        description: dom.description,
        isActive: true,
      },
      create: {
        id: dom.id,
        code: dom.code,
        name: dom.name,
        displayName: dom.displayName,
        durationMonths: dom.durationMonths,
        description: dom.description,
        isActive: true,
      },
    });
  }
  console.log('✓ All 12 Canonical Training Domains active.');

  // 2. Build bulk link array for all 231 live sessions
  console.log('\n[2/3] Generating bulk link rows for 231 live classes...');
  const jsonPath = path.join(__dirname, '..', 'data', 'codexa-training-2026-2027.json');
  const timetable = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const liveSessions = timetable.calendar.filter(c => c.hasLiveClass);

  const allLinks = [];
  let commonCount = 0;
  let clusterCount = 0;

  for (const session of liveSessions) {
    const classId = session.sourceKey; // e.g. "CXA-LIVE-001"

    let targetDomainCodes = [];
    if (session.isCommon || session.sequenceNumber <= 14) {
      targetDomainCodes = CANONICAL_DOMAINS.map(d => d.code);
      commonCount++;
    } else {
      targetDomainCodes = session.domainCodes || session.attendingDomainCodes || [];
      clusterCount++;
    }

    for (const code of targetDomainCodes) {
      const domId = CODE_TO_DOM_ID[code];
      if (domId) {
        allLinks.push({
          id: `${classId}_${domId}`,
          classId: classId,
          domainId: domId,
        });
      }
    }
  }

  console.log(`Generated ${allLinks.length} total links (${commonCount} common classes x 12 + ${clusterCount} cluster classes).`);

  // Bulk insert with skipDuplicates
  console.log('\n[3/3] Performing fast bulk insert into class_domains...');
  const result = await prisma.classDomainLink.createMany({
    data: allLinks,
    skipDuplicates: true,
  });
  console.log(`✓ Bulk insert completed: ${result.count} new rows inserted.`);

  const totalInDb = await prisma.classDomainLink.count();
  console.log(`✓ Total class_domains links currently in database: ${totalInDb}`);

  // Test verify counts per domain
  console.log('\nDomain-Wise Classes Distribution:');
  for (const d of CANONICAL_DOMAINS) {
    const count = await prisma.classDomainLink.count({
      where: { domainId: d.id }
    });
    console.log(`  [${d.id}] ${d.code.padEnd(8)}: ${count} classes (14 Common + ${count - 14} Specialization)`);
  }

  console.log('\n================================================================');
  console.log('BULK SEEDING & LINKING COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Bulk linking failed:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
