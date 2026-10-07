/**
 * CodeXa Agency — Master Intern CSV Sync Script
 * 
 * Synchronizes and corrects all 39 intern records against the authoritative CSV:
 * CodeXa_Interns_Master_Details_39_Updated_2026-10-07.csv
 * 
 * Safety features:
 * - Idempotent, safe, repeatable, transaction-aware
 * - Default mode: --dry-run (no DB writes)
 * - Apply mode: --apply
 * - Primary match: normalized email
 * - Ambiguous match detection
 * - Zero touch on passwords, sessions, PFPs, posts, attendance, or non-intern accounts
 * - JSON diff backup creation
 * - AuditLog emission
 * - Full post-sync verification pass across all 39 records
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Robust CSV parser supporting quoted values with commas and newlines
function parseCSV(content: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== "") {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  if (currentRow.length > 0 || currentField !== "") {
    currentRow.push(currentField);
    lines.push(currentRow);
  }
  return lines;
}

// Explicit DD/MM/YYYY date parser (returns UTC Midnight Date)
function parseDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed in JS
    const year = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0));
  }
  return null;
}

function formatDateDisplay(d: Date | string | null): string {
  if (!d) return "N/A";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface CSVInternRecord {
  Order: string;
  internId: string;
  referenceNumber: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  collegeLocation: string;
  yearOfStudy: string;
  branch: string;
  finalOfferDomain: string;
  durationMonths: number;
  startDate: string;
  endDate: string;
  role: string;
  designation: string;
  username: string;
  notes: string;
  [key: string]: any;
}

async function locateCSVFile(): Promise<string> {
  const possiblePaths = [
    path.resolve(process.cwd(), "CodeXa_Interns_Master_Details_39_Updated_2026-10-07.csv"),
    path.resolve(process.cwd(), "data", "CodeXa_Interns_Master_Details_39_Updated_2026-10-07.csv"),
    "C:\\Users\\MYPC\\Downloads\\CodeXa_Interns_Master_Details_39_Updated_2026-10-07.csv",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error("Could not find master CSV file CodeXa_Interns_Master_Details_39_Updated_2026-10-07.csv");
}

export async function runSync(options: { apply: boolean }) {
  const isApply = options.apply;
  console.log("==================================================================");
  console.log("  CODEXA AGENCY — INTERN MASTER CSV SYNC & CORRECTION ENGINE     ");
  console.log(`  MODE: ${isApply ? ">>> APPLY (LIVE DATABASE UPDATES) <<<" : ">>> DRY-RUN (PREVIEW ONLY - NO DB WRITES) <<<"}`);
  console.log("==================================================================\n");

  const csvPath = await locateCSVFile();
  console.log(`[INFO] Master CSV source: ${csvPath}`);

  let csvContent = fs.readFileSync(csvPath, "utf8");
  if (csvContent.charCodeAt(0) === 0xfeff) {
    csvContent = csvContent.slice(1);
  }

  const rawRows = parseCSV(csvContent);
  const rawHeaders = rawRows[0].map((h) => h.trim());

  const csvInterns: CSVInternRecord[] = [];
  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length < 5) continue;
    const map: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      map[h] = row[idx] ? row[idx].trim() : "";
    });

    const durationNum = parseInt(map["Duration (Months)"] || "3", 10);
    const rec: CSVInternRecord = {
      Order: map["Order"] || String(r),
      internId: map["Intern ID"],
      referenceNumber: map["Reference Number"],
      fullName: map["Full Name"],
      email: map["Email"],
      phone: map["Phone / WhatsApp"],
      college: map["College"],
      collegeLocation: map["College Location"],
      yearOfStudy: map["Year of Study"],
      branch: map["Branch / Department"],
      finalOfferDomain: map["Final Offer Domain"],
      durationMonths: durationNum,
      startDate: map["Internship Start Date"] || "24/10/2026",
      endDate: map["Internship End Date"],
      role: "INTERN",
      designation: map["Functional Role (Derived)"] || `${map["Final Offer Domain"]} Intern`,
      username: map["Username"],
      notes: map["Data Quality / Notes"],
    };
    csvInterns.push(rec);
  }

  console.log(`[INFO] Successfully parsed ${csvInterns.length} interns from master CSV.`);
  if (csvInterns.length !== 39) {
    console.warn(`[WARNING] Expected 39 rows, found ${csvInterns.length}`);
  }

  // Pre-check phone duplicates across roster
  const phoneCounts = new Map<string, string[]>();
  for (const c of csvInterns) {
    const cleanPhone = c.phone?.replace(/\D/g, "");
    if (cleanPhone && cleanPhone.length >= 10) {
      const list = phoneCounts.get(cleanPhone) || [];
      list.push(`${c.internId} - ${c.fullName}`);
      phoneCounts.set(cleanPhone, list);
    }
  }

  const phoneWarnings: string[] = [];
  phoneCounts.forEach((names, phone) => {
    if (names.length > 1) {
      phoneWarnings.push(`Phone ${phone} is duplicated across: ${names.join(", ")}`);
    }
  });

  if (phoneWarnings.length > 0) {
    console.log("\n[PHONE REVIEW WARNINGS]");
    phoneWarnings.forEach((w) => console.log(`  ⚠ ${w}`));
    console.log("  -> Flagged as PHONE_DUPLICATE_REVIEW_REQUIRED. Script will preserve existing numbers and NOT overwrite ambiguously.\n");
  }

  // Fetch all existing users from database
  const dbUsers = await prisma.user.findMany({
    include: {
      employmentProfile: true,
      profile: true,
      paymentRequests: true,
    },
  });

  console.log(`[INFO] Current database users in system: ${dbUsers.length}`);

  // Matching maps
  const dbByEmail = new Map<string, typeof dbUsers[0][]>();
  const dbByInternId = new Map<string, typeof dbUsers[0][]>();
  const dbByUsername = new Map<string, typeof dbUsers[0][]>();

  for (const u of dbUsers) {
    if (u.email) {
      const em = u.email.toLowerCase().trim();
      const list = dbByEmail.get(em) || [];
      list.push(u);
      dbByEmail.set(em, list);
    }
    if (u.username) {
      const un = u.username.toLowerCase().trim();
      const list = dbByUsername.get(un) || [];
      list.push(u);
      dbByUsername.set(un, list);
    }
    if (u.employmentProfile?.employeeId) {
      const empId = u.employmentProfile.employeeId.toUpperCase().trim();
      const list = dbByInternId.get(empId) || [];
      list.push(u);
      dbByInternId.set(empId, list);
    }
  }

  const matchedUsers: Array<{
    csv: CSVInternRecord;
    user: typeof dbUsers[0];
    diffs: Record<string, { old: any; new: any }>;
  }> = [];

  const unmatchedRows: CSVInternRecord[] = [];
  const ambiguousRows: Array<{ csv: CSVInternRecord; matches: string[] }> = [];
  const backupSnapshot: Record<string, any> = {};

  // Step through each CSV intern
  for (const csv of csvInterns) {
    const normEmail = csv.email?.toLowerCase().trim();
    const internIdUpper = csv.internId?.toUpperCase().trim();
    const usernameLower = csv.username?.toLowerCase().trim();

    // 1. Try exact email match
    let candidateMatches = dbByEmail.get(normEmail) || [];

    // 2. If no email match, try exact Intern ID
    if (candidateMatches.length === 0 && internIdUpper) {
      candidateMatches = dbByInternId.get(internIdUpper) || [];
    }

    // 3. If still no match, try exact username
    if (candidateMatches.length === 0 && usernameLower) {
      candidateMatches = dbByUsername.get(usernameLower) || [];
    }

    if (candidateMatches.length === 0) {
      unmatchedRows.push(csv);
      continue;
    }

    if (candidateMatches.length > 1) {
      ambiguousRows.push({
        csv,
        matches: candidateMatches.map((m) => `${m.id} (${m.email}, @${m.username})`),
      });
      continue;
    }

    const matchedUser = candidateMatches[0];
    const emp = matchedUser.employmentProfile;

    // Safety guard: NEVER modify protected non-intern leadership accounts
    const protectedRoles = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER"];
    if (protectedRoles.includes(matchedUser.role?.toUpperCase() || "")) {
      console.warn(`[SAFETY] User ${matchedUser.username} has leadership role ${matchedUser.role}. Skipping!`);
      continue;
    }

    // Build diffs
    const diffs: Record<string, { old: any; new: any }> = {};

    // User table fields
    if (matchedUser.role !== "INTERN") {
      diffs["User.role"] = { old: matchedUser.role, new: "INTERN" };
    }
    if (matchedUser.orgRole !== "INTERN") {
      diffs["User.orgRole"] = { old: matchedUser.orgRole, new: "INTERN" };
    }
    if (csv.fullName && matchedUser.fullName !== csv.fullName) {
      diffs["User.fullName"] = { old: matchedUser.fullName, new: csv.fullName };
    }
    if (csv.username && matchedUser.username.toLowerCase() !== csv.username.toLowerCase()) {
      // Validate unique before proposing username change
      const existingWithUsername = dbByUsername.get(csv.username.toLowerCase());
      if (!existingWithUsername || existingWithUsername.some((e) => e.id === matchedUser.id)) {
        diffs["User.username"] = { old: matchedUser.username, new: csv.username.toLowerCase() };
      }
    }

    // Phone handling (avoid duplicate overwrite)
    const cleanPhone = csv.phone?.replace(/\D/g, "");
    const isDupPhone = cleanPhone && (phoneCounts.get(cleanPhone)?.length || 0) > 1;
    if (csv.phone && !isDupPhone) {
      if ((matchedUser as any).phone !== csv.phone) {
        diffs["User.phone"] = { old: (matchedUser as any).phone || null, new: csv.phone };
      }
    }

    // EmploymentProfile fields
    const parsedStart = parseDDMMYYYY(csv.startDate);
    const parsedEnd = parseDDMMYYYY(csv.endDate);
    const targetDurationStr = `${csv.durationMonths} Months`;

    if (!emp) {
      diffs["EmploymentProfile.create"] = { old: null, new: "CREATE_NEW_PROFILE" };
    } else {
      if (emp.employeeId !== csv.internId) {
        diffs["EmploymentProfile.employeeId"] = { old: emp.employeeId, new: csv.internId };
      }
      if (emp.employmentType !== "INTERN") {
        diffs["EmploymentProfile.employmentType"] = { old: emp.employmentType, new: "INTERN" };
      }
      if (emp.designation !== csv.designation) {
        diffs["EmploymentProfile.designation"] = { old: emp.designation, new: csv.designation };
      }
      if (emp.department !== csv.finalOfferDomain) {
        diffs["EmploymentProfile.department"] = { old: emp.department, new: csv.finalOfferDomain };
      }
      if ((emp as any).internshipDomain !== csv.finalOfferDomain) {
        diffs["EmploymentProfile.internshipDomain"] = { old: (emp as any).internshipDomain || null, new: csv.finalOfferDomain };
      }
      if (emp.internshipDuration !== targetDurationStr) {
        diffs["EmploymentProfile.internshipDuration"] = { old: emp.internshipDuration, new: targetDurationStr };
      }
      if ((emp as any).internshipDurationMonths !== csv.durationMonths) {
        diffs["EmploymentProfile.internshipDurationMonths"] = { old: (emp as any).internshipDurationMonths || null, new: csv.durationMonths };
      }

      // Start date check
      const oldStartISO = emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : null;
      const newStartISO = parsedStart ? parsedStart.toISOString().slice(0, 10) : null;
      if (oldStartISO !== newStartISO) {
        diffs["EmploymentProfile.joiningDate"] = { old: oldStartISO, new: newStartISO };
      }
      if ((emp as any).internshipStartDate?.toISOString?.().slice(0, 10) !== newStartISO) {
        diffs["EmploymentProfile.internshipStartDate"] = { old: (emp as any).internshipStartDate || null, new: newStartISO };
      }

      // End date check
      const oldEndISO = emp.endDate ? new Date(emp.endDate).toISOString().slice(0, 10) : null;
      const newEndISO = parsedEnd ? parsedEnd.toISOString().slice(0, 10) : null;
      if (oldEndISO !== newEndISO) {
        diffs["EmploymentProfile.endDate"] = { old: oldEndISO, new: newEndISO };
      }
      if ((emp as any).internshipEndDate?.toISOString?.().slice(0, 10) !== newEndISO) {
        diffs["EmploymentProfile.internshipEndDate"] = { old: (emp as any).internshipEndDate || null, new: newEndISO };
      }

      // Academic details
      if (csv.college && (emp as any).college !== csv.college) {
        diffs["EmploymentProfile.college"] = { old: (emp as any).college || null, new: csv.college };
      }
      if (csv.collegeLocation && (emp as any).collegeLocation !== csv.collegeLocation) {
        diffs["EmploymentProfile.collegeLocation"] = { old: (emp as any).collegeLocation || null, new: csv.collegeLocation };
      }
      if (csv.yearOfStudy && (emp as any).yearOfStudy !== csv.yearOfStudy) {
        diffs["EmploymentProfile.yearOfStudy"] = { old: (emp as any).yearOfStudy || null, new: csv.yearOfStudy };
      }
      if (csv.branch && (emp as any).academicBranch !== csv.branch) {
        diffs["EmploymentProfile.academicBranch"] = { old: (emp as any).academicBranch || null, new: csv.branch };
      }
      if (csv.referenceNumber && (emp as any).referenceNumber !== csv.referenceNumber) {
        diffs["EmploymentProfile.referenceNumber"] = { old: (emp as any).referenceNumber || null, new: csv.referenceNumber };
      }
      if (csv.phone && !isDupPhone && (emp as any).phone !== csv.phone) {
        diffs["EmploymentProfile.phone"] = { old: (emp as any).phone || null, new: csv.phone };
      }
    }

    // Pending payment requests synchronization
    const pendingPayment = matchedUser.paymentRequests?.find(
      (p) => p.paymentStatus === "PENDING_PAYMENT" || p.paymentStatus === "PAYMENT_STARTED"
    );
    if (pendingPayment) {
      if (pendingPayment.domain !== csv.finalOfferDomain) {
        diffs["PaymentRequest.domain"] = { old: pendingPayment.domain, new: csv.finalOfferDomain };
      }
      if (pendingPayment.internId !== csv.internId) {
        diffs["PaymentRequest.internId"] = { old: pendingPayment.internId, new: csv.internId };
      }
    }

    // Capture backup snapshot
    backupSnapshot[matchedUser.id] = {
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        username: matchedUser.username,
        fullName: matchedUser.fullName,
        role: matchedUser.role,
        orgRole: matchedUser.orgRole,
      },
      employmentProfile: emp
        ? {
            id: emp.id,
            employeeId: emp.employeeId,
            designation: emp.designation,
            department: emp.department,
            internshipDuration: emp.internshipDuration,
            joiningDate: emp.joiningDate,
            endDate: emp.endDate,
          }
        : null,
    };

    matchedUsers.push({
      csv,
      user: matchedUser,
      diffs,
    });
  }

  // Save backup snapshot to disk for reconstruction
  const backupPath = path.resolve(process.cwd(), "scripts", `intern-sync-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupSnapshot, null, 2), "utf8");
  console.log(`[BACKUP] Safety snapshot recorded at: ${backupPath}\n`);

  // Report previews
  console.log("------------------------------------------------------------------");
  console.log("  MATCH PREVIEW & PROPOSED FIELD CHANGES                          ");
  console.log("------------------------------------------------------------------");

  let updatedCount = 0;
  let alreadyCorrectCount = 0;

  for (const m of matchedUsers) {
    const diffKeys = Object.keys(m.diffs);
    if (diffKeys.length === 0) {
      alreadyCorrectCount++;
      console.log(`[NO_CHANGE] ${m.csv.internId} • ${m.csv.fullName} (${m.user.email}) -> All fields already match CSV.`);
    } else {
      updatedCount++;
      console.log(`[UPDATE] ${m.csv.internId} • ${m.csv.fullName} (${m.user.email}) [MATCH: email]`);
      diffKeys.forEach((k) => {
        const change = m.diffs[k];
        console.log(`   └─ ${k}: "${change.old}" → "${change.new}"`);
      });
    }
  }

  console.log("\n==================================================================");
  console.log("  PRE-EXECUTION SUMMARY                                           ");
  console.log("==================================================================");
  console.log(`  Total CSV Interns:   ${csvInterns.length}`);
  console.log(`  Matched Users:       ${matchedUsers.length}`);
  console.log(`  Pending Updates:     ${updatedCount}`);
  console.log(`  Already In Sync:     ${alreadyCorrectCount}`);
  console.log(`  Unmatched Rows:      ${unmatchedRows.length}`);
  console.log(`  Ambiguous Matches:   ${ambiguousRows.length}`);
  console.log("==================================================================\n");

  if (!isApply) {
    console.log(">>> DRY-RUN COMPLETE. No changes were made to the database. <<<");
    console.log("To apply these changes, run:");
    console.log("  npm run sync:interns -- --apply\n");
    return {
      total: csvInterns.length,
      matched: matchedUsers.length,
      pendingUpdates: updatedCount,
      alreadyCorrect: alreadyCorrectCount,
      unmatched: unmatchedRows.length,
      ambiguous: ambiguousRows.length,
      phoneWarnings: phoneWarnings.length,
    };
  }

  // APPLY MODE: Execute database updates inside per-user transactions
  console.log(">>> COMMENCING LIVE DATABASE SYNCHRONIZATION... <<<\n");

  let appliedSuccessCount = 0;
  let appliedFailureCount = 0;

  for (const m of matchedUsers) {
    const { csv, user, diffs } = m;
    const diffKeys = Object.keys(diffs);
    if (diffKeys.length === 0) {
      continue; // nothing to write
    }

    const parsedStart = parseDDMMYYYY(csv.startDate)!;
    const parsedEnd = parseDDMMYYYY(csv.endDate)!;
    const cleanPhone = csv.phone?.replace(/\D/g, "");
    const isDupPhone = cleanPhone && (phoneCounts.get(cleanPhone)?.length || 0) > 1;

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Update User model
        const userUpdateData: any = {
          role: "INTERN",
          orgRole: "INTERN",
          fullName: csv.fullName,
        };

        if (csv.username && user.username.toLowerCase() !== csv.username.toLowerCase()) {
          userUpdateData.username = csv.username.toLowerCase();
        }

        if (csv.phone && !isDupPhone) {
          userUpdateData.phone = csv.phone;
        }

        await tx.user.update({
          where: { id: user.id },
          data: userUpdateData,
        });

        // 2. Upsert EmploymentProfile
        const employmentData: any = {
          employeeId: csv.internId,
          employmentType: "INTERN",
          designation: csv.designation,
          department: csv.finalOfferDomain,
          internshipDomain: csv.finalOfferDomain,
          internshipDuration: `${csv.durationMonths} Months`,
          internshipDurationMonths: csv.durationMonths,
          joiningDate: parsedStart,
          internshipStartDate: parsedStart,
          endDate: parsedEnd,
          internshipEndDate: parsedEnd,
          status: "ACTIVE",
        };

        if (csv.college) employmentData.college = csv.college;
        if (csv.collegeLocation) employmentData.collegeLocation = csv.collegeLocation;
        if (csv.yearOfStudy) employmentData.yearOfStudy = csv.yearOfStudy;
        if (csv.branch) employmentData.academicBranch = csv.branch;
        if (csv.referenceNumber) employmentData.referenceNumber = csv.referenceNumber;
        if (csv.phone && !isDupPhone) employmentData.phone = csv.phone;

        await tx.employmentProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            ...employmentData,
          },
          update: employmentData,
        });

        // 3. Update pending PaymentRequests domain/internId if applicable
        await tx.paymentRequest.updateMany({
          where: {
            userId: user.id,
            paymentStatus: { in: ["PENDING_PAYMENT", "PAYMENT_STARTED"] },
          },
          data: {
            domain: csv.finalOfferDomain,
            internId: csv.internId,
            userName: csv.fullName,
          },
        });

        // 4. Record Audit Log
        await tx.auditLog.create({
          data: {
            action: "INTERN_MASTER_DATA_SYNC",
            targetId: user.id,
            actorName: "SYSTEM_MASTER_CSV_SYNC",
            details: JSON.stringify({
              csvFile: "CodeXa_Interns_Master_Details_39_Updated_2026-10-07.csv",
              internId: csv.internId,
              fullName: csv.fullName,
              email: csv.email,
              domain: csv.finalOfferDomain,
              durationMonths: csv.durationMonths,
              startDate: csv.startDate,
              endDate: csv.endDate,
              designation: csv.designation,
              modifiedFields: Object.keys(diffs),
            }),
          },
        });
      });

      appliedSuccessCount++;
      console.log(`[APPLIED] Successfully synced ${csv.internId} (${csv.fullName})`);
    } catch (err: any) {
      appliedFailureCount++;
      console.error(`[ERROR] Failed to update ${csv.internId} (${csv.email}):`, err.message);
    }
  }

  console.log("\n==================================================================");
  console.log("  POST-SYNC VERIFICATION PASS ACROSS ALL 39 RECORDS               ");
  console.log("==================================================================");

  let verifiedPassCount = 0;
  let verifiedFailCount = 0;
  const domainTally: Record<string, number> = {};
  const durationTally: Record<string, number> = {};

  for (const csv of csvInterns) {
    const verifiedUser = await prisma.user.findUnique({
      where: { email: csv.email.toLowerCase().trim() },
      include: { employmentProfile: true },
    });

    if (!verifiedUser || !verifiedUser.employmentProfile) {
      console.error(`[FAIL] Verification failed: User ${csv.email} missing in DB!`);
      verifiedFailCount++;
      continue;
    }

    const emp = verifiedUser.employmentProfile;
    const durStr = emp.internshipDuration || "";
    const domStr = emp.department || "";

    domainTally[domStr] = (domainTally[domStr] || 0) + 1;
    durationTally[durStr] = (durationTally[durStr] || 0) + 1;

    const startISO = emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : null;
    const expectedStartISO = parseDDMMYYYY(csv.startDate)!.toISOString().slice(0, 10);

    const endISO = emp.endDate ? new Date(emp.endDate).toISOString().slice(0, 10) : null;
    const expectedEndISO = parseDDMMYYYY(csv.endDate)!.toISOString().slice(0, 10);

    const isMatch =
      verifiedUser.role === "INTERN" &&
      verifiedUser.orgRole === "INTERN" &&
      emp.employeeId === csv.internId &&
      emp.designation === csv.designation &&
      emp.department === csv.finalOfferDomain &&
      durStr === `${csv.durationMonths} Months` &&
      startISO === expectedStartISO &&
      endISO === expectedEndISO;

    if (isMatch) {
      verifiedPassCount++;
    } else {
      verifiedFailCount++;
      console.error(`[FAIL] Discrepancy remaining for ${csv.internId}:`, {
        role: verifiedUser.role,
        empId: emp.employeeId,
        designation: emp.designation,
        domain: emp.department,
        duration: durStr,
        startISO,
        endISO,
      });
    }
  }

  console.log(`\n  Verified Records Passing: ${verifiedPassCount} / 39`);
  console.log(`  Failed Verification:      ${verifiedFailCount} / 39`);

  console.log("\n--- AUTHORITATIVE DURATION DISTRIBUTION VERIFICATION ---");
  console.log(durationTally);
  console.log("Expected: { '2 Months': 4, '3 Months': 18, '6 Months': 12, '9 Months': 5 }");

  console.log("\n--- AUTHORITATIVE DOMAIN DISTRIBUTION VERIFICATION ---");
  console.log(domainTally);

  console.log("\n==================================================================");
  console.log("  FINAL SYNC COMPLETE                                             ");
  console.log("==================================================================\n");

  return {
    total: csvInterns.length,
    matched: matchedUsers.length,
    applied: appliedSuccessCount,
    failed: appliedFailureCount,
    verified: verifiedPassCount,
    domainTally,
    durationTally,
  };
}

// CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");

  runSync({ apply: isApply })
    .catch((e) => {
      console.error("FATAL ERROR IN SYNC SCRIPT:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
