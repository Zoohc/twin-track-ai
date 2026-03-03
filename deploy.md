# Twin Track AI — 배포 가이드

**스택:** Supabase (DB) + Modal (백엔드) + Vercel (프론트엔드)
**비용:** $0 (무료 티어 기준)

---

## 배포 순서 (반드시 이 순서대로)

```
1. Supabase → 2. Google OAuth → 3. 키 생성 → 4. Modal → 5. Vercel → 6. OAuth URI 업데이트
```

---

## 1. Supabase

> **목적:** DB 스키마 생성 + 환경변수 수집

- [ ] https://supabase.com → 로그인 → **"New project"**
  - Name: `twin-track-ai`
  - Region: `Northeast Asia (Seoul)`
  - Plan: Free
- [ ] **Project Settings → API** 에서 수집:
  - `Project URL` → `SUPABASE_URL`
  - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` 키 (Reveal 클릭) → `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **SQL Editor → New query** → `supabase/migrations/001_init.sql` 전체 붙여넣기 → **RUN**
- [ ] **Database → Replication** → `feed_messages` 토글 활성화(파란색)

---

## 2. Google OAuth

> **목적:** Google 로그인 클라이언트 ID/Secret 발급

- [ ] https://console.cloud.google.com → 새 프로젝트 `Twin Track AI` 생성
- [ ] **API 및 서비스 → OAuth 동의 화면**
  - User Type: **외부(External)** → 만들기
  - 앱 이름: `Twin Track AI`, 지원 이메일 입력 → 저장 후 계속 (범위/테스트사용자 그냥 통과)
- [ ] **사용자 인증 정보 → + 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
  - 애플리케이션 유형: **웹 애플리케이션**
  - 승인된 리디렉션 URI: `http://localhost:3000/api/auth/callback/google` (일단 로컬만)
  - → 만들기
  - `클라이언트 ID` → `AUTH_GOOGLE_ID`
  - `클라이언트 보안 비밀` → `AUTH_GOOGLE_SECRET`

---

## 3. 암호화 키 생성

터미널에서 각각 실행:

```bash
# AUTH_SECRET (NextAuth 서명키)
openssl rand -base64 32

# ENCRYPTION_KEY (API Key 암호화)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 4. Modal (백엔드 배포)

> **목적:** FastAPI + AI 워커 서버리스 배포

- [ ] https://modal.com → GitHub 로그인 → 계정 생성
- [ ] 터미널:
  ```bash
  pip install modal
  modal token new   # 브라우저 열림 → Allow 클릭
  ```
- [ ] Modal 대시보드 → **Secrets → Create secret → Custom**
  - Secret 이름: `twin-track-ai`
  - 키-값 입력 (+ 버튼으로 각 행 추가):

  | Key | Value |
  |-----|-------|
  | `SUPABASE_URL` | Supabase Project URL |
  | `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 |
  | `ENCRYPTION_KEY` | Fernet 키 |
  | `ALLOWED_ORIGINS` | `http://localhost:3000` (Vercel URL 확정 후 변경) |

  → **Save**
- [ ] 터미널에서 배포:
  ```bash
  cd twin-track-ai
  modal deploy backend/modal_app.py
  ```
- [ ] 출력된 URL 메모: `https://계정명--twin-track-ai-fastapi.modal.run`
  → 이게 `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL`

---

## 5. Vercel (프론트엔드 배포)

> Next.js 완전 지원, $0 Hobby 플랜

- [ ] https://vercel.com → GitHub 로그인
- [ ] **"Add New → Project"** → GitHub 저장소 선택
- [ ] 설정:
  - **Root Directory**: `twin-track-ai/frontend`
  - Framework Preset: **Next.js** (자동 감지됨)
- [ ] **Environment Variables** 에 아래 추가:

  | Key | Value |
  |-----|-------|
  | `AUTH_SECRET` | openssl 결과 |
  | `AUTH_URL` | `https://[프로젝트명].vercel.app` (배포 완료 후 URL 확정) |
  | `AUTH_GOOGLE_ID` | Google 클라이언트 ID |
  | `AUTH_GOOGLE_SECRET` | Google 클라이언트 보안 비밀 |
  | `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon 키 |
  | `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 |
  | `NEXT_PUBLIC_BACKEND_URL` | Modal URL |
  | `BACKEND_URL` | Modal URL |

- [ ] **Deploy** 클릭
- [ ] 배포 완료 후 URL 확인: `https://[프로젝트명].vercel.app`

---

## 6. 배포 후 업데이트

### Google OAuth 리디렉션 URI 추가
- [ ] Google Cloud Console → **사용자 인증 정보** → OAuth 클라이언트 편집(연필 아이콘)
- [ ] 승인된 리디렉션 URI → **+ URI 추가**: `https://[vercel-url]/api/auth/callback/google`
- [ ] **저장**

### Vercel 환경변수 수정
- [ ] Vercel 프로젝트 → **Settings → Environment Variables**
- [ ] `AUTH_URL` 값을 실제 Vercel URL로 업데이트
- [ ] **Deployments → 최신 배포 → Redeploy** (환경변수 적용을 위해)

### Modal ALLOWED_ORIGINS 수정
- [ ] Modal 대시보드 → Secrets → `twin-track-ai` 편집
- [ ] `ALLOWED_ORIGINS` 값을 `https://[vercel-url]` 로 변경
- [ ] 터미널에서 재배포:
  ```bash
  modal deploy backend/modal_app.py
  ```

---

## 확인 체크리스트

- [ ] `https://[vercel-url]` 접속 → 랜딩 페이지 로딩
- [ ] Google 로그인 성공
- [ ] 온보딩 화면에서 API Key 입력
- [ ] 대시보드에서 URL 입력 후 테스트 시작 → `queued` 상태 확인
- [ ] `https://계정명--twin-track-ai-fastapi.modal.run/health` → `{"status":"ok"}` 응답

---

## 로컬 개발 (참고)

```bash
# 백엔드
cd twin-track-ai/backend
pip install -r requirements.txt && playwright install chromium
python -m uvicorn backend.main:app --reload --port 8000

# 프론트엔드 (새 터미널)
cd twin-track-ai/frontend
npm install && npm run dev
```

`.env.local` 및 `.env` 파일 필요 — task.md 4번 참고.
