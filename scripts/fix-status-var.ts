import fs from "fs";

// Fix messages_screen.dart
const messagesPath = "G:/AntiGravity IDE/codexa app/lib/features/messages/messages_screen.dart";
let messages = fs.readFileSync(messagesPath, "utf8");

messages = messages.replace(
  "  Widget _buildStatusIndicator(Map<String, dynamic> msg, bool isMe, int index) {\n    if (!isMe || index != 0) return const SizedBox.shrink();\n\n        if (status == 'Sending') {",
  "  Widget _buildStatusIndicator(Map<String, dynamic> msg, bool isMe, int index) {\n    if (!isMe || index != 0) return const SizedBox.shrink();\n    final status = msg['status'] ?? 'Sent';\n\n    if (status == 'Sending') {"
);

// Remove the unused status in itemBuilder
messages = messages.replace(
  "                          final body = msg['message'] ?? '';\n                          final status = msg['status'] ?? 'Sent';",
  "                          final body = msg['message'] ?? '';"
);

fs.writeFileSync(messagesPath, messages, "utf8");
console.log("Fixed status in messages_screen.dart!");

// Fix assignments_screen.dart
const asgPath = "G:/AntiGravity IDE/codexa app/lib/features/assignments/assignments_screen.dart";
let asg = fs.readFileSync(asgPath, "utf8");
asg = asg.replace(
  "                                ref.invalidate(assignmentsProvider);\n                                Navigator.pop(ctx);",
  "                                ref.invalidate(assignmentsProvider);\n                                if (!mounted) return;\n                                Navigator.of(ctx).pop();"
);
fs.writeFileSync(asgPath, asg, "utf8");
console.log("Fixed assignments_screen.dart async pop!");
