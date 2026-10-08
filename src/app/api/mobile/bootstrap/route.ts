import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult, generateRequestId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectiveRole, ROLE_PERMISSIONS } from "@/lib/permissions";
import {
  getOrCreateGlobalMobileConfig,
  resolveAllMobileFeatures,
} from "@/lib/mobile-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function isDatabaseError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const name = String(err.name || "").toLowerCase();
  const code = String(err.code || "");
  if (code.startsWith("P10") || code === "P2024") return true;
  if (name.includes("prismaclientinitializationerror") || name.includes("prismaclientrustpanickerror")) return true;
  if (msg.includes("can't reach database") || msg.includes("connection pool") || msg.includes("timed out")) return true;
  if (msg.includes("connection refused") || msg.includes("econnrefused") || msg.includes("etimedout")) return true;
  return false;
}

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") {
        return res.user;
      }
    }
  }

  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") {
    return cookieRes.user;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const authUser = await resolveRequestUser(req);

    if (!authUser) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Valid CodeXa mobile session required." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Fetch full user with relations from Core DB
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: {
        profile: true,
        employmentProfile: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "User account is disabled or not found." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const effectiveRole = getEffectiveRole(user);
    const globalConfig = await getOrCreateGlobalMobileConfig();
    const featureFlags = await resolveAllMobileFeatures(user, globalConfig);

    // Maintenance Mode enforcement:
    if (globalConfig.maintenanceEnabled && effectiveRole !== "FOUNDER" && effectiveRole !== "CO_FOUNDER") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MAINTENANCE_MODE",
            message: globalConfig.maintenanceMessage || "CodeXa is currently under scheduled maintenance.",
          },
          maintenance: {
            enabled: true,
            title: "CodeXa Maintenance",
            message: globalConfig.maintenanceMessage || "CodeXa is undergoing scheduled maintenance.",
            expectedEndAt: (globalConfig as any).expectedMaintenanceEnd || null,
          },
          requestId,
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    // Force Update Check if client specified version header or query param
    const clientVersion = req.headers.get("x-app-version") || req.nextUrl.searchParams.get("version");
    if (clientVersion && globalConfig.minVersion && globalConfig.forceUpdateEnabled) {
      if (clientVersion < globalConfig.minVersion) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "UPDATE_REQUIRED",
              message: "A required update for CodeXa is available. Please update to continue.",
            },
            version: {
              minimumSupported: globalConfig.minVersion,
              latest: globalConfig.currentVersion,
              forceUpdate: true,
              updateUrl: globalConfig.androidApkUrl || globalConfig.downloadUrl || "https://codxa-agency.online/downloads/CodeXa.apk",
              releaseNotes: (globalConfig as any).releaseNotes || "Please update to the latest version of CodeXa.",
            },
            requestId,
          },
          { status: 426, headers: NO_CACHE_HEADERS }
        );
      }
    }

    // 2. Resolve Role Permissions
    const permSet = ROLE_PERMISSIONS[effectiveRole] || new Set();
    const permissions = Array.from(permSet);

    // 3. Internship Details (if INTERN)
    let internship: any = null;
    const emp = user.employmentProfile;
    if (effectiveRole === "INTERN" && emp) {
      const startDate = emp.joiningDate ? emp.joiningDate.toISOString().split("T")[0] : null;
      const endDate = emp.endDate ? emp.endDate.toISOString().split("T")[0] : null;
      const now = new Date();
      const startD = emp.joiningDate ? new Date(emp.joiningDate) : now;
      const daysUntilStart = Math.max(0, Math.ceil((startD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      internship = {
        internId: emp.employeeId || "CXA-INT-2026",
        domain: (emp as any).internshipDomain || emp.department || "Technical Track",
        duration: emp.internshipDuration || ((emp as any).internshipDurationMonths ? `${(emp as any).internshipDurationMonths} Months` : "—"),
        designation: emp.designation,
        college: (emp as any).college,
        collegeLocation: (emp as any).collegeLocation,
        yearOfStudy: (emp as any).yearOfStudy,
        academicBranch: (emp as any).academicBranch,
        referenceNumber: (emp as any).referenceNumber,
        startDate,
        endDate,
        daysUntilStart,
        mentorName: emp.mentorName || "Shaik Ashu (Founder)",
        status: emp.status || "ACTIVE",
        stipend: emp.stipend ? `₹${emp.stipend}/mo` : "Performance Stipend",
      };
    }

    // 4. Attendance State (Authoritative Core DB)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const now = new Date();

    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"].includes(effectiveRole);
    const isInternPreStart = effectiveRole === "INTERN" && emp?.joiningDate ? new Date(emp.joiningDate).getTime() > Date.now() : false;

    // Check active attendance window in database
    const activeWindow = await db.attendanceWindow.findFirst({
      where: {
        status: "ACTIVE",
        startTime: { lte: now },
        endTime: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);

    let attendance: any;
    if (isLeadership) {
      const [todayPresentCount, totalEligible] = await Promise.all([
        db.attendanceRecord.count({
          where: { date: { gte: today, lt: tomorrow }, status: "PRESENT" },
        }).catch(() => 0),
        db.user.count({
          where: { role: { in: ["INTERN", "EMPLOYEE"] }, isActive: true },
        }).catch(() => 0),
      ]);

      attendance = {
        isManagement: true,
        canMark: false,
        lifecycleStatus: activeWindow ? "WINDOW_ACTIVE" : "CLOSED",
        message: activeWindow ? "Attendance window is open." : "No active attendance window.",
        currentWindow: activeWindow ? {
          id: activeWindow.id,
          isOpen: true,
          startTime: activeWindow.startTime.toISOString(),
          endTime: activeWindow.endTime.toISOString(),
          remainingSeconds: Math.max(0, Math.floor((activeWindow.endTime.getTime() - now.getTime()) / 1000)),
        } : {
          isOpen: false,
          startTime: null,
          endTime: null,
          remainingSeconds: 0,
        },
        metrics: {
          presentCount: todayPresentCount,
          totalEligible,
        },
        todayRecord: null,
        stats: null,
      };
    } else if (isInternPreStart) {
      attendance = {
        isManagement: false,
        lifecycleStatus: "PRE_START",
        canMark: false,
        isPreStart: true,
        message: "Your attendance will become available when your internship begins.",
        startDate: emp?.joiningDate ? emp.joiningDate.toISOString() : null,
        currentWindow: {
          isOpen: false,
          startTime: null,
        },
        todayRecord: null,
        stats: null,
      };
    } else {
      const todayRecord = await db.attendanceRecord.findFirst({
        where: {
          userId: user.id,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      }).catch(() => null);

      const isWindowOpen = Boolean(activeWindow);
      const canMarkNow = isWindowOpen && !todayRecord && Boolean(featureFlags.MOBILE_ATTENDANCE);

      attendance = {
        isManagement: false,
        lifecycleStatus: todayRecord ? "COMPLETED" : isWindowOpen ? "WINDOW_ACTIVE" : "CLOSED",
        canMark: canMarkNow,
        isPreStart: false,
        message: todayRecord
          ? `Attendance marked for today (${todayRecord.status}).`
          : isWindowOpen
            ? "Attendance window open."
            : "Attendance window is closed.",
        startDate: emp?.joiningDate ? emp.joiningDate.toISOString() : null,
        currentWindow: {
          id: activeWindow?.id || null,
          isOpen: isWindowOpen,
          startTime: activeWindow?.startTime?.toISOString() || null,
          endTime: activeWindow?.endTime?.toISOString() || null,
          remainingSeconds: activeWindow ? Math.max(0, Math.floor((activeWindow.endTime.getTime() - now.getTime()) / 1000)) : 0,
        },
        todayRecord: todayRecord ? {
          id: todayRecord.id,
          status: todayRecord.status,
          timestamp: todayRecord.markedAt?.toISOString() || todayRecord.date.toISOString(),
        } : null,
        stats: null,
      };
    }

    // 5. Active Projects & Operational Metrics
    // isLeadership already in scope

    let operationalMetrics: any = null;
    if (isLeadership) {
      const [
        activeEmployees,
        activeInterns,
        todayPresentCount,
        pendingLeaveCount,
        pendingCorrectionsCount,
        totalProjectsCount,
      ] = await Promise.all([
        db.user.count({ where: { role: "EMPLOYEE", isActive: true } }).catch(() => 0),
        db.user.count({ where: { role: "INTERN", isActive: true } }).catch(() => 0),
        db.attendanceRecord.count({
          where: { date: { gte: today, lt: tomorrow }, status: "PRESENT" },
        }).catch(() => 0),
        db.leaveRequest.count({ where: { status: "PENDING" } }).catch(() => 0),
        db.attendanceCorrection.count({ where: { status: "PENDING" } }).catch(() => 0),
        db.project.count().catch(() => 0),
      ]);

      operationalMetrics = {
        activeEmployees,
        activeInterns,
        todayPresentCount,
        pendingLeaveCount,
        pendingCorrectionsCount,
        totalProjectsCount,
      };
    }

    const projects = await db.project.findMany({
      where: isLeadership
        ? undefined
        : {
            OR: [
              { createdBy: user.id },
              { collaborators: { some: { userId: user.id } } },
            ],
          },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }).catch(() => []);

    const activeProjects = projects.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      myRole: p.createdBy === user.id ? "Lead / Creator" : isLeadership ? "Management" : "Contributor",
      status: p.status || "Active",
      category: p.category || "Engineering",
      progressPercentage: p.status === "Live" ? 100.0 : 75.0,
      shortDesc: p.shortDesc || p.overview?.slice(0, 120) || null,
    }));

    // 6. Payment Information (for intern)
    let payment: any = null;
    if (effectiveRole === "INTERN") {
      const paymentReq = await db.paymentRequest.findFirst({
        where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
      }).catch(() => null);

      payment = {
        totalAmount: globalConfig.internFeeTotal || 450.0,
        currency: "INR",
        status: paymentReq?.paymentStatus || (user.internServicePaymentPaid ? "SUCCESSFUL" : "PENDING"),
        referenceId: paymentReq?.referenceId || null,
        webCheckoutUrl: globalConfig.paymentPortalUrl || "https://codxa-agency.online/dashboard/internship/payment",
        items: [
          { name: "Official Smart ID Card & NFC Dispatch", amount: 150 },
          { name: "Enterprise AI Development Stack Access", amount: 300 },
        ],
      };
    }

    // 7. Unread counts (isolated from Chat DB)
    const unreadNotifications = await db.notification.count({
      where: { userId: user.id, isRead: false },
    }).catch(() => 0);

    const unreadMessages = 0; // Isolated - chat loads independently

    // 8. Announcement
    let announcement: any = null;
    if (globalConfig.announcementEnabled) {
      announcement = {
        enabled: true,
        title: globalConfig.announcementTitle || "Announcement",
        message: globalConfig.announcementMessage || "",
        type: globalConfig.announcementType || "INFO",
        actionLabel: globalConfig.announcementActionLabel || null,
        actionUrl: globalConfig.announcementActionUrl || null,
      };
    }

    // 9. App Config
    const appConfig = {
      appName: globalConfig.appName || "CodeXa",
      currentVersion: globalConfig.currentVersion || "1.0.0",
      minimumVersion: globalConfig.minVersion || "1.0.0",
      forceUpdate: Boolean(globalConfig.forceUpdateEnabled),
      maintenanceMode: Boolean(globalConfig.maintenanceEnabled),
      maintenanceMessage: globalConfig.maintenanceMessage || "",
    };

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.profile?.displayName || user.username,
        role: effectiveRole,
        orgRole: user.orgRole,
        department: user.department || user.employmentProfile?.department,
        designation: user.employmentProfile?.designation || user.profile?.primaryRole,
        employeeId: user.employmentProfile?.employeeId,
        profileMediaUrl: user.profileMediaUrl || user.profile?.profileMediaUrl || user.profile?.mediaUrl,
        bio: user.profile?.bio || null,
        githubUrl: null,
        linkedinUrl: null,
        portfolioUrl: null,
        mustChangePassword: user.mustChangePassword,
      },
      role: effectiveRole,
      permissions,
      featureFlags,
      internship,
      attendance,
      unreadMessages,
      unreadNotifications,
      activeProjects,
      operationalMetrics,
      payment,
      appConfig,
      announcement,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/bootstrap Error] [${requestId}]`, {
      message: err?.message,
      code: err?.code,
    });

    if (isDatabaseError(err)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_UNAVAILABLE",
            message: "CodeXa is temporarily unable to connect to its database.",
          },
          requestId,
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Signed in, but CodeXa couldn't load your workspace.",
        },
        requestId,
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
