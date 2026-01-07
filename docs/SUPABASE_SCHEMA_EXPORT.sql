-- ============================================
-- Supabase Database Schema Export
-- Generated: 2025-01-06
-- ============================================
-- 
-- 이 파일은 Supabase 데이터베이스의 전체 스키마를 포함합니다.
-- 새로운 프로젝트에 동일한 구조를 설정하려면 이 SQL을 실행하세요.
--
-- 주의사항:
-- 1. 이 파일은 스키마 구조만 포함하며 데이터는 포함하지 않습니다.
-- 2. RLS 정책, 함수, 트리거, 인덱스 등 모든 설정이 포함되어 있습니다.
-- 3. 실행 순서가 중요하므로 순서대로 실행하세요.
-- ============================================

-- ============================================
-- 1. 확장 프로그램 (Extensions)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- ============================================
-- 2. ENUM 타입 생성
-- ============================================

CREATE TYPE public.channel_type AS ENUM ('public', 'private');
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'member', 'guest');
CREATE TYPE public.user_status AS ENUM ('active', 'away', 'dnd', 'offline');

-- ============================================
-- 3. 테이블 생성
-- ============================================

-- 3.1 사용자 프로필
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    username text,
    full_name text,
    avatar_url text,
    status_message text,
    status user_status DEFAULT 'offline'::user_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    background_color text
);
COMMENT ON COLUMN public.profiles.deleted_at IS '회원 탈퇴 시각 (NULL이면 활성 회원, 값이 있으면 탈퇴한 회원)';
COMMENT ON COLUMN public.profiles.background_color IS 'User profile background color for avatar display';

-- 3.2 워크스페이스
CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text NOT NULL,
    icon_url text,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.3 워크스페이스 멤버
CREATE TABLE IF NOT EXISTS public.members (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role user_role DEFAULT 'member'::user_role,
    joined_at timestamp with time zone DEFAULT now()
);

-- 3.4 채널
CREATE TABLE IF NOT EXISTS public.channels (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    type channel_type DEFAULT 'public'::channel_type,
    description text,
    topic text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.5 채널 멤버
CREATE TABLE IF NOT EXISTS public.channel_members (
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    notification_level text DEFAULT 'all'::text,
    last_read_at timestamp with time zone DEFAULT now()
);

-- 3.6 메시지
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text,
    parent_id uuid,
    is_edited boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

-- 3.7 스레드
CREATE TABLE IF NOT EXISTS public.threads (
    parent_message_id uuid NOT NULL,
    reply_count integer DEFAULT 0,
    participant_count integer DEFAULT 0,
    last_reply_at timestamp with time zone
);

-- 3.8 리액션
CREATE TABLE IF NOT EXISTS public.reactions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.9 첨부파일
CREATE TABLE IF NOT EXISTS public.attachments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size bigint,
    mime_type text,
    uploaded_at timestamp with time zone DEFAULT now()
);

-- 3.10 사용자 상태
CREATE TABLE IF NOT EXISTS public.presences (
    user_id uuid NOT NULL,
    workspace_id uuid,
    status user_status DEFAULT 'offline'::user_status,
    status_message text,
    status_emoji text,
    last_seen_at timestamp with time zone DEFAULT now()
);

-- 3.11 고정 메시지
CREATE TABLE IF NOT EXISTS public.pins (
    channel_id uuid NOT NULL,
    message_id uuid NOT NULL,
    pinned_by uuid NOT NULL,
    pinned_at timestamp with time zone DEFAULT now()
);

-- 3.12 저장된 메시지
CREATE TABLE IF NOT EXISTS public.saves (
    user_id uuid NOT NULL,
    message_id uuid NOT NULL,
    saved_at timestamp with time zone DEFAULT now()
);

-- 3.13 리마인더
CREATE TABLE IF NOT EXISTS public.reminders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    message_id uuid,
    content text NOT NULL,
    remind_at timestamp with time zone NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.14 임시 저장
