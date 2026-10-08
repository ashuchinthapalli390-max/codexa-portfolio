import fs from "fs";

// 1. Fix src/app/api/mobile/benefits/ai-access-requests/route.ts
const p1 = "src/app/api/mobile/benefits/ai-access-requests/route.ts";
let s1 = fs.readFileSync(p1, "utf8");
s1 = s1.replace(
  "const internId = fullUser?.employmentProfile?.internId || fullUser?.employmentProfile?.employeeId || \"CXA-INT\";",
  "const internId = fullUser?.employmentProfile?.employeeId || \"CXA-INT\";"
);
s1 = s1.replace(
  "const paymentRef = ownPayment?.referenceId || `CXA-PAY-${user.username.toUpperCase()}-450`;",
  "const paymentRef = ownPayment?.referenceId || `CXA-PAY-${(user.username || user.id.slice(-6)).toUpperCase()}-450`;"
);
fs.writeFileSync(p1, s1, "utf8");
console.log("Fixed ai-access-requests/route.ts!");

// 2. Fix src/app/api/mobile/benefits/route.ts
const p2 = "src/app/api/mobile/benefits/route.ts";
let s2 = fs.readFileSync(p2, "utf8");
s2 = s2.replace(
  "paymentReference: ownPayment?.referenceId || `CXA-PAY-${user.username.toUpperCase()}-450`,",
  "paymentReference: ownPayment?.referenceId || `CXA-PAY-${(user.username || user.id.slice(-6)).toUpperCase()}-450`,"
);
fs.writeFileSync(p2, s2, "utf8");
console.log("Fixed benefits/route.ts!");
