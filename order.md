# Twin Track AI — 클릭 순서 완전 가이드

> 이 문서 하나만 보고 처음부터 끝까지 배포할 수 있도록 작성됨.
> 모든 클릭, 모든 붙여넣기 내용이 포함됨.

---

## 준비: 값 메모장

아래 항목들을 메모장(또는 텍스트 편집기)에 복사해두고, 진행하면서 채워넣으세요.

```
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

AUTH_SECRET=
ENCRYPTION_KEY=

BACKEND_URL=           (Modal 배포 후 채움)
VERCEL_URL=            (Vercel 배포 후 채움)
```

---

## STEP 1 — Supabase

### 1-1. 프로젝트 생성

1. 브라우저에서 **https://supabase.com** 열기
2. 우측 상단 **"Start your project"** 버튼 클릭
3. **"Continue with GitHub"** 클릭 → GitHub 로그인
4. 로그인 후 대시보드로 이동됨
5. 좌측 상단 조직 옆 **"New project"** 버튼 클릭
6. 아래 값 입력:
   - **Name**: `twin-track-ai`
   - **Database Password**: 아무 비밀번호 (저장 안 해도 됨)
   - **Region**: `Northeast Asia (Seoul)` 선택
   - **Pricing plan**: `Free` 확인
7. **"Create new project"** 버튼 클릭
8. 초록색 로딩 바가 사라질 때까지 대기 (약 1~2분)

---

### 1-2. 환경변수 수집

1. 왼쪽 사이드바 맨 아래 **톱니바퀴 아이콘 (Project Settings)** 클릭
2. 왼쪽 서브메뉴에서 **"API"** 클릭
3. **"Project URL"** 섹션에서 URL 복사 → 메모장 `SUPABASE_URL=` 옆에 붙여넣기
4. **"Project API keys"** 섹션에서:
   - `anon` `public` 행 → 오른쪽 복사 아이콘 클릭 → 메모장 `NEXT_PUBLIC_SUPABASE_ANON_KEY=` 옆에 붙여넣기
   - `service_role` `secret` 행 → **"Reveal"** 버튼 클릭 → 복사 → 메모장 `SUPABASE_SERVICE_ROLE_KEY=` 옆에 붙여넣기

---

### 1-3. DB 마이그레이션 실행

1. 왼쪽 사이드바에서 **"SQL Editor"** (코드 모양 아이콘) 클릭
2. 화면 왼쪽 패널 상단 **"New query"** 버튼 클릭
3. 에디터 영역에 아래 SQL 전체를 붙여넣기 (기존 내용 지우고):

```sql
-- Twin Track AI — DB Schema
-- Note: auth.users 참조 제거 (NextAuth 사용으로 Supabase Auth 미사용)

-- 유저 프로필
CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  llm_provider TEXT CHECK (llm_provider IN ('openai', 'anthropic')),
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

ALTER TABLE feed_messages REPLICA IDENTITY FULL;
```

4. 에디터 우측 하단 **"RUN"** 버튼 클릭 (또는 `Cmd+Enter`)
5. 하단 결과 패널에 **"Success. No rows returned"** 또는 테이블 생성 성공 메시지 확인

---

### 1-4. Realtime 활성화

1. 왼쪽 사이드바에서 **"Database"** 클릭
2. 나타나는 서브메뉴에서 **"Replication"** 클릭
3. **"Source"** 탭이 기본 선택된 상태 확인
4. 테이블 목록에서 **`feed_messages`** 행 찾기
5. 해당 행 오른쪽 끝의 토글 스위치를 클릭해 **파란색(ON)** 으로 변경
6. 자동 저장됨 (별도 저장 버튼 없음)

---

## STEP 2 — Google OAuth

### 2-1. 프로젝트 생성

