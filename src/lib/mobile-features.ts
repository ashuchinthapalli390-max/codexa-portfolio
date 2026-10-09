import { db } from "@/lib/db";
import { getEffectiveRole, OrgRole, UserPermissionContext } from "@/lib/permissions";

export type MobileFeatureKey =
  | "MOBILE_HOME"
  | "MOBILE_ATTENDANCE"
  | "MOBILE_ATTENDANCE_HISTORY"
  | "MOBILE_ATTENDANCE_CORRECTION"
  | "MOBILE_MESSAGES"
  | "MOBILE_GROUP_MESSAGES"
  | "MOBILE_PROJECT_CHAT"
  | "MOBILE_POSTS"
  | "MOBILE_CREATE_POST"
  | "MOBILE_COMMENTS"
  | "MOBILE_LIKES"
  | "MOBILE_MEDIA_UPLOAD"
  | "MOBILE_PROJECTS"
  | "MOBILE_PROJECT_UPDATES"
  | "MOBILE_NOTIFICATIONS"
  | "MOBILE_PUSH_NOTIFICATIONS"
  | "MOBILE_PROFILE"
  | "MOBILE_PROFILE_EDIT"
  | "MOBILE_PFP_UPLOAD"
  | "MOBILE_LEAVE_REQUESTS"
  | "MOBILE_PAYMENTS"
  | "MOBILE_DOCUMENTS"
  | "MOBILE_OFFER_LETTER"
  | "MOBILE_INTERNSHIP_DETAILS"
  | "MOBILE_EMPLOYMENT_DETAILS";

export interface MobileFeatureMeta {
  key: MobileFeatureKey;
  label: string;
  category: "Core" | "Attendance" | "Messages" | "Posts" | "Projects" | "Notifications" | "Profile" | "Leave" | "Payments" | "Documents" | "Work";
  description: string;
  defaultState: boolean;
}

