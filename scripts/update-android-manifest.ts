import fs from "fs";

const p = "G:/AntiGravity IDE/codexa app/android/app/src/main/AndroidManifest.xml";
let s = fs.readFileSync(p, "utf8");

if (!s.includes("android.permission.CAMERA")) {
  const target = '<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>';
  const additions = `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29"/>`;

  s = s.replace(target, additions);
  fs.writeFileSync(p, s, "utf8");
  console.log("Updated AndroidManifest.xml with camera and media permissions!");
} else {
  console.log("AndroidManifest.xml already has CAMERA permission.");
}
