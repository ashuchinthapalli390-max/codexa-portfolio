# CodeXa Mobile — Official App Showcase Specification

**Route:** `/mobile`  
**Distribution Policy:** Official Website Exclusive (`https://codxa-agency.online/mobile`)  
**Design System:** CodeXa Obsidian Black (`#060606`), Crimson Accents (`#DC2626` / `#E11D48`), Subtle Glassmorphism, Rounded Panels, Zero Play Store Badges.

---

## 1. Executive Summary

CodeXa Mobile is the official Android workspace for CodeXa Agency members (Leadership, Staff, Employees, and Interns). The application is distributed **exclusively** through the official CodeXa website and its built-in in-app CodeXa Store. It is **not** listed on Google Play Store or any third-party app marketplace.

The showcase at `/mobile` provides visitors, interns, and team members with a Play Store-inspired application experience featuring:
- Live database-backed release status (version, APK file size, build number, update policy).
- Verified SHA-256 release checksum and Android SDK compatibility.
- 10 real production screenshots organized into functional categories.
- 1080p full-length application demonstration video with custom playback controls.
- Interactive key features grid with availability badges.
- Dynamic "What's New" changelog sourced directly from the active release record.
- Step-by-step sideloading and Android package installation instructions with security guidance.
- Comprehensive troubleshooting and support FAQ.

---

## 2. Page Architecture & Design Tokens

### 2.1 Visual Hierarchy
1. **Official App Hero Section**:
   - App Icon (`/logo.jpeg`) with crimson glow.
   - Title: `CodeXa Mobile` | Developer: `CodeXa Agency` | Platform: `Android`.
   - Verified Official Release badge (green indicator when release is published and verified).
   - Dynamic APK Download CTA with live file size (`~76.3 MB`), version (`v1.0.5`), and build number.
   - Secondary button to jump straight to the 1080p video walkthrough.
   - Exclusivity declaration: *"Distributed exclusively through codxa-agency.online"*.
2. **Explore CodeXa Mobile (Screenshots Carousel)**:
   - Category filtering: `All`, `Dashboard & Auth`, `Academics & Classes`, `Projects & Tasks`, `Team & AI`.
   - Horizontal snap-scroll carousel with previous/next controls.
   - Click-to-enlarge modal with full-screen zoom, keyboard Esc navigation, and explicit close button.
   - Authentic 9:16 portrait screenshots sourced from `public/appstore/screenshots/` and Supabase Storage.
3. **Watch CodeXa In Action (Demo Video Section)**:
   - Embedded 1080p video (`public/appstore/videos/CodeXa_Enhanced_1080p.mp4`).
   - Custom playback controls: Play/Pause overlay, time progress bar, mute/unmute, and native fullscreen.
   - Video metadata: duration (`2:18`), resolution (`1080p 60fps`), format (`MP4 / H.264`).
4. **Everything You Need, In One App (Core Features)**:
   - 10 core agency feature modules:
     - Attendance & Geo-Windowing (`Available`)
     - Scheduled Classes & Domain Batches (`Available`)
     - Daily Topics & Resource Links (`Available`)
     - Team Directory & Verified Roles (`Available`)
     - Real-Time Direct & Group Messaging (`Available`)
     - Projects & Milestone Tasks (`Available`)
     - Assignments & Code Review (`Available`)
     - Leave Management & Approvals (`Available`)
     - Official Documents & ID Cards (`Available`)
     - CodeXa AI Assistant & Store (`Available`)
5. **What's New in CodeXa Mobile**:
   - Release changelog dynamically populated from `MobileAppRelease.releaseNotes`.
6. **Technical Specifications**:
   - Package Name: `online.codxa_agency.app`
   - Target Architecture: `ARM64-v8a / armeabi-v7a`
   - Minimum Android: `Android 8.0 (Oreo, API Level 26)`
   - SHA-256 Checksum with one-click copy button.
7. **Installation Guide & Android Security**:
   - 4-step clear walkthrough for installing APKs safely on modern Android 10/11/12/13/14+.
   - Never asks users to disable Google Play Protect.
8. **Support & Troubleshooting FAQ**:
   - Answers to common questions: Google Play policy, "App not installed" resolution, login requirements, and update procedures.

---

## 3. SEO & OpenGraph Integration

Configured in [`src/app/mobile/layout.tsx`](file:///g:/AntiGravity%20IDE/CodeXa/codexa-portfolio/src/app/mobile/layout.tsx):
- **Page Title:** `CodeXa Mobile — Official Android App | CodeXa Agency`
- **Meta Description:** *"Download CodeXa Mobile, the official CodeXa Agency Android workspace. Available exclusively on our official website. Unified workspace for attendance, classes, projects, tasks, chat, and AI."*
- **Canonical URL:** `https://codxa-agency.online/mobile`
- **OpenGraph:** Type `website`, images pointing to `/logo.jpeg` and `/appstore/screenshots/01_mobile_login.png`.
- **Twitter Card:** `summary_large_image`.

---

## 4. Navigation Links

The showcase page is wired throughout the site:
- **Primary Navbar:** Added `Mobile App` item linking to `/mobile`.
- **Apps Catalog (`/apps`):** Added high-contrast *"View Full Showcase & Screenshots →"* banner card.
- **Global Footer:** Added *"Mobile App (Official APK)"* link under Applications.
- **Admin Dashboard:** Added link to public showcase from the Mobile Control Center.

---

## 5. Security & Exclusivity Policy

```
[STRICT POLICY ENFORCEMENT]
1. NO Google Play Store badges or links permitted anywhere on the site.
2. NO fake reviews, manufactured star ratings, or inflated download counters.
3. ALL versions and file sizes displayed on /mobile MUST be fetched dynamically from PostgreSQL.
4. If no published APK exists, the button renders "Coming Soon" and remains disabled.
```
