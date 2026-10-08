import fs from "fs";

const p = "G:/AntiGravity IDE/codexa app/lib/features/payments/post_payment_benefits_view.dart";
let s = fs.readFileSync(p, "utf8");
s = s.replace("import 'dart:convert';\n", "");
s = s.replace("import 'dart:io';\n", "");
fs.writeFileSync(p, s, "utf8");
console.log("Cleaned unused imports in post_payment_benefits_view.dart!");