export const MOBILE_FEATURE_LIST: MobileFeatureMeta[] = [
  {
    key: "MOBILE_HOME",
    label: "Mobile Home Dashboard",
    category: "Core",
    description: "Personalized dashboard widgets, quick actions, and status cards.",
    defaultState: true,
  },
  {
    key: "MOBILE_ATTENDANCE",
    label: "Self Attendance Marking",
    category: "Attendance",
    description: "Mark attendance from mobile client during active server window.",
    defaultState: true,
  },
  {
    key: "MOBILE_ATTENDANCE_HISTORY",
    label: "Attendance History Log",
    category: "Attendance",
    description: "View past attendance records, check-in timestamps, and percentages.",
    defaultState: true,
  },
  {
    key: "MOBILE_ATTENDANCE_CORRECTION",
    label: "Attendance Correction Requests",
    category: "Attendance",
    description: "Submit correction tickets for missed or disputed check-in slots.",
    defaultState: true,
  },
  {
    key: "MOBILE_MESSAGES",
    label: "Direct Messaging (DMs)",
    category: "Messages",
    description: "One-on-one encrypted chat governed by the role permission matrix.",
    defaultState: true,
  },
  {
    key: "MOBILE_GROUP_MESSAGES",
    label: "Group Channels & Chats",
    category: "Messages",
    description: "Multi-user organizational discussions and department groups.",
    defaultState: true,
  },
  {
    key: "MOBILE_PROJECT_CHAT",
    label: "Project Team Chat",
    category: "Messages",
    description: "Dedicated chat room associated with assigned projects.",
    defaultState: true,
  },
  {
    key: "MOBILE_POSTS",
    label: "Team Feed & Posts",
    category: "Posts",
    description: "Internal company social feed, announcements, and project highlights.",
    defaultState: true,
  },
  {
    key: "MOBILE_CREATE_POST",
    label: "Create Feed Posts",
    category: "Posts",
    description: "Publish new updates, images, code snippets, or team announcements.",
    defaultState: true,
  },
  {
    key: "MOBILE_COMMENTS",
    label: "Post Comments & Discussions",
    category: "Posts",
    description: "Participate in discussions under agency feed posts.",
    defaultState: true,
  },
  {
    key: "MOBILE_LIKES",
    label: "Post Reactions & Likes",
    category: "Posts",
    description: "React and like fellow team members' posts and achievements.",
    defaultState: true,
  },
  {
    key: "MOBILE_MEDIA_UPLOAD",
    label: "Media Uploads (Images/Files)",
    category: "Posts",
    description: "Attach screenshots, graphics, and documents to posts.",
    defaultState: true,
  },
  {
    key: "MOBILE_PROJECTS",
    label: "Projects Directory",
    category: "Projects",
    description: "Browse agency projects, tech stacks, and team collaborator lists.",
    defaultState: true,
  },
  {
    key: "MOBILE_PROJECT_UPDATES",
    label: "Project Milestone Updates",
    category: "Projects",
    description: "Post progress updates and milestone logs on active project boards.",
    defaultState: true,
  },
  {
    key: "MOBILE_NOTIFICATIONS",
    label: "In-App Notification Feed",
    category: "Notifications",
    description: "Centralized notifications list for payments, tasks, and mentions.",
    defaultState: true,
  },
  {
    key: "MOBILE_PUSH_NOTIFICATIONS",
    label: "Push Notifications (FCM)",
    category: "Notifications",
    description: "Receive high-priority background alerts on physical mobile hardware.",
    defaultState: true,
  },
  {
    key: "MOBILE_PROFILE",
    label: "Member Profile Viewing",
    category: "Profile",
    description: "View own profile and teammate public directories.",
    defaultState: true,
  },
  {
    key: "MOBILE_PROFILE_EDIT",
    label: "Profile Editing (Bio & Links)",
    category: "Profile",
    description: "Update personal bio, portfolio links, and skills (excluding core role).",
    defaultState: true,
  },
  {
    key: "MOBILE_PFP_UPLOAD",
    label: "Avatar / PFP Upload",
    category: "Profile",
    description: "Change and crop avatar photo directly from mobile photo gallery.",
    defaultState: true,
  },
  {
    key: "MOBILE_LEAVE_REQUESTS",
    label: "Leave Management",
    category: "Leave",
    description: "Submit leave applications and monitor approval states.",
    defaultState: true,
  },
  {
    key: "MOBILE_PAYMENTS",
    label: "Payments & Internship Fees",
    category: "Payments",
    description: "View fee invoices, ₹450 onboarding status, and UPI payment buttons.",
    defaultState: true,
  },
  {
    key: "MOBILE_DOCUMENTS",
    label: "Documents Center",
    category: "Documents",
    description: "Access and view authenticated PDFs, ID cards, and official files.",
    defaultState: true,
  },
  {
    key: "MOBILE_OFFER_LETTER",
    label: "Offer Letter Access",
    category: "Documents",
    description: "View and download official signed CodeXa offer/appointment letters.",
    defaultState: true,
  },
  {
    key: "MOBILE_INTERNSHIP_DETAILS",
    label: "Internship Track & Status",
    category: "Work",
    description: "View internship track, duration, mentor, and completion timeline.",
    defaultState: true,
  },
  {
    key: "MOBILE_EMPLOYMENT_DETAILS",
    label: "Employment Details",
    category: "Work",
    description: "View department, designation, employee ID, and joining date.",
    defaultState: true,
  },
];

export const DEFAULT_DM_ROLE_MATRIX: Record<string, boolean> = {
  INTERN_TO_INTERN: true,
  INTERN_TO_EMPLOYEE: true,
  INTERN_TO_CTO: true,
  INTERN_TO_HR: true,
  INTERN_TO_FOUNDER: false, // Protected by default
  EMPLOYEE_TO_EMPLOYEE: true,
  EMPLOYEE_TO_HR: true,
  EMPLOYEE_TO_CTO: true,
  EMPLOYEE_TO_FOUNDER: true,
  LEADERSHIP_TO_ALL: true,
};

