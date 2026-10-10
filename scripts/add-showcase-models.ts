import fs from "fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
if (!schema.includes("model MobileShowcaseMedia")) {
  const models = `

// ─── MOBILE APP SHOWCASE MEDIA & ASSET CATALOG ──────────────────────────────
model MobileShowcaseMedia {
  id                  String   @id @default(cuid())
  mediaCategory       String   @default("SCREENSHOT") // "SCREENSHOT" | "DEMO_VIDEO" | "PROMO_ARTWORK" | "APP_ICON"
  mediaType           String   @default("IMAGE") // "IMAGE" | "VIDEO"
  storageProvider     String   @default("SUPABASE") // "SUPABASE" | "LOCAL" | "VERCEL_BLOB"
  storageBucket       String   @default("mobile-releases")
  storageKey          String
  publicUrl           String
  mimeType            String   @default("image/png")
  fileSize            BigInt   @default(0)
  width               Int?
  height              Int?
  durationSeconds     Float?
  displayOrder        Int      @default(0)
  title               String?
  caption             String?  @db.Text
  altText             String?
  thumbnailUrl        String?
  featureCategory     String?
  isCover             Boolean  @default(false)
  isFeatured          Boolean  @default(false)
  isPublished         Boolean  @default(true)
  associatedReleaseId String?
  createdById         String?
  createdByName       String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([mediaCategory])
  @@index([mediaType])
  @@index([displayOrder])
  @@index([isPublished])
  @@index([featureCategory])
}

// ─── MOBILE SHOWCASE CONTENT & STORE SPECIFICATION ──────────────────────────
model MobileShowcaseContent {
  id                    String   @id @default("cxa_mobile_showcase_content")
  appName               String   @default("CodeXa Mobile")
  appTagline            String   @default("Official CodeXa Agency Workspace")
  badgeText             String   @default("Available Exclusively on Our Official Website")
  developerName         String   @default("CodeXa Agency")
  platform              String   @default("Android")
  packageName           String   @default("com.codexa.app")
  shortDescription      String   @default("Your complete CodeXa workspace, connected wherever you go. Attendance, Classes, Projects, Assignments, Communication. Everything in one place.")
  fullDescription       String   @db.Text
  compatibilityText     String   @default("Android 8.0 or later • Compatible with SDK 26+")
  officialWebsiteUrl    String   @default("https://codxa-agency.online")
  supportEmail          String   @default("contact@codxa-agency.online")
  supportPhone          String   @default("+91 7075920852")
  featuresJson          Json?
  installationStepsJson Json?
  troubleshootingJson   Json?
  isPubliclyVisible     Boolean  @default(true)
  contentRevision       Int      @default(1)
  updatedById           String?
  updatedByName         String?
  updatedAt             DateTime @updatedAt
}
`;
  fs.appendFileSync("prisma/schema.prisma", models, "utf8");
  console.log("Successfully appended showcase models to prisma/schema.prisma");
} else {
  console.log("Showcase models already exist in prisma/schema.prisma");
}