CREATE TABLE IF NOT EXISTS public.drafts (
    user_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    content text,
    updated_at timestamp with time zone DEFAULT now()
);

-- 3.15 읽음 확인
CREATE TABLE IF NOT EXISTS public.read_receipts (
    user_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    last_read_message_id uuid,
    last_read_at timestamp with time zone DEFAULT now()
);

-- 3.16 초대
CREATE TABLE IF NOT EXISTS public.invitations (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL,
    code text NOT NULL,
    created_by uuid NOT NULL,
    expires_at timestamp with time zone,
    max_uses integer DEFAULT 1,
    used_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.17 커스텀 이모지
CREATE TABLE IF NOT EXISTS public.custom_emojis (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    image_url text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.18 웹훅
CREATE TABLE IF NOT EXISTS public.webhooks (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    url text,
    name text,
    secret text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.19 워크플로우 자동화
CREATE TABLE IF NOT EXISTS public.workflow_automations (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    trigger_type text NOT NULL,
    actions jsonb NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- 4. PRIMARY KEY 제약조건
-- ============================================

ALTER TABLE public.attachments ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.channel_members ADD CONSTRAINT channel_members_pkey PRIMARY KEY (channel_id, user_id);
ALTER TABLE public.channels ADD CONSTRAINT channels_pkey PRIMARY KEY (id);
ALTER TABLE public.custom_emojis ADD CONSTRAINT custom_emojis_pkey PRIMARY KEY (id);
ALTER TABLE public.drafts ADD CONSTRAINT drafts_pkey PRIMARY KEY (user_id, channel_id);
ALTER TABLE public.invitations ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);
ALTER TABLE public.members ADD CONSTRAINT members_pkey PRIMARY KEY (id);
ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE public.pins ADD CONSTRAINT pins_pkey PRIMARY KEY (channel_id, message_id);
ALTER TABLE public.presences ADD CONSTRAINT presences_pkey PRIMARY KEY (user_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.reactions ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);
ALTER TABLE public.read_receipts ADD CONSTRAINT read_receipts_pkey PRIMARY KEY (user_id, channel_id);
ALTER TABLE public.reminders ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);
ALTER TABLE public.saves ADD CONSTRAINT saves_pkey PRIMARY KEY (user_id, message_id);
ALTER TABLE public.threads ADD CONSTRAINT threads_pkey PRIMARY KEY (parent_message_id);
ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);
ALTER TABLE public.workflow_automations ADD CONSTRAINT workflow_automations_pkey PRIMARY KEY (id);
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);

-- ============================================
-- 5. UNIQUE 제약조건
-- ============================================

ALTER TABLE public.channels ADD CONSTRAINT channels_workspace_id_name_key UNIQUE (workspace_id, name);
ALTER TABLE public.custom_emojis ADD CONSTRAINT custom_emojis_workspace_id_name_key UNIQUE (workspace_id, name);
ALTER TABLE public.invitations ADD CONSTRAINT invitations_code_key UNIQUE (code);
ALTER TABLE public.members ADD CONSTRAINT members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);
ALTER TABLE public.reactions ADD CONSTRAINT reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_slug_key UNIQUE (slug);

-- ============================================
-- 6. 외래키 제약조건
-- ============================================

