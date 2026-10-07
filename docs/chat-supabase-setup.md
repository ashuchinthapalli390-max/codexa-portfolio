# Dedicated Chat Supabase Project Setup Guide

This guide details how to provision, configure, and operate the **second Supabase project** dedicated solely to CodeXa Mobile chat, messaging, realtime, and private attachment storage.

---

## 1. System Topology & Separation of Concerns

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     CodeXa Core Database        │       │   CodeXa Chat Supabase Project  │
│      (Source of Truth)          │       │      (Second Supabase Project)  │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ • Users & Credentials           │       │ • Conversations (Direct, Group) │
│ • RBAC & Profiles               │       │ • Conversation Members          │
│ • Attendance & Leave            │       │ • Messages & Replies            │
│ • Projects & Tasks              │       │ • Message Reads (Seen state)    │
│ • Payments & Documents          │       │ • Message Reactions             │
│ • FCM Push Tokens               │       │ • Private Attachments Metadata  │
│ • Canonical Notifications       │       │ • Moderation Reports & Blocks   │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 └────────── core_user_id ─────────────────┘
```

**Key Principle**: Users authenticate exclusively through CodeXa Core Auth. The second Supabase project does **NOT** maintain duplicate user accounts, passwords, or authentication state. All chat members and messages reference the canonical `core_user_id`.

---

## 2. Step-by-Step Provisioning Guide

### Step 1: Create the Dedicated Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Name: `codexa-chat` (or `codexa-mobile-chat`).
4. Select the database region closest to your Core database.
5. Set a secure database password and create the project.

### Step 2: Retrieve API Keys & Connection Strings
From **Project Settings -> API**:
- **Project URL**: e.g., `https://[CHAT_PROJECT_REF].supabase.co`
- **Publishable Key (Anon)**: Used for public client/realtime initialization.
- **Secret Key (service_role)**: Server-only! Never expose to client applications or the Flutter APK.

From **Project Settings -> Database**:
- **Connection string (URI / Transaction pooler)** -> `CHAT_SUPABASE_DB_URL`
- **Direct connection string** -> `CHAT_SUPABASE_DIRECT_URL`

### Step 3: Configure Environment Variables
Add the following to your deployment environment (Vercel Project Settings) and local `.env`:

```env
# ============================================================
# CODEXA CHAT SUPABASE — SECOND PROJECT
# ============================================================

# Public Project URL (PUBLIC SAFE)
CHAT_SUPABASE_URL=https://[YOUR_CHAT_PROJECT_REF].supabase.co

# Safe client-side project key for Realtime (PUBLIC SAFE)
CHAT_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# SERVER ONLY. Never expose to mobile APK or browser.
CHAT_SUPABASE_SECRET_KEY=sb_secret_...

# Postgres pooled connection URL (DATABASE ONLY)
CHAT_SUPABASE_DB_URL=postgresql://postgres.[CHAT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection URL for migrations (DATABASE ONLY)
CHAT_SUPABASE_DIRECT_URL=postgresql://postgres.[CHAT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Private storage bucket for attachments
CHAT_SUPABASE_STORAGE_BUCKET=chat-private

# Enable Realtime
CHAT_SUPABASE_REALTIME_ENABLED=true

# JWT signing secret for Realtime authorization
CHAT_JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
CHAT_JWT_ISSUER=codexa-chat
CHAT_JWT_AUDIENCE=codexa-mobile
```

### Step 4: Run SQL Schema Migration
Execute the migration script located at:
`supabase-chat/migrations/001_create_chat_schema.sql`

In Supabase Dashboard:
1. Navigate to **SQL Editor**.
2. Paste the contents of `001_create_chat_schema.sql`.
3. Click **Run**.
4. Confirm tables created: `conversations`, `conversation_members`, `messages`, `message_reads`, `message_reactions`, `message_attachments`, `chat_reports`, `chat_mutes`, `chat_blocks`.

### Step 5: Configure Private Storage Bucket (`chat-private`)
1. In the Supabase dashboard, navigate to **Storage -> Buckets**.
2. Click **New bucket**.
3. Name: `chat-private`.
4. Ensure **Public bucket** is toggled **OFF**.
5. Set file size limit: `25MB`.
6. Allowed MIME types: images (`image/*`), PDFs (`application/pdf`), text documents.

Storage Path Structure:
```text
conversations/<conversationId>/<messageId>/<filename>
```

### Step 6: Enable Supabase Realtime
1. Navigate to **Database -> Publications**.
2. Select `supabase_realtime`.
3. Ensure the following tables are toggled **ON**:
   - `conversations`
   - `messages`
   - `message_reads`
   - `message_reactions`

### Step 7: Configure JWT Secret in Project Settings
In **Project Settings -> API -> JWT Settings**:
- Ensure the JWT Secret matches `CHAT_JWT_SECRET`. This allows the server-generated short-lived token (`POST /api/chat/token`) to authenticate WebSocket Realtime subscriptions.

---

## 3. Communication Permission Matrix

The backend enforces corporate messaging rules prior to conversation initiation or message transmission:
- **Intern -> Intern**: Enabled
- **Intern -> Employee**: Enabled
- **Intern -> CTO / HR**: Enabled
- **Intern -> Founder / CEO**: Restricted (blocked by backend policy unless initiated by leadership)
- **Employee -> Founder**: Enabled

*Note: Client UI hiding is a UX convenience; server-side validation is strictly authoritative.*

---

## 4. Android Inline Reply Workflow

```
Android Push Notification ("New Message")
    │
    ▼
[ REPLY ] Action tapped
    │
    ▼
User enters text into RemoteInput
    │
    ▼
Native Kotlin `CxNotificationReplyReceiver`
    │
    ▼
Retrieves secure session Bearer token from SharedPreferences
    │
    ▼
Asynchronously dispatches:
POST /api/chat/conversations/:id/messages
    │
    ▼
Next.js Chat API validates Core Auth session
    │
    ▼
Inserts message with `clientMessageId` idempotency into Chat Supabase
    │
    ▼
Updates system notification with confirmation checkmark
```

---

## 5. Verification Checklist

- [x] Environment configuration loaded cleanly with zero client secret leaks.
- [x] Server-side clients (`chat-admin.ts`) enforce server-only context execution.
- [x] 1-to-1 conversation deduplication guaranteed via `direct_pair_key` (`sorted(userA, userB)`).
- [x] Duplicate message submission protection via `(sender_core_user_id, client_message_id)`.
- [x] Row Level Security (RLS) active on all tables.
- [x] `/api/chat/token` issues short-lived 1-hour HS256 JWT containing `core_user_id`.
- [x] Offline messages produce canonical `Notification` records in Core DB for FCM delivery.
- [x] Flutter data layer handles connection states and presence without crashes.
- [x] Zero TypeScript compilation errors across entire backend.