export const DEFAULT_PUSH_CATEGORIES: Record<string, boolean> = {
  attendance: true,
  messages: true,
  projects: true,
  hr: true,
  leave: true,
  payments: true,
  documents: true,
  posts: true,
  security: true,
  announcements: true,
};

/**
 * Returns or initializes the global MobileAppConfig record.
 */
export async function getOrCreateGlobalMobileConfig() {
  let config = await db.mobileAppConfig.findFirst({
    where: { targetType: "GLOBAL" },
  });

  if (!config) {
    config = await db.mobileAppConfig.create({
      data: {
        targetType: "GLOBAL",
        appName: "CodeXa",
        platformStatus: "ACTIVE",
        currentVersion: "1.0.0",
        minVersion: "1.0.0",
        buildNumber: 1,
        maintenanceEnabled: false,
        maintenanceMessage: "CodeXa is undergoing scheduled maintenance. Please try again shortly.",
        forceUpdateEnabled: false,
        softUpdateEnabled: false,
        configVersion: 1,
        downloadUrl: "",
        androidApkUrl: "",
        playStoreUrl: "",
        iosStoreUrl: "",
        altDownloadUrl: "",
        attendanceEnabled: true,
        dmEnabled: true,
        postsEnabled: true,
        commentsEnabled: true,
        pushEnabled: true,
        projectsEnabled: true,
        paymentsEnabled: true,
        documentsEnabled: true,
        leaveRequestsEnabled: true,
        profileEnabled: true,
        employeeSelfAttendance: true,
        internSelfAttendance: true,
        allowAttendanceHistory: true,
        allowAttendanceCorrection: true,
        allowLateAttendance: false,
        showAttendancePercentage: true,
        requireActiveAttendanceWindow: true,
        defaultAttendanceDuration: 20,
        groupMessagesEnabled: true,
        projectChatEnabled: true,
        fileAttachmentsEnabled: true,
        imageAttachmentsEnabled: true,
        readReceiptsEnabled: true,
        typingIndicatorsEnabled: true,
        messageDeleteEnabled: true,
        dmRoleMatrix: DEFAULT_DM_ROLE_MATRIX,
        likesEnabled: true,
        videoUploadEnabled: true,
        projectUpdatesEnabled: true,
        mentionsEnabled: true,
        internalSharesEnabled: true,
        showAssignedProjectsOnly: false,
        allowProjectUpdates: true,
        allowMobileProjectComments: true,
        allowProjectMediaUpload: true,
        showProjectMembers: true,
        showProjectStatus: true,
        pushCategories: DEFAULT_PUSH_CATEGORIES,
        internFeeVisible: true,
        internFeeTotal: 450,
        internFeeBreakdown: {
          idCard: 150,
          aiDevPack: 300,
        },
        paymentPortalUrl: "https://codxa-agency.online/dashboard/internship/payment",
        docOfferLetter: true,
        docIdCard: true,
        docPayslips: true,
        docInternshipCert: true,
        docCompletionCert: true,
        docExperienceLetter: true,
        docNda: true,
        profileViewingEnabled: true,
        profileEditingEnabled: true,
        pfpUploadEnabled: true,
        bioEditingEnabled: true,
        skillsEditingEnabled: true,
        socialLinksEditingEnabled: true,
        leaveAttachmentsEnabled: true,
        leaveHistoryEnabled: true,
        leaveStatusEnabled: true,
        leaveCancellationEnabled: true,
        maxDevicesPerUser: 2,
        multipleSessionsAllowed: true,
        forceLogoutAllDevices: false,
        requireReauthSensitive: false,
        sessionExpiryDays: 30,
        blockRootedDevices: false,
        screenshotProtection: false,
        requireLatestVersionLogin: false,
      },
    });
  }

  return config;
}

