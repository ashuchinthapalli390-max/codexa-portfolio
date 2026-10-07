-- =============================================================================
-- CODEXA CHAT SUPABASE — SECOND PROJECT SCHEMA MIGRATION
-- Project: CodeXa Chat (Dedicated communication infrastructure)
-- Note: Core DB is the authoritative source for identity, roles, and business data.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. CONVERSATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('DIRECT', 'GROUP', 'PROJECT')),
    title TEXT,
    project_id TEXT,
    created_by_core_user_id TEXT NOT NULL,
    direct_pair_key TEXT UNIQUE, -- e.g. "usr_1:usr_2" sorted for 1-to-1 deduplication
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. CONVERSATION MEMBERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    core_user_id TEXT NOT NULL,
    member_role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (member_role IN ('OWNER', 'ADMIN', 'MEMBER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    muted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_conversation_member UNIQUE (conversation_id, core_user_id)
);

-- -----------------------------------------------------------------------------
-- 3. MESSAGES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_core_user_id TEXT NOT NULL,
    client_message_id TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'FILE', 'SYSTEM')),
    text TEXT,
    reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sender_client_message UNIQUE (sender_core_user_id, client_message_id)
);

-- -----------------------------------------------------------------------------
-- 4. MESSAGE READS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    core_user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_message_read_user UNIQUE (message_id, core_user_id)
);

-- -----------------------------------------------------------------------------
-- 5. MESSAGE REACTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    core_user_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_message_reaction_user UNIQUE (message_id, core_user_id, reaction)
);

-- -----------------------------------------------------------------------------
-- 6. MESSAGE ATTACHMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. CHAT REPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_core_user_id TEXT NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 8. CHAT MUTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_mutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    core_user_id TEXT NOT NULL,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    muted_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_mute UNIQUE (core_user_id, conversation_id)
);

-- -----------------------------------------------------------------------------
-- 9. CHAT BLOCKS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_core_user_id TEXT NOT NULL,
    blocked_core_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_block UNIQUE (blocker_core_user_id, blocked_core_user_id)
);

-- -----------------------------------------------------------------------------
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_conv_members_core_user_id ON public.conversation_members(core_user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_lookup ON public.conversation_members(conversation_id, core_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_cursor ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON public.message_reads(core_user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_msg ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON public.chat_reports(status);
CREATE INDEX IF NOT EXISTS idx_chat_blocks_lookup ON public.chat_blocks(blocker_core_user_id, blocked_core_user_id);

-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_core_user_id()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'core_user_id'),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),
        ''
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) ENFORCEMENT
-- -----------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
CREATE POLICY "Members can select their conversations"
ON public.conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = conversations.id
          AND cm.core_user_id = public.current_core_user_id()
          AND cm.left_at IS NULL
    )
);

-- Conversation Members RLS
CREATE POLICY "Members can select membership of their conversations"
ON public.conversation_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = conversation_members.conversation_id
          AND cm.core_user_id = public.current_core_user_id()
          AND cm.left_at IS NULL
    )
);

-- Messages RLS
CREATE POLICY "Members can select messages in their conversations"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
          AND cm.core_user_id = public.current_core_user_id()
          AND cm.left_at IS NULL
    )
);

CREATE POLICY "Members can insert messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
    sender_core_user_id = public.current_core_user_id()
    AND EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
          AND cm.core_user_id = public.current_core_user_id()
          AND cm.left_at IS NULL
    )
);

-- Message Reads RLS
CREATE POLICY "Users can insert their own message reads"
ON public.message_reads FOR INSERT
WITH CHECK (core_user_id = public.current_core_user_id());

CREATE POLICY "Members can view message reads"
ON public.message_reads FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE m.id = message_reads.message_id
          AND cm.core_user_id = public.current_core_user_id()
          AND cm.left_at IS NULL
    )
);

-- Message Reactions RLS
CREATE POLICY "Users can manage their own message reactions"
ON public.message_reactions FOR ALL
USING (core_user_id = public.current_core_user_id())
WITH CHECK (core_user_id = public.current_core_user_id());

CREATE POLICY "Members can view message reactions"
ON public.message_reactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE m.id = message_reactions.message_id
          AND cm.core_user_id = public.current_core_user_id()
          AND cm.left_at IS NULL
    )
);

-- Chat Mutes RLS
CREATE POLICY "Users can manage their own mutes"
ON public.chat_mutes FOR ALL
USING (core_user_id = public.current_core_user_id())
WITH CHECK (core_user_id = public.current_core_user_id());

-- Chat Blocks RLS
CREATE POLICY "Users can manage their own blocks"
ON public.chat_blocks FOR ALL
USING (blocker_core_user_id = public.current_core_user_id())
WITH CHECK (blocker_core_user_id = public.current_core_user_id());

-- Chat Reports RLS
CREATE POLICY "Users can insert reports"
ON public.chat_reports FOR INSERT
WITH CHECK (reporter_core_user_id = public.current_core_user_id());

-- -----------------------------------------------------------------------------
-- REALTIME CONFIGURATION
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
END $$;
