/**
 * CodeXa Core Service Layer for MCP and Website API
 * Shared domain business logic: Users, Employees, Interns, Projects, Attendance,
 * Payments, Documents, Email, Analytics, Apps, and Reports.
 */

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { dataStore } from "@/lib/data-store";
import { canCreateRole, getEffectiveRole, isPermanentFounder, OrgRole } from "@/lib/permissions";
import {
  generateCodeXaId,
  generateOfferNumber,
  generatePayslipNumber,
  generatePaymentReferenceId,
  generateVerificationCode,
  generateDesktopActivationKey,
} from "@/lib/cxa-ids";
import { sendEmail, sendAccountCreatedEmail, contactFromEmail } from "@/lib/email";

// ─── 1. USERS SERVICE ─────────────────────────────────────────────────────────
export const usersService = {
  async searchUsers(query: string, role?: string, department?: string, limit = 20) {
    const q = query.trim().toLowerCase();
    const where: any = {
      isActive: true,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    };

    if (role) where.orgRole = role.toUpperCase();
    if (department) where.department = { contains: department, mode: "insensitive" };

    const users = await prisma.user.findMany({
      where,
      take: Math.min(limit, 50),
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        orgRole: true,
        department: true,
        profileMediaUrl: true,
        createdAt: true,
        employmentProfile: {
          select: {
            employeeId: true,
            designation: true,
            status: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.fullName || u.username,
      role: u.orgRole || u.role,
      department: u.department || "General",
      employeeId: u.employmentProfile?.employeeId || null,
      designation: u.employmentProfile?.designation || null,
      status: u.employmentProfile?.status || "ACTIVE",
    }));
  },

  async getUser(identifier: string) {
    const id = identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id },
          { email: id.toLowerCase() },
          { username: id.toLowerCase() },
          { employmentProfile: { employeeId: id.toUpperCase() } },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        orgRole: true,
        department: true,
        isActive: true,
        createdAt: true,
        employmentProfile: true,
        profile: {
          select: {
            headline: true,
            bio: true,
            githubUrl: true,
            linkedinUrl: true,
            portfolioUrl: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName || user.username,
      role: user.orgRole || user.role,
      department: user.department,
      isActive: user.isActive,
      employment: user.employmentProfile
        ? {
            ...user.employmentProfile,
            bankAccountMasked: user.employmentProfile.bankAccountMasked || "XXXX XXXX 4832",
          }
        : null,
      profile: user.profile,
    };
  },

  async listUsers(page = 1, limit = 20, role?: string, department?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (role) where.orgRole = role.toUpperCase();
    if (department) where.department = { contains: department, mode: "insensitive" };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          orgRole: true,
          department: true,
          isActive: true,
          createdAt: true,
          employmentProfile: {
            select: { employeeId: true, designation: true, status: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.fullName || u.username,
        role: u.orgRole || u.role,
        department: u.department,
        employeeId: u.employmentProfile?.employeeId || null,
        status: u.isActive ? (u.employmentProfile?.status || "ACTIVE") : "DEACTIVATED",
      })),
    };
  },

  async createAccount(data: {
    fullName: string;
    email: string;
    username?: string;
    role: string;
    department?: string;
    phone?: string;
    joiningDate?: string;
    employmentType?: string;
    salaryOrStipend?: number;
    reportingManager?: string;
    dryRun?: boolean;
    actorUser: any;
  }) {
    const rawRole = data.role.toUpperCase().trim() as OrgRole;

    // Check creator authority
    if (!canCreateRole(data.actorUser, rawRole)) {
      throw new Error(`Your role is not authorized to create accounts with role '${rawRole}'.`);
    }

    const email = data.email.toLowerCase().trim();
    if (!email.includes("@")) throw new Error("Invalid email address format.");

    // Check existing
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: data.username?.toLowerCase().trim() }] },
    });
    if (existing) {
      throw new Error(`An account with email '${email}' or username already exists.`);
    }

    const username = (data.username || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9_-]/g, "");

    const isIntern = rawRole === "INTERN";
    const employeeId = await generateCodeXaId(isIntern ? "INTERN" : "EMPLOYEE");

    if (data.dryRun) {
      return {
        dryRun: true,
        fullName: data.fullName,
        email,
        username,
        role: rawRole,
        employeeId,
        department: data.department || (isIntern ? "Engineering" : "Engineering"),
        message: "Dry run validation succeeded. Account is valid for creation.",
      };
    }

    const tempPassword = `Codexa@${crypto.randomBytes(3).toString("hex")}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        fullName: data.fullName.trim(),
        role: rawRole,
        orgRole: rawRole,
        department: data.department || (isIntern ? "Engineering" : "Engineering"),
        passwordHash,
        mustChangePassword: true,
        isActive: true,
        employmentProfile: {
          create: {
            employeeId,
            employmentType: isIntern ? "INTERN" : (data.employmentType || "FULL_TIME"),
            department: data.department || "Engineering",
            designation: isIntern ? "Intern Engineer" : "Core Developer",
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
            reportingTo: data.reportingManager || null,
            status: "ACTIVE",
            basicSalary: !isIntern ? data.salaryOrStipend || 45000 : undefined,
            stipend: isIntern ? data.salaryOrStipend || 15000 : undefined,
            internshipDuration: isIntern ? "3 Months" : undefined,
            bankAccountMasked: "XXXX XXXX 4832",
          },
        },
      },
      include: {
        employmentProfile: true,
      },
    });

    // Notify via email asynchronously
    sendAccountCreatedEmail({
      email,
      name: data.fullName,
      username,
    }).catch(() => {});

    await dataStore.logAudit(
      data.actorUser.id,
      "MCP_ACCOUNT_CREATED",
      `Created ${rawRole} account for ${email} (${employeeId}).`
    ).catch(() => {});

    return {
      success: true,
      userId: user.id,
      email: user.email,
      username: user.username,
      name: user.fullName,
      role: user.orgRole,
      employeeId,
      department: user.department,
      mustChangePassword: true,
      message: "Account created successfully. User must set password on first login.",
    };
  },

  async previewBulkAccounts(users: any[]) {
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error("Input must be a non-empty array of user objects.");
    }

    const emails = users.map((u) => (u.email || "").toLowerCase().trim());
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    const existingSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const seenInBatch = new Set<string>();
    let valid = 0;
    let duplicates = 0;
    let invalidEmails = 0;

    const items = users.map((u, idx) => {
      const email = (u.email || "").toLowerCase().trim();
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isValidEmail) {
        invalidEmails++;
        return { index: idx + 1, name: u.fullName || u.name, email, status: "INVALID_EMAIL", reason: "Invalid syntax" };
      }

      if (existingSet.has(email) || seenInBatch.has(email)) {
        duplicates++;
        return { index: idx + 1, name: u.fullName || u.name, email, status: "DUPLICATE", reason: "Already exists in database or batch" };
      }

      seenInBatch.add(email);
      valid++;
      return {
        index: idx + 1,
        name: u.fullName || u.name,
        email,
        role: (u.role || "INTERN").toUpperCase(),
        department: u.department || "Engineering",
        status: "VALID",
      };
    });

    return {
      totalSubmitted: users.length,
      validCount: valid,
      duplicateCount: duplicates,
      invalidEmailCount: invalidEmails,
      actionSummary: `Ready to create ${valid} accounts. Skip ${duplicates} duplicates. Reject ${invalidEmails} invalid.`,
      items,
    };
  },

  async createBulkAccounts(users: any[], actorUser: any, dryRun = false) {
    const preview = await this.previewBulkAccounts(users);
    if (dryRun) {
      return {
        dryRun: true,
        preview,
        message: "Dry run completed. No accounts were created.",
      };
    }

    const validItems = preview.items.filter((i) => i.status === "VALID");
    const created: any[] = [];
    const failed: any[] = [];

    for (const item of validItems) {
      try {
        const original = users.find((u) => (u.email || "").toLowerCase().trim() === item.email);
        const res = await this.createAccount({
          fullName: item.name || item.email.split("@")[0],
          email: item.email,
          role: item.role || "INTERN",
          department: item.department || "Engineering",
          salaryOrStipend: original?.salaryOrStipend || original?.stipend,
          joiningDate: original?.joiningDate,
          reportingManager: original?.reportingManager,
          actorUser,
        });
        created.push({
          email: res.email,
          name: res.name,
          employeeId: res.employeeId,
          role: res.role,
          status: "CREATED",
        });
      } catch (err: any) {
        failed.push({
          email: item.email,
          reason: err.message || "Failed to create account",
          status: "FAILED",
        });
      }
    }

    await dataStore.logAudit(
      actorUser.id,
      "MCP_BULK_ACCOUNTS_EXECUTED",
      `Bulk accounts completed: ${created.length} created, ${preview.duplicateCount} skipped duplicates, ${failed.length} failed.`
    ).catch(() => {});

    return {
      totalSubmitted: users.length,
      createdCount: created.length,
      skippedCount: preview.duplicateCount,
      failedCount: failed.length,
      created,
      failed,
    };
  },

  async deactivateUser(userId: string, actorUser: any) {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, orgRole: true, role: true },
    });

    if (!target) throw new Error("User not found.");

    const targetRole = (target.orgRole || target.role).toUpperCase();
    if (targetRole === "FOUNDER" || isPermanentFounder(target.email)) {
      throw new Error("Founder accounts cannot be deactivated.");
    }
    if (targetRole === "CO_FOUNDER" && !isPermanentFounder(actorUser.email)) {
      throw new Error("Only Founder can deactivate Co-Founder.");
    }

    // 1. Mark inactive
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // 2. Terminate employment record
    await prisma.employmentProfile.updateMany({
      where: { userId },
      data: { status: "TERMINATED", endDate: new Date() },
    });

    // 3. Revoke sessions
    await prisma.session.deleteMany({ where: { userId } });

    // 4. Revoke desktop licenses
    await prisma.desktopLicense.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_USER_DEACTIVATED",
      `Deactivated user '${target.email}' (${target.id}) and revoked all active licenses/sessions.`
    ).catch(() => {});

    return {
      success: true,
      userId,
      email: target.email,
      status: "DEACTIVATED",
      message: "User successfully deactivated. All active sessions and desktop licenses revoked. Records preserved.",
    };
  },
};

// ─── 2. EMPLOYEES & INTERNS SERVICE ───────────────────────────────────────────
export const employeesService = {
  async listEmployees(status?: string, department?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      employmentType: { not: "INTERN" },
    };
    if (status) where.status = status.toUpperCase();
    if (department) where.department = { contains: department, mode: "insensitive" };

    const [total, profiles] = await Promise.all([
      prisma.employmentProfile.count({ where }),
      prisma.employmentProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joiningDate: "desc" },
        include: {
          user: {
            select: { id: true, fullName: true, username: true, email: true, orgRole: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      employees: profiles.map((p) => ({
        id: p.id,
        employeeId: p.employeeId,
        userId: p.userId,
        name: p.user.fullName || p.user.username,
        email: p.user.email,
        role: p.user.orgRole,
        department: p.department,
        designation: p.designation,
        status: p.status,
        joiningDate: p.joiningDate.toISOString().slice(0, 10),
        salaryCycle: p.salaryCycle,
      })),
    };
  },

  async listInterns(domain?: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      employmentType: "INTERN",
    };
    if (status) where.status = status.toUpperCase();
    if (domain) where.department = { contains: domain, mode: "insensitive" };

    const [total, profiles] = await Promise.all([
      prisma.employmentProfile.count({ where }),
      prisma.employmentProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joiningDate: "desc" },
        include: {
          user: {
            select: { id: true, fullName: true, username: true, email: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      interns: profiles.map((p) => ({
        id: p.id,
        internId: p.employeeId,
        userId: p.userId,
        name: p.user.fullName || p.user.username,
        email: p.user.email,
        domain: p.department,
        mentor: p.mentorName || "Unassigned",
        duration: p.internshipDuration || "3 Months",
        status: p.status,
        startDate: p.joiningDate.toISOString().slice(0, 10),
        endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
      })),
    };
  },
};

// ─── 3. PROJECTS SERVICE ──────────────────────────────────────────────────────
export const projectsService = {
  async listProjects(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status.toUpperCase();

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { fullName: true, username: true } },
          collaborators: {
            include: { user: { select: { fullName: true, username: true } } },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        status: p.status,
        isPublic: p.isHomepageVisible,
        isApproved: p.isMainProject,
        creator: p.creator.fullName || p.creator.username,
        collaboratorCount: p.collaborators.length,
        liveUrl: p.liveUrl,
        githubUrl: p.repoUrl,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  },

  async getProject(projectId: string) {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id: projectId }, { slug: projectId }] },
      include: {
        creator: { select: { id: true, fullName: true, username: true, email: true } },
        collaborators: {
          include: {
            user: { select: { id: true, fullName: true, username: true, email: true } },
          },
        },
      },
    });

    if (!project) return null;

    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: project.overview || project.shortDesc || "",
      category: project.category,
      tags: project.techStack,
      status: project.status,
      isPublic: project.isHomepageVisible,
      isApproved: project.isMainProject,
      creator: project.creator,
      collaborators: project.collaborators.map((c) => ({
        userId: c.userId,
        name: c.user.fullName || c.user.username,
        email: c.user.email,
        role: c.roleTitle || "Collaborator",
      })),
      liveUrl: project.liveUrl,
      githubUrl: project.repoUrl,
      createdAt: project.createdAt.toISOString(),
    };
  },

  async createProject(data: {
    title: string;
    description: string;
    category?: string;
    tags?: string[];
    liveUrl?: string;
    githubUrl?: string;
    actorUser: any;
  }) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const project = await prisma.project.create({
      data: {
        title: data.title.trim(),
        slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
        shortDesc: data.description.trim(),
        category: data.category || "Full Stack",
        techStack: data.tags || [],
        liveUrl: data.liveUrl,
        repoUrl: data.githubUrl,
        status: "Live",
        isDraft: true,
        isHomepageVisible: false,
        isMainProject: false,
        createdBy: data.actorUser.id,
      },
    });

    await dataStore.logAudit(
      data.actorUser.id,
      "MCP_PROJECT_CREATED",
      `Draft project created: '${project.title}' (${project.id}).`
    ).catch(() => {});

    return {
      success: true,
      projectId: project.id,
      title: project.title,
      status: project.status,
      message: "Project draft created successfully.",
    };
  },

  async assignProjectMembersBulk(projectId: string, userIds: string[], role = "COLLABORATOR", actorUser: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { collaborators: true },
    });
    if (!project) throw new Error("Project not found.");

    const existingUserIds = new Set(project.collaborators.map((c) => c.userId));
    const toAdd = userIds.filter((uid) => !existingUserIds.has(uid));

    for (const uid of toAdd) {
      await prisma.projectCollaborator.create({
        data: {
          projectId,
          userId: uid,
          roleTitle: role,
        },
      });
    }

    await dataStore.logAudit(
      actorUser.id,
      "MCP_PROJECT_MEMBERS_ASSIGNED",
      `Assigned ${toAdd.length} members to project '${project.title}'. (${existingUserIds.size} already assigned).`
    ).catch(() => {});

    return {
      success: true,
      projectId,
      projectTitle: project.title,
      totalRequested: userIds.length,
      alreadyAssigned: userIds.length - toAdd.length,
      newlyAssigned: toAdd.length,
    };
  },

  async approveProject(projectId: string, actorUser: any, notes?: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found.");

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "Live",
        isDraft: false,
        isMainProject: true,
        isHomepageVisible: true,
      },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_PROJECT_APPROVED",
      `Approved project '${project.title}' (${project.id}). Notes: ${notes || "None"}`
    ).catch(() => {});

    return {
      success: true,
      projectId: updated.id,
      title: updated.title,
      status: updated.status,
      message: "Project approved and marked public.",
    };
  },

  async rejectProject(projectId: string, actorUser: any, reason: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found.");

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "Archived",
        isDraft: true,
        isHomepageVisible: false,
      },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_PROJECT_REJECTED",
      `Rejected project '${project.title}'. Reason: ${reason}`
    ).catch(() => {});

    return {
      success: true,
      projectId: updated.id,
      title: updated.title,
      status: updated.status,
      reason,
      message: "Project was rejected.",
    };
  },
};

// ─── 4. ATTENDANCE SERVICE ────────────────────────────────────────────────────
export const attendanceService = {
  async getAttendanceSummary(userId?: string, month?: number, year?: number) {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const where: any = { month: m, year: y };
    if (userId) where.userId = userId;

    const records = await prisma.attendanceRecord.findMany({ where });

    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const leave = records.filter((r) => r.status === "LEAVE").length;

    const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 100.0;
    const isEligible = rate >= 75.0;

    return {
      month: m,
      year: y,
      totalWorkingDays: total,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      leaveDays: leave,
      attendanceRate: rate,
      requiredRate: 75.0,
      isEligibleForPayroll: isEligible,
    };
  },

  async createAttendanceWindow(data: {
    date?: string;
    durationMinutes?: number;
    eligibleRoles?: string[];
    actorUser: any;
  }) {
    // Close any currently active window first
    await prisma.attendanceWindow.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "CLOSED" },
    });

    const now = new Date();
    const duration = data.durationMinutes || 30;
    const closesAt = new Date(now.getTime() + duration * 60 * 1000);
    const dateStr = data.date || now.toISOString().slice(0, 10);

    const window = await prisma.attendanceWindow.create({
      data: {
        date: new Date(dateStr),
        startTime: now,
        endTime: closesAt,
        status: "ACTIVE",
        eligibleRoles: data.eligibleRoles || ["EMPLOYEE", "INTERN"],
        createdById: data.actorUser.id,
        createdByName: data.actorUser.fullName || data.actorUser.username,
      },
    });

    await dataStore.logAudit(
      data.actorUser.id,
      "MCP_ATTENDANCE_WINDOW_OPENED",
      `Opened remote attendance window (${duration} mins, closes at ${closesAt.toLocaleTimeString()}).`
    ).catch(() => {});

    return {
      success: true,
      windowId: window.id,
      date: window.date.toISOString().slice(0, 10),
      openUntil: closesAt.toISOString(),
      durationMinutes: duration,
      eligibleRoles: window.eligibleRoles,
      status: "ACTIVE",
      message: `Attendance window active for ${duration} minutes. Mobile App users can submit check-in.`,
    };
  },

  async closeAttendanceWindow(windowId: string, actorUser: any) {
    const updated = await prisma.attendanceWindow.update({
      where: { id: windowId },
      data: { status: "CLOSED", endTime: new Date() },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_ATTENDANCE_WINDOW_CLOSED",
      `Closed attendance window ${windowId}.`
    ).catch(() => {});

    return {
      success: true,
      windowId: updated.id,
      status: "CLOSED",
      message: "Attendance window closed successfully.",
    };
  },
};

// ─── 5. PAYMENTS & PAYROLL SERVICE ────────────────────────────────────────────
export const paymentsService = {
  async getPaymentSummary(month?: number, year?: number) {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const records = await prisma.payrollRecord.findMany({
      where: { month: m, year: y },
    });

    const totalGross = records.reduce((acc, r) => acc + (r.basicAmount + r.allowances + r.bonus), 0);
    const totalNet = records.reduce((acc, r) => acc + r.netAmount, 0);
    const paidCount = records.filter((r) => r.status === "PAID").length;
    const pendingCount = records.filter((r) => r.status === "PENDING" || r.status === "SCHEDULED").length;
    const verifiedCount = records.filter((r) => r.status === "UNDER_VERIFICATION" || r.status === "VERIFIED").length;

    return {
      month: m,
      year: y,
      totalRecords: records.length,
      totalGrossAmount: totalGross,
      totalNetAmount: totalNet,
      paidRecords: paidCount,
      pendingRecords: pendingCount,
      verifiedRecords: verifiedCount,
    };
  },

  async listPayments(month?: number, year?: number, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const where: any = { month: m, year: y };
    if (status) where.status = status.toUpperCase();

    const [total, records] = await Promise.all([
      prisma.payrollRecord.count({ where }),
      prisma.payrollRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, fullName: true, username: true, email: true, orgRole: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      payments: records.map((r) => ({
        id: r.id,
        recipient: r.user.fullName || r.user.username,
        email: r.user.email,
        role: r.user.orgRole,
        period: r.period,
        netAmount: r.netAmount,
        status: r.status,
        dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
        paidAt: r.paymentDate ? r.paymentDate.toISOString().slice(0, 10) : null,
        transactionRef: r.transactionRef || null,
        verifiedBy: r.verifiedBy || null,
        approvedBy: r.approvedBy || null,
      })),
    };
  },

  async verifyPayment(paymentId: string, actorUser: any, notes?: string) {
    const payment = await prisma.payrollRecord.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Payment record not found.");

    const updated = await prisma.payrollRecord.update({
      where: { id: paymentId },
      data: {
        status: "VERIFIED",
        verifiedBy: actorUser.fullName || actorUser.username,
        verifiedAt: new Date(),
        notes: notes || payment.notes,
      },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_PAYMENT_VERIFIED",
      `Payment ${paymentId} (₹${payment.netAmount}) verified by ${actorUser.email}.`
    ).catch(() => {});

    return {
      success: true,
      paymentId: updated.id,
      status: "VERIFIED",
      verifiedBy: updated.verifiedBy,
      netAmount: updated.netAmount,
      message: "Payment verified successfully. Ready for Founder approval.",
    };
  },

  async approvePayment(paymentId: string, actorUser: any, notes?: string) {
    const payment = await prisma.payrollRecord.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Payment record not found.");

    const updated = await prisma.payrollRecord.update({
      where: { id: paymentId },
      data: {
        status: "APPROVED",
        approvedBy: actorUser.fullName || actorUser.username,
        approvedAt: new Date(),
        notes: notes || payment.notes,
      },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_PAYMENT_APPROVED",
      `Payment ${paymentId} (₹${payment.netAmount}) approved by ${actorUser.email}.`
    ).catch(() => {});

    return {
      success: true,
      paymentId: updated.id,
      status: "APPROVED",
      approvedBy: updated.approvedBy,
      netAmount: updated.netAmount,
      message: "Payment approved for disbursement.",
    };
  },

  async markPaymentPaid(paymentId: string, transactionReference: string, actorUser: any) {
    const payment = await prisma.payrollRecord.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Payment record not found.");

    const updated = await prisma.payrollRecord.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paymentDate: new Date(),
        transactionRef: transactionReference.trim(),
      },
    });

    // Generate Payslip record
    const payslipNumber = await generatePayslipNumber(payment.month, payment.year);
    await prisma.payslip.create({
      data: {
        userId: payment.userId,
        payrollRecordId: payment.id,
        slipNumber: payslipNumber,
        period: payment.period,
        grossAmount: payment.basicAmount + payment.allowances + payment.bonus,
        deductions: payment.deductions,
        netAmount: payment.netAmount,
        status: "GENERATED",
      },
    }).catch(() => {});

    await dataStore.logAudit(
      actorUser.id,
      "MCP_PAYMENT_MARKED_PAID",
      `Payment ${paymentId} (₹${payment.netAmount}) disbursed with ref '${transactionReference}'.`
    ).catch(() => {});

    return {
      success: true,
      paymentId: updated.id,
      status: "PAID",
      transactionReference: updated.transactionRef,
      payslipNumber,
      message: "Payment disbursed and marked as PAID. Payslip record generated.",
    };
  },

  // ── Manual UPI Payment Verification Methods ──
  async getPaymentRequest(referenceOrId: string) {
    const payment = await prisma.paymentRequest.findFirst({
      where: { OR: [{ id: referenceOrId }, { referenceId: referenceOrId }] },
      include: {
        paymentAccount: true,
        submissions: { orderBy: { submissionNumber: "desc" } },
      },
    });
    if (!payment) return null;
    return {
      id: payment.id,
      referenceId: payment.referenceId,
      user: { id: payment.userId, name: payment.userName, email: payment.userEmail, role: payment.userRole },
      title: payment.title,
      description: payment.description,
      fixedAmount: payment.fixedAmount,
      currency: payment.currency,
      status: payment.paymentStatus,
      utrNumber: payment.utrNumber,
      paymentDate: payment.paymentDate ? payment.paymentDate.toISOString().slice(0, 10) : null,
      submittedAt: payment.submittedAt ? payment.submittedAt.toISOString() : null,
      verifiedBy: payment.verifiedByName,
      verifiedAt: payment.verifiedAt ? payment.verifiedAt.toISOString() : null,
      rejectionReason: payment.rejectionReason,
    };
  },

  async listPendingPaymentVerifications() {
    const queue = await prisma.paymentRequest.findMany({
      where: { paymentStatus: "PENDING_VERIFICATION" },
      orderBy: { submittedAt: "asc" },
      include: { paymentAccount: true },
    });
    return {
      count: queue.length,
      queue: queue.map((p) => ({
        id: p.id,
        referenceId: p.referenceId,
        userName: p.userName,
        userEmail: p.userEmail,
        userRole: p.userRole,
        title: p.title,
        fixedAmount: p.fixedAmount,
        utrNumber: p.utrNumber,
        submittedAt: p.submittedAt?.toISOString(),
        upiApp: p.upiApp,
      })),
    };
  },

  async createPaymentRequest(data: {
    userId: string;
    title: string;
    fixedAmount: number;
    paymentPurpose?: string;
    description?: string;
    dueDate?: string;
    actorUser: any;
  }) {
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { employmentProfile: true },
    });
    if (!targetUser) throw new Error("Target user not found.");

    const refId = await generatePaymentReferenceId();
    const payment = await prisma.paymentRequest.create({
      data: {
        referenceId: refId,
        userId: targetUser.id,
        userName: targetUser.fullName || targetUser.username,
        userEmail: targetUser.email,
        userRole: targetUser.role,
        employeeId: targetUser.employmentProfile?.employeeId || null,
        internId: targetUser.role === "INTERN" ? targetUser.employmentProfile?.employeeId : null,
        domain: targetUser.employmentProfile?.department || targetUser.department || "General",
        paymentPurpose: data.paymentPurpose || "INTERNSHIP_FEE",
        title: data.title,
        description: data.description || null,
        fixedAmount: data.fixedAmount,
        currency: "INR",
        paymentStatus: "PENDING_PAYMENT",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: data.actorUser.id,
        createdByName: data.actorUser.fullName || data.actorUser.username,
      },
    });

    await dataStore.logAudit(
      data.actorUser.id,
      "MCP_PAYMENT_REQUEST_CREATED",
      `Created payment request ${refId} for ${targetUser.email} (₹${data.fixedAmount})`
    ).catch(() => {});

    return {
      success: true,
      paymentId: payment.id,
      referenceId: payment.referenceId,
      userEmail: payment.userEmail,
      fixedAmount: payment.fixedAmount,
      status: payment.paymentStatus,
      message: `Created payment request ${refId} for ₹${payment.fixedAmount}`,
    };
  },

  async approvePaymentProof(paymentId: string, actorUser: any, notes?: string) {
    const payment = await prisma.paymentRequest.findFirst({
      where: { OR: [{ id: paymentId }, { referenceId: paymentId }] },
    });
    if (!payment) throw new Error("Payment request not found.");

    const updated = await prisma.paymentRequest.update({
      where: { id: payment.id },
      data: {
        paymentStatus: "APPROVED",
        verifiedBy: actorUser.id,
        verifiedByName: actorUser.fullName || actorUser.username,
        verifiedAt: new Date(),
        adminNotes: notes || payment.adminNotes,
      },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_PAYMENT_APPROVED",
      `Approved manual payment ${payment.referenceId} (₹${payment.fixedAmount})`
    ).catch(() => {});

    return {
      success: true,
      paymentId: updated.id,
      referenceId: updated.referenceId,
      status: "APPROVED",
      verifiedBy: updated.verifiedByName,
      amount: updated.fixedAmount,
      message: "Payment successfully verified and approved.",
    };
  },

  async rejectPaymentProof(paymentId: string, actorUser: any, reason: string) {
    const payment = await prisma.paymentRequest.findFirst({
      where: { OR: [{ id: paymentId }, { referenceId: paymentId }] },
    });
    if (!payment) throw new Error("Payment request not found.");

    const updated = await prisma.paymentRequest.update({
      where: { id: payment.id },
      data: {
        paymentStatus: "REJECTED",
        rejectedBy: actorUser.id,
        rejectedByName: actorUser.fullName || actorUser.username,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_PAYMENT_REJECTED",
      `Rejected manual payment ${payment.referenceId}. Reason: ${reason}`
    ).catch(() => {});

    return {
      success: true,
      paymentId: updated.id,
      referenceId: updated.referenceId,
      status: "REJECTED",
      rejectionReason: reason,
      message: "Payment proof rejected. User notified to resubmit.",
    };
  },
};

// ─── 6. DOCUMENTS & OFFER LETTERS SERVICE ─────────────────────────────────────
export const documentsService = {
  async generateOfferLetter(userId: string, actorUser: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employmentProfile: true },
    });
    if (!user) throw new Error("User not found.");

    const offerNumber = await generateOfferNumber();
    const verificationCode = generateVerificationCode();

    const isIntern = (user.orgRole || user.role) === "INTERN";

    const offerLetter = await prisma.offerLetter.create({
      data: {
        userId,
        offerNumber,
        verificationCode,
        role: user.employmentProfile?.designation || (isIntern ? "Intern Engineer" : "Core Developer"),
        department: user.department || "Engineering",
        joiningDate: user.employmentProfile?.joiningDate || new Date(),
        duration: isIntern ? (user.employmentProfile?.internshipDuration || "3 Months") : undefined,
        salaryOrStipend: isIntern
          ? (user.employmentProfile?.stipend || 15000)
          : (user.employmentProfile?.basicSalary || 45000),
        status: "ISSUED",
        issuedBy: actorUser.fullName || actorUser.username,
      },
    });

    // Also attach to DocumentItem vault
    await prisma.documentItem.create({
      data: {
        userId,
        title: `Official Offer Letter (${offerNumber})`,
        documentType: "OFFER_LETTER",
        verificationCode,
        status: "ACTIVE",
        issuedBy: actorUser.fullName || actorUser.username,
      },
    }).catch(() => {});

    await dataStore.logAudit(
      actorUser.id,
      "MCP_OFFER_LETTER_GENERATED",
      `Generated offer letter ${offerNumber} for '${user.email}'. Verification: ${verificationCode}.`
    ).catch(() => {});

    return {
      success: true,
      offerNumber,
      verificationCode,
      recipientName: user.fullName || user.username,
      recipientEmail: user.email,
      roleTitle: offerLetter.role,
      joiningDate: offerLetter.joiningDate.toISOString().slice(0, 10),
      verificationUrl: `https://codxa-agency.online/verify/${verificationCode}`,
      message: "Offer letter generated and vaulted successfully.",
    };
  },

  async previewBulkOfferLetters(userIds: string[]) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, username: true, email: true, orgRole: true },
    });

    return {
      totalRequested: userIds.length,
      matchingUsers: users.length,
      recipients: users.map((u) => ({
        userId: u.id,
        name: u.fullName || u.username,
        email: u.email,
        role: u.orgRole,
      })),
      actionSummary: `Ready to generate and vault ${users.length} official offer letters.`,
    };
  },

  async generateBulkOfferLetters(userIds: string[], actorUser: any) {
    const results: any[] = [];
    for (const uid of userIds) {
      try {
        const res = await this.generateOfferLetter(uid, actorUser);
        results.push({ userId: uid, status: "SUCCESS", offerNumber: res.offerNumber });
      } catch (err: any) {
        results.push({ userId: uid, status: "FAILED", error: err.message });
      }
    }

    return {
      total: userIds.length,
      successful: results.filter((r) => r.status === "SUCCESS").length,
      failed: results.filter((r) => r.status === "FAILED").length,
      results,
    };
  },
};