1. 브라우저에서 **https://console.cloud.google.com** 열기
2. Google 계정으로 로그인
3. 상단 헤더 중간에 프로젝트 드롭다운 (처음엔 "My First Project" 같은 이름) 클릭
4. 팝업 우측 상단 **"새 프로젝트"** 버튼 클릭
5. **프로젝트 이름**: `Twin Track AI` 입력
6. **"만들기"** 버튼 클릭
7. 상단 알림(벨) 아이콘에서 생성 완료 확인 → **"프로젝트 선택"** 링크 클릭 (또는 프로젝트 드롭다운에서 `Twin Track AI` 선택)

---

### 2-2. OAuth 동의 화면 설정

1. 왼쪽 햄버거 메뉴(≡) → **"API 및 서비스"** → **"OAuth 동의 화면"** 클릭
2. **User Type**: **"외부(External)"** 라디오버튼 선택
3. **"만들기"** 버튼 클릭
4. 아래 값 입력:
   - **앱 이름**: `Twin Track AI`
   - **사용자 지원 이메일**: 드롭다운에서 본인 이메일 선택
   - **개발자 연락처 이메일**: 본인 이메일 직접 입력
5. **"저장 후 계속"** 버튼 클릭
6. **"범위"** 페이지: 아무것도 추가하지 않고 **"저장 후 계속"** 클릭
7. **"테스트 사용자"** 페이지: **"+ ADD USERS"** 클릭 → 본인 이메일 입력 → Enter → **"추가"** 클릭 → **"저장 후 계속"** 클릭
8. **"요약"** 페이지: **"대시보드로 돌아가기"** 클릭

---

### 2-3. OAuth 클라이언트 ID 발급

1. 왼쪽 메뉴에서 **"사용자 인증 정보"** 클릭
2. 상단 **"+ 사용자 인증 정보 만들기"** 클릭
3. 드롭다운에서 **"OAuth 클라이언트 ID"** 클릭
4. **애플리케이션 유형**: 드롭다운에서 **"웹 애플리케이션"** 선택
5. **이름**: `Twin Track AI Web` (자유 입력)
6. **"승인된 리디렉션 URI"** 섹션에서 **"+ URI 추가"** 버튼 클릭
7. 입력창에 아래 값 붙여넣기:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
8. **"만들기"** 버튼 클릭
9. 팝업이 뜸:
   - **"클라이언트 ID"** 오른쪽 복사 아이콘 클릭 → 메모장 `AUTH_GOOGLE_ID=` 옆에 붙여넣기
   - **"클라이언트 보안 비밀"** 오른쪽 복사 아이콘 클릭 → 메모장 `AUTH_GOOGLE_SECRET=` 옆에 붙여넣기
10. **"확인"** 클릭

---

## STEP 3 — 암호화 키 생성 (터미널)

터미널(Terminal.app 또는 iTerm2)을 열고 아래 명령어를 **순서대로** 실행:

### AUTH_SECRET 생성

```bash
openssl rand -base64 32
```

출력값 예시: `k3Gf8...` (긴 문자열)
→ 메모장 `AUTH_SECRET=` 옆에 붙여넣기

### ENCRYPTION_KEY 생성

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> `cryptography` 없으면 먼저 설치: `pip3 install cryptography`

출력값 예시: `TlTTdL8...=` (44자 문자열)
→ 메모장 `ENCRYPTION_KEY=` 옆에 붙여넣기

---

## STEP 4 — Modal (백엔드 배포)

### 4-1. Modal 계정 생성

1. 브라우저에서 **https://modal.com** 열기
2. **"Sign up"** 버튼 클릭
3. **"Continue with GitHub"** 클릭 → GitHub 로그인
4. 계정 생성 완료 후 대시보드로 이동

---

### 4-2. Modal CLI 설치 및 로그인

터미널에서:

```bash
pip3 install modal
```

설치 완료 후:

```bash
modal token new
```

브라우저가 자동으로 열리면 → **"Allow"** 버튼 클릭
터미널에 `Token stored` 메시지 확인

---

### 4-3. Secret 등록

