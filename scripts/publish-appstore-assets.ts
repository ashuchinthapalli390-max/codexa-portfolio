import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../src/lib/db";
import { getStorageClient, APK_BUCKET_NAME } from "../src/lib/apk-storage";

async function main() {
  console.log("================================================================================");
  console.log("CODEXA AGENCY — PUBLISHING APPSTORE ASSETS TO MEDIA CATALOG & CLOUD STORAGE");
  console.log("================================================================================");

  const sourceDir = path.resolve("app store");
  const publicDir = path.resolve("public/appstore");

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source app store directory not found at ${sourceDir}`);
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const screenshotMapping = [
    { file: "ChatGPT Image Oct 10, 2026, 07_59_08 AM-1.png", target: "screenshot-1.png", order: 1, title: "Welcome & Secure Authentication", caption: "Secure entry to your official CodeXa workspace with authorized Core account credentials.", category: "Welcome & Auth", isCover: true },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_09 AM-2.png", target: "screenshot-2.png", order: 2, title: "Unified Agency Dashboard", caption: "Live overview of today's attendance window, scheduled training, pending tasks, and announcements.", category: "Dashboard", isCover: false },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_11 AM-3.png", target: "screenshot-3.png", order: 3, title: "Smart Attendance Tracker", caption: "Mark attendance within authorized geofenced time windows with automated server-side verification.", category: "Attendance", isCover: false },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_13 AM-4.png", target: "screenshot-4.png", order: 4, title: "Scheduled Classes & Daily Topics", caption: "Explore assigned classes, curriculum dates, learning objectives, and class resources.", category: "Classes", isCover: false },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_15 AM-5.png", target: "screenshot-5.png", order: 5, title: "Assignments & Submissions", caption: "Receive coding tasks, submit repository links or written work, and view mentor feedback.", category: "Assignments", isCover: false },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_16 AM-6.png", target: "screenshot-6.png", order: 6, title: "Projects & Agile Milestones", caption: "Collaborative project management, task Kanban, deadline monitoring, and deliverables tracking.", category: "Projects", isCover: false },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_18 AM-7.png", target: "screenshot-7.png", order: 7, title: "Real-Time Team Communication", caption: "Encrypted messaging with mentors, coworkers, and management via dedicated channels.", category: "Communication", isCover: false },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_19 AM-8.png", target: "screenshot-8.png", order: 8, title: "People Directory & Verified Profiles", caption: "Browse verified CodeXa Agency team members, roles, designations, and department contacts.", category: "Directory", isCover: false },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_20 AM-9.png", target: "screenshot-9.png", order: 9, title: "CodeXa AI Assistant", caption: "Built-in agency AI copilot for rapid development guidance, debugging, and code reviews.", category: "AI Copilot", isCover: false },
    { file: "ChatGPT Image Oct 10, 2026, 07_59_22 AM-10.png", target: "screenshot-10.png", order: 10, title: "Built-in In-App CodeXa Store", caption: "Official in-app application store for seamless update checks, release notes, and downloads.", category: "CodeXa Store", isCover: false },
  ];

  const supabase = getStorageClient();

  // 1. Process Screenshots
  console.log("\n[1/4] Copying and registering 10 official screenshots...");
  for (const item of screenshotMapping) {
    const srcPath = path.join(sourceDir, item.file);
    const destPath = path.join(publicDir, item.target);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      const buffer = fs.readFileSync(srcPath);
      const fileSize = BigInt(buffer.length);
      const storageKey = `showcase/screenshots/${item.target}`;
      let publicUrl = `/appstore/${item.target}`;

      // Upload to Supabase Storage
      try {
        const { error } = await supabase.storage.from(APK_BUCKET_NAME).upload(storageKey, buffer, {
          contentType: "image/png",
          upsert: true,
        });
        if (!error) {
          const { data: urlData } = supabase.storage.from(APK_BUCKET_NAME).getPublicUrl(storageKey);
          if (urlData?.publicUrl) {
            publicUrl = urlData.publicUrl;
          }
        }
      } catch (uploadErr: any) {
        console.warn(`Warning uploading ${item.target} to Supabase:`, uploadErr?.message);
      }

      // Check if media already exists
      const existing = await db.mobileShowcaseMedia.findFirst({
        where: { storageKey },
      });

      if (existing) {
        await db.mobileShowcaseMedia.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            caption: item.caption,
            altText: `CodeXa Mobile — ${item.title}`,
            publicUrl,
            fileSize,
            displayOrder: item.order,
            featureCategory: item.category,
            isCover: item.isCover,
            isPublished: true,
          },
        });
      } else {
        await db.mobileShowcaseMedia.create({
          data: {
            mediaCategory: "SCREENSHOT",
            mediaType: "IMAGE",
            storageProvider: "SUPABASE",
            storageBucket: APK_BUCKET_NAME,
            storageKey,
            publicUrl,
            mimeType: "image/png",
            fileSize,
            displayOrder: item.order,
            title: item.title,
            caption: item.caption,
            altText: `CodeXa Mobile — ${item.title}`,
            thumbnailUrl: publicUrl,
            featureCategory: item.category,
            isCover: item.isCover,
            isFeatured: item.isCover,
            isPublished: true,
          },
        });
      }
      console.log(`[✓] Screenshot ${item.order}: ${item.title} -> ${publicUrl}`);
    } else {
      console.warn(`[!] Source file not found: ${srcPath}`);
    }
  }

  // 2. Process Demo Video
  console.log("\n[2/4] Copying and registering official Demo Video...");
  const videoSrc = path.join(sourceDir, "CodeXa_Enhanced_1080p.mp4");
  const videoDest = path.join(publicDir, "codexa-demo-1080p.mp4");

  if (fs.existsSync(videoSrc)) {
    fs.copyFileSync(videoSrc, videoDest);
    const videoBuffer = fs.readFileSync(videoSrc);
    const videoSize = BigInt(videoBuffer.length);
    const videoStorageKey = "showcase/videos/codexa-demo-1080p.mp4";
    let videoPublicUrl = "/appstore/codexa-demo-1080p.mp4";
    const posterUrl = "/appstore/screenshot-1.png";

    try {
      const { error } = await supabase.storage.from(APK_BUCKET_NAME).upload(videoStorageKey, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });
      if (!error) {
        const { data: urlData } = supabase.storage.from(APK_BUCKET_NAME).getPublicUrl(videoStorageKey);
        if (urlData?.publicUrl) {
          videoPublicUrl = urlData.publicUrl;
        }
      }
    } catch (vErr: any) {
      console.warn("Warning uploading video to Supabase:", vErr?.message);
    }

    const existingVideo = await db.mobileShowcaseMedia.findFirst({
      where: { storageKey: videoStorageKey },
    });

    if (existingVideo) {
      await db.mobileShowcaseMedia.update({
        where: { id: existingVideo.id },
        data: {
          publicUrl: videoPublicUrl,
          fileSize: videoSize,
          thumbnailUrl: posterUrl,
          title: "CodeXa Mobile — Official App Walkthrough",
          caption: "Comprehensive 1080p walkthrough demonstrating attendance marking, class schedules, assignments, real-time chat, and the in-app CodeXa Store.",
          isFeatured: true,
          isPublished: true,
        },
      });
    } else {
      await db.mobileShowcaseMedia.create({
        data: {
          mediaCategory: "DEMO_VIDEO",
          mediaType: "VIDEO",
          storageProvider: "SUPABASE",
          storageBucket: APK_BUCKET_NAME,
          storageKey: videoStorageKey,
          publicUrl: videoPublicUrl,
          mimeType: "video/mp4",
          fileSize: videoSize,
          durationSeconds: 120,
          displayOrder: 1,
          title: "CodeXa Mobile — Official App Walkthrough",
          caption: "Comprehensive 1080p walkthrough demonstrating attendance marking, class schedules, assignments, real-time chat, and the in-app CodeXa Store.",
          altText: "Official CodeXa Mobile Android app demonstration video",
          thumbnailUrl: posterUrl,
          featureCategory: "App Walkthrough",
          isCover: false,
          isFeatured: true,
          isPublished: true,
        },
      });
    }
    console.log(`[✓] Demo Video Registered -> ${videoPublicUrl} (${(Number(videoSize) / 1024 / 1024).toFixed(1)} MB)`);
  }

  // 3. Populate MobileShowcaseContent Specification
  console.log("\n[3/4] Initializing authoritative Showcase Content & Features Specification...");
  const features = [
    {
      id: "attendance",
      title: "Smart Attendance Tracking",
      description: "Mark attendance within authorized windows with automated geofenced time validation and live status logs.",
      icon: "Clock",
      status: "Available",
      category: "Operations",
    },
    {
      id: "classes",
      title: "Scheduled Classes & Hub",
      description: "View batches, daily agendas, mentor details, join live sessions, and access class recordings.",
      icon: "GraduationCap",
      status: "Available",
      category: "Learning",
    },
    {
      id: "topics",
      title: "Date-wise Daily Topics",
      description: "Review structured curriculum topics, subtopics, recommended resources, and reference documentation.",
      icon: "BookOpen",
      status: "Available",
      category: "Learning",
    },
    {
      id: "assignments",
      title: "Assignments & Submissions",
      description: "Track coding assignments, submit GitHub repository links or documentation, and view grading feedback.",
      icon: "FileCode",
      status: "Available",
      category: "Development",
    },
    {
      id: "projects",
      title: "Projects & Agile Workspace",
      description: "Monitor milestones, collaborate on sprint tasks, track sprint deliverables, and manage project boards.",
      icon: "FolderKanban",
      status: "Available",
      category: "Development",
    },
    {
      id: "chat",
      title: "Real-Time Team Communication",
      description: "Direct messaging, group channels, photo/video sharing, and read receipts powered by secure Supabase channels.",
      icon: "MessageSquare",
      status: "Available",
      category: "Communication",
    },
    {
      id: "directory",
      title: "Verified People Directory",
      description: "Search coworkers and mentors, view role designations, departmental hierarchy, and contact info.",
      icon: "Users",
      status: "Available",
      category: "Organization",
    },
    {
      id: "leave",
      title: "Leave Management",
      description: "Apply for leave with reason selection, attach medical proof, and track real-time approval decisions.",
      icon: "CalendarX",
      status: "Available",
      category: "Operations",
    },
    {
      id: "ai",
      title: "CodeXa AI Copilot",
      description: "Integrated AI assistant tuned for CodeXa technical architectures, code debugging, and task automation.",
      icon: "Sparkles",
      status: "Available",
      category: "AI & Productivity",
    },
    {
      id: "store",
      title: "Built-in CodeXa Store",
      description: "Check for new application updates, inspect release notes, and install updates without visiting external stores.",
      icon: "ShoppingBag",
      status: "Available",
      category: "System",
    },
  ];

  const installationSteps = [
    {
      stepNumber: 1,
      title: "Download Official APK",
      description: "Click the 'Download Official APK' button above to save the latest verified CodeXa.apk binary to your Android device.",
      tip: "Verify that the downloaded file ends in .apk and matches the published SHA-256 hash.",
    },
    {
      stepNumber: 2,
      title: "Open Downloaded File",
      description: "Locate the file in your device's Notifications tray or Downloads folder and tap on it to initiate Android package installer.",
      tip: "If prompted by Android, grant 'Allow from this source' for your browser or file manager.",
    },
    {
      stepNumber: 3,
      title: "Review & Confirm Installation",
      description: "Review the system confirmation dialog and tap 'Install' or 'Update' to proceed with package unpacking.",
      tip: "No special root permissions or bypassing Play Protect is required — CodeXa Mobile is standard Android package.",
    },
    {
      stepNumber: 4,
      title: "Sign In with CodeXa Credentials",
      description: "Launch CodeXa Mobile from your home screen and log in using your approved CodeXa Agency account email and password.",
      tip: "Intern and employee accounts are provisioned by agency administration.",
    },
  ];

  const troubleshooting = [
    {
      q: "Why is CodeXa Mobile not on the Google Play Store?",
      a: "CodeXa Mobile is an exclusive, internal agency application built specifically for CodeXa Agency team members, interns, and leadership. To ensure direct release management, zero third-party telemetry, and instant bug fixes, it is distributed exclusively via our official website and the in-app CodeXa Store.",
      category: "Distribution",
    },
    {
      q: "Is it safe to install this APK on my Android device?",
      a: "Yes, 100%. Every APK release published on codxa-agency.online is cryptographically validated, signed with CodeXa's official Android release certificate, and hashed with SHA-256 before release. We never ask you to disable Google Play Protect.",
      category: "Security",
    },
    {
      q: "How do I update the application after installing?",
      a: "CodeXa Mobile includes a built-in 'CodeXa Store' inside the app. When a new version is published, you will receive a push notification and can update directly with one tap inside the app, or re-download from this official page.",
      category: "Updates",
    },
    {
      q: "Installation blocked: 'App not installed' or 'Conflicting signature'?",
      a: "This happens if you have an older test build installed that was signed with a debug key. Please uninstall the old version first, reboot your device, and install the official build from this page.",
      category: "Troubleshooting",
    },
    {
      q: "Can anyone register an account in the app?",
      a: "Access to CodeXa Mobile is restricted to verified CodeXa Agency team members and enrolled interns. If you do not have an active account, please contact agency administration at contact@codxa-agency.online.",
      category: "Access",
    },
  ];

  await db.mobileShowcaseContent.upsert({
    where: { id: "cxa_mobile_showcase_content" },
    create: {
      id: "cxa_mobile_showcase_content",
      appName: "CodeXa Mobile",
      appTagline: "Official CodeXa Agency Workspace",
      badgeText: "Available Exclusively on Our Official Website",
      developerName: "CodeXa Agency",
      platform: "Android",
      packageName: "com.codexa.app",
      shortDescription: "Your complete CodeXa workspace, connected wherever you go. Attendance, Classes, Projects, Assignments, Communication. Everything in one place.",
      fullDescription: `CodeXa Mobile is the official Android workspace for CodeXa Agency members. The application connects interns, employees, and management through a unified platform for communication, attendance, scheduled classes, assignments, projects, updates, and organizational activities.\n\nBuilt natively using Flutter and backed by CodeXa's enterprise PostgreSQL infrastructure, CodeXa Mobile delivers real-time notifications, geofenced attendance logging, and an integrated in-app CodeXa Store for seamless over-the-air updates.`,
      compatibilityText: "Android 8.0 (Oreo) or later • SDK 26+",
      officialWebsiteUrl: "https://codxa-agency.online",
      supportEmail: "contact@codxa-agency.online",
      supportPhone: "+91 7075920852",
      featuresJson: features as any,
      installationStepsJson: installationSteps as any,
      troubleshootingJson: troubleshooting as any,
      isPubliclyVisible: true,
      contentRevision: 1,
    },
    update: {
      appName: "CodeXa Mobile",
      appTagline: "Official CodeXa Agency Workspace",
      featuresJson: features as any,
      installationStepsJson: installationSteps as any,
      troubleshootingJson: troubleshooting as any,
      isPubliclyVisible: true,
      contentRevision: { increment: 1 },
    },
  });

  console.log("[✓] MobileShowcaseContent upserted successfully.");

  // 4. Verification
  const totalMedia = await db.mobileShowcaseMedia.count();
  console.log(`\n[4/4] Verification Complete! Total media items registered in catalog: ${totalMedia}`);
  console.log("================================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error publishing appstore assets:", e);
    process.exit(1);
  });
