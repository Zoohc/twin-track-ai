-- Twin Track AI — DB Schema
-- Note: auth.users 참조 제거 (NextAuth 사용으로 Supabase Auth 미사용)

-- 유저 프로필
CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  llm_provider TEXT CHECK (llm_provider IN ('openai', 'anthropic')),
  -- API Key 암호화 저장 (Fernet)
  llm_api_key_enc TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 페르소나 (user_id NULL = 기본 페르소나)
CREATE TABLE personas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기본 3개 페르소나 seed
INSERT INTO personas (id, user_id, name, description, system_prompt, is_default) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  NULL,
  '초보 유저',
  '기술에 익숙하지 않은 첫 방문 사용자',
  'You are a first-time user of this web service.
You are not tech-savvy. You read text carefully.
If something is unclear, you go back instead of trying.
You get frustrated if loading takes more than 3 seconds.
Your goal: explore the site as a new visitor and try to complete the main action.',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000002',
  NULL,
  '빠른 클릭 유저',
  '참을성 없이 빠르게 클릭하는 파워 유저',
  'You are an impatient power user.
You click quickly without reading all text.
You try to submit forms multiple times if nothing happens immediately.
You use browser back button frequently.
Your goal: complete main actions as fast as possible.',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000003',
  NULL,
  '모바일 유저',
  '모바일 기기에서 터치로 사용하는 사용자',
  'You are browsing on a mobile device (viewport: 390x844).
You use touch gestures (scroll, tap).
Check if all interactive elements are reachable by thumb.
Report any elements that are too small to tap or outside the viewport.',
  TRUE
);

-- 테스트 작업 (Job)
CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued', 'running', 'done', 'failed')),
  persona_ids UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
-- cursor 페이징용 인덱스
CREATE INDEX idx_jobs_user_created ON jobs(user_id, created_at DESC);

-- 리포트
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  score           INT CHECK (score BETWEEN 0 AND 100),
  summary         TEXT,
  issues          JSONB NOT NULL DEFAULT '[]',
  fix_pack        JSONB,
  video_url       TEXT,
  persona_results JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- cursor 페이징용 인덱스
CREATE INDEX idx_reports_user_created ON reports(user_id, created_at DESC);

-- 라이브 피드 메시지
CREATE TABLE feed_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  level      TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'success', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_feed_job_created ON feed_messages(job_id, created_at ASC);

-- feed_messages Realtime 활성화 (MVP: 공개 읽기 허용)
ALTER TABLE feed_messages REPLICA IDENTITY FULL;