1. 브라우저에서 **https://modal.com/secrets** 접속 (또는 Modal 대시보드 왼쪽 **"Secrets"** 클릭)
2. **"Create secret"** 버튼 클릭
3. 화면에서 **"Custom"** 선택
4. **Secret name**: `twin-track-ai` 입력
5. 아래 키-값 쌍을 입력 (각 줄마다 **"+"** 아이콘 클릭해서 새 행 추가):

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | 메모장의 `SUPABASE_URL` 값 |
   | `SUPABASE_SERVICE_ROLE_KEY` | 메모장의 `SUPABASE_SERVICE_ROLE_KEY` 값 |
   | `ENCRYPTION_KEY` | 메모장의 `ENCRYPTION_KEY` 값 |
   | `ALLOWED_ORIGINS` | `http://localhost:3000` (Vercel 배포 후 변경 예정) |

6. **"Save"** 버튼 클릭

---

### 4-4. 백엔드 배포

터미널에서 아래 명령 실행:

```bash
cd /Users/hyeongchan/개발/money/vibe-builder/twin-track-ai
modal deploy backend/modal_app.py
```

배포 완료 후 터미널 출력 예시:
```
✓ Created objects.
├── 🔨 Created function run_worker.
└── 🔨 Created function fastapi_app.
└── 🌐 Web endpoint deployed: https://계정명--twin-track-ai-fastapi-app.modal.run
```

→ 마지막 줄 URL을 복사해서 메모장 `BACKEND_URL=` 옆에 붙여넣기

확인: 브라우저에서 `https://[위 URL]/health` 접속 → `{"status":"ok","service":"twin-track-ai"}` 응답 확인

---

## STEP 5 — Vercel (프론트엔드 배포)

### 5-1. 코드를 GitHub에 올리기

> 아직 GitHub에 올리지 않았다면 먼저 실행:

```bash
cd /Users/hyeongchan/개발/money/vibe-builder
git add .
git commit -m "Twin Track AI MVP"
git push
```

---

### 5-2. Vercel 프로젝트 생성

1. 브라우저에서 **https://vercel.com** 열기
2. **"Sign Up"** 또는 **"Log In"** → **"Continue with GitHub"** 클릭
3. 로그인 후 대시보드에서 **"Add New…"** → **"Project"** 클릭
4. GitHub 저장소 목록에서 해당 저장소 찾기 → **"Import"** 버튼 클릭

---

### 5-3. 빌드 설정

Import 화면에서:

1. **"Root Directory"** 옆 **"Edit"** 클릭
2. 폴더 트리에서 `twin-track-ai` → `frontend` 선택 → **"Continue"** 클릭
3. **Framework Preset**: `Next.js` 자동 감지됨 (그대로 두기)
4. **Build Command**: `next build` (기본값 그대로)
5. **Output Directory**: `.next` (기본값 그대로)

---

### 5-4. 환경변수 입력

같은 화면 하단 **"Environment Variables"** 섹션에서 아래 항목을 **하나씩** 입력:

> 입력 방법: **"Key"** 칸에 키 이름 → **"Value"** 칸에 값 → **"Add"** 버튼 클릭

| Key | Value |
|-----|-------|
| `AUTH_SECRET` | 메모장의 `AUTH_SECRET` 값 |
| `AUTH_URL` | `https://twin-track-ai.vercel.app` ← **일단 이렇게 입력 (배포 후 실제 URL로 수정)** |
| `AUTH_GOOGLE_ID` | 메모장의 `AUTH_GOOGLE_ID` 값 |
| `AUTH_GOOGLE_SECRET` | 메모장의 `AUTH_GOOGLE_SECRET` 값 |
| `NEXT_PUBLIC_SUPABASE_URL` | 메모장의 `SUPABASE_URL` 값 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 메모장의 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 값 |
| `SUPABASE_SERVICE_ROLE_KEY` | 메모장의 `SUPABASE_SERVICE_ROLE_KEY` 값 |
| `NEXT_PUBLIC_BACKEND_URL` | 메모장의 `BACKEND_URL` 값 (Modal URL) |
| `BACKEND_URL` | 메모장의 `BACKEND_URL` 값 (Modal URL) |

---

### 5-5. 배포 실행

