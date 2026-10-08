import fs from "fs";

const targetPath = "G:/AntiGravity IDE/codexa app/lib/main.dart";
let content = fs.readFileSync(targetPath, "utf8");

if (!content.includes("core/config/app_gate.dart")) {
  content = `import 'core/config/app_gate.dart';\n` + content;
}

if (!content.includes("builder: (context, child) => AppGate")) {
  content = content.replace(
    "routerConfig: appRouter,",
    "routerConfig: appRouter,\n      builder: (context, child) => AppGate(child: child ?? const SizedBox.shrink()),"
  );
}

fs.writeFileSync(targetPath, content, "utf8");
console.log("Updated main.dart with AppGate builder");
