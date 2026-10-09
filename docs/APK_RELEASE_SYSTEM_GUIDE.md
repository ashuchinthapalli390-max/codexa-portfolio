# CodeXa Agency — APK Release Management & Mobile App Update System

## 1. System Overview
The **CodeXa APK Release Management System** enables the Founder and Co-Founder to upload, validate, stage, and publish Android APK binaries directly from the CodeXa Website (`/dashboard/apps/mobile` -> **APK Management** tab) or from an authenticated Founder/Co-Founder session in the Flutter Android application.

### Key Architectural Pillars:
1. **Zero Database Bloat**: APK binary files are **NEVER** stored directly inside PostgreSQL or ephemeral serverless disks (`public/uploads`). They are uploaded directly to **persistent cloud object storage (Supabase Storage bucket `mobile-releases`)**.
2. **PostgreSQL Release Ledger**: Release versioning, SHA-256 integrity checksums, file sizes, signing certificate fingerprints, and release notes are maintained in the Core database via Prisma (`MobileAppRelease` and `MobileReleaseEvent` models).
3. **Strict RBAC**: Only users with the `FOUNDER` or `CO_FOUNDER` role can upload, publish, archive, or roll back APK releases. CTO, CEO, and HR have restricted read-only visibility; employees and interns are blocked (HTTP 403).
4. **Authoritative Sync**: Website and Flutter Android application always read the exact same published release data from CodeXa Core APIs (`/api/mobile/app-update`, `/api/mobile/bootstrap`, `/api/mobile/config`).
5. **No Silent Installs**: The mobile app checks version codes, verifies SHA-256 integrity upon download, and triggers the standard Android package installer with user consent.

---

## 2. Web Management Dashboard (`/dashboard/apps/mobile`)
Founders and Co-Founders can navigate to:
**Dashboard → Apps → Mobile Control Plane → APK Management**

### Sections:
1. **Current Published Version**:
   - Live version banner (Version Name, Version Code, Release Channel: Stable/Beta).
   - Update policy badge: Optional Update vs. Mandatory (Force Update).
   - Binary size (MB) and full 64-character SHA-256 checksum with copy action.
   - Direct download and CDN copy buttons.
2. **Upload New Android APK Form**:
   - Drag & drop `.apk` selector with client-side format verification.
   - Version Name (`1.0.5`), Version Code (`105`), Release Channel (`STABLE` / `BETA`).
   - Update Policy selector (`OPTIONAL` vs. `MANDATORY`).
   - Minimum supported build number for automated update enforcement.
   - Real-time progress bar tracking actual bytes transferred (`X.X MB / Y.Y MB`) via `XMLHttpRequest` upload events.
   - Save as Draft or Publish Immediately toggle.
3. **Draft Releases Pending Approval**:
   - Cards showing pending draft builds with inspection reports.
   - One-click "Publish Now" or "Delete Draft" actions.
4. **Release History Table**:
   - Comprehensive ledger of all releases.
   - Instant "Roll Back To" action to safely revert active version pointers without deleting user data.
5. **Storage Information & Update Telemetry**:
   - Real-time event log for update checks, download starts, and installation completions.

---

## 3. Core Backend APIs

### Admin APIs (Founder & Co-Founder Only)
- `GET /api/admin/mobile/releases` — Fetch all releases, current published version, storage metrics, and audit logs.
- `POST /api/admin/mobile/releases/upload-session` — Generate a short-lived signed cloud upload URL for direct-to-cloud upload.
- `POST /api/admin/mobile/releases/complete-upload` — Verify uploaded APK (ZIP magic, `AndroidManifest.xml`, bytecode, signing), store metadata, and create draft.
- `POST /api/admin/mobile/releases/[id]/publish` — Atomically activate release, update `MobileAppConfig`, and dispatch notifications.
- `POST /api/admin/mobile/releases/[id]/archive` — Archive an old release.
- `POST /api/admin/mobile/releases/[id]/rollback` — Atomically revert active release pointer to a previous stable build.
- `PATCH /api/admin/mobile/releases/[id]` — Edit release notes or update type.
- `DELETE /api/admin/mobile/releases/[id]` — Remove draft or failed release and delete cloud storage binary.

### Mobile Client APIs
- `GET /api/mobile/app-update` — Evaluates client's installed `versionCode` against active published release and returns update status (`updateAvailable`, `forceUpdate`, `downloadUrl`, `sha256`).
- `GET /api/mobile/app-update/download` — Increments download metrics and redirects to high-speed cloud CDN binary.
- `POST /api/mobile/app-update/events` — Tracks telemetry (`CHECK_UPDATE`, `DOWNLOAD_START`, `DOWNLOAD_COMPLETE`, `UPDATE_INSTALLED`, `DOWNLOAD_FAILED`).

---

## 4. Flutter Mobile App Integration
A drop-in Dart integration service is provided in [docs/flutter-apk-release-integration.dart](file:///g:/AntiGravity%20IDE/CodeXa/codexa-portfolio/docs/flutter-apk-release-integration.dart).

### Usage in Flutter:
```dart
// Check updates on startup or dashboard load
final update = await CodeXaUpdateService.checkForUpdates();
if (update != null && update.updateAvailable) {
  CodeXaUpdateService.showUpdateDialog(
    context: context,
    update: update,
  );
}
```
