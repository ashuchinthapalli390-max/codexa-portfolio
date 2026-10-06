import { db } from "../src/lib/db";

const DEFAULT_FLAGS = [
  { flagKey: "MOBILE_ATTENDANCE", name: "Mobile Attendance Check-in", description: "Enables attendance marking in Mobile App during open windows.", isEnabled: true },
  { flagKey: "MOBILE_DM", name: "Mobile Direct Messages", description: "Enables team direct messaging & conversations in Mobile App.", isEnabled: true },
  { flagKey: "MOBILE_POSTS", name: "Mobile Team Posts & Feed", description: "Enables social sharing and updates on Mobile feed.", isEnabled: true },
  { flagKey: "MOBILE_PUSH", name: "Mobile Push Notifications", description: "Delivers background alerts to registered mobile devices.", isEnabled: true },
  { flagKey: "DESKTOP_AI", name: "Desktop AI Engine Access", description: "Master switch for CodeXa AI Desktop client connectivity.", isEnabled: true },
  { flagKey: "DESKTOP_CODE_MODELS", name: "Code Assistant Models", description: "Allows access to autonomous coding models on desktop.", isEnabled: true },
  { flagKey: "DESKTOP_RESEARCH_MODELS", name: "Deep Research Models", description: "Allows access to research and document reasoning models.", isEnabled: false },
  { flagKey: "INTERN_PROJECT_CREATION", name: "Intern Project Drafts", description: "Permits interns to submit project drafts for approval.", isEnabled: true },
  { flagKey: "EMPLOYEE_PROJECT_CREATION", name: "Employee Project Publishing", description: "Permits core engineers to initiate project publishing.", isEnabled: true },
];

const DEFAULT_DM_MATRIX = {
  INTERN_TO_INTERN: true,
  INTERN_TO_EMPLOYEE: true,
  INTERN_TO_CTO: true,
  INTERN_TO_HR: true,
  INTERN_TO_FOUNDER: false,
  EMPLOYEE_TO_EMPLOYEE: true,
  EMPLOYEE_TO_HR: true,
  EMPLOYEE_TO_CTO: true,
  EMPLOYEE_TO_FOUNDER: true,
  LEADERSHIP_TO_ALL: true,
};

async function seedConfig() {
  console.log("Seeding default feature flags...");
  for (const flag of DEFAULT_FLAGS) {
    await db.featureFlag.upsert({
      where: { flagKey: flag.flagKey },
      update: {},
      create: flag,
    });
  }
  console.log(`Seeded ${DEFAULT_FLAGS.length} feature flags.`);

  console.log("Seeding global Mobile App configuration...");
  const existingConfig = await db.mobileAppConfig.findFirst({
    where: { targetType: "GLOBAL" },
  });

  if (!existingConfig) {
    await db.mobileAppConfig.create({
      data: {
        targetType: "GLOBAL",
        attendanceEnabled: true,
        dmEnabled: true,
        postsEnabled: true,
        commentsEnabled: true,
        pushEnabled: true,
        dmRoleMatrix: DEFAULT_DM_MATRIX,
        minVersion: "1.0.0",
        currentVersion: "1.0.0",
        downloadUrl: "",
      },
    });
    console.log("Global Mobile App config created.");
  } else {
    console.log("Global Mobile App config already exists.");
  }

  console.log("Platform configuration seed completed successfully.");
}

seedConfig()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
