import fs from "fs";

// 1. attendance_screen.dart
const attPath = "G:/AntiGravity IDE/codexa app/lib/features/attendance/attendance_screen.dart";
let att = fs.readFileSync(attPath, "utf8");
att = att.replace(
  /ScaffoldMessenger\.of\(context\)\.showSnackBar/g,
  "if (mounted) ScaffoldMessenger.of(context).showSnackBar"
);
fs.writeFileSync(attPath, att, "utf8");
console.log("Fixed context warnings in attendance_screen.dart");

// 2. messages_screen.dart
const msgPath = "G:/AntiGravity IDE/codexa app/lib/features/messages/messages_screen.dart";
let msg = fs.readFileSync(msgPath, "utf8");
msg = msg.replace(
  "if (mounted) {\n                            ScaffoldMessenger.of(context).showSnackBar(",
  "if (ctx.mounted) {\n                            ScaffoldMessenger.of(ctx).showSnackBar("
);
fs.writeFileSync(msgPath, msg, "utf8");
console.log("Fixed context warning in messages_screen.dart");
