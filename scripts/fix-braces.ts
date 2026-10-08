import fs from "fs";

const attPath = "G:/AntiGravity IDE/codexa app/lib/features/attendance/attendance_screen.dart";
let att = fs.readFileSync(attPath, "utf8");

att = att.replace(
  /if \(mounted\) ScaffoldMessenger\.of\(context\)\.showSnackBar\(([^;]+)\);/g,
  "if (mounted) {\n          ScaffoldMessenger.of(context).showSnackBar($1);\n        }"
);

fs.writeFileSync(attPath, att, "utf8");
console.log("Wrapped single line ifs with braces in attendance_screen.dart");
