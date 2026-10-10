# CodeXa Store & Showcase API Contract

**Endpoint:** `GET /api/mobile/store/catalog`  
**Distribution:** Public / Server Authoritative  
**Target Consumers:**  
1. CodeXa Official Website (`https://codxa-agency.online/mobile`)  
2. CodeXa Flutter Android Application (Built-in CodeXa Store Screen)  

---

## 1. Overview & Architecture

The `/api/mobile/store/catalog` endpoint is the single authoritative source of truth for:
- Official Application Identity & Exclusivity Policy
- The latest published Android APK release metadata, checksums, and download endpoints
- Curated, high-resolution mobile application screenshots from `public/appstore/`
- Full HD 1080p demonstration video with poster thumbnail for direct streaming
- Core feature catalog, 4-step installation instructions, and FAQ troubleshooting

> **Important:** The CodeXa Store is a screen inside the existing CodeXa Mobile application (`com.codexa.app`). It is distributed **exclusively** through the official CodeXa Agency website (`https://codxa-agency.online`).

---

## 2. Request Specification

- **Method:** `GET`
- **URL:** `https://codxa-agency.online/api/mobile/store/catalog`
- **Query Parameters (Optional):** None required
- **Headers:**
  - `Accept: application/json`
  - `x-app-version`: (Optional client app version string, e.g. `1.0.5`)
  - `x-device-id`: (Optional client tracking identifier)

---

## 3. Real Production Response Schema

```json
{
  "ok": true,
  "application": {
    "name": "CodeXa Mobile",
    "tagline": "Official CodeXa Agency Workspace",
    "badgeText": "Available Exclusively on Our Official Website",
    "platform": "android",
    "packageName": "com.codexa.app",
    "developer": "CodeXa Agency",
    "distribution": "official_website",
    "officialWebsiteUrl": "https://codxa-agency.online",
    "compatibility": "Android 8.0 (Oreo) or later • SDK 26+",
    "supportEmail": "contact@codxa-agency.online",
    "supportPhone": "+91 7075920852",
    "shortDescription": "Your complete CodeXa workspace, connected wherever you go. Attendance, Classes, Projects, Assignments, Communication. Everything in one place.",
    "fullDescription": "CodeXa Mobile delivers the complete enterprise agency workspace to your pocket..."
  },
  "release": {
    "id": "cmv2olwwf0000vnhel4g9qf7b",
    "appId": "codexa-mobile",
    "platform": "ANDROID",
    "packageName": "com.codexa.app",
    "versionName": "1.0.5",
    "versionCode": 105,
    "releaseChannel": "STABLE",
    "storageProvider": "LOCAL",
    "storageBucket": "mobile-releases",
    "storageKey": "codexa-apk/stable/1.0.5/CodeXa.apk",
    "apkDownloadUrl": "https://codxa-agency.online/downloads/CodeXa.apk",
    "apkFileSize": 865409956,
    "apkSha256": "fc7a5dc832d1300c73db2d6321d43278b311f145f710a71c6ea5fa29d98f0ef1",
    "signingCertificateFingerprint": null,
    "releaseNotes": "Official CodeXa Mobile Production Release — Built-in CodeXa Store, Live Classes, Attendance, Projects & Assignments, Team Chat & Media Sync.",
    "status": "PUBLISHED",
    "updateType": "OPTIONAL",
    "minimumSupportedVersionCode": 100,
    "isCurrentPublished": true,
    "publishedAt": "2026-10-10T17:42:08.075Z"
  },
  "catalog": {
    "revision": 106,
    "updatedAt": "2026-10-10T03:17:21.236Z",
    "screenshots": [
      {
        "id": "cmv1to57s0000112f74s2whjo",
        "title": "Welcome & Secure Authentication",
        "caption": "Secure entry to your official CodeXa workspace with authorized Core account credentials.",
        "altText": "CodeXa Mobile — Welcome & Secure Authentication",
        "url": "https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/screenshots/screenshot-1.png",
        "thumbnailUrl": "https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/screenshots/screenshot-1.png",
        "displayOrder": 1,
        "featureCategory": "Welcome & Auth",
        "isCover": true,
        "fileSize": 1973517,
        "width": 941,
        "height": 1672
      },
      {
        "id": "cmv1to7j20001112f230w1y4g",
        "title": "Unified Agency Dashboard",
        "caption": "Real-time command center displaying daily schedule, urgent tasks, and operational updates.",
        "altText": "CodeXa Mobile — Unified Agency Dashboard",
        "url": "https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/screenshots/screenshot-2.png",
        "thumbnailUrl": "https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/screenshots/screenshot-2.png",
        "displayOrder": 2,
        "featureCategory": "Dashboard",
        "isCover": false,
        "fileSize": 1968768,
        "width": 941,
        "height": 1672
      }
    ],
    "videos": [
      {
        "id": "cmv1tpsl9000a112fw29f7bj5",
        "title": "CodeXa Mobile — Official App Walkthrough",
        "description": "Official CodeXa Mobile application walkthrough — exploring Dashboard, Attendance, Classes, Projects, Assignments, and Communications.",
        "url": "https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/videos/codexa-demo-1080p.mp4",
        "thumbnailUrl": "https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/videos/codexa-demo-poster.jpg",
        "durationSeconds": 30.02,
        "displayOrder": 1,
        "isFeatured": true,
        "mimeType": "video/mp4",
        "width": 1080,
        "height": 1920,
        "fileSize": 31945664
      }
    ],
    "features": [
      {
        "id": "feat_attendance",
        "title": "Smart Attendance",
        "description": "Clock in securely with role-based active window verification and live attendance calendar.",
        "icon": "Clock",
        "status": "Production Ready",
        "category": "Operations"
      }
    ],
    "installationSteps": [
      {
        "stepNumber": 1,
        "title": "Download Official APK",
        "description": "Click the 'Download Official APK' button above to save the latest verified CodeXa.apk binary to your Android device.",
        "tip": "Only download CodeXa Mobile from codxa-agency.online."
      }
    ],
    "troubleshooting": [
      {
        "q": "Why is CodeXa Mobile not on the Google Play Store?",
        "a": "CodeXa Mobile is an exclusive, internal agency application built specifically for CodeXa Agency team members and enrolled interns. Distributed exclusively via our official website to guarantee rapid updates and zero telemetry.",
        "category": "Distribution"
      }
    ]
  }
}
```

