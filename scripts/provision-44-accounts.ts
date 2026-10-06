import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const INTERN_TEMPORARY_PASSWORD = process.env.INTERN_TEMPORARY_PASSWORD || "SUPPLIED_VIA_SECRET";

interface InternData {
  no: string;
  name: string;
  email: string;
  id: string;
  preferredUsername: string;
}

const INTERN_LIST: InternData[] = [
  { no: "001", name: "Alikepalli Charan Teja", email: "charantejareddyalikepalli@gmail.com", id: "CXA-INT-2026-001", preferredUsername: "charanteja" },
  { no: "002", name: "Hem Kumar", email: "hemkumarmummina2008@gmail.com", id: "CXA-INT-2026-002", preferredUsername: "hemkumar" },
  { no: "003", name: "Noushin", email: "noushinshaik33@gmail.com", id: "CXA-INT-2026-003", preferredUsername: "noushin" },
  { no: "004", name: "Shaik Umar", email: "usk3442@gmail.com", id: "CXA-INT-2026-004", preferredUsername: "shaikumar" },
  { no: "005", name: "A.Lakshmi Gayathri", email: "akishoreapl@gmail.com", id: "CXA-INT-2026-005", preferredUsername: "lakshmigayathri" },
  { no: "006", name: "Aparanji", email: "gollamudiaparanji25@gmail.com", id: "CXA-INT-2026-006", preferredUsername: "aparanji" },
  { no: "007", name: "Bukkisetti Bhargav Naidu", email: "bhargavnaidubukkisetti@gmail.com", id: "CXA-INT-2026-007", preferredUsername: "bhargavnaidu" },
  { no: "008", name: "Byra.Geethika", email: "geethikabyra@gmail.com", id: "CXA-INT-2026-008", preferredUsername: "geethikabyra" },
  { no: "009", name: "C Hemanth Kumar", email: "hemanthkumar7489@gmail.com", id: "CXA-INT-2026-009", preferredUsername: "hemanthkumar" },
  { no: "010", name: "Gopu Pravallika Srilakshmi", email: "pravallika123456sl@gmail.com", id: "CXA-INT-2026-010", preferredUsername: "pravallika" },
  { no: "011", name: "Kanagala Lakshmi Pallavi", email: "pallavichowdary823@gmail.com", id: "CXA-INT-2026-011", preferredUsername: "lakshmipallavi" },
  { no: "012", name: "Maguluri Sai Ram Charan Mokshagna", email: "sairam.maguluri@gmail.com", id: "CXA-INT-2026-012", preferredUsername: "sairamcharan" },
  { no: "013", name: "Neelam Aishwarya", email: "neelamaishwarya07@gmail.com", id: "CXA-INT-2026-013", preferredUsername: "neelamaishwarya" },
  { no: "014", name: "Pragada Varun Tej", email: "varuntejpragada@gmail.com", id: "CXA-INT-2026-014", preferredUsername: "varuntej" },
  { no: "015", name: "Pusapati Gayathri", email: "gayathripusapati74@gmail.com", id: "CXA-INT-2026-015", preferredUsername: "gayathripusapati" },
  { no: "016", name: "Santhoshi Kandakatla", email: "renukakandakatla524@gmail.com", id: "CXA-INT-2026-016", preferredUsername: "santhoshi" },
  { no: "017", name: "Shaik Izaz", email: "izazshaik64008@gmail.com", id: "CXA-INT-2026-017", preferredUsername: "shaikizaz" },
  { no: "018", name: "Vallabharaju Sneha", email: "snehavallabharaju02@gmail.com", id: "CXA-INT-2026-018", preferredUsername: "snehavallabharaju" },
  { no: "019", name: "Valluri Ganesh", email: "vvalluriganesh@gmail.com", id: "CXA-INT-2026-019", preferredUsername: "ganeshvalluri" },
  { no: "020", name: "Venkata Sai Harish Babu Gummadi", email: "harishgummadi72@gmail.com", id: "CXA-INT-2026-020", preferredUsername: "harishgummadi" },
  { no: "021", name: "Yasam Venkata Ram Saran", email: "yasamvenkataramsaran44@gmail.com", id: "CXA-INT-2026-021", preferredUsername: "ramsaran" },
  { no: "022", name: "Avula Mounika", email: "mounikaavula55@gmail.com", id: "CXA-INT-2026-022", preferredUsername: "mounikaavula" },
  { no: "023", name: "Bogadapati Priya Hasini", email: "bogadapatipriyahasini@gmail.com", id: "CXA-INT-2026-023", preferredUsername: "priyahasini" },
  { no: "024", name: "Chinthapalli Samitha Reddy", email: "chsamithareddy@gmail.com", id: "CXA-INT-2026-024", preferredUsername: "samithareddy" },
  { no: "025", name: "Dakuri Madhumathi", email: "dakurimadhumathi@gmail.com", id: "CXA-INT-2026-025", preferredUsername: "madhumathi" },
  { no: "026", name: "Gummadi Venkata Siva Gayatri", email: "gummadigayatri21@gmail.com", id: "CXA-INT-2026-026", preferredUsername: "sivagayatri" },
  { no: "027", name: "M Vardhan", email: "makamvardhan7@gmail.com", id: "CXA-INT-2026-027", preferredUsername: "makamvardhan" },
  { no: "028", name: "M.Jayasri", email: "medamjayasri04@gmail.com", id: "CXA-INT-2026-028", preferredUsername: "jayasrimedam" },
  { no: "029", name: "N.Sri Bhargav Utshav", email: "nadipintisribhargav@gmail.com", id: "CXA-INT-2026-029", preferredUsername: "sribhargav" },
  { no: "030", name: "Shaik Bhadar Mahammad Thahir", email: "thahirshaik1182@gmail.com", id: "CXA-INT-2026-030", preferredUsername: "shaikthahir" },
  { no: "031", name: "Shaik Farhana Kousar", email: "f87446928@gmail.com", id: "CXA-INT-2026-031", preferredUsername: "farhanakousar" },
  { no: "032", name: "Thota Anitha", email: "anithathota167@gmail.com", id: "CXA-INT-2026-032", preferredUsername: "anithathota" },
  { no: "033", name: "Jaswanthi Reddy Pasam", email: "jaswanthipasam562@gmail.com", id: "CXA-INT-2026-033", preferredUsername: "jaswanthireddy" },
  { no: "034", name: "Kolisetty Jaya Sai Krishna", email: "kolisettyjayasaikrishna3@gmail.com", id: "CXA-INT-2026-034", preferredUsername: "jayasaikrishna" },
  { no: "035", name: "Meenakshi", email: "battulameenakshi1@gmail.com", id: "CXA-INT-2026-035", preferredUsername: "meenakshibattula" },
  { no: "036", name: "Yechuri Sarayu", email: "ragasarayu1368@gmail.com", id: "CXA-INT-2026-036", preferredUsername: "ragasarayu" },
  { no: "037", name: "A Harsha", email: "charanharsha346@gmail.com", id: "CXA-INT-2026-037", preferredUsername: "harshacharan" },
  { no: "038", name: "Kakarla Rohith", email: "kakarlarohith61@gmail.com", id: "CXA-INT-2026-038", preferredUsername: "rohithkakarla" },
];

