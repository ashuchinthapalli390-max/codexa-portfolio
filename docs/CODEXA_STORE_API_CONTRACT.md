# CodeXa Store & Showcase API Contract

**Endpoint:** `GET /api/mobile/store/catalog`  
**Alias:** `GET /api/mobile/showcase`  
**Distribution:** Public / Stale-While-Revalidate Caching  
**Target Consumers:** CodeXa Official Website (`/mobile`) and CodeXa Flutter Android App (in-app CodeXa Store screen)

---

## 1. Overview

The `/api/mobile/store/catalog` endpoint is the single authoritative source of truth for all public application metadata, active APK release specifications, screenshots, demonstration videos, feature definitions, and installation guidance.

Both the web front-end and the Flutter mobile client consume this contract.

---

## 2. Request Specification

- **Method:** `GET`
- **URL:** `https://codxa-agency.online/api/mobile/store/catalog`
- **Query Parameters (Optional):**
  - `channel`: `stable` (default)
  - `platform`: `android` (default)
- **Headers:**
  - `Accept: application/json`
  - `x-app-version-code`: (Optional integer sent by Flutter app for telemetry)
  - `x-device-id`: (Optional client tracking header)

---

## 3. Response Specification (JSON)

### HTTP 200 OK
```json
{
  "ok": true,
  "application": {
    "name": "CodeXa Mobile",
    "packageName": "online.codxa_agency.app",
    "platform": "android",
    "developer": "CodeXa Agency",
    "distributionPolicy": "OFFICIAL_WEBSITE_EXCLUSIVE",
    "officialDomain": "https://codxa-agency.online"
  },
  "release": {
    "id": "rel_cly8f9a2b001",
    "versionName": "1.0.5",
    "versionCode": 105,
    "channel": "stable",
    "fileSizeBytes": 80004912,
    "fileSizeFormatted": "76.3 MB",
    "sha256": "8f3b2c1d0e5a9f7e4a1c6b8d2e0f3a5c7b9d1e3f5a7c9b1d3e5f7a9c1b3d5e7f",
    "minimumSupportedVersionCode": 103,
    "updatePolicy": "OPTIONAL",
    "releaseNotes": "• Enhanced attendance geo-windowing accuracy.\n• Real-time WebSocket stability enhancements in team chat.\n• Added 1080p demo walkthrough integration into CodeXa Store.\n• Fixed profile picture crop upload on Android 14.\n• Performance optimizations for Daily Topics module.",
    "publishedAt": "2026-10-10T08:00:00.000Z",
    "downloadUrl": "https://codxa-agency.online/api/mobile/releases/download"
  },
  "showcase": {
    "screenshots": [
      {
        "id": "media_scr_01",
        "title": "Authentication & Welcome",
        "caption": "Secure OTP and verified organizational credentials sign-in.",
        "altText": "CodeXa Mobile Login Screen",
        "url": "https://codxa-agency.online/appstore/screenshots/01_mobile_login.png",
        "thumbnailUrl": "https://codxa-agency.online/appstore/screenshots/01_mobile_login.png",
        "category": "Dashboard & Auth",
        "displayOrder": 1
      },
      {
        "id": "media_scr_02",
        "title": "Command Center Dashboard",
        "caption": "Live announcements, attendance overview, and quick-action launcher.",
        "altText": "CodeXa Mobile Main Dashboard Screen",
        "url": "https://codxa-agency.online/appstore/screenshots/02_mobile_dashboard.png",
        "thumbnailUrl": "https://codxa-agency.online/appstore/screenshots/02_mobile_dashboard.png",
        "category": "Dashboard & Auth",
        "displayOrder": 2
      }
    ],
    "videos": [
      {
        "id": "media_vid_01",
        "title": "CodeXa Mobile 1080p Experience Walkthrough",
        "description": "Comprehensive tour of mobile attendance, domain batches, projects, tasks, chat, and built-in CodeXa Store.",
        "url": "https://codxa-agency.online/appstore/videos/CodeXa_Enhanced_1080p.mp4",
        "thumbnailUrl": "https://codxa-agency.online/appstore/screenshots/02_mobile_dashboard.png",
        "duration": "2:18",
        "displayOrder": 1
      }
    ],
    "features": [
      {
        "id": "feat_att",
        "key": "attendance",
        "title": "Attendance Tracking",
        "description": "Real-time clock-in within authorized agency timeframes and calendar tracking.",
        "status": "Available",
        "category": "Core",
        "order": 1
      },
      {
        "id": "feat_cls",
        "key": "classes",
        "title": "Scheduled Classes",
        "description": "Domain-specific batch schedules, live links, and upcoming curriculums.",
        "status": "Available",
        "category": "Academics",
        "order": 2
      }
    ],
    "about": {
      "appName": "CodeXa Mobile",
      "tagline": "Official CodeXa Agency Workspace",
      "description": "CodeXa Mobile connects interns, employees, and executive management through a single unified platform for attendance, classes, assignments, project delivery, team communication, and agency workflows.",
      "supportedRoles": ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "EMPLOYEE", "INTERN"],
      "accountRequirement": "Active approved CodeXa Agency organization credentials required."
    },
    "installation": {
      "steps": [
        "Download the official APK from this page or through the in-app CodeXa Store.",
        "Tap the downloaded APK file in Android Downloads notifications or your Files app.",
        "When prompted by Android, allow installation from your trusted browser or CodeXa app.",
        "Open CodeXa and sign in using your verified CodeXa Agency email address."
      ],
      "notice": "Never disable Google Play Protect. CodeXa Mobile uses official SHA-256 verified binaries signed by CodeXa Agency."
    },
    "support": {
      "officialDomain": "https://codxa-agency.online",
      "contactEmail": "support@codxa-agency.online",
      "faq": [
        {
          "q": "Why is CodeXa Mobile not on Google Play Store?",
          "a": "CodeXa Mobile is proprietary internal enterprise software distributed exclusively through our official website (codxa-agency.online) and our built-in in-app CodeXa Store."
        },
        {
          "q": "How do I update the application?",
          "a": "You will receive an in-app prompt and push notification whenever a new update is released. Open the built-in CodeXa Store from the app navigation and tap 'Update Now'."
        }
      ]
    }
  }
}
```

---

## 4. Caching & Edge Headers

```http
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: W/"showcase-v{versionCode}-{revision}"
Access-Control-Allow-Origin: *
```
- Invalidation: Whenever Founder/Co-Founder publishes a new release or updates showcase metadata via the admin dashboard, the cache tag is purged immediately.
