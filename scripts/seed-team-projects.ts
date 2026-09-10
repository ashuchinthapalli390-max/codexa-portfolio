import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ override: true });
import { db } from "../src/lib/db";
import {
  OFFICIAL_FOUNDER_PROJECTS,
  OFFICIAL_CO_FOUNDER_PROJECTS,
} from "../src/lib/bootstrap-leadership";

async function main() {
  console.log("\n=======================================================");
  console.log("   SYNCING OFFICIAL FOUNDER & CO-FOUNDER PROJECTS      ");
  console.log("=======================================================\n");

  try {
    // 1. Locate Founder User & Profile
    const founderUser = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: "ashu", mode: "insensitive" } },
          { role: "OWNER" },
        ],
      },
      include: { profile: true },
    });

    if (founderUser) {
      console.log(`✓ Found Founder user: @${founderUser.username} (${founderUser.id})`);
      if (founderUser.profile) {
        await db.teamProfile.update({
          where: { id: founderUser.profile.id },
          data: {
            featuredProjects: OFFICIAL_FOUNDER_PROJECTS,
          },
        });
        console.log("  ✓ Updated Founder profile featuredProjects in database.");
      }
    } else {
      console.log("! Founder user not found in DB.");
    }

    // 2. Locate Co-Founder User & Profile
    const coFounderUser = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: "sanjay", mode: "insensitive" } },
          { profile: { leadershipPosition: "CO_FOUNDER" } },
        ],
      },
      include: { profile: true },
    });

    if (coFounderUser) {
      console.log(`✓ Found Co-Founder user: @${coFounderUser.username} (${coFounderUser.id})`);
      if (coFounderUser.profile) {
        await db.teamProfile.update({
          where: { id: coFounderUser.profile.id },
          data: {
            featuredProjects: OFFICIAL_CO_FOUNDER_PROJECTS,
          },
        });
        console.log("  ✓ Updated Co-Founder profile featuredProjects in database.");
      }
    } else {
      console.log("! Co-Founder user not found in DB.");
    }

    // 3. Upsert into Project Table
    console.log("\n--- Syncing Projects Table ---");

    // Founder Projects
    if (founderUser) {
      const founderProjectData = [
        {
          title: "Nexa AI",
          slug: "nexa-ai",
          category: "AI",
          shortDesc: "Cutting-edge AI intelligence suite and autonomous agent workflow platform.",
          overview:
            "Nexa AI is an advanced artificial intelligence platform featuring autonomous agent workflows, cognitive automation, custom prompt pipelines, and intelligent assistant integrations. Engineered for developer velocity and enterprise automation.",
          features: ["Autonomous AI Agents", "LLM Integration Pipelines", "Cognitive Automation", "Prompt Orchestration", "REST API Endpoints"],
          techStack: ["Next.js", "AI Agents", "LLM APIs", "Python", "TypeScript"],
          status: "Live",
          liveUrl: "https://nexa-ai.xyz/",
          repoUrl: null, // Code is Private
          thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isHomepageVisible: true,
          isMainProject: true,
          createdBy: founderUser.id,
        },
        {
          title: "CloudWave",
          slug: "cloudwave",
          category: "Cloud",
          shortDesc: "Enterprise-grade cloud infrastructure, NVMe VPS & bot hosting portal.",
          overview:
            "CloudWave delivers high-performance NVMe VPS, automated container deployments, Discord bot hosting, DDoS mitigation, and 99.99% uptime server management on custom cloud infrastructure.",
          features: ["NVMe Cloud VPS", "Discord Bot Hosting", "Automated SSL & DDoS Defense", "99.99% Uptime SLA", "Custom Infrastructure API"],
          techStack: ["Cloud Hosting", "Linux", "Docker", "Next.js", "REST APIs"],
          status: "Live",
          liveUrl: "https://cloudewave.in/",
          repoUrl: null, // Code is Private
          thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isHomepageVisible: true,
          isMainProject: true,
          createdBy: founderUser.id,
        },
        {
          title: "NEC Portal",
          slug: "nec-portal",
          category: "Web",
          shortDesc: "Autonomous College Academic, Research & Institutional Management Portal.",
          overview:
            "Official Academic, Research & Institutional Management Portal of Narasaraopeta Engineering College (Autonomous). Integrates 13 academic departments, 418+ verified faculty directories, research publication auto-sync, and student analytics.",
          features: ["13 Academic Departments Directory", "418+ Verified Faculty Profiles", "Research Publication Auto-Sync", "Accreditation Tracking Engine", "Student Analytics Dashboard"],
          techStack: ["React", "Vite", "Tailwind CSS", "TypeScript"],
          status: "Live",
          liveUrl: "https://nec-portal-rosy.vercel.app/",
          repoUrl: null, // Code is Private
          thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isHomepageVisible: true,
          isMainProject: true,
          createdBy: founderUser.id,
        },
        {
          title: "NodeWave",
          slug: "nodewave",
          category: "Automation",
          shortDesc: "High-throughput Node.js microservices framework and developer runtime tooling.",
          overview:
            "NodeWave is a developer platform and microservices framework engineered for high-throughput Node.js systems, distributed caching, automated API routing, and backend runtime orchestration.",
          features: ["Microservices Architecture", "API Gateway Routing", "Distributed Redis Caching", "High Throughput Optimization", "Developer CLI Tools"],
          techStack: ["Node.js", "Express", "Redis", "TypeScript", "Microservices"],
          status: "Live",
          liveUrl: "https://nodewave.in/",
          repoUrl: null, // Code is Private
          thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isHomepageVisible: true,
          isMainProject: true,
          createdBy: founderUser.id,
        },
        {
          title: "CodeAxis Apply",
          slug: "codeaxis-apply",
          category: "Full Stack",
          shortDesc: "Developer screening & internship recruitment universe with 8-round screening.",
          overview:
            "CodeAxis Apply is the official developer recruitment and internship universe for CodeXa Developer Internship 2026. Features 8-stage candidate assessment, live application tracking, automated project evaluation, and interactive screening terminal.",
          features: ["8-Stage Screening Pipeline", "Interactive Candidate Terminal", "Live Application Tracking", "Automated Project Evaluation", "Curriculum Module Viewer"],
          techStack: ["Next.js App Router", "Supabase", "Tailwind CSS", "Framer Motion"],
          status: "Live",
          liveUrl: "https://www.codeaxisapply.xyz/",
          repoUrl: null, // Code is Private
          thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isHomepageVisible: true,
          isMainProject: true,
          createdBy: founderUser.id,
        },
        {
          title: "CodeXa Agency Platform",
          slug: "codexa-agency",
          category: "Full Stack",
          shortDesc: "Flagship digital agency platform showcasing enterprise web development & cyber aesthetics.",
          overview:
            "Official digital agency showcase for CodeXa Agency. Features enterprise web engineering, cybersecurity testing, AI automation, and custom client software solutions with interactive cyber aesthetics.",
          features: ["Interactive 3D / Cyber Interface", "Client Project Management", "Secure Authentication & 2FA", "Team Profile Architecture", "Client Booking Engine"],
          techStack: ["Next.js", "Tailwind CSS", "Framer Motion", "Prisma", "PostgreSQL"],
          status: "Live",
          liveUrl: "https://codxa-agency.online/",
          repoUrl: null, // Code is Private
          thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isHomepageVisible: true,
          isMainProject: true,
          createdBy: founderUser.id,
        },
      ];

      for (const p of founderProjectData) {
        const existing = await db.project.findUnique({ where: { slug: p.slug } });
        if (!existing) {
          await db.project.create({ data: p });
          console.log(`  ✓ Created project: ${p.title} (${p.slug})`);
        } else {
          await db.project.update({
            where: { slug: p.slug },
            data: {
              title: p.title,
              shortDesc: p.shortDesc,
              overview: p.overview,
              category: p.category,
              techStack: p.techStack,
              features: p.features,
              liveUrl: p.liveUrl,
              repoUrl: p.repoUrl,
              status: p.status,
              isHomepageVisible: true,
              isMainProject: true,
            },
          });
          console.log(`  ✓ Updated project: ${p.title} (${p.slug})`);
        }
      }
    }

    // Co-Founder Projects
    if (coFounderUser) {
      const coFounderProjectData = [
        {
          title: "StarX Live",
          slug: "starx-live",
          category: "Web",
          shortDesc: "Official band booking & media streaming web platform for Hyderabad's premier rock band.",
          overview:
            "StarX Live is the official web platform and VIP booking portal for StarX Live, a premier Hyderabad-based live rock band performing Classic, Rock and Western music in Telugu and Hindi. Features dynamic media showcases, tour schedules, and booking coordination.",
          features: ["Audio-Visual Media Gallery", "Live Performance Schedule", "Musician Lineup Directory", "VIP Booking Form", "High-Energy Cyber Interface"],
          techStack: ["React", "Vite", "Tailwind CSS", "Audio Streaming"],
          status: "Live",
          liveUrl: "https://starx-live-official.vercel.app/",
          repoUrl: null, // Code is Private
          thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isHomepageVisible: true,
          isMainProject: true,
          createdBy: coFounderUser.id,
        },
        {
          title: "TicketX",
          slug: "ticket-x",
          category: "Web",
          shortDesc: "Premium real-time movie & event ticket booking platform with interactive seat maps.",
          overview:
            "TicketX is a next-gen real-time cinema and event ticket booking platform. Features multi-city theater programming, interactive seat layout maps, digital ticket pass generation, and secure checkout integration.",
          features: ["Multi-City Theater Programming", "Interactive Seat Selection Map", "Digital QR Pass Generation", "Real-time Show Booking", "Mobile Responsive Experience"],
          techStack: ["Next.js", "React", "Tailwind CSS", "TypeScript"],
          status: "Live",
          liveUrl: "https://ticket-x-theta.vercel.app/",
          repoUrl: null, // Code is Private
          thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isHomepageVisible: true,
          isMainProject: true,
          createdBy: coFounderUser.id,
        },
      ];

      for (const p of coFounderProjectData) {
        const existing = await db.project.findUnique({ where: { slug: p.slug } });
        if (!existing) {
          await db.project.create({ data: p });
          console.log(`  ✓ Created project: ${p.title} (${p.slug})`);
        } else {
          await db.project.update({
            where: { slug: p.slug },
            data: {
              title: p.title,
              shortDesc: p.shortDesc,
              overview: p.overview,
              category: p.category,
              techStack: p.techStack,
              features: p.features,
              liveUrl: p.liveUrl,
              repoUrl: p.repoUrl,
              status: p.status,
              isHomepageVisible: true,
              isMainProject: true,
            },
          });
          console.log(`  ✓ Updated project: ${p.title} (${p.slug})`);
        }
      }
    }

    console.log("\n✓ ALL OFFICIAL PROJECTS SUCCESSFULLY SYNCED IN DATABASE!\n");
  } catch (err) {
    console.error("Error during project sync:", err);
  } finally {
    await db.$disconnect();
  }
}

main();
