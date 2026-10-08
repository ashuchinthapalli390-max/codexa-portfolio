# CODEXA ECOSYSTEM — COMPLETE MOBILE APP STATUS, FEATURES & WEBSITE INTEGRATION MASTER DOCUMENT

## VERSION: WEBSITE UPDATE AND MOBILE CONNECTION HANDOFF
### For CodeXa Website, Core Backend, Database, Flutter APK and Deployment Teams

---

# 1. PURPOSE OF THIS DOCUMENT

This document defines the intended complete CodeXa Mobile application, its currently reported issues, the website administration features required to support it and every critical Website ↔ Backend ↔ Mobile integration point.

The website team must use this document when updating the CodeXa production website.

**PRIMARY OBJECTIVE:**
Make the CodeXa website the fully functional administrative control center for the CodeXa Mobile application.

The website and app must share the same actual:
- Users
- Roles
- Permissions
- Profiles
- Employees
- Interns
- Internship records
- Attendance
- Attendance windows
- Scheduled classes
- Topics and learning resources
- Assignments
- Submissions
- Projects
- Tasks
- Payments
- ID Card benefits
- AI access requests
- Documents
- Notifications
- Feature flags
- Maintenance settings
- Version settings
- Announcements
- Social content where applicable

Never create fake mobile records to hide a missing website integration.

**IMPORTANT STATUS NOTE:** The issues below are user-reported. The requested feature list is a product specification. Actual implementation status must be established through a code audit and real end-to-end testing.

---

# 2. CODEXA PRODUCT STRUCTURE

CodeXa has three distinct product surfaces:
- **CODEXA WEBSITE**: The primary administrative and organizational control center.
- **CODEXA MOBILE**: The daily working environment used by management, employees and interns.
- **CODEXA DESKTOP**: The future developer/AI-focused workspace.

Website and Mobile must remain connected through the authoritative CodeXa Core backend.
Do not duplicate their identities or business records.

---

# 3. EXISTING TECHNOLOGY CONTEXT

- **Website / Backend**: Next.js, Prisma, Supabase PostgreSQL for CodeXa Core, Secure authentication and sessions, Firebase integration, Vercel deployment.
- **Mobile**: Flutter Android, Riverpod state management, Dio HTTP client, Secure storage, Native camera/gallery/file picker, Android notifications.
- **Chat**: Separate Supabase project, Postgres, Realtime, Private media storage.
- **AI**: CodeXa backend AI service, Gemini API as an internal provider.
- **Notifications**: Firebase Cloud Messaging, Email provider, Optional authorized WhatsApp Business integration.

---

# 4. CURRENT MOBILE APP — USER-REPORTED STATUS

| Module | Reported issue | Priority |
| --- | --- | --- |
| Core Connection | Could not synchronize with CodeXa Core Servers | P0 |
| Authentication | App logs out after close/reopen | P0 |
| Google Sign-In | Unknown Google accounts appear able to sign in | P0 Security |
| Role System | Founder and Intern see similar features | P0 |
| Messaging | DMs do not reliably send | P0 |
| Read Receipts | Seen Just Now appears before recipient reads | P0 |
| Realtime | Messages do not consistently reach another user | P0 |
| Notifications | Second phone does not receive message push | P0 |
| App Control | Website Maintenance/Update settings do not reflect | P0 |
| People Directory | One expected Intern is missing from list (38 instead of 39) | P1 |
| Attendance | Founder sees Mark Attendance instead of management controls | P1 |
| Attendance | CLOSED state/calendar incomplete | P1 |
| Stories | Photo/video creation or upload missing | P1 |
| Group Chat | Create Group or group-media options missing | P1 |
| Profiles | Photo URL field appears instead of native photo upload | P1 |
| Profiles | Some photos/details do not display | P1 |
| Chat | Voice, images, videos, stickers and actions incomplete | P1 |
| Feed | Post/media creation and engagement incomplete | P1 |
| Documents | Upload and detailed document management incomplete | P1 |
| Projects | Real project/task visibility incomplete | P1 |
| Classes | Scheduled Classes and topics need full implementation | P1 |
| Assignments | Text/repository submission workflow needed | P1 |
| Payments | Real paid/unpaid parity and benefits need implementation/verification | P1 |

---

# 5. THE SINGLE MOST IMPORTANT CONNECTION RULE

The CodeXa website and mobile app must use the same canonical Core database.
For each business entity:
Website creates/updates record → Core API persists record → Mobile API reads the same record → Mobile renders authorized information → Mobile changes, if allowed, update the same canonical record → Website reflects the change.

---

# 6. SOURCE OF TRUTH BY MODULE

| Module | Authoritative storage |
| --- | --- |
| Login / Identity | Core DB |
| Users / Roles / Permissions | Core DB |
| Profile details | Core DB |
| Internship / Employment | Core DB |
| Attendance | Core DB |
| Scheduled Classes | Core DB |
| Learning resources | Core DB |
| Assignments / Submissions | Core DB |
| Projects / Tasks | Core DB |
| Payments | Core DB |
| ID Card benefits | Core DB |
| AI account access requests | Core DB |
| Documents | Core DB |
| Feed / Posts / Stories / Notes | Core-backed domain |
| Notifications history | Core DB |
| Mobile App Control | Core DB |
| DMs / Groups / Chat Messages | Separate Chat Supabase |
| Chat Reactions / Read Receipts | Separate Chat Supabase |
| Chat attachments | Chat private storage |
| FCM token registration | Core DB |
| Push delivery | Firebase Cloud Messaging |
| CodeXa AI API | CodeXa backend |
| AI provider secret | Backend environment only |

---

