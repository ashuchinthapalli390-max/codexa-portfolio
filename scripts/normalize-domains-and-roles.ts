/**
 * CODEXA AGENCY — GLOBAL DOMAIN & WORKFORCE ROLE NORMALIZATION SCRIPT
 *
 * Normalizes all stored intern domains to the single canonical catalog:
 * - 2 Months: Automations, Cybersecurity
 * - 3 Months: Full-Stack Development with AI, UI/UX Design, Custom Software Development,
 *             Application Development, Mobile App Development, Generative AI & AI Agents
 * - 6 Months: Web Development, Programming Full Stack — Java, Programming Full Stack — Python,
 *             AI & Machine Learning, Cloud & DevOps, Ethical Hacking, Penetration Testing / Bug Bounty / VAPT
 * - 9 Months: Cybersecurity — Ethical Hacking + Penetration Testing,
 *             AI & Machine Learning + Generative AI & AI Agents
 *
 * Sets workforceType ("INTERN", "LEARNING_INTERN", "EMPLOYEE") without touching executive RBAC roles.
 *
 * Usage:
 *   npx tsx scripts/normalize-domains-and-roles.ts --dry-run
 *   npx tsx scripts/normalize-domains-and-roles.ts --apply
 */

import { db } from "../src/lib/db";
import {
  normalizeDomain,
  getDomainDurationMonths,
  getDomainDurationLabel,
  isCanonicalDomain,
} from "../src/lib/internships/domains";