ALTER TABLE public.attachments ADD CONSTRAINT attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.attachments ADD CONSTRAINT attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.channel_members ADD CONSTRAINT channel_members_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels (id) ON DELETE CASCADE;
ALTER TABLE public.channel_members ADD CONSTRAINT channel_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.channels ADD CONSTRAINT channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.channels ADD CONSTRAINT channels_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;
ALTER TABLE public.custom_emojis ADD CONSTRAINT custom_emojis_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.custom_emojis ADD CONSTRAINT custom_emojis_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;
ALTER TABLE public.drafts ADD CONSTRAINT drafts_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels (id) ON DELETE CASCADE;
ALTER TABLE public.drafts ADD CONSTRAINT drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.invitations ADD CONSTRAINT invitations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;
ALTER TABLE public.members ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.members ADD CONSTRAINT members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels (id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.pins ADD CONSTRAINT pins_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels (id) ON DELETE CASCADE;
ALTER TABLE public.pins ADD CONSTRAINT pins_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.pins ADD CONSTRAINT pins_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES public.profiles (id);
ALTER TABLE public.presences ADD CONSTRAINT presences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.presences ADD CONSTRAINT presences_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id);
ALTER TABLE public.reactions ADD CONSTRAINT reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.reactions ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.read_receipts ADD CONSTRAINT read_receipts_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels (id) ON DELETE CASCADE;
ALTER TABLE public.read_receipts ADD CONSTRAINT read_receipts_last_read_message_id_fkey FOREIGN KEY (last_read_message_id) REFERENCES public.messages (id);
ALTER TABLE public.read_receipts ADD CONSTRAINT read_receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD CONSTRAINT reminders_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD CONSTRAINT saves_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.saves ADD CONSTRAINT saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.threads ADD CONSTRAINT threads_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels (id) ON DELETE CASCADE;
ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;
ALTER TABLE public.workflow_automations ADD CONSTRAINT workflow_automations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles (id);

-- ============================================
-- 7. 인덱스 생성
-- ============================================

CREATE UNIQUE INDEX attachments_pkey ON public.attachments USING btree (id);
CREATE UNIQUE INDEX channel_members_pkey ON public.channel_members USING btree (channel_id, user_id);
CREATE INDEX idx_channel_members_channel_user ON public.channel_members USING btree (channel_id, user_id);
CREATE INDEX idx_channel_members_user ON public.channel_members USING btree (user_id);
CREATE INDEX idx_channel_members_user_workspace ON public.channel_members USING btree (user_id);
CREATE UNIQUE INDEX channels_pkey ON public.channels USING btree (id);
CREATE UNIQUE INDEX channels_workspace_id_name_key ON public.channels USING btree (workspace_id, name);
CREATE UNIQUE INDEX custom_emojis_pkey ON public.custom_emojis USING btree (id);
CREATE UNIQUE INDEX custom_emojis_workspace_id_name_key ON public.custom_emojis USING btree (workspace_id, name);
CREATE UNIQUE INDEX drafts_pkey ON public.drafts USING btree (user_id, channel_id);
CREATE UNIQUE INDEX invitations_code_key ON public.invitations USING btree (code);
CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id);
CREATE INDEX idx_members_user_workspace ON public.members USING btree (user_id, workspace_id);
CREATE INDEX idx_members_workspace_role ON public.members USING btree (workspace_id, role);
CREATE INDEX idx_members_workspace_user ON public.members USING btree (workspace_id, user_id);
CREATE UNIQUE INDEX members_pkey ON public.members USING btree (id);
CREATE UNIQUE INDEX members_workspace_id_user_id_key ON public.members USING btree (workspace_id, user_id);
CREATE INDEX idx_messages_channel_created ON public.messages USING btree (channel_id, created_at DESC);
CREATE INDEX idx_messages_content_fts ON public.messages USING gin (to_tsvector('english'::regconfig, content));
CREATE INDEX idx_messages_parent ON public.messages USING btree (parent_id);
CREATE INDEX idx_messages_parent_id ON public.messages USING btree (parent_id);
CREATE INDEX idx_messages_user_created ON public.messages USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);
CREATE UNIQUE INDEX pins_pkey ON public.pins USING btree (channel_id, message_id);
CREATE UNIQUE INDEX presences_pkey ON public.presences USING btree (user_id);
CREATE INDEX idx_profiles_deleted_at ON public.profiles USING btree (deleted_at);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE INDEX idx_reactions_message ON public.reactions USING btree (message_id);
CREATE INDEX idx_reactions_message_emoji ON public.reactions USING btree (message_id, emoji);
CREATE INDEX idx_reactions_user ON public.reactions USING btree (user_id);
CREATE UNIQUE INDEX reactions_message_id_user_id_emoji_key ON public.reactions USING btree (message_id, user_id, emoji);
CREATE UNIQUE INDEX reactions_pkey ON public.reactions USING btree (id);
CREATE INDEX idx_read_receipts_user_channel ON public.read_receipts USING btree (user_id, channel_id);
CREATE UNIQUE INDEX read_receipts_pkey ON public.read_receipts USING btree (user_id, channel_id);
CREATE UNIQUE INDEX reminders_pkey ON public.reminders USING btree (id);
CREATE UNIQUE INDEX saves_pkey ON public.saves USING btree (user_id, message_id);
CREATE UNIQUE INDEX threads_pkey ON public.threads USING btree (parent_message_id);
CREATE UNIQUE INDEX webhooks_pkey ON public.webhooks USING btree (id);
CREATE UNIQUE INDEX workflow_automations_pkey ON public.workflow_automations USING btree (id);
CREATE INDEX idx_workspaces_owner ON public.workspaces USING btree (owner_id);
CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);
CREATE UNIQUE INDEX workspaces_slug_key ON public.workspaces USING btree (slug);

