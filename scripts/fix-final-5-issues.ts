import fs from "fs";

// 1. Fix stories_tray.dart Image.network(user.mediaUrl!)
const storiesTrayPath = "G:/AntiGravity IDE/codexa app/lib/features/stories/stories_tray.dart";
let storiesTray = fs.readFileSync(storiesTrayPath, "utf8");
storiesTray = storiesTray.replace("user.mediaUrl!", "user.profileMediaUrl!");
fs.writeFileSync(storiesTrayPath, storiesTray, "utf8");
console.log("Fixed stories_tray.dart Image.network!");

// 2. Fix messages_screen.dart call _markConversationRead in _loadMessages & remove unused status
const messagesPath = "G:/AntiGravity IDE/codexa app/lib/features/messages/messages_screen.dart";
let messages = fs.readFileSync(messagesPath, "utf8");
const loadMessagesTarget = `        setState(() {
          _messages.clear();
          _messages.addAll(msgs);
        });`;

const loadMessagesReplacement = `        setState(() {
          _messages.clear();
          _messages.addAll(msgs);
        });
        if (msgs.isNotEmpty) {
          _markConversationRead(convId, msgs.first['id']);
        }`;

messages = messages.replace(loadMessagesTarget, loadMessagesReplacement);
messages = messages.replace("final status = msg['status'] ?? 'Sent';\n", "");
fs.writeFileSync(messagesPath, messages, "utf8");
console.log("Fixed messages_screen.dart _markConversationRead and status!");

// 3. Fix story_composer_screen.dart const Icon
const composerPath = "G:/AntiGravity IDE/codexa app/lib/features/stories/story_composer_screen.dart";
let composer = fs.readFileSync(composerPath, "utf8");
composer = composer.replace(
  "Icon(Icons.public, size: 16, color: CxColors.textSecondary)",
  "const Icon(Icons.public, size: 16, color: CxColors.textSecondary)"
);
fs.writeFileSync(composerPath, composer, "utf8");
console.log("Fixed story_composer_screen.dart const Icon!");

// 4. Fix assignments_screen.dart mounted context
const asgPath = "G:/AntiGravity IDE/codexa app/lib/features/assignments/assignments_screen.dart";
let asg = fs.readFileSync(asgPath, "utf8");
const oldSubmitResult = `                              if (res.data != null && res.data['ok'] == true) {
                                ref.invalidate(assignmentsProvider);
                                if (mounted) {
                                  Navigator.pop(ctx);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Assignment submitted successfully!'),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                }
                              } else {
                                throw Exception(res.data?['error']?['message'] ?? 'Failed');
                              }
                            } catch (e) {
                              setModalState(() => isSubmitting = false);
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Submission failed: \${e.toString()}'),
                                    backgroundColor: CxColors.brightRed,
                                  ),
                                );
                              }
                            }`;

const newSubmitResult = `                              if (res.data != null && res.data['ok'] == true) {
                                ref.invalidate(assignmentsProvider);
                                Navigator.pop(ctx);
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Assignment submitted successfully!'),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                }
                              } else {
                                throw Exception(res.data?['error']?['message'] ?? 'Failed');
                              }
                            } catch (e) {
                              setModalState(() => isSubmitting = false);
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Submission failed: \${e.toString()}'),
                                    backgroundColor: CxColors.brightRed,
                                  ),
                                );
                              }
                            }`;

asg = asg.replace(oldSubmitResult, newSubmitResult);
fs.writeFileSync(asgPath, asg, "utf8");
console.log("Fixed assignments_screen.dart context mounted!");