/**
 * Maps a feature key to the corresponding global boolean column on MobileAppConfig.
 */
function getGlobalFlagValue(config: any, featureKey: MobileFeatureKey): boolean {
  switch (featureKey) {
    case "MOBILE_HOME":
      return config.platformStatus !== "DISABLED";
    case "MOBILE_ATTENDANCE":
      return Boolean(config.attendanceEnabled);
    case "MOBILE_ATTENDANCE_HISTORY":
      return Boolean(config.attendanceEnabled && config.allowAttendanceHistory);
    case "MOBILE_ATTENDANCE_CORRECTION":
      return Boolean(config.attendanceEnabled && config.allowAttendanceCorrection);
    case "MOBILE_MESSAGES":
      return Boolean(config.dmEnabled);
    case "MOBILE_GROUP_MESSAGES":
      return Boolean(config.dmEnabled && config.groupMessagesEnabled);
    case "MOBILE_PROJECT_CHAT":
      return Boolean(config.dmEnabled && config.projectChatEnabled);
    case "MOBILE_POSTS":
      return Boolean(config.postsEnabled);
    case "MOBILE_CREATE_POST":
      return Boolean(config.postsEnabled);
    case "MOBILE_COMMENTS":
      return Boolean(config.postsEnabled && config.commentsEnabled);
    case "MOBILE_LIKES":
      return Boolean(config.postsEnabled && config.likesEnabled);
    case "MOBILE_MEDIA_UPLOAD":
      return Boolean(config.postsEnabled && config.imageUploadEnabled);
    case "MOBILE_PROJECTS":
      return Boolean(config.projectsEnabled);
    case "MOBILE_PROJECT_UPDATES":
      return Boolean(config.projectsEnabled && config.allowProjectUpdates);
    case "MOBILE_NOTIFICATIONS":
      return Boolean(config.pushEnabled || true);
    case "MOBILE_PUSH_NOTIFICATIONS":
      return Boolean(config.pushEnabled);
    case "MOBILE_PROFILE":
      return Boolean(config.profileViewingEnabled);
    case "MOBILE_PROFILE_EDIT":
      return Boolean(config.profileEditingEnabled);
    case "MOBILE_PFP_UPLOAD":
      return Boolean(config.pfpUploadEnabled);
    case "MOBILE_LEAVE_REQUESTS":
      return Boolean(config.leaveRequestsEnabled);
    case "MOBILE_PAYMENTS":
      return Boolean(config.paymentsEnabled);
    case "MOBILE_DOCUMENTS":
      return Boolean(config.documentsEnabled);
    case "MOBILE_OFFER_LETTER":
      return Boolean(config.documentsEnabled && config.docOfferLetter);
    case "MOBILE_INTERNSHIP_DETAILS":
      return true;
    case "MOBILE_EMPLOYMENT_DETAILS":
      return true;
    default:
      return true;
  }
}

/**
 * CENTRAL RESOLVER: Precedence order:
 * USER override > ROLE override > GLOBAL setting
 */
export async function resolveMobileFeature(
  user: UserPermissionContext | null | undefined,
  featureKey: MobileFeatureKey,
  providedConfig?: any
): Promise<boolean> {
  if (!user || !user.id) {
    // Unauthenticated fallback to global
    const globalConfig = providedConfig || (await getOrCreateGlobalMobileConfig());
    return getGlobalFlagValue(globalConfig, featureKey);
  }

  const effectiveRole = getEffectiveRole(user);

  // 1. Check USER override
  const userOverride = await db.mobileFeatureOverride.findFirst({
    where: {
      featureKey,
      scope: "USER",
      targetUserId: user.id,
    },
  });

  if (userOverride) {
    if (userOverride.state === "ENABLED") return true;
    if (userOverride.state === "DISABLED") return false;
  }

  // 2. Check ROLE override
  const roleOverride = await db.mobileFeatureOverride.findFirst({
    where: {
      featureKey,
      scope: "ROLE",
      targetRole: effectiveRole,
    },
  });

  if (roleOverride) {
    if (roleOverride.state === "ENABLED") return true;
    if (roleOverride.state === "DISABLED") return false;
  }

  // 3. Check GLOBAL setting
  const globalConfig = providedConfig || (await getOrCreateGlobalMobileConfig());
  return getGlobalFlagValue(globalConfig, featureKey);
}

