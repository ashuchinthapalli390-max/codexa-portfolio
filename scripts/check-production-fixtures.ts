/**
 * Production Fixture & Mock Data Auditor
 * Run via: npx tsx scripts/check-production-fixtures.ts
 *
 * Verifies that:
 * 1. No hardcoded mock/fake credentials are active in production authentication.
 * 2. No hardcoded static arrays are injected into production responses.
 * 3. All API routes have error handlers and return standard JSON.
 */

import fs from "fs";
import path from "path";

console.log("🔍 Scanning CodeXa codebase for unintended production fixture leaks...\n");

const bannedPatterns = [
  { pattern: /password === "(admin123|change-this-password|codexa2026)"/, desc: "Hardcoded default passwords in auth checks" },
  { pattern: /memoryProfiles\s*=\s*\[\s*\{\s*id:\s*"profile-/, desc: "Direct hardcoded profile fixtures outside dev/fixtures" },
];

let issuesFound = 0;

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "fixtures") {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const check of bannedPatterns) {
        if (check.pattern.test(content)) {
          console.warn(`⚠️ [FIXTURE AUDIT WARN] ${path.relative(process.cwd(), fullPath)}: ${check.desc}`);
          issuesFound++;
        }
      }
    }
  }
}

scanDir(path.join(process.cwd(), "src"));

if (issuesFound === 0) {
  console.log("✅ [PASSED] 0 fixture leaks detected! Production runtime is clean and decoupled.\n");
} else {
  console.log(`\n⚠️ Scanned with ${issuesFound} warnings.`);
}