---

## 4. Flutter Integration Guide

### A. Fetching the Catalog
```dart
import 'package:dio/dio.dart';

class CodeXaStoreRepository {
  final Dio dio;
  CodeXaStoreRepository(this.dio);

  Future<Map<String, dynamic>> fetchStoreCatalog() async {
    final response = await dio.get('https://codxa-agency.online/api/mobile/store/catalog');
    if (response.statusCode == 200 && response.data['ok'] == true) {
      return response.data;
    }
    throw Exception('Failed to load CodeXa Store catalog');
  }
}
```

### B. Displaying Screenshots in Carousel
- Render screenshots using `Image.network(screenshot['url'])` inside a horizontal `ListView.builder` or `PageView`.
- All screenshots are portrait (`941x1672` pixels, aspect ratio `~9:16`).
- Tapping on any item opens the full-screen interactive viewer.

### C. Streaming the 1080p Video
- The demo video is encoded in H.264 video with AAC stereo audio at `1080x1920` (portrait).
- Direct playback URL: `https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/videos/codexa-demo-1080p.mp4`
- Poster thumbnail URL: `https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/showcase/videos/codexa-demo-poster.jpg`
- Use the standard `video_player` package:
```dart
final controller = VideoPlayerController.networkUrl(
  Uri.parse(video['url']),
);
await controller.initialize();
controller.play();
```

### D. In-App Updates & Version Comparison
Compare integer Android version codes:
```dart
final installedVersionCode = packageInfo.buildNumber; // e.g. "100"
final latestVersionCode = release['versionCode'];    // 105

if (int.parse(installedVersionCode) < latestVersionCode) {
  // Show "Update Available" or "Update Required" (if updateType == "MANDATORY")
  final downloadUrl = release['apkDownloadUrl'];
}
```