-- ============================================
-- 8. 함수 생성
-- ============================================

-- 8.1 사용자 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 프로필이 이미 존재하는 경우 (재가입)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = new.id) THEN
    -- 재가입 시 프로필 복구 (deleted_at을 NULL로 설정하고 사용자 이름도 업데이트)
    UPDATE profiles
    SET 
      deleted_at = NULL,
      username = COALESCE(
        new.raw_user_meta_data->>'username', 
        split_part(new.email, '@', 1),
        profiles.username
      ),
      full_name = COALESCE(
        new.raw_user_meta_data->>'full_name', 
        split_part(new.email, '@', 1),
        profiles.full_name
      ),
      avatar_url = COALESCE(
        new.raw_user_meta_data->>'avatar_url', 
        profiles.avatar_url
      ),
      updated_at = NOW()
    WHERE id = new.id;
  ELSE
    -- 새 회원가입: 프로필 생성
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'avatar_url'
    );
  END IF;
  
  RETURN new;
END;
$function$;

-- 8.2 수정 시간 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 8.3 스레드 상세 정보 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_thread_details()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    INSERT INTO public.threads (parent_message_id, reply_count, last_reply_at, participant_count)
    VALUES (NEW.parent_id, 1, NEW.created_at, 1)
    ON CONFLICT (parent_message_id)
    DO UPDATE SET
      reply_count = threads.reply_count + 1,
      last_reply_at = NEW.created_at;
  END IF;
  RETURN NEW;
END;
$function$;

-- 8.4 이메일 자동 확인 함수 (트리거용)
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- auth.users 테이블의 email_confirmed_at을 현재 시간으로 설정
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$function$;

