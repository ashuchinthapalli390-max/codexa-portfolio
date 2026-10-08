import fs from "fs";

// 1. Fix src/app/api/mobile/assignments/[id]/feedback/route.ts
const feedbackPath = "src/app/api/mobile/assignments/[id]/feedback/route.ts";
let feedback = fs.readFileSync(feedbackPath, "utf8");
feedback = feedback.replace("user.fullName || user.username", "user.displayName || user.username || 'Mentor'");
fs.writeFileSync(feedbackPath, feedback, "utf8");
console.log("Fixed feedback/route.ts");

// 2. Fix src/app/api/mobile/assignments/[id]/submit/route.ts
const submitPath = "src/app/api/mobile/assignments/[id]/submit/route.ts";
let submit = fs.readFileSync(submitPath, "utf8");
submit = submit.replace(
  "select: { internId: true, employeeId: true },",
  "select: { employeeId: true },"
);
submit = submit.replace(
  "const officialId = empProfile?.internId || empProfile?.employeeId || null;",
  "const officialId = empProfile?.employeeId || null;"
);
submit = submit.replace("user.fullName || user.username", "user.displayName || user.username || 'Student'");
fs.writeFileSync(submitPath, submit, "utf8");
console.log("Fixed submit/route.ts");

// 3. Fix src/app/api/mobile/assignments/route.ts
const asgPath = "src/app/api/mobile/assignments/route.ts";
let asg = fs.readFileSync(asgPath, "utf8");
asg = asg.replace("user.fullName || user.username", "user.displayName || user.username || 'Lead'");
fs.writeFileSync(asgPath, asg, "utf8");
console.log("Fixed assignments/route.ts");

// 4. Fix src/app/api/mobile/classes/route.ts
const classesPath = "src/app/api/mobile/classes/route.ts";
let classes = fs.readFileSync(classesPath, "utf8");
classes = classes.replace("user.fullName || user.username", "user.displayName || user.username || 'Instructor'");
fs.writeFileSync(classesPath, classes, "utf8");
console.log("Fixed classes/route.ts");

// 5. Fix src/app/api/mobile/stories/route.ts
const storiesPath = "src/app/api/mobile/stories/route.ts";
let stories = fs.readFileSync(storiesPath, "utf8");
if (!stories.includes('import fs from "fs";')) {
  stories = 'import fs from "fs";\n' + stories;
}
// Fix /s regex flag
stories = stories.replace(
  'const tagMatch = post.content.match(/^\\[CODEXA_STORY:([^:]+):([^\\]]+)\\]\\n?(.*)$/s);',
  `const tagMatch = post.content.match(/^\\[CODEXA_STORY:([^:]+):([^\\]]+)\\]\\n?([\\s\\S]*)$/);`
);
fs.writeFileSync(storiesPath, stories, "utf8");
console.log("Fixed stories/route.ts");
