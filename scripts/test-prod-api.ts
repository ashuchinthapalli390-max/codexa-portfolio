import dotenv from 'dotenv';
dotenv.config();

async function testProductionEndpoints() {
  const baseUrl = "https://codxa-agency.online";

  console.log("=== TEST 1: GET /api/mobile/health ===");
  const healthRes = await fetch(`${baseUrl}/api/mobile/health`);
  console.log("Health Status:", healthRes.status);
  const healthJson = await healthRes.json();
  console.log("Health JSON:", JSON.stringify(healthJson, null, 2));

  console.log("\n=== TEST 2: POST /api/mobile/auth/login (Wrong Password) ===");
  const wrongLoginRes = await fetch(`${baseUrl}/api/mobile/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "ashu",
      password: "completelywrongpassword",
    }),
  });
  console.log("Wrong Login Status:", wrongLoginRes.status);
  const wrongLoginJson = await wrongLoginRes.json();
  console.log("Wrong Login Response:", JSON.stringify(wrongLoginJson, null, 2));

  console.log("\n=== TEST 3: POST /api/mobile/auth/login (Valid Credentials via Username) ===");
  const validLoginRes = await fetch(`${baseUrl}/api/mobile/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "ashu",
      password: process.env.OWNER_PASSWORD || "CxA!AshuFounder2026",
    }),
  });
  console.log("Username Login Status:", validLoginRes.status);
  const validLoginJson = await validLoginRes.json() as any;
  console.log("Username Login ok:", validLoginJson.ok);

  console.log("\n=== TEST 3B: POST /api/mobile/auth/login (Valid Credentials via Email) ===");
  const emailLoginRes = await fetch(`${baseUrl}/api/mobile/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "ashuchinthapalli3900@gmail.com",
      password: process.env.OWNER_PASSWORD || "CxA!AshuFounder2026",
    }),
  });
  console.log("Email Login Status:", emailLoginRes.status);
  const emailLoginJson = await emailLoginRes.json() as any;
  console.log("Email Login ok:", emailLoginJson.ok);
  if (validLoginJson.ok) {
    console.log("User:", validLoginJson.user.username, validLoginJson.user.email, validLoginJson.user.role);
    console.log("Access Token present:", !!validLoginJson.accessToken);
    console.log("Refresh Token present:", !!validLoginJson.refreshToken);

    const sessionToken = validLoginJson.accessToken;

    console.log("\n=== TEST 4: POST /api/mobile/auth/refresh ===");
    const refreshRes = await fetch(`${baseUrl}/api/mobile/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        token: sessionToken,
      }),
    });
    console.log("Refresh Status:", refreshRes.status);
    const refreshJson = await refreshRes.json() as any;
    console.log("Refresh ok:", refreshJson.ok);
    const currentToken = refreshJson.accessToken || sessionToken;

    console.log("\n=== TEST 5: GET /api/mobile/bootstrap ===");
    const bootstrapRes = await fetch(`${baseUrl}/api/mobile/bootstrap`, {
      headers: {
        "Authorization": `Bearer ${currentToken}`,
      },
    });
    console.log("Bootstrap Status:", bootstrapRes.status);
    const bootstrapJson = await bootstrapRes.json() as any;
    console.log("Bootstrap ok:", bootstrapJson.ok);
    console.log("Bootstrap user:", bootstrapJson.user?.username);
    console.log("Bootstrap role:", bootstrapJson.role);
    console.log("Bootstrap attendance:", !!bootstrapJson.attendance);
    console.log("Bootstrap activeProjects:", bootstrapJson.activeProjects?.length);
    console.log("Bootstrap unreadCount:", bootstrapJson.unreadCount);
  } else {
    console.error("Valid login failed:", validLoginJson);
  }
}

testProductionEndpoints().catch(console.error);
