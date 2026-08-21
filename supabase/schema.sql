-- ==============================================================================
-- CODEXA AGENCY — SUPABASE POSTGRESQL DATABASE SCHEMA
-- Multi-Role Authentication, Projects, Social Feed, Chat, Notifications & Audit Logs
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked to custom auth users or standalone accounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'TEAM_MEMBER', -- 'OWNER' | 'ADMIN' | 'TEAM_MEMBER'
    member_type VARCHAR(32) NOT NULL DEFAULT 'CORE_TEAM', -- 'LEADERSHIP' | 'CORE_TEAM'
    leadership_position VARCHAR(32), -- 'FOUNDER' | 'CO_FOUNDER' | 'CEO' | NULL
    headline VARCHAR(255),
    bio TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    github_url VARCHAR(512),
    linkedin_url VARCHAR(512),
    portfolio_url VARCHAR(512),
    social_links JSONB DEFAULT '{}'::jsonb,
    media_url VARCHAR(512),
    media_mime_type VARCHAR(100),
    avatar_source VARCHAR(32) DEFAULT 'STATIC', -- 'STATIC' | 'SUPABASE_STORAGE' | 'LEGACY'
    avatar_path VARCHAR(512),
    avatar_url VARCHAR(512),
    avatar_storage_path VARCHAR(512),
    avatar_zoom NUMERIC DEFAULT 1,
    avatar_position_x NUMERIC DEFAULT 50,
    avatar_position_y NUMERIC DEFAULT 50,
    avatar_updated_at TIMESTAMPTZ,
    crop_x NUMERIC DEFAULT 0,
    crop_y NUMERIC DEFAULT 0,
    crop_w NUMERIC,
    crop_h NUMERIC,
    crop_zoom NUMERIC DEFAULT 1,
    crop_rotation NUMERIC DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. PROJECTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_desc VARCHAR(500) NOT NULL,
    overview TEXT NOT NULL,
    problem TEXT,
    solution TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    tech_stack JSONB DEFAULT '[]'::jsonb,
    category VARCHAR(64) NOT NULL DEFAULT 'Web', -- 'AI' | 'Web' | 'Mobile' | 'Automation' | 'Cybersecurity' | 'Discord Bot' | 'Full Stack' | 'API' | 'Other'
    status VARCHAR(32) NOT NULL DEFAULT 'Live', -- 'In Progress' | 'Live' | 'Archived' | 'Client Work'
    thumbnail_url VARCHAR(512),
    screenshots JSONB DEFAULT '[]'::jsonb,
    repo_url VARCHAR(512),
    live_url VARCHAR(512),
    is_draft BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_main_project BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. PROJECT_MEMBERS TABLE (Collaborators)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(64) NOT NULL DEFAULT 'Contributor', -- 'Lead Developer' | 'Contributor' | 'Designer' | 'Architect'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, profile_id)
);

-- ------------------------------------------------------------------------------
-- 4. PROJECT_MEDIA TABLE (Screenshots / Videos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    media_url VARCHAR(512) NOT NULL,
    media_type VARCHAR(32) NOT NULL DEFAULT 'image', -- 'image' | 'video' | 'gif'
    caption VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. SOCIAL FEED POSTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    is_announcement BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. POST_MEDIA TABLE (Multiple post images / attachments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    media_url VARCHAR(512) NOT NULL,
    media_type VARCHAR(32) NOT NULL DEFAULT 'image',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. POST_LIKES TABLE (Strictly 1 like per user per post)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, profile_id)
);

-- ------------------------------------------------------------------------------
-- 8. POST_COMMENTS TABLE (Nested replies support)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. INQUIRIES TABLE (Real Client Project Applications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id VARCHAR(32) UNIQUE NOT NULL, -- e.g. CXA-2026-000123
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    company VARCHAR(255),
    project_type VARCHAR(64) NOT NULL,
    budget VARCHAR(64) NOT NULL,
    timeline VARCHAR(64),
    message TEXT NOT NULL,
    attachment_url VARCHAR(512),
    status VARCHAR(32) NOT NULL DEFAULT 'NEW', -- 'NEW' | 'CONTACTED' | 'DISCUSSION' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'ARCHIVED'
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reply_notes TEXT,
    converted_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. CONVERSATIONS TABLE (Direct & Group Chat)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(32) NOT NULL DEFAULT 'DIRECT', -- 'DIRECT' | 'GROUP' | 'PROJECT'
    title VARCHAR(255),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. CONVERSATION_MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(conversation_id, profile_id)
);

-- ------------------------------------------------------------------------------
-- 12. MESSAGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    file_url VARCHAR(512),
    file_name VARCHAR(255),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL, -- 'INQUIRY' | 'CHAT' | 'POST_LIKE' | 'POST_COMMENT' | 'PROJECT_FEATURED' | 'PROJECT_ASSIGNED' | 'SECURITY'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(512),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 14. AUTH_OTPS TABLE (Custom 2-Stage Verification & Password Reset)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(32) NOT NULL DEFAULT 'LOGIN', -- 'LOGIN' | 'PASSWORD_RESET'
    attempts INTEGER NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 15. SITE_SETTINGS TABLE (Homepage Section Toggles & Configuration)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default Settings Seeds
INSERT INTO public.site_settings (key, value) VALUES
    ('main_projects_home_visible', 'true'::jsonb),
    ('team_projects_home_visible', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 16. AUDIT_LOGS TABLE (Security Forensics)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    details TEXT,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 17. MEDIA ASSETS TABLE (Supabase Storage & Static Media Metadata)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_type VARCHAR(32) NOT NULL DEFAULT 'AVATAR', -- 'AVATAR' | 'PROJECT' | 'POST'
    source_type VARCHAR(32) NOT NULL DEFAULT 'SUPABASE_STORAGE', -- 'STATIC' | 'SUPABASE_STORAGE' | 'LEGACY'
    storage_bucket VARCHAR(64) NOT NULL DEFAULT 'avatars',
    storage_path VARCHAR(512) NOT NULL,
    public_url VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255),
    file_size INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_main ON public.projects(is_main_project);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_ref ON public.inquiries(reference_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_auth_otps_lookup ON public.auth_otps(email, purpose, is_used);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (is_public = TRUE AND is_active = TRUE);
CREATE POLICY "Users can update own profile fields" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Projects
CREATE POLICY "Public projects are viewable by everyone" ON public.projects FOR SELECT USING (is_public = TRUE AND is_draft = FALSE);
CREATE POLICY "Creators can view own drafts" ON public.projects FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = created_by));

-- Inquiries
CREATE POLICY "Public can submit inquiries" ON public.inquiries FOR INSERT WITH CHECK (TRUE);

-- Messages
CREATE POLICY "Members can view messages in conversations" ON public.messages FOR SELECT USING (
    auth.uid() IN (
        SELECT p.user_id FROM public.conversation_members cm 
        JOIN public.profiles p ON cm.profile_id = p.id 
        WHERE cm.conversation_id = messages.conversation_id
    )
);
