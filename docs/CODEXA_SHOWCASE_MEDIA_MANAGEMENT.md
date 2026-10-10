# CodeXa Showcase Media Management Guide

**Dashboard Route:** `/dashboard/apps/mobile` → **App Showcase & Media** tab  
**Component:** [`AppShowcaseTab.tsx`](file:///g:/AntiGravity%20IDE/CodeXa/codexa-portfolio/src/components/mobile-admin/AppShowcaseTab.tsx)  
**Database Models:** `MobileShowcaseMedia`, `MobileShowcaseContent`  
**Storage Engine:** Supabase Storage (`mobile-releases` bucket) + Local Next.js Static Mirror (`public/appstore/`)

---

## 1. Overview

CodeXa Showcase Media Management empowers Founders and Co-Founders to maintain all visual assets (screenshots, walkthrough videos, posters) and copy text for CodeXa Mobile without writing code or redeploying the application.

Any media updated in this administrative interface reflects **instantaneously** on:
1. The official public website showcase at `https://codxa-agency.online/mobile`.
2. The in-app CodeXa Store screen on every installed Android device.

---

## 2. Media Inventory

The production asset library includes the following verified artifacts from the official `app store` master repository:

### 2.1 Screenshots (9:16 Aspect Ratio)

| File | Title | Category | Display Order |
| :--- | :--- | :--- | :---: |
| `01_mobile_login.png` | Authentication & Welcome | Dashboard & Auth | 1 |
| `02_mobile_dashboard.png` | Command Center Dashboard | Dashboard & Auth | 2 |
| `03_mobile_attendance.png` | Attendance & Geofence | Academics & Classes | 3 |
| `04_mobile_classes.png` | Scheduled Domain Classes | Academics & Classes | 4 |
| `05_mobile_topics.png` | Daily Topics & Curriculums | Academics & Classes | 5 |
| `06_mobile_people.png` | Organization Directory | Team & AI | 6 |
| `07_mobile_chat.png` | Real-Time Direct & Group Chat | Team & AI | 7 |
| `08_mobile_projects.png` | Projects & Milestones | Projects & Tasks | 8 |
| `09_mobile_assignments.png` | Assignments & Code Submissions | Projects & Tasks | 9 |
| `10_mobile_ai_assistant.png` | CodeXa AI Assistant & Store | Team & AI | 10 |

### 2.2 Demonstration Video (1080p 60fps)

- **File:** `CodeXa_Enhanced_1080p.mp4`
- **Resolution:** `1920 × 1080` (16:9 widescreen)
- **Duration:** `2 minutes 18 seconds`
- **Encoding:** `H.264 / AAC (MP4)`
- **Size:** `30.5 MB`
- **Cloud Storage Key:** `showcase/videos/CodeXa_Enhanced_1080p.mp4`

---

## 3. Administrative Operations

Inside `/dashboard/apps/mobile` under the **App Showcase & Media** tab, leadership can perform:

1. **Upload New Screenshot / Video**:
   - Supports multi-file selection.
   - Automatically compresses/validates image aspect ratio and sets default order.
2. **Edit Metadata Modal**:
   - Change Title, Caption, Alt Text, and Category.
   - Set as Cover Image or Featured Video.
3. **Reordering Controls**:
   - Click **Move Left / Move Right** or **Move Up / Move Down** buttons.
   - Saves new ordinal sequence atomically in PostgreSQL via `PUT /api/admin/mobile/showcase/media`.
4. **Visibility Toggling**:
   - Switch any screenshot or video to `Draft / Hidden` to take it down without deleting the file.
5. **App Showcase Copy & Features Editor**:
   - Edit the App Name, Tagline, About Description, and Feature Cards list directly in the panel.
   - Saves directly to the `MobileShowcaseContent` table.