-- 8.5 이메일 자동 확인 함수 (RPC용)
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email(user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- auth.users 테이블의 email_confirmed_at을 현재 시간으로 설정
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = user_id_param;
END;
$function$;

-- 8.6 이메일 존재 확인 함수
CREATE OR REPLACE FUNCTION public.check_email_exists(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  email_exists boolean;
  user_id uuid;
BEGIN
  -- auth.users 테이블에서 이메일로 사용자 ID 찾기
  SELECT id INTO user_id
  FROM auth.users 
  WHERE email = user_email
  LIMIT 1;
  
  -- 사용자가 존재하지 않으면 false 반환
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- profiles 테이블에서 해당 사용자의 deleted_at 확인
  -- deleted_at이 NULL이면 활성 회원 (중복)
  -- deleted_at이 있으면 탈퇴한 회원 (재가입 가능)
  SELECT (deleted_at IS NULL) INTO email_exists
  FROM profiles
  WHERE id = user_id;
  
  -- 프로필이 없으면 (새 계정) false 반환
  IF email_exists IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN email_exists;
END;
$function$;

-- 8.7 사용자 삭제 여부 확인 함수
CREATE OR REPLACE FUNCTION public.is_user_deleted(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_id_val uuid;
  deleted_at_val timestamptz;
BEGIN
  -- 이메일로 사용자 ID 찾기
  SELECT id INTO user_id_val
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  -- 사용자가 없으면 false 반환
  IF user_id_val IS NULL THEN
    RETURN false;
  END IF;

  -- 프로필에서 deleted_at 확인 (최신 상태)
  SELECT deleted_at INTO deleted_at_val
  FROM public.profiles
  WHERE id = user_id_val;

  -- 프로필이 없으면 false 반환 (새로 가입한 사용자)
  IF deleted_at_val IS NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_val) THEN
    RETURN false;
  END IF;

  -- deleted_at이 NULL이 아니면 탈퇴한 회원 (true 반환)
  -- deleted_at이 NULL이면 활성 회원 (false 반환)
  RETURN deleted_at_val IS NOT NULL;
END;
$function$;

-- 8.8 프로필 복구 함수 (UUID)
CREATE OR REPLACE FUNCTION public.restore_user_profile(user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 프로필이 존재하고 deleted_at이 NULL이 아니면 복구
  UPDATE profiles
  SET 
    deleted_at = NULL,
    updated_at = NOW()
  WHERE id = user_id_param
    AND deleted_at IS NOT NULL;
END;
$function$;

-- 8.9 프로필 복구 함수 (UUID + 사용자 정보)
CREATE OR REPLACE FUNCTION public.restore_user_profile(user_id_param uuid, username_param text DEFAULT NULL::text, full_name_param text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_exists boolean;
  profile_exists boolean;
  rows_updated integer;
  retry_count integer := 0;
  max_retries integer := 5;
  user_email text;
BEGIN
  -- auth.users에 사용자가 존재하는지 확인 (재시도)
  LOOP
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id_param) INTO user_exists;
    
    IF user_exists THEN
      -- 사용자 이메일 가져오기
      SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
      EXIT; -- 사용자가 존재하면 루프 종료
    END IF;
    
    retry_count := retry_count + 1;
    
    IF retry_count >= max_retries THEN
      -- 최대 재시도 횟수에 도달하면 함수 종료 (에러 발생하지 않음)
      -- 트리거가 나중에 처리할 것임
      RETURN;
    END IF;
    
    -- 200ms 대기 후 재시도
    PERFORM pg_sleep(0.2);
  END LOOP;
  
  -- 프로필 존재 여부 확인
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id_param) INTO profile_exists;
  
  IF profile_exists THEN
    -- 프로필이 존재하면 무조건 deleted_at을 NULL로 설정하고 사용자 이름도 업데이트
    UPDATE profiles
    SET 
      deleted_at = NULL,
      username = COALESCE(NULLIF(username_param, ''), split_part(COALESCE(user_email, ''), '@', 1), username),
      full_name = COALESCE(NULLIF(full_name_param, ''), split_part(COALESCE(user_email, ''), '@', 1), full_name),
      updated_at = NOW()
    WHERE id = user_id_param;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
  ELSE
    -- 프로필이 없으면 새로 생성
    INSERT INTO profiles (id, username, full_name, deleted_at)
    VALUES (
      user_id_param,
      COALESCE(NULLIF(username_param, ''), split_part(COALESCE(user_email, ''), '@', 1), 'User'),
      COALESCE(NULLIF(full_name_param, ''), split_part(COALESCE(user_email, ''), '@', 1), 'User'),
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      deleted_at = NULL,
      username = COALESCE(NULLIF(username_param, ''), split_part(COALESCE(user_email, ''), '@', 1), profiles.username),
      full_name = COALESCE(NULLIF(full_name_param, ''), split_part(COALESCE(user_email, ''), '@', 1), profiles.full_name),
      updated_at = NOW();
  END IF;
END;
$function$;

-- 8.10 프로필 복구 함수 (이메일)
CREATE OR REPLACE FUNCTION public.restore_user_profile_by_email(user_email text, username_param text DEFAULT NULL::text, full_name_param text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_id_val uuid;
  profile_exists boolean;
  rows_updated integer;
  retry_count integer := 0;
  max_retries integer := 5;
BEGIN
  -- 이메일로 사용자 ID 찾기 (재시도)
  LOOP
    SELECT id INTO user_id_val
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
    
    IF user_id_val IS NOT NULL THEN
      EXIT; -- 사용자를 찾으면 루프 종료
    END IF;
    
    retry_count := retry_count + 1;
    
    IF retry_count >= max_retries THEN
      -- 최대 재시도 횟수에 도달하면 함수 종료 (에러 발생하지 않음)
      -- 트리거가 나중에 처리할 것임
      RETURN;
    END IF;
    
    -- 200ms 대기 후 재시도
    PERFORM pg_sleep(0.2);
  END LOOP;
  
  -- 프로필 존재 여부 확인
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id_val) INTO profile_exists;
  
  IF profile_exists THEN
    -- 프로필이 존재하면 deleted_at을 NULL로 설정하고 사용자 이름도 업데이트
    UPDATE profiles
    SET 
      deleted_at = NULL,
      username = COALESCE(NULLIF(username_param, ''), split_part(user_email, '@', 1), username),
      full_name = COALESCE(NULLIF(full_name_param, ''), split_part(user_email, '@', 1), full_name),
      updated_at = NOW()
    WHERE id = user_id_val;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
  ELSE
    -- 프로필이 없으면 새로 생성
    INSERT INTO profiles (id, username, full_name, deleted_at)
    VALUES (
      user_id_val,
      COALESCE(NULLIF(username_param, ''), split_part(user_email, '@', 1), 'User'),
      COALESCE(NULLIF(full_name_param, ''), split_part(user_email, '@', 1), 'User'),
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      deleted_at = NULL,
      username = COALESCE(NULLIF(username_param, ''), split_part(user_email, '@', 1), profiles.username),
      full_name = COALESCE(NULLIF(full_name_param, ''), split_part(user_email, '@', 1), profiles.full_name),
      updated_at = NOW();
  END IF;
END;
$function$;

-- 8.11 사용자 이메일 가져오기 함수
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT email FROM auth.users WHERE id = user_id;
$function$;

-- 8.12 접근 가능한 채널 ID 목록 가져오기 함수
CREATE OR REPLACE FUNCTION public.get_my_accessible_channel_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT channel_id FROM channel_members WHERE user_id = auth.uid();
$function$;

-- 8.13 접근 가능한 워크스페이스 ID 목록 가져오기 함수
CREATE OR REPLACE FUNCTION public.get_my_workspace_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT workspace_id FROM members WHERE user_id = auth.uid();
$function$;

-- 8.14 워크스페이스 관리자 확인 함수
CREATE OR REPLACE FUNCTION public.is_workspace_admin(lookup_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM members 
    WHERE workspace_id = lookup_workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
$function$;

-- 8.15 워크스페이스 멤버 확인 함수
CREATE OR REPLACE FUNCTION public.is_workspace_member(lookup_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM members 
    WHERE workspace_id = lookup_workspace_id 
    AND user_id = auth.uid()
  );
$function$;

-- 8.16 채널 멤버 확인 함수
CREATE OR REPLACE FUNCTION public.is_channel_member(lookup_channel_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_id = lookup_channel_id 
    AND user_id = auth.uid()
  );
$function$;

-- 8.17 초대 코드로 워크스페이스 참여 함수
CREATE OR REPLACE FUNCTION public.join_workspace_by_code(invite_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite record;
  v_workspace_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- 1. Check invitation validity
  SELECT * INTO v_invite
  FROM invitations
  WHERE code = invite_code;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION '유효하지 않은 초대 코드입니다.';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION '만료된 초대 코드입니다.';
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN
    RAISE EXCEPTION '사용 횟수가 초과된 초대 코드입니다.';
  END IF;

  v_workspace_id := v_invite.workspace_id;

  -- 2. Check if already a member
  IF EXISTS (SELECT 1 FROM members WHERE workspace_id = v_workspace_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION '이미 해당 워크스페이스의 멤버입니다.';
  END IF;

  -- 3. Add member
  INSERT INTO members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'member');

  -- 4. Update usage count
  UPDATE invitations
  SET used_count = used_count + 1
  WHERE id = v_invite.id;

  RETURN v_workspace_id;
END;
$function$;

-- ============================================
-- 9. 트리거 생성
-- ============================================

-- 9.1 새 사용자 프로필 자동 생성 트리거
-- 주의: auth.users 테이블에 트리거를 생성해야 합니다.
-- Supabase 대시보드에서 직접 설정하거나 다음 SQL을 실행하세요:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9.2 프로필 수정 시간 자동 업데이트 트리거
CREATE TRIGGER update_profiles_modtime 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

-- 9.3 메시지 수정 시간 자동 업데이트 트리거
CREATE TRIGGER update_messages_modtime 
  BEFORE UPDATE ON public.messages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

-- 9.4 스레드 상세 정보 자동 업데이트 트리거
CREATE TRIGGER on_thread_message_created 
  AFTER INSERT ON public.messages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_thread_details();

-- ============================================
-- 10. RLS (Row Level Security) 활성화
-- ============================================

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. RLS 정책 생성
-- ============================================

-- 11.1 Profiles 정책
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 11.2 Workspaces 정책
CREATE POLICY "workspaces_select_public" ON public.workspaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "workspaces_insert" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspaces_update" ON public.workspaces FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspaces_delete" ON public.workspaces FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- 11.3 Members 정책
CREATE POLICY "members_select" ON public.members FOR SELECT TO authenticated USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "members_insert" ON public.members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update" ON public.members FOR UPDATE TO authenticated USING (is_workspace_admin(workspace_id)) WITH CHECK (is_workspace_admin(workspace_id));
CREATE POLICY "members_delete" ON public.members FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR is_workspace_admin(workspace_id));

-- 11.4 Channels 정책
CREATE POLICY "channels_select" ON public.channels FOR SELECT TO authenticated USING (id IN (SELECT get_my_accessible_channel_ids()));
CREATE POLICY "channels_insert_public" ON public.channels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "channels_update" ON public.channels FOR UPDATE TO authenticated USING ((created_by = auth.uid()) OR is_workspace_admin(workspace_id)) WITH CHECK ((created_by = auth.uid()) OR is_workspace_admin(workspace_id));
CREATE POLICY "channels_delete" ON public.channels FOR DELETE TO authenticated USING (is_workspace_admin(workspace_id));

-- 11.5 Channel Members 정책
CREATE POLICY "channel_members_select" ON public.channel_members FOR SELECT TO authenticated USING (channel_id IN (SELECT get_my_accessible_channel_ids()));
CREATE POLICY "channel_members_select_policy" ON public.channel_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "channel_members_insert_public" ON public.channel_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "channel_members_delete" ON public.channel_members FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM channels c WHERE ((c.id = channel_members.channel_id) AND is_workspace_admin(c.workspace_id)))));

-- 11.6 Messages 정책
CREATE POLICY "messages_select_public" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert_public" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM channels c WHERE ((c.id = messages.channel_id) AND is_workspace_admin(c.workspace_id)))));
CREATE POLICY "messages_all_policy" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "messages_all_policy_anon" ON public.messages FOR ALL TO anon USING (true) WITH CHECK (true);

-- 11.7 Threads 정책
CREATE POLICY "threads_all" ON public.threads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11.8 Reactions 정책
CREATE POLICY "reactions_select" ON public.reactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messages m WHERE ((m.id = reactions.message_id) AND (m.channel_id IN (SELECT get_my_accessible_channel_ids())))));
CREATE POLICY "reactions_insert" ON public.reactions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()) AND (EXISTS (SELECT 1 FROM messages m WHERE ((m.id = reactions.message_id) AND (m.channel_id IN (SELECT get_my_accessible_channel_ids()))))));
CREATE POLICY "reactions_delete" ON public.reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 11.9 Attachments 정책
CREATE POLICY "attachments_select" ON public.attachments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messages m WHERE ((m.id = attachments.message_id) AND (m.channel_id IN (SELECT get_my_accessible_channel_ids())))));
CREATE POLICY "attachments_insert" ON public.attachments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "attachments_delete" ON public.attachments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 11.10 Presences 정책
CREATE POLICY "presences_select" ON public.presences FOR SELECT TO authenticated USING (true);
CREATE POLICY "presences_all" ON public.presences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 11.11 Pins 정책
CREATE POLICY "pins_all" ON public.pins FOR ALL TO authenticated USING (pinned_by = auth.uid()) WITH CHECK (pinned_by = auth.uid());

