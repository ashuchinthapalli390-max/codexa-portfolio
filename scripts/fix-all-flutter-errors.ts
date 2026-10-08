import fs from "fs";

// 1. Fix stories_tray.dart
const storiesTrayPath = "G:/AntiGravity IDE/codexa app/lib/features/stories/stories_tray.dart";
let storiesTray = fs.readFileSync(storiesTrayPath, "utf8");
storiesTray = storiesTray.replace(/user\?\.mediaUrl/g, "user?.profileMediaUrl");
storiesTray = storiesTray.replace(/user!\.mediaUrl!/g, "user!.profileMediaUrl!");
storiesTray = storiesTray.replace(/user\?\.displayName/g, "user?.fullName");
storiesTray = storiesTray.replace(/user!\.displayName/g, "user!.fullName");
storiesTray = storiesTray.replace(/user\.displayName/g, "(user.fullName.isNotEmpty ? user.fullName : user.username)");
fs.writeFileSync(storiesTrayPath, storiesTray, "utf8");
console.log("Fixed stories_tray.dart user properties!");

// 2. Fix coworker_profile_screen.dart duplicate _buildRow
const coworkerPath = "G:/AntiGravity IDE/codexa app/lib/features/profile/coworker_profile_screen.dart";
let coworker = fs.readFileSync(coworkerPath, "utf8");
const duplicateRowIdx = coworker.lastIndexOf("  Widget _buildRow(String label, String value) {");
if (duplicateRowIdx !== -1) {
  const firstRowIdx = coworker.indexOf("  Widget _buildRow(String label, String value) {");
  if (duplicateRowIdx !== firstRowIdx) {
    // Remove the second copy
    const afterSecond = coworker.indexOf("  }", duplicateRowIdx) + 4;
    coworker = coworker.substring(0, duplicateRowIdx) + coworker.substring(afterSecond);
    fs.writeFileSync(coworkerPath, coworker, "utf8");
    console.log("Removed duplicate _buildRow in coworker_profile_screen.dart!");
  }
}

// 3. Fix messages_screen.dart CoworkerProfileScreen call and unused status
const messagesPath = "G:/AntiGravity IDE/codexa app/lib/features/messages/messages_screen.dart";
let messages = fs.readFileSync(messagesPath, "utf8");
messages = messages.replace(
  "CoworkerProfileScreen(coworker: Map<String, dynamic>.from(recipient))",
  "CoworkerProfileScreen(username: (recipient['username'] ?? '').toString())"
);
// In case _markConversationRead was defined inside ChatConversationScreen or outside:
// Check where _loadMessages calls _markConversationRead:
if (!messages.includes("_markConversationRead(convId, list.first['id'])")) {
  messages = messages.replace(
    "_messages.addAll(list);\n          });",
    "_messages.addAll(list);\n          });\n          if (list.isNotEmpty) {\n            _markConversationRead(convId, list.first['id']);\n          }"
  );
}
fs.writeFileSync(messagesPath, messages, "utf8");
console.log("Fixed messages_screen.dart CoworkerProfileScreen call and markConversationRead!");

// 4. Fix attendance_screen.dart: wire _buildScheduledClassesSection into participant view and remove unused import
const attPath = "G:/AntiGravity IDE/codexa app/lib/features/attendance/attendance_screen.dart";
let att = fs.readFileSync(attPath, "utf8");
att = att.replace("import '../assignments/assignments_screen.dart';\nimport '../assignments/assignments_screen.dart';", "import '../assignments/assignments_screen.dart';");

// Find where history is mapped in participant view
const targetHistoryEnd = "color: h['status'] == 'PRESENT' ? Colors.greenAccent : Colors.orangeAccent,\n                        ),\n                      ),\n                    ),\n                  ],\n                ),\n              )),\n          ],";

if (att.includes(targetHistoryEnd)) {
  const insertion = `${targetHistoryEnd}

          const SizedBox(height: 24),

          // --- QUICK LINK TO ASSIGNMENTS ---
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: CxColors.cardElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: CxColors.borderSubtle),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: CxColors.brightRed.withAlpha(30),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.assignment_turned_in_outlined, color: CxColors.brightRed, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PROJECT ASSIGNMENTS',
                        style: GoogleFonts.orbitron(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'Submit text & code repo assignments',
                        style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AssignmentsScreen()),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: CxColors.brightRed,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                  child: Text(
                    'VIEW',
                    style: GoogleFonts.orbitron(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),

          // --- SCHEDULED CLASSES SECTION ---
          _buildScheduledClassesSection(),`;

  att = att.replace(targetHistoryEnd, insertion);
  fs.writeFileSync(attPath, att, "utf8");
  console.log("Wired Scheduled Classes and Assignments into attendance_screen.dart participant view!");
}

// 5. Fix class_details_screen.dart and assignments_screen.dart lints
const classDetailsPath = "G:/AntiGravity IDE/codexa app/lib/features/classes/class_details_screen.dart";
let classDetails = fs.readFileSync(classDetailsPath, "utf8");
classDetails = classDetails.replace("import '../../core/api/api_client.dart';\n", "");
classDetails = classDetails.replace("final date = widget.classData['class_date'] ?? '';\n", "");
classDetails = classDetails.replace("bool _isSubmittingQuestion = false;\n", "");
fs.writeFileSync(classDetailsPath, classDetails, "utf8");
console.log("Fixed class_details_screen.dart lints!");

const asgPath = "G:/AntiGravity IDE/codexa app/lib/features/assignments/assignments_screen.dart";
let asg = fs.readFileSync(asgPath, "utf8");
asg = asg.replace("String _filter = 'ALL';\n", "");
asg = asg.replace(
  "if (context.mounted) {\n                                  Navigator.pop(ctx);",
  "if (mounted) {\n                                  Navigator.pop(ctx);"
);
asg = asg.replace(
  "if (context.mounted) {\n                                ScaffoldMessenger.of(context).showSnackBar(",
  "if (mounted) {\n                                ScaffoldMessenger.of(context).showSnackBar("
);
fs.writeFileSync(asgPath, asg, "utf8");
console.log("Fixed assignments_screen.dart lints!");

const composerPath = "G:/AntiGravity IDE/codexa app/lib/features/stories/story_composer_screen.dart";
let composer = fs.readFileSync(composerPath, "utf8");
composer = composer.replace("import 'dart:convert';\n", "");
fs.writeFileSync(composerPath, composer, "utf8");
console.log("Fixed story_composer_screen.dart lints!");