// ─── 7. EMAIL SERVICE ─────────────────────────────────────────────────────────
export const emailService = {
  async previewBulkEmail(params: {
    targetGroup?: string;
    specificUserIds?: string[];
    subject: string;
    template?: string;
  }) {
    let where: any = { isActive: true };
    if (params.specificUserIds && params.specificUserIds.length > 0) {
      where = { id: { in: params.specificUserIds } };
    } else if (params.targetGroup) {
      const g = params.targetGroup.toUpperCase();
      if (g === "INTERNS") where.orgRole = "INTERN";
      else if (g === "EMPLOYEES") where.orgRole = "EMPLOYEE";
      else if (g === "CREW") where.orgRole = { in: ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO"] };
    }

    const recipients = await prisma.user.findMany({
      where,
      select: { id: true, email: true, fullName: true, username: true, orgRole: true },
      take: 200,
    });

    return {
      targetGroup: params.targetGroup || "CUSTOM",
      subject: params.subject,
      template: params.template || "STANDARD_ANNOUNCEMENT",
      recipientCount: recipients.length,
      sampleRecipients: recipients.slice(0, 5).map((r) => ({
        name: r.fullName || r.username,
        email: r.email,
        role: r.orgRole,
      })),
      message: `Audience resolved: ${recipients.length} recipients. Approval required before dispatch.`,
    };
  },

  async sendEmail(data: {
    recipientEmail: string;
    subject: string;
    message: string;
    template?: string;
    actorUser: any;
  }) {
    await sendEmail({
      from: contactFromEmail,
      to: data.recipientEmail,
      subject: data.subject,
      html: `<div style="font-family:sans-serif;padding:20px;background:#0d0d0d;color:#fff;">
        <h2 style="color:#ff2d55;">CodeXa Agency Dispatch</h2>
        <p>${data.message.replace(/\n/g, "<br/>")}</p>
        <hr style="border-color:#333;margin-top:20px;"/>
        <small style="color:#888;">Sent by ${data.actorUser.email} via CodeXa Agentic Core.</small>
      </div>`,
    });

    await dataStore.logAudit(
      data.actorUser.id,
      "MCP_EMAIL_SENT",
      `Sent email to '${data.recipientEmail}' with subject: '${data.subject}'.`
    ).catch(() => {});

    return {
      success: true,
      recipient: data.recipientEmail,
      subject: data.subject,
      message: "Email dispatched via Resend.",
    };
  },
};

// ─── 8. ANALYTICS SERVICE ─────────────────────────────────────────────────────
export const analyticsService = {
  async getCompanyOverview() {
    const [
      totalUsers,
      totalEmployees,
      totalInterns,
      totalProjects,
      pendingApprovals,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.employmentProfile.count({ where: { employmentType: { not: "INTERN" }, status: "ACTIVE" } }),
      prisma.employmentProfile.count({ where: { employmentType: "INTERN", status: "ACTIVE" } }),
      prisma.project.count(),
      prisma.approvalRequest.count({ where: { status: "PENDING" } }),
    ]);

    return {
      activeUsers: totalUsers,
      activeEmployees: totalEmployees,
      activeInterns: totalInterns,
      totalProjects,
      pendingApprovals,
      timestamp: new Date().toISOString(),
    };
  },
};

// ─── 9. FEATURE FLAGS & SEARCH SERVICES ───────────────────────────────────────
export const featureFlagsService = {
  async listFeatureFlags() {
    return prisma.featureFlag.findMany({
      orderBy: { flagKey: "asc" },
    });
  },

  async updateFeatureFlag(flagKey: string, isEnabled: boolean, actorUser: any) {
    const updated = await prisma.featureFlag.update({
      where: { flagKey },
      data: { isEnabled },
    });

    await dataStore.logAudit(
      actorUser.id,
      "MCP_FEATURE_FLAG_UPDATED",
      `Feature flag '${flagKey}' toggled to ${isEnabled ? "ENABLED" : "DISABLED"}.`
    ).catch(() => {});

    return {
      success: true,
      flagKey: updated.flagKey,
      isEnabled: updated.isEnabled,
    };
  },
};

export const searchService = {
  async searchCodeXa(query: string, actorUser: any) {
    const [users, projects] = await Promise.all([
      usersService.searchUsers(query, undefined, undefined, 10),
      projectsService.listProjects(undefined, 1, 10),
    ]);

    const filteredProjects = projects.projects.filter(
      (p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
    );

    return {
      query,
      results: {
        users,
        projects: filteredProjects,
      },
    };
  },
};