interface LeaderData {
  title: string;
  name: string;
  email: string;
  role: string;
  orgRole: string;
  department: string;
}

const LEADERSHIP_LIST: LeaderData[] = [
  { title: "Founder", name: "CH. Arshad", email: "ashuchinthapalli3900@gmail.com", role: "OWNER", orgRole: "FOUNDER", department: "Executive" },
  { title: "Co-Founder", name: "B. Sanjay", email: "boddukurisanjay@gmail.com", role: "ADMIN", orgRole: "CO_FOUNDER", department: "Executive" },
  { title: "CEO", name: "Kishore", email: "katlakishore86@gmail.com", role: "CEO", orgRole: "CEO", department: "Executive" },
  { title: "CTO", name: "D. Amrutha", email: "amruthadivvela@gmail.com", role: "CTO", orgRole: "CTO", department: "Engineering" },
  { title: "COO", name: "Varun", email: "varunparlapalli2008@gmail.com", role: "COO", orgRole: "COO", department: "Operations" },
  { title: "HR", name: "Vyshnavi Reddy", email: "vyshnavireddy720@gmail.com", role: "HR", orgRole: "HR", department: "People & Culture" },
];

function buildInternEmailHtml(intern: InternData, tempPass: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your CodeXa Account Credentials</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #0C0C0C; border: 1px solid rgba(217, 4, 41, 0.4); border-radius: 16px; padding: 36px; box-shadow: 0 0 35px rgba(217, 4, 41, 0.15); }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; text-align: center; margin-bottom: 24px; }
    .logo span { color: #D90429; font-size: 13px; }
    .badge { display: inline-block; background: rgba(217, 4, 41, 0.15); border: 1px solid rgba(217, 4, 41, 0.4); color: #EF233C; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
    .title { font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; }
    .subtitle { font-size: 13px; color: #A5A5A5; line-height: 1.5; margin-bottom: 24px; text-align: center; }
    .card-box { background: #121212; border: 1px solid #242424; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .field-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1A1A1A; font-size: 13px; }
    .field-label { color: #888888; font-weight: 500; }
    .field-value { color: #FFFFFF; font-weight: 600; }
    .cred-box { background: #080808; border: 1px solid rgba(217, 4, 41, 0.4); border-radius: 10px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; background: #D90429; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin: 20px 0; }
    .instruction { font-size: 12px; line-height: 1.6; color: #CCCCCC; margin: 12px 0; }
    .instruction strong { color: #EF233C; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #555555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CODEXA <span>AGENCY</span></div>
    <div style="text-align: center;"><div class="badge">Official Credentials</div></div>
    <h1 class="title">Welcome to CodeXa, ${intern.name}</h1>
    <p class="subtitle">Your official Intern account has been created on the CodeXa platform.</p>

    <div class="card-box">
      <div style="margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #D90429; font-weight: 700;">Account Profile</div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #888;">Name:</td><td style="font-weight: 600; color: #fff;">${intern.name}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Role:</td><td style="font-weight: 600; color: #fff;">Intern Engineer</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Intern ID:</td><td style="font-family: monospace; font-weight: 700; color: #EF233C;">${intern.id}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Portal URL:</td><td><a href="https://codxa-agency.online/login" style="color: #EF233C; text-decoration: none;">https://codxa-agency.online/login</a></td></tr>
      </table>
    </div>

    <div class="cred-box">
      <div style="margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #EF233C; font-weight: 700;">Login Credentials</div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #888;">Login Email:</td><td style="font-family: monospace; font-weight: 600; color: #fff;">${intern.email}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Temporary Password:</td><td style="font-family: monospace; font-weight: 700; color: #EF233C;">${tempPass}</td></tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="https://codxa-agency.online/login" class="btn">Sign In To CodeXa Portal</a>
    </div>

    <div style="border-top: 1px solid #1C1C1C; padding-top: 16px; margin-top: 20px;">
      <p class="instruction">
        🔐 <strong>Mandatory Password Change:</strong> You must change your temporary password immediately upon first login. Navigate to <em>Settings &gt; Security</em> to set your permanent private password.
      </p>
      <p class="instruction">
        🌐 <strong>Google Sign-In Enabled:</strong> You can also sign in by clicking <em>"Continue with Google"</em> using this verified email address (<strong>${intern.email}</strong>). Your Google identity is bound directly to your CodeXa intern profile.
      </p>
      <p class="instruction" style="font-size: 11px; color: #777;">
        ⚠️ This is a secure operational transmission. Do not share your login credentials with anyone.
      </p>
    </div>
  </div>
  <div class="footer">&copy; 2026 CodeXa Agency. All rights reserved. &bull; Enterprise Developer Platform</div>
</body>
</html>
  `;
}

function buildLeaderEmailHtml(leader: LeaderData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CodeXa Leadership Account Verification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #0C0C0C; border: 1px solid rgba(217, 4, 41, 0.4); border-radius: 16px; padding: 36px; box-shadow: 0 0 35px rgba(217, 4, 41, 0.15); }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; text-align: center; margin-bottom: 24px; }
    .logo span { color: #D90429; font-size: 13px; }
    .badge { display: inline-block; background: rgba(217, 4, 41, 0.15); border: 1px solid rgba(217, 4, 41, 0.4); color: #EF233C; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
    .title { font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; }
    .subtitle { font-size: 13px; color: #A5A5A5; line-height: 1.5; margin-bottom: 24px; text-align: center; }
    .card-box { background: #121212; border: 1px solid #242424; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .btn { display: inline-block; background: #D90429; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin: 20px 0; }
    .instruction { font-size: 12px; line-height: 1.6; color: #CCCCCC; margin: 12px 0; }
    .instruction strong { color: #EF233C; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #555555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CODEXA <span>AGENCY</span></div>
    <div style="text-align: center;"><div class="badge">Executive Authority Verified</div></div>
    <h1 class="title">CodeXa Leadership Access: ${leader.name}</h1>
    <p class="subtitle">Your executive role and credentials have been verified on the official CodeXa platform.</p>

    <div class="card-box">
      <div style="margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #D90429; font-weight: 700;">Executive Verification</div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #888;">Name:</td><td style="font-weight: 600; color: #fff;">${leader.name}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Designation:</td><td style="font-weight: 700; color: #EF233C;">${leader.title}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Assigned Role:</td><td style="font-weight: 600; color: #fff;">${leader.orgRole}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Department:</td><td style="font-weight: 600; color: #fff;">${leader.department}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Login Email:</td><td style="font-family: monospace; font-weight: 600; color: #fff;">${leader.email}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Password Status:</td><td style="font-weight: 600; color: #10B981;">Active &amp; Secured (Preserved)</td></tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="https://codxa-agency.online/login" class="btn">Access Executive Workspace</a>
    </div>

    <div style="border-top: 1px solid #1C1C1C; padding-top: 16px; margin-top: 20px;">
      <p class="instruction">
        🌐 <strong>Google Sign-In:</strong> You can log in using <em>"Continue with Google"</em> with this verified email address (<strong>${leader.email}</strong>). Your Google identity connects directly to your executive account.
      </p>
      <p class="instruction">
        🔐 <strong>Credentials Status:</strong> Your existing private credentials remain active. If you ever need to update your password, you may do so at any time in <em>Settings &gt; Security</em>.
      </p>
    </div>
  </div>
  <div class="footer">&copy; 2026 CodeXa Agency. All rights reserved. &bull; Enterprise Developer Platform</div>
</body>
</html>
  `;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== STEP 1: PROVISIONING 38 INTERN ACCOUNTS IN DATABASE ===");
  const internPasswordHash = await bcrypt.hash(INTERN_TEMPORARY_PASSWORD, 12);
  const internResults: Array<{
    no: string;
    name: string;
    email: string;
    id: string;
    username: string;
    accountStatus: string;
    googleStatus: string;
    emailStatus: string;
  }> = [];

  // Get taken usernames
  const existingUsers = await prisma.user.findMany({ select: { username: true, email: true } });
  const takenUsernames = new Set(existingUsers.map((u) => u.username.toLowerCase()));

  for (const intern of INTERN_LIST) {
    const email = intern.email.toLowerCase().trim();

    // Check if account already exists
    let existingUser = await prisma.user.findUnique({
      where: { email },
      include: { employmentProfile: true, profile: true },
    });

    let assignedUsername = intern.preferredUsername;
    if (!existingUser) {
      // Find unique username
      let candidate = intern.preferredUsername.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      let counter = 1;
      while (takenUsernames.has(candidate)) {
        candidate = `${intern.preferredUsername}${counter}`;
        counter++;
      }
      assignedUsername = candidate;
      takenUsernames.add(assignedUsername);

      // Create User with profile and employmentProfile
      existingUser = await prisma.user.create({
        data: {
          email,
          username: assignedUsername,
          fullName: intern.name,
          role: "INTERN",
          orgRole: "INTERN",
          department: "Engineering",
          passwordHash: internPasswordHash,
          mustChangePassword: true,
          isActive: true,
          profile: {
            create: {
              displayName: intern.name,
              memberType: "CORE_TEAM",
              primaryRole: "Intern Engineer",
              headline: "Intern Engineer at CodeXa Agency",
              bio: `Intern Engineer at CodeXa Agency. Assigned ID: ${intern.id}`,
              isPublic: false,
            },
          },
          employmentProfile: {
            create: {
              employeeId: intern.id,
              employmentType: "INTERN",
              department: "Engineering",
              designation: "Intern Engineer",
              status: "ACTIVE",
              stipend: 15000,
              internshipDuration: "3 Months",
              bankAccountMasked: "XXXX XXXX 4832",
            },
          },
        },
        include: { employmentProfile: true, profile: true },
      });
      console.log(`[CREATED] ${intern.id} | ${intern.name} (${email}) -> @${assignedUsername}`);
    } else {
      console.log(`[VERIFIED EXISTING] ${intern.id} | ${intern.name} (${email})`);
    }

    internResults.push({
      no: intern.no,
      name: intern.name,
      email: intern.email,
      id: intern.id,
      username: existingUser.username,
      accountStatus: "Created & Active in DB",
      googleStatus: "Enabled (Linked by verified email)",
      emailStatus: "Pending dispatch",
    });
  }

  console.log("\n=== STEP 2: VERIFYING 6 LEADERSHIP ACCOUNTS IN DATABASE ===");
  const leaderResults: Array<{
    title: string;
    name: string;
    email: string;
    role: string;
    accountStatus: string;
    googleStatus: string;
    emailStatus: string;
  }> = [];

  for (const leader of LEADERSHIP_LIST) {
    const email = leader.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      console.error(`[ERROR] Leadership account missing: ${email}`);
      leaderResults.push({
        title: leader.title,
        name: leader.name,
        email: leader.email,
        role: leader.orgRole,
        accountStatus: "ERROR: Account missing in DB",
        googleStatus: "Pending",
        emailStatus: "Skipped",
      });
      continue;
    }

    // Update fullName and orgRole without touching password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: leader.name,
        orgRole: leader.orgRole,
        department: leader.department,
        isActive: true,
      },
    });

    console.log(`[VERIFIED LEADERSHIP] ${leader.title} | ${leader.name} (${email}) -> @${user.username} (Password Preserved)`);

    leaderResults.push({
      title: leader.title,
      name: leader.name,
      email: leader.email,
      role: leader.orgRole,
      accountStatus: "Verified & Active (Password preserved)",
      googleStatus: "Enabled (Linked by verified email)",
      emailStatus: "Pending dispatch",
    });
  }

  console.log("\n=== STEP 3: DISPATCHING CREDENTIAL EMAILS VIA OFFICIAL SYSTEM ===");
  const fromEmail = "CodeXa Agency <contact@codxa-agency.online>";

  // 1. Send intern credential emails
  for (let i = 0; i < internResults.length; i++) {
    const item = internResults[i];
    const internDef = INTERN_LIST.find((x) => x.email.toLowerCase() === item.email.toLowerCase())!;
    const html = buildInternEmailHtml(internDef, INTERN_TEMPORARY_PASSWORD);

    try {
      const sendRes = await resend.emails.send({
        from: fromEmail,
        to: item.email,
        subject: `Welcome to CodeXa — Official Credentials [${item.id}]`,
        html,
      });

      if (sendRes.data?.id) {
        item.emailStatus = `Delivered (${sendRes.data.id.slice(0, 8)}...)`;
        console.log(`[EMAIL OK ${i + 1}/38] ${item.email} -> ID: ${sendRes.data.id}`);
      } else {
        item.emailStatus = `Failed: ${sendRes.error?.message || "Unknown error"}`;
        console.error(`[EMAIL FAIL ${i + 1}/38] ${item.email} -> ${sendRes.error?.message}`);
      }
    } catch (err: any) {
      item.emailStatus = `Failed: ${err.message}`;
      console.error(`[EMAIL ERR ${i + 1}/38] ${item.email} -> ${err.message}`);
    }

    await delay(750); // Respect rate limits (10/s max)
  }

  // 2. Send leadership credential emails
  for (let i = 0; i < leaderResults.length; i++) {
    const item = leaderResults[i];
    const leaderDef = LEADERSHIP_LIST.find((x) => x.email.toLowerCase() === item.email.toLowerCase())!;
    const html = buildLeaderEmailHtml(leaderDef);

    try {
      const sendRes = await resend.emails.send({
        from: fromEmail,
        to: item.email,
        subject: `CodeXa Executive Access Verification — ${leaderDef.title}`,
        html,
      });

      if (sendRes.data?.id) {
        item.emailStatus = `Delivered (${sendRes.data.id.slice(0, 8)}...)`;
        console.log(`[LEADER EMAIL OK ${i + 1}/6] ${item.email} -> ID: ${sendRes.data.id}`);
      } else {
        item.emailStatus = `Failed: ${sendRes.error?.message || "Unknown error"}`;
        console.error(`[LEADER EMAIL FAIL ${i + 1}/6] ${item.email} -> ${sendRes.error?.message}`);
      }
    } catch (err: any) {
      item.emailStatus = `Failed: ${err.message}`;
      console.error(`[LEADER EMAIL ERR ${i + 1}/6] ${item.email} -> ${err.message}`);
    }

    await delay(750);
  }

  console.log("\n=== FINAL RECAP ===");
  console.log(`Interns Processed: ${internResults.length}`);
  console.log(`Leaders Processed: ${leaderResults.length}`);
  const totalCount = await prisma.user.count();
  console.log(`Total database users now: ${totalCount}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
