import fs from "fs";

// Fix unescaped template string interpolations in create-flutter-benefits-view.ts
let script = fs.readFileSync("scripts/create-flutter-benefits-view.ts", "utf8");
script = script.replace(
  "'Submitted Portrait (Revision ${latestSub['version'] ?? 1})'",
  "'Submitted Portrait (Revision \\\${latestSub[\"version\"] ?? 1})'"
);
script = script.replace(
  "Submitted: ${latestSub['submittedAt']",
  "Submitted: \\\${latestSub[\"submittedAt\"]"
);
script = script.replace(
  "Reason: ${latestSub['rejectionReason']",
  "Reason: \\\${latestSub[\"rejectionReason\"]"
);
fs.writeFileSync("scripts/create-flutter-benefits-view.ts", script, "utf8");
console.log("Fixed create-flutter-benefits-view.ts escapes!");
