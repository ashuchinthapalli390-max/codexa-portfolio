import fs from "fs";

const p = "G:/AntiGravity IDE/codexa app/lib/features/stories/stories_tray.dart";
let s = fs.readFileSync(p, "utf8");
s = s.replace("StoryViewerScreen(storyGroup: story)", "StoryViewerScreen(group: StoryGroupModel.fromJson(story))");
if (!s.includes("import '../../core/models/models.dart';")) {
  s = s.replace("import 'story_viewer_screen.dart';", "import '../../core/models/models.dart';\nimport 'story_viewer_screen.dart';");
}
fs.writeFileSync(p, s, "utf8");
console.log("Fixed stories_tray StoryViewerScreen call!");