-- 11.12 Saves 정책
CREATE POLICY "saves_all" ON public.saves FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 11.13 Reminders 정책
CREATE POLICY "reminders_all" ON public.reminders FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 11.14 Drafts 정책
CREATE POLICY "drafts_all" ON public.drafts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 11.15 Read Receipts 정책
CREATE POLICY "read_receipts_all" ON public.read_receipts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 11.16 Invitations 정책
CREATE POLICY "Admins can view invitations" ON public.invitations FOR SELECT TO public USING (EXISTS (SELECT 1 FROM members WHERE ((members.workspace_id = invitations.workspace_id) AND (members.user_id = auth.uid()) AND (members.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))));
CREATE POLICY "Admins can create invitations" ON public.invitations FOR INSERT TO public WITH CHECK ((EXISTS (SELECT 1 FROM members WHERE ((members.workspace_id = invitations.workspace_id) AND (members.user_id = auth.uid()) AND (members.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role]))))) AND (auth.uid() = created_by));
CREATE POLICY "Admins can delete invitations" ON public.invitations FOR DELETE TO public USING (EXISTS (SELECT 1 FROM members WHERE ((members.workspace_id = invitations.workspace_id) AND (members.user_id = auth.uid()) AND (members.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])))));

-- 11.17 Custom Emojis 정책 (기본적으로 워크스페이스 멤버만 접근 가능하도록 설정 필요)
-- 필요시 추가 정책을 생성하세요.

