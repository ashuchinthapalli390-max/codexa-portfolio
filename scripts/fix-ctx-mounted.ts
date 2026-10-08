import fs from "fs";

const asgPath = "G:/AntiGravity IDE/codexa app/lib/features/assignments/assignments_screen.dart";
let asg = fs.readFileSync(asgPath, "utf8");
asg = asg.replace(
  "                                if (!mounted) return;\n                                Navigator.of(ctx).pop();\n                                if (mounted) {",
  "                                if (ctx.mounted) {\n                                  Navigator.of(ctx).pop();\n                                }\n                                if (mounted) {"
);
fs.writeFileSync(asgPath, asg, "utf8");
console.log("Fixed ctx.mounted in assignments_screen.dart!");