/**
 * Resolves ALL mobile features for a given user in a single optimized batch query.
 */
export async function resolveAllMobileFeatures(
  user: UserPermissionContext | null | undefined,
  providedConfig?: any
): Promise<Record<MobileFeatureKey, boolean>> {
  const globalConfig = providedConfig || (await getOrCreateGlobalMobileConfig());
  const effectiveRole = user ? getEffectiveRole(user) : "EMPLOYEE";
  const userId = user?.id || null;

  // Batch load all relevant overrides
  const overrides = await db.mobileFeatureOverride.findMany({
    where: {
      OR: [
        ...(userId ? [{ scope: "USER", targetUserId: userId }] : []),
        { scope: "ROLE", targetRole: effectiveRole },
      ],
    },
  });

  const userOverridesMap = new Map<string, string>();
  const roleOverridesMap = new Map<string, string>();

  for (const ov of overrides) {
    if (ov.scope === "USER" && ov.targetUserId === userId) {
      userOverridesMap.set(ov.featureKey, ov.state);
    } else if (ov.scope === "ROLE" && ov.targetRole === effectiveRole) {
      roleOverridesMap.set(ov.featureKey, ov.state);
    }
  }

  const resolved: Record<string, boolean> = {};

  for (const item of MOBILE_FEATURE_LIST) {
    const key = item.key;

    // 1. User
    const userState = userOverridesMap.get(key);
    if (userState === "ENABLED") {
      resolved[key] = true;
      continue;
    }
    if (userState === "DISABLED") {
      resolved[key] = false;
      continue;
    }

    // 2. Role
    const roleState = roleOverridesMap.get(key);
    if (roleState === "ENABLED") {
      resolved[key] = true;
      continue;
    }
    if (roleState === "DISABLED") {
      resolved[key] = false;
      continue;
    }

    // 3. Global
    resolved[key] = getGlobalFlagValue(globalConfig, key);
  }

  return resolved as Record<MobileFeatureKey, boolean>;
}

/**
 * Resolves full authenticated mobile response package for mobile app clients.
 */