-- 11.18 Webhooks 정책 (기본적으로 워크스페이스 관리자만 접근 가능하도록 설정 필요)
-- 필요시 추가 정책을 생성하세요.

-- 11.19 Workflow Automations 정책 (기본적으로 워크스페이스 관리자만 접근 가능하도록 설정 필요)
-- 필요시 추가 정책을 생성하세요.

-- ============================================
-- 12. Storage 버킷 설정 (수동 설정 필요)
-- ============================================

-- Storage 버킷은 Supabase 대시보드에서 수동으로 생성해야 합니다.
-- 일반적으로 다음 버킷이 필요합니다:
-- - 'avatars': 사용자 프로필 이미지
-- - 'attachments': 파일 첨부
-- - 'workspace-icons': 워크스페이스 아이콘

-- Storage 정책 예시:
-- CREATE POLICY "Avatar images are publicly accessible"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');

-- CREATE POLICY "Users can upload their own avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 13. Realtime 설정 (Supabase 대시보드에서 설정)
-- ============================================

-- Realtime은 Supabase 대시보드의 Database > Replication에서 활성화해야 합니다.
-- 일반적으로 다음 테이블에 Realtime을 활성화합니다:
-- - messages
-- - reactions
-- - channel_members
-- - presences
-- - threads

-- ============================================
-- 완료
-- ============================================

-- 이 스키마를 실행한 후:
-- 1. Supabase 대시보드에서 auth.users 테이블에 handle_new_user 트리거를 설정하세요.
-- 2. Storage 버킷을 생성하고 정책을 설정하세요.
-- 3. Realtime을 활성화할 테이블을 선택하세요.
-- 4. 필요에 따라 추가 RLS 정책을 생성하세요.