# 7. WEBSITE APP CONTROL CENTER
Real persisted controls for:
- Mobile App Enabled
- Maintenance Mode, Message, Expected End
- Minimum Supported App Version & Latest App Version
- Force Update & Optional Update
- Android Update URL & Release Notes
- Global, Role-based, and User-specific Mobile Feature Flags
- Push Notifications & Core Service Availability
- Mobile Configuration Revision

---

# 8. WEBSITE → APK CONFIGURATION SYNCHRONIZATION
Website Admin Save → Authenticated Admin API → Core DB update → configVersion increment → FCM CONFIG_CHANGED event → Flutter configuration refetch (`/api/mobile/public-config`, `/api/mobile/config`, `/api/mobile/bootstrap`) → application state update → backend enforcement.

---

# 9. MAINTENANCE MODE
Website turns Maintenance ON → Mobile displays complete CodeXa Maintenance screen; backend operational APIs block.
Website turns Maintenance OFF → Mobile restores session without requiring re-login.

---

# 10. APP VERSION MANAGEMENT
Semantic-version comparison. Force update blocks below minimum version; optional update prompts when newer version is available.

---

# 11. AUTHENTICATION CONNECTION
Email, Username, Employee ID, Intern ID, Password, Approved Google account.
Google Sign-In must validate Google identity token on backend; user must already exist and be active in Core.

---

# 12. ROLE AND PERMISSION SYSTEM
Roles: FOUNDER, CO_FOUNDER, CEO, CTO, HR, COO, EMPLOYEE, INTERN.
Authoritative role/permission matrix owned by website and enforced server-side.

---

# 13. WEBSITE USER MANAGEMENT & PEOPLE DIRECTORY
Audit discrepancy between actual Core records and authorized list. No hardcoding 39.

---

# 14. PEOPLE SEARCH API
Paginated search supporting Name, Username, Employee ID, Intern ID, Role, Department, Domain, Designation, Skills, Assigned Project.

---

# 15. PROFILE MANAGEMENT CONNECTION
Authenticated photo upload, bio, skills, links. Centrally controlled roles, IDs, stipend, and employment dates.

---

# 16. INTERNSHIP MANAGEMENT
Core owned: Intern ID, Domain, Designation, Start Date, End Date, Duration, Status, Mentor, Cohort, Assigned Projects.

---

# 17. EMPLOYEE MANAGEMENT
Employee ID, Department, Designation, Type, Joining Date, Manager, Status, Projects, Documents, Leave, Payroll.

---

# 18-20. ATTENDANCE & CALENDAR
Attendance windows: BEFORE_START, NOT_OPENED, OPEN, MARKED, CLOSED, COMPLETED.
Founder/HR can open/close windows and review corrections; Interns/Employees mark during open window.

---

# 21-23. SCHEDULED CLASSES & NOTIFICATIONS
Scheduled Classes beneath Attendance. Topics, subtopics, instructor, time, join link, resources, recording, linked assignment.

---

# 24. LEARNING HUB
Course management, syllabus, modules, lessons, resources, recordings, notes, progress.

---

# 25-28. ASSIGNMENT MANAGEMENT & SUBMISSION
Assignment types: TEXT, REPOSITORY, or BOTH.
Lifecycle: NOT_STARTED, DRAFT, SUBMITTING, SUBMITTED, UNDER_REVIEW, REVISION_REQUESTED, APPROVED, GRADED, REJECTED, LATE.

---

# 29-30. PROJECT MANAGEMENT & GROUP CHAT SYNC
Projects, members, milestones, tasks. Automated chat membership synchronization on member addition/removal.

---

# 31-38. MESSAGING, READ RECEIPTS & GROUP CHAT
Core controls user identity and permissions; Chat Supabase controls conversations and messages.
Real optimistic send with backend persistence confirmation.
Read receipts require actual viewing in the conversation.

---

# 39-42. STORIES, NOTES, FEED & ANNOUNCEMENTS
Stories with 24-hr expiry; Notes near Messages; Feed posts with comments/reactions; Targeted Announcements.

---

# 43-45. PAYMENTS — SOURCE OF TRUTH
Authoritative bill: ₹150 ID Card + ₹300 AI Dev Tools = ₹450 total.
Trusted payment reconciliation with server-side validation.

---

# 46-52. POST-PAYMENT BENEFITS (ID CARD & AI TOOLS)
Verified ₹450 unlocks:
1. **ID Card Photo Submission & Review**: Intern uploads portrait → Website reviewer approves/rejects → Preparing/Ready/Issued.
2. **Gemini Pro Access Request**: Intern requests access → Founder/Co-Founder email notification → Website review and provisioning.

---

# 53-54. DOCUMENTS & LEAVE REQUESTS
Official document issuance (Offer Letter, ID Card, Certificates) and Leave request workflows.

---

# 55-56. PUSH NOTIFICATIONS & INLINE REPLY
FCM device tokens tied to Core User ID. Android inline reply via RemoteInput.

---

# 57. CODEXA AI
Branded CodeXa AI powered securely server-side (Gemini API provider). Enforce Core RBAC.

---

# 58. SECURITY & SESSIONS
Active sessions, device tracking, session revocation, force logout.

---

# 59. FEATURE FLAGS MATRIX
Over 35 feature flags supporting GLOBAL, ROLE, and USER-level targeting.

---

# 60-63. APIS, EVENTS & ERROR CODES
Standardized shared API contracts, domain event triggers, and semantic API error codes.

---

# 64. DATABASE MIGRATION RULES
Clean additions without destructive resets.

---

# 65-68. ADMIN PAGES, WORKFLOWS, SECURITY & OBSERVABILITY
Full control center pages with save, readback, and mobile propagation verification.

---

# 69-71. E2E TESTS, PRIORITIES & DELIVERY REPORT
Comprehensive verification matrix and delivery reporting rules.
