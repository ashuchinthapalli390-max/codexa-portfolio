# CodeXa APK Release Management Architecture

**Platform:** CodeXa Agency Core Backend & Admin Dashboard  
**Database Models:** `MobileAppRelease`, `MobileAppConfig`  
**Storage Provider:** Supabase Storage (`mobile-releases` bucket)  
**Security Scope:** Role-Based Access Control (FOUNDER & CO_FOUNDER exclusive publish authority)

---

## 1. Overview & Release Lifecycle

The CodeXa APK Release Management system provides an authoritative, database-backed pipeline for building, uploading, validating, publishing, and archiving official Android APK releases.

### Lifecycle States:
1. **DRAFT**:
   - APK uploaded by Founder/Co-Founder via Dashboard or Admin CLI.
   - APK file written to Supabase Storage (`mobile-releases/apks/CodeXa-v{version}-{code}.apk`).
   - SHA-256 checksum and exact byte count computed.
   - Release remains invisible to end users and Flutter app update checks until published.
2. **PUBLISHED**:
   - Exactly one release is flagged `status = 'PUBLISHED'` per platform channel (`stable`).
   - Atomically updates `MobileAppConfig.currentVersion`, `MobileAppConfig.buildNumber`, `MobileAppConfig.apkUrl`, and `MobileAppConfig.apkSha256`.
   - Superseded previous published releases are archived, and their storage files are deleted to prevent orphaned storage bloat.
   - Triggers FCM `APK_RELEASE_PUBLISHED` notification to registered Android devices.
3. **ARCHIVED**:
   - Release history preserved in PostgreSQL audit log, storage binary reclaimed.

---

## 2. Authorization Matrix

| User Role | View Releases | Upload Draft APK | Publish APK | Delete Release | Download Public APK |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **FOUNDER** | Full | Full | Full | Full | Yes |
| **CO_FOUNDER** | Full | Full | Full | Full | Yes |
| **CEO / CTO / HR** | Read-Only | Denied | Denied | Denied | Yes |
| **EMPLOYEE** | Denied | Denied | Denied | Denied | Yes |
| **INTERN** | Denied | Denied | Denied | Denied | Yes |
| **GUEST (Public)** | Denied | Denied | Denied | Denied | Yes |

*Enforced server-side in `src/lib/permissions.ts` via `canManageMobile(user)` and `canViewMobile(user)`.*

---

## 3. Storage & Binary Architecture

- **Supabase Storage Bucket:** `mobile-releases`
- **Maximum File Limit:** 250 MB
- **File Naming Convention:** `apks/CodeXa-v{versionName}-{versionCode}-{timestamp}.apk`
- **Direct Streaming:** Direct upload to Supabase Storage via service key, bypassing Vercel serverless request body limits (4.5 MB limit on standard serverless avoided).
- **Cleanup Routine:** When a new release is published, `apk-storage.ts` locates all previous draft or published releases belonging to the same app and invokes `supabase.storage.from("mobile-releases").remove([oldKey])`.

---

## 4. API Specification

### 4.1 Upload Draft APK
- **Route:** `POST /api/admin/apps/mobile/releases/upload`
- **Auth:** Requires Founder/Co-Founder session.
- **Request Body (FormData):**
  - `file`: Binary `.apk` file (up to 250 MB).
  - `versionName`: e.g. `"1.0.5"`
  - `versionCode`: e.g. `105`
  - `releaseNotes`: Changelog string
  - `updatePolicy`: `"OPTIONAL"` | `"MANDATORY"`
  - `minimumSupportedVersionCode`: Integer (e.g. `103`)
- **Response:**
  ```json
  {
    "success": true,
    "release": {
      "id": "rel_cly1234567890",
      "versionName": "1.0.5",
      "versionCode": 105,
      "status": "DRAFT",
      "apkSize": 80004912,
      "apkSha256": "4a7d...391e",
      "downloadUrl": "https://.../mobile-releases/apks/CodeXa-v1.0.5-105.apk"
    }
  }
  ```

### 4.2 Publish Release
- **Route:** `POST /api/admin/apps/mobile/releases/publish`
- **Auth:** Requires Founder/Co-Founder session.
- **Request Body:**
  ```json
  {
    "releaseId": "rel_cly1234567890"
  }
  ```
- **Atomicity:** Executed in a PostgreSQL transaction:
  1. Sets target release `status = "PUBLISHED"`, `publishedAt = NOW()`.
  2. Sets all other releases for the platform to `"ARCHIVED"`.
  3. Updates `MobileAppConfig` record with new version name, build number, SHA-256, and download URL.
  4. Triggers background cleanup of superseded APK files.

### 4.3 Public Release Resolution
- **Route:** `GET /api/mobile/releases/download`
- **Auth:** Public.
- **Behavior:** Resolves the active published APK from database and responds with a 302 Redirect to the verified storage CDN URL, or streams the file with `Content-Disposition: attachment; filename="CodeXa-v1.0.5.apk"`.
