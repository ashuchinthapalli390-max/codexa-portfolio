/**
 * /api/owner/accounts
 * GET: List all accounts (requires Permission.VIEW_USERS)
 * POST: Create an internal account (requires Permission.CREATE_USERS + role authorization check)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import bcrypt from "bcryptjs";
import { sendAccountCreatedEmail } from "@/lib/email";
import {
  Permission,
  requirePermission,
  canCreateRole,
  getAllowedRolesToCreate,
  getEffectiveRole,
  OrgRole,
} from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const permCheck = await requirePermission(auth.user, Permission.VIEW_USERS);
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  try {
    const profiles = await dataStore.getProfiles();
    return NextResponse.json(
      {
        success: true,
        accounts: profiles,
        allowedRolesToCreate: getAllowedRolesToCreate(auth.user),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/owner/accounts]", err);
    return NextResponse.json(
      { error: "Failed to load accounts from database." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  // 1. Enforce CREATE_USERS permission
  const permCheck = await requirePermission(auth.user, Permission.CREATE_USERS);
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  const currentUser = auth.user;
  const actorRole = getEffectiveRole(currentUser);

  try {
    const body = await req.json();
    const { fullName, username, email, role, temporaryPassword, headline, bio, leadershipPosition, department } = body;

    // Validation
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Full Name is required." }, { status: 400 });
    }
    if (!username || !username.trim()) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }
    if (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Valid Email is required." }, { status: 400 });
    }
    if (!temporaryPassword || temporaryPassword.length < 8) {
      return NextResponse.json({ error: "Temporary password must be at least 8 characters." }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    const cleanEmail = email.toLowerCase().trim();
    const requestedRole = (role || "EMPLOYEE").toUpperCase() as OrgRole;

    // 2. Enforce Role Creator Boundaries (CTO/HR cannot create CEO or Founder)
    if (!canCreateRole(currentUser, requestedRole)) {
      const allowed = getAllowedRolesToCreate(currentUser);
      return NextResponse.json(
        {
          error: `Forbidden. Your role (${actorRole}) is not permitted to create accounts with role "${requestedRole}". You may only create: ${allowed.join(", ")}.`,
          allowedRoles: allowed,
        },
        { status: 403 }
      );
    }

    const memberType = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"].includes(requestedRole)
      ? "LEADERSHIP"
      : "CORE_TEAM";

    // Check duplicate in database
    const existing = await dataStore.getProfiles();
    if (existing.some((p) => p.username.toLowerCase() === cleanUsername || p.email.toLowerCase() === cleanEmail)) {
      return NextResponse.json({ error: "An account with this username or email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Create profile in PostgreSQL with mustChangePassword = true
    const newProfile = await dataStore.createProfile({
      username: cleanUsername,
      email: cleanEmail,
      displayName: fullName.trim(),
      passwordHash,
      role: requestedRole,
      orgRole: requestedRole,
      department: department?.trim() || null,
      memberType,
      leadershipPosition: leadershipPosition || (["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO"].includes(requestedRole) ? requestedRole : null),
      headline: headline?.trim() || null,
      bio: bio?.trim() || null,
      skills: [],
      mediaUrl: "/assets/images/logo.jpeg",
      isActive: true,
      isPublic: true,
      mustChangePassword: true,
    });

    // Provision Employment Profile
    let empRecord = null;
    try {
      const { generateCodeXaId } = await import("@/lib/cxa-ids");
      const generatedId = await generateCodeXaId(requestedRole);
      const isIntern = requestedRole === "INTERN";
      const salaryNum = body.salaryOrStipend ? parseFloat(body.salaryOrStipend) : null;

      empRecord = await db.employmentProfile.create({
        data: {
          userId: newProfile.id,
          employeeId: generatedId,
          employmentType: body.employmentType || (isIntern ? "INTERN" : "FULL_TIME"),
          department: department?.trim() || "Engineering",
          designation: headline?.trim() || (isIntern ? "Engineering Intern" : "Core Member"),
          reportingTo: body.reportingTo?.trim() || (isIntern ? "CTO / Lead Mentor" : "Engineering Lead"),
          joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
          status: "ACTIVE",
          salaryCycle: isIntern ? "STIPEND_MONTHLY" : "MONTHLY",
          basicSalary: !isIntern ? salaryNum : null,
          stipend: isIntern ? salaryNum : null,
          mentorName: body.mentorName?.trim() || null,
          internshipDuration: isIntern ? (body.internshipDuration?.trim() || "3 Months") : null,
        },
      });
    } catch (empErr) {
      console.error("[Account Creation] Employment profile init error:", empErr);
    }

    // Send Welcome email
    sendAccountCreatedEmail({
      email: cleanEmail,
      name: fullName.trim(),
      username: cleanUsername,
    }).catch((e) => console.error("[Account Created Email Error]", e));

    // Audit log
    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: newProfile.id,
      action: "ACCOUNT_CREATED",
      details: `${actorRole} (${currentUser.displayName}) provisioned new ${requestedRole} account for ${newProfile.displayName} (@${newProfile.username}) with mandatory password reset. Employee ID: ${empRecord?.employeeId || "Pending"}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      account: { ...newProfile, employmentProfile: empRecord },
      message: `Account @${cleanUsername} (${requestedRole}) created successfully.`,
    });
  } catch (err: any) {
    console.error("[POST /api/owner/accounts]", err);
    return NextResponse.json({ error: "Failed to create account in database." }, { status: 500 });
  }
}