1. **"Deploy"** 버튼 클릭
2. 배포 로그가 실시간으로 표시됨 (약 2~3분 소요)
3. 완료 후 **"Congratulations!"** 화면 표시
4. 표시된 URL 확인 (예: `https://twin-track-ai-abc123.vercel.app`)
   → 메모장 `VERCEL_URL=` 옆에 붙여넣기

---

## STEP 6 — 배포 후 업데이트 (3곳 수정)

### 6-1. Vercel 환경변수 `AUTH_URL` 수정

1. Vercel 대시보드 → 해당 프로젝트 클릭
2. 상단 **"Settings"** 탭 클릭
3. 왼쪽 메뉴 **"Environment Variables"** 클릭
4. `AUTH_URL` 항목 찾아서 오른쪽 **"Edit"** (연필 아이콘) 클릭
5. Value를 실제 URL로 수정:
   ```
   https://[실제-vercel-url].vercel.app
   ```
6. **"Save"** 클릭

---

### 6-2. Vercel 재배포 (환경변수 적용)

1. 상단 **"Deployments"** 탭 클릭
2. 목록 첫 번째 (최신) 배포 항목 오른쪽 **"..."** 메뉴 클릭
3. **"Redeploy"** 클릭
4. **"Redeploy"** 확인 버튼 클릭
5. 재배포 완료 대기 (약 2분)

---

### 6-3. Modal `ALLOWED_ORIGINS` 수정

1. **https://modal.com/secrets** 접속
2. `twin-track-ai` Secret 클릭 → **"Edit"** 버튼 클릭
3. `ALLOWED_ORIGINS` 값을 아래로 변경:
   ```
   https://[실제-vercel-url].vercel.app
   ```
4. **"Save"** 클릭
5. 터미널에서 Modal 재배포:
   ```bash
   cd /Users/hyeongchan/개발/money/vibe-builder/twin-track-ai
   modal deploy backend/modal_app.py
   ```

---

### 6-4. Google OAuth 리디렉션 URI 추가

1. **https://console.cloud.google.com** → `Twin Track AI` 프로젝트 선택 확인
2. 왼쪽 메뉴 **"API 및 서비스"** → **"사용자 인증 정보"** 클릭
3. `OAuth 2.0 클라이언트 ID` 목록에서 `Twin Track AI Web` 항목 오른쪽 **연필(편집) 아이콘** 클릭
4. **"승인된 리디렉션 URI"** 섹션에서 **"+ URI 추가"** 클릭
5. 아래 값 입력 (실제 Vercel URL로 변경):
   ```
   https://[실제-vercel-url].vercel.app/api/auth/callback/google
   ```
6. **"저장"** 버튼 클릭

---

## STEP 7 — 최종 확인

브라우저에서 아래 순서로 테스트:

1. `https://[vercel-url]` 접속 → 랜딩 페이지 로딩 확인
2. **"Google로 계속하기"** 버튼 클릭 → Google 로그인 창 뜨는지 확인
3. 로그인 완료 → 온보딩 화면 (API Key 입력) 나타나는지 확인
4. OpenAI 또는 Anthropic API Key 입력 후 **"저장"** 클릭
5. 대시보드로 이동 → URL 입력 후 테스트 시작 → 상태가 `queued`로 변하는지 확인

백엔드 헬스체크:
```
https://[modal-url]/health
```
→ `{"status":"ok","service":"twin-track-ai"}` 응답 확인

---

## 문제 발생 시

| 증상 | 원인 | 해결 |
|------|------|------|
| Google 로그인 후 "redirect_uri_mismatch" 에러 | OAuth 리디렉션 URI 미등록 | STEP 6-4 다시 확인 |
| 로그인 후 흰 화면 | `AUTH_URL` 환경변수 오류 | STEP 6-1 확인 후 재배포 |
| 테스트 시작 후 계속 queued | Modal 백엔드 미응답 | `BACKEND_URL` 환경변수 확인, Modal 로그 확인 |
| API Key 저장 실패 | `ENCRYPTION_KEY` 불일치 | Modal Secret의 `ENCRYPTION_KEY`와 Vercel의 값이 동일한지 확인 |
