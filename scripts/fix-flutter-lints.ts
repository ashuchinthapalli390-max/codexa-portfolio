import fs from "fs";

// 1. app_gate.dart
const appGatePath = "G:/AntiGravity IDE/codexa app/lib/core/config/app_gate.dart";
let appGate = fs.readFileSync(appGatePath, "utf8");
appGate = appGate.replace(
  "expectedEndAt: configState.config?.maintenanceExpectedEndAt,",
  "expectedEndAt: configState.config?.maintenanceExpectedEndAt?.toIso8601String(),"
);
fs.writeFileSync(appGatePath, appGate, "utf8");
console.log("Fixed app_gate.dart");

// 2. force_update_screen.dart
const forceUpdatePath = "G:/AntiGravity IDE/codexa app/lib/core/config/force_update_screen.dart";
let forceUpdate = fs.readFileSync(forceUpdatePath, "utf8");
forceUpdate = forceUpdate.replace(/text:\s*('UPDATE CODEXA'|'UPDATE')/g, "label: $1");
fs.writeFileSync(forceUpdatePath, forceUpdate, "utf8");
console.log("Fixed force_update_screen.dart");

// 3. maintenance_screen.dart
const maintenancePath = "G:/AntiGravity IDE/codexa app/lib/core/config/maintenance_screen.dart";
let maintenance = fs.readFileSync(maintenancePath, "utf8");
maintenance = maintenance.replace(/text:\s*('TRY AGAIN'|'RETRY')/g, "label: $1");
fs.writeFileSync(maintenancePath, maintenance, "utf8");
console.log("Fixed maintenance_screen.dart");

// 4. mobile_config_provider.dart
const mobConfigPath = "G:/AntiGravity IDE/codexa app/lib/core/config/mobile_config_provider.dart";
let mobConfig = fs.readFileSync(mobConfigPath, "utf8");
mobConfig = mobConfig.replace("import 'package:flutter/material.dart';\n", "");
fs.writeFileSync(mobConfigPath, mobConfig, "utf8");
console.log("Fixed mobile_config_provider.dart");

// 5. attendance_screen.dart
const attPath = "G:/AntiGravity IDE/codexa app/lib/features/attendance/attendance_screen.dart";
let att = fs.readFileSync(attPath, "utf8");
att = att.replace("import '../../core/models/models.dart';\n", "");
att = att.replace(/CxButton\(\s*text:/g, "CxButton(label:");
att = att.replace(/text:\s*('OPEN ATTENDANCE'|'CLOSE ATTENDANCE'|'MARK ATTENDANCE'|'MARK PRESENT'|'RETRY')/g, "label: $1");
fs.writeFileSync(attPath, att, "utf8");
console.log("Fixed attendance_screen.dart");

// 6. notes_row.dart
const notesRowPath = "G:/AntiGravity IDE/codexa app/lib/features/messages/notes_row.dart";
let notesRow = fs.readFileSync(notesRowPath, "utf8");
notesRow = notesRow.replace(/size:\s*36,/g, "radius: 18,");
notesRow = notesRow.replace(/size:\s*52,/g, "radius: 26,");
fs.writeFileSync(notesRowPath, notesRow, "utf8");
console.log("Fixed notes_row.dart");

// 7. messages_screen.dart
const msgScreenPath = "G:/AntiGravity IDE/codexa app/lib/features/messages/messages_screen.dart";
let msgScreen = fs.readFileSync(msgScreenPath, "utf8");
msgScreen = msgScreen.replace(/size:\s*40,/g, "radius: 20,");
msgScreen = msgScreen.replace(/size:\s*46,/g, "radius: 23,");
fs.writeFileSync(msgScreenPath, msgScreen, "utf8");
console.log("Fixed messages_screen.dart");

// 8. profile_screen.dart
const profilePath = "G:/AntiGravity IDE/codexa app/lib/features/profile/profile_screen.dart";
let profile = fs.readFileSync(profilePath, "utf8");
profile = profile.replace(/size:\s*88,/g, "radius: 44,");
fs.writeFileSync(profilePath, profile, "utf8");
console.log("Fixed profile_screen.dart");

console.log("All lint fixes applied!");