export async function resolveFullMobilePackage(
  user: any,
  providedConfig?: any
) {
  const globalConfig = providedConfig || (await getOrCreateGlobalMobileConfig());
  const features = await resolveAllMobileFeatures(user, globalConfig);
  const effectiveRole = getEffectiveRole(user);

  // Check announcement active window
  const now = new Date();
  let announcement = null;
  if (globalConfig.announcementEnabled) {
    const isStarted = !globalConfig.announcementStartDate || new Date(globalConfig.announcementStartDate) <= now;
    const isEnded = !globalConfig.announcementEndDate || new Date(globalConfig.announcementEndDate) >= now;

    if (isStarted && isEnded) {
      announcement = {
        enabled: true,
        title: globalConfig.announcementTitle || "Announcement",
        message: globalConfig.announcementMessage || "",
        type: globalConfig.announcementType || "INFO",
        actionLabel: globalConfig.announcementActionLabel || null,
        actionUrl: globalConfig.announcementActionUrl || null,
      };
    }
  }

  // Payment information for intern/user
  let internPaymentInfo = null;
  if (effectiveRole === "INTERN" && user?.id) {
    const internPayment = await db.paymentRequest.findFirst({
      where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
      select: {
        referenceId: true,
        paymentStatus: true,
        fixedAmount: true,
        description: true,
        verifiedAt: true,
      },
    });

    internPaymentInfo = {
      visible: globalConfig.internFeeVisible,
      required: true,
      totalAmount: globalConfig.internFeeTotal || 450,
      breakdown: globalConfig.internFeeBreakdown || { idCard: 150, aiDevPack: 300 },
      status: internPayment?.paymentStatus || "PENDING_PAYMENT",
      referenceId: internPayment?.referenceId || null,
      payUrl: globalConfig.paymentPortalUrl || "https://codxa-agency.online/dashboard/internship/payment",
    };
  }

  // Employment / Intern Profile info
  const empProfile = user?.employmentProfile || null;

  // Fetch active published Android release
  const publishedRelease = await db.mobileAppRelease.findFirst({
    where: { platform: "ANDROID", releaseChannel: "STABLE", isCurrentPublished: true, status: "PUBLISHED" },
  });

  const latestVer = publishedRelease?.versionName || globalConfig.currentVersion || "1.0.0";
  const latestBuild = publishedRelease?.versionCode || globalConfig.buildNumber || 1;
  const activeApkUrl =
    publishedRelease?.apkDownloadUrl || globalConfig.androidApkUrl || globalConfig.downloadUrl || null;

  return {
    app: {
      name: globalConfig.appName || "CodeXa",
      version: latestVer,
      latestVersion: latestVer,
      latestVersionCode: latestBuild,
      buildNumber: latestBuild,
      minimumVersion: globalConfig.minVersion || "1.0.0",
      minimumSupportedVersionCode: publishedRelease?.minimumSupportedVersionCode || 1,
      platformStatus: globalConfig.platformStatus || "ACTIVE",
      maintenance: Boolean(globalConfig.maintenanceEnabled),
      maintenanceMessage: globalConfig.maintenanceMessage,
      forceUpdate: Boolean(globalConfig.forceUpdateEnabled) || publishedRelease?.updateType === "MANDATORY",
      softUpdate: Boolean(globalConfig.softUpdateEnabled),
      sha256: publishedRelease?.apkSha256 || null,
      fileSizeBytes: publishedRelease ? Number(publishedRelease.apkFileSize || 0) : null,
      releaseNotes: publishedRelease?.releaseNotes || globalConfig.releaseNotes || null,
    },

    downloads: {
      apkUrl: activeApkUrl,
      downloadUrl: activeApkUrl,
      playStoreUrl: globalConfig.playStoreUrl || null,
      iosStoreUrl: globalConfig.iosStoreUrl || null,
      altUrl: globalConfig.altDownloadUrl || null,
    },

    features: {
      attendance: features.MOBILE_ATTENDANCE,
      attendanceHistory: features.MOBILE_ATTENDANCE_HISTORY,
      attendanceCorrection: features.MOBILE_ATTENDANCE_CORRECTION,
      messages: features.MOBILE_MESSAGES,
      groupMessages: features.MOBILE_GROUP_MESSAGES,
      projectChat: features.MOBILE_PROJECT_CHAT,
      posts: features.MOBILE_POSTS,
      createPost: features.MOBILE_CREATE_POST,
      comments: features.MOBILE_COMMENTS,
      likes: features.MOBILE_LIKES,
      mediaUpload: features.MOBILE_MEDIA_UPLOAD,
      projects: features.MOBILE_PROJECTS,
      projectUpdates: features.MOBILE_PROJECT_UPDATES,
      notifications: features.MOBILE_NOTIFICATIONS,
      pushNotifications: features.MOBILE_PUSH_NOTIFICATIONS,
      profile: features.MOBILE_PROFILE,
      profileEdit: features.MOBILE_PROFILE_EDIT,
      pfpUpload: features.MOBILE_PFP_UPLOAD,
      leaveRequests: features.MOBILE_LEAVE_REQUESTS,
      payments: features.MOBILE_PAYMENTS,
      documents: features.MOBILE_DOCUMENTS,
      offerLetter: features.MOBILE_OFFER_LETTER,
      internshipDetails: features.MOBILE_INTERNSHIP_DETAILS,
      employmentDetails: features.MOBILE_EMPLOYMENT_DETAILS,
    },

    flags: features,

    attendanceConfig: {
      enabled: features.MOBILE_ATTENDANCE,
      allowSelfMarking: effectiveRole === "INTERN" ? globalConfig.internSelfAttendance : globalConfig.employeeSelfAttendance,
      allowHistory: globalConfig.allowAttendanceHistory,
      allowCorrection: globalConfig.allowAttendanceCorrection,
      allowLate: globalConfig.allowLateAttendance,
      showPercentage: globalConfig.showAttendancePercentage,
      requireActiveWindow: globalConfig.requireActiveAttendanceWindow,
      windowDurationMinutes: globalConfig.defaultAttendanceDuration || 20,
    },

    messagesConfig: {
      dmEnabled: features.MOBILE_MESSAGES,
      groupEnabled: features.MOBILE_GROUP_MESSAGES,
      projectChatEnabled: features.MOBILE_PROJECT_CHAT,
      fileAttachments: globalConfig.fileAttachmentsEnabled,
      imageAttachments: globalConfig.imageAttachmentsEnabled,
      readReceipts: globalConfig.readReceiptsEnabled,
      typingIndicators: globalConfig.typingIndicatorsEnabled,
      messageDelete: globalConfig.messageDeleteEnabled,
      roleMatrix: globalConfig.dmRoleMatrix || DEFAULT_DM_ROLE_MATRIX,
    },

    documentsConfig: {
      enabled: features.MOBILE_DOCUMENTS,
      offerLetter: globalConfig.docOfferLetter,
      idCard: globalConfig.docIdCard,
      payslips: globalConfig.docPayslips,
      internshipCertificate: globalConfig.docInternshipCert,
      completionCertificate: globalConfig.docCompletionCert,
      experienceLetter: globalConfig.docExperienceLetter,
      nda: globalConfig.docNda,
    },

    profileConfig: {
      viewing: globalConfig.profileViewingEnabled,
      editing: globalConfig.profileEditingEnabled,
      pfpUpload: globalConfig.pfpUploadEnabled,
      bioEditing: globalConfig.bioEditingEnabled,
      skillsEditing: globalConfig.skillsEditingEnabled,
      socialLinksEditing: globalConfig.socialLinksEditingEnabled,
      // Immutable fields that mobile cannot modify
      immutableFields: [
        "role",
        "orgRole",
        "employeeId",
        "internId",
        "salary",
        "stipend",
        "joiningDate",
        "internshipDuration",
        "status",
      ],
    },

    internPayment: internPaymentInfo,

    announcement,

    security: {
      maxDevices: globalConfig.maxDevicesPerUser || 2,
      multipleSessions: globalConfig.multipleSessionsAllowed,
      requireReauthSensitive: globalConfig.requireReauthSensitive,
      sessionExpiryDays: globalConfig.sessionExpiryDays || 30,
      blockRootedDevices: globalConfig.blockRootedDevices,
      screenshotProtection: globalConfig.screenshotProtection,
      requireLatestVersionLogin: globalConfig.requireLatestVersionLogin,
    },

    user: {
      id: user?.id,
      username: user?.username,
      displayName: user?.fullName || user?.username,
      email: user?.email,
      role: effectiveRole,
      department: user?.department || empProfile?.department || null,
      designation: empProfile?.designation || null,
      employeeId: empProfile?.employeeId || null,
    },

    meta: {
      configVersion: globalConfig.configVersion || 1,
      generatedAt: new Date().toISOString(),
      serverTime: new Date().toISOString(),
    },
  };
}