async function main() {
  const isApply = process.argv.includes("--apply");
  const mode = isApply ? "APPLY (DATABASE MUTATION)" : "DRY-RUN (PREVIEW ONLY)";

  console.log("=================================================================");
  console.log(`CODEXA AGENCY — DOMAIN & WORKFORCE ROLE NORMALIZATION [${mode}]`);
  console.log("=================================================================\n");

  // ─── 1. AUDIT EMPLOYMENT PROFILES ───────────────────────────────────────────
  const profiles = await db.employmentProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          role: true,
          orgRole: true,
        },
      },
    },
    orderBy: { employeeId: "asc" },
  });

  console.log(`Inspecting ${profiles.length} Employment Profiles...`);

  let profileUpdatesCount = 0;
  const profileChanges: any[] = [];

  for (const ep of profiles) {
    const rawDomain = ep.internshipDomain || ep.department || "Full-Stack Development with AI";
    const canonicalDomain = normalizeDomain(rawDomain);
    const durationMonths = getDomainDurationMonths(canonicalDomain);
    const durationLabel = getDomainDurationLabel(canonicalDomain);

    const isIntern = ep.user.role === "INTERN" || ep.user.orgRole === "INTERN" || ep.employmentType === "INTERN";
    const currentWorkforceType = (ep as any).workforceType;
    const targetWorkforceType = isIntern ? "INTERN" : "EMPLOYEE";

    const domainChanged = ep.internshipDomain !== canonicalDomain || ep.department !== canonicalDomain;
    const durationChanged = ep.internshipDurationMonths !== durationMonths || ep.internshipDuration !== durationLabel;
    const workforceChanged = currentWorkforceType !== targetWorkforceType;

    if (domainChanged || durationChanged || workforceChanged) {
      profileUpdatesCount++;
      profileChanges.push({
        id: ep.id,
        userId: ep.userId,
        name: ep.user.fullName || ep.user.username,
        email: ep.user.email,
        employeeId: ep.employeeId,
        oldDomain: ep.internshipDomain,
        newDomain: canonicalDomain,
        oldDept: ep.department,
        newDept: canonicalDomain,
        oldDuration: ep.internshipDuration,
        newDuration: durationLabel,
        oldMonths: ep.internshipDurationMonths,
        newMonths: durationMonths,
        oldWorkforce: currentWorkforceType,
        newWorkforce: targetWorkforceType,
        domainChanged,
        durationChanged,
        workforceChanged,
      });

      console.log(`  [UPDATE NEEDED] ${ep.employeeId} (${ep.user.fullName})`);
      if (domainChanged) console.log(`     Domain: "${ep.internshipDomain}" -> "${canonicalDomain}"`);
      if (durationChanged) console.log(`     Duration: "${ep.internshipDuration}" (${ep.internshipDurationMonths}m) -> "${durationLabel}" (${durationMonths}m)`);
      if (workforceChanged) console.log(`     WorkforceType: "${currentWorkforceType || 'null'}" -> "${targetWorkforceType}"`);
    } else {
      console.log(`  [ALREADY CANONICAL] ${ep.employeeId} (${ep.user.fullName}) -> "${canonicalDomain}" (${durationLabel})`);
    }
  }

  // ─── 2. AUDIT PAYMENT REQUESTS ──────────────────────────────────────────────
  const payments = await db.paymentRequest.findMany({
    include: {
      user: {
        include: {
          employmentProfile: true,
        },
      },
    },
    orderBy: { referenceId: "asc" },
  });

  console.log(`\nInspecting ${payments.length} Payment Requests...`);

  let paymentUpdatesCount = 0;
  const paymentChanges: any[] = [];

  for (const pr of payments) {
    // Prefer authoritative profile domain
    const profileDomain = pr.user?.employmentProfile?.internshipDomain;
    const rawDomain = profileDomain || pr.domain || "Full-Stack Development with AI";
    const canonicalDomain = normalizeDomain(rawDomain);

    const isIntern = pr.userRole === "INTERN" || pr.user?.role === "INTERN";
    const currentWorkforce = (pr as any).workforceType;
    const targetWorkforce = isIntern ? "INTERN" : "EMPLOYEE";

    const domainChanged = pr.domain !== canonicalDomain;
    const workforceChanged = currentWorkforce !== targetWorkforce;

    if (domainChanged || workforceChanged) {
      paymentUpdatesCount++;
      paymentChanges.push({
        id: pr.id,
        referenceId: pr.referenceId,
        user: pr.userName || pr.userEmail,
        oldDomain: pr.domain,
        newDomain: canonicalDomain,
        oldWorkforce: currentWorkforce,
        newWorkforce: targetWorkforce,
      });

      console.log(`  [PAYMENT UPDATE] ${pr.referenceId} (${pr.userName})`);
      if (domainChanged) console.log(`     Domain: "${pr.domain}" -> "${canonicalDomain}"`);
      if (workforceChanged) console.log(`     WorkforceType: "${currentWorkforce || 'null'}" -> "${targetWorkforce}"`);
    } else {
      console.log(`  [PAYMENT CANONICAL] ${pr.referenceId} -> "${canonicalDomain}"`);
    }
  }

  // ─── 3. AUDIT EXECUTIVE ACCOUNTS ───────────────────────────────────────────
  const executives = await db.user.findMany({
    where: {
      OR: [
        { role: { in: ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER"] } },
        { orgRole: { in: ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO"] } },
      ],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      orgRole: true,
    },
  });

  console.log(`\n=== EXECUTIVE ACCOUNTS AUDIT (PRESERVATION CHECK) ===`);
  for (const exec of executives) {
    console.log(`  [EXECUTIVE UNTOUCHED] ${exec.fullName} (${exec.email}) -> Role: ${exec.role}, OrgRole: ${exec.orgRole}`);
  }

  // ─── 4. SUMMARY REPORT ───────────────────────────────────────────────────────
  console.log("\n=================================================================");
  console.log("NORMALIZATION SUMMARY");
  console.log("=================================================================");
  console.log(`Total Employment Profiles Inspected: ${profiles.length}`);
  console.log(`Profiles requiring normalization:    ${profileUpdatesCount}`);
  console.log(`Total Payment Requests Inspected:    ${payments.length}`);
  console.log(`Payment requests requiring updates:  ${paymentUpdatesCount}`);
  console.log(`Executive accounts preserved:        ${executives.length} (100% RBAC PRESERVED)`);
  console.log("=================================================================\n");

  if (!isApply) {
    console.log("ℹ️  Dry run complete. No database rows were modified.");
    console.log("   To apply normalization, run: npx tsx scripts/normalize-domains-and-roles.ts --apply\n");
    return;
  }

  // ─── 5. EXECUTE APPLY ────────────────────────────────────────────────────────
  console.log("==> Applying normalization to Database...");

  for (const pc of profileChanges) {
    await db.employmentProfile.update({
      where: { id: pc.id },
      data: {
        internshipDomain: pc.newDomain,
        department: pc.newDept,
        internshipDuration: pc.newDuration,
        internshipDurationMonths: pc.newMonths,
        workforceType: pc.newWorkforce,
      },
    });

    if (pc.domainChanged) {
      await db.auditLog.create({
        data: {
          action: "INTERN_DOMAIN_NORMALIZED",
          actorName: "CodeXa Normalization Engine",
          targetId: pc.userId,
          details: JSON.stringify({
            employeeId: pc.employeeId,
            previousDomain: pc.oldDomain,
            newDomain: pc.newDomain,
            duration: pc.newDuration,
          }),
        },
      });
    }

    if (pc.workforceChanged) {
      await db.auditLog.create({
        data: {
          action: "WORKFORCE_TYPE_NORMALIZED",
          actorName: "CodeXa Normalization Engine",
          targetId: pc.userId,
          details: JSON.stringify({
            employeeId: pc.employeeId,
            previousWorkforceType: pc.oldWorkforce,
            newWorkforceType: pc.newWorkforce,
          }),
        },
      });
    }
  }

  for (const payc of paymentChanges) {
    await db.paymentRequest.update({
      where: { id: payc.id },
      data: {
        domain: payc.newDomain,
        workforceType: payc.newWorkforce,
      },
    });
  }

  console.log(`✓ Updated ${profileChanges.length} Employment Profiles.`);
  console.log(`✓ Updated ${paymentChanges.length} Payment Requests.`);
  console.log("✅ GLOBAL DOMAIN & WORKFORCE ROLE NORMALIZATION COMPLETE!\n");
}

main()
  .catch((e) => {
    console.error("❌ Normalization failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
