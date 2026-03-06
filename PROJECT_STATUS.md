# Twin Track AI — 프로젝트 현황 및 구현 가이드

## 현황 요약

Twin Track AI는 AI 에이전트가 웹사이트를 자동 테스트하는 플랫폼입니다.
사용자가 URL을 입력하면 다양한 페르소나(초보 유저, 빠른 클릭 유저, 모바일 유저)로 테스트를 실행하고 리포트를 생성합니다.

### 기술 스택
- Frontend: Next.js 14 (App Router) + Vercel
- Backend: FastAPI + Modal (서버리스)
- DB: Supabase (PostgreSQL)
- AI: browser-use + LangChain (OpenAI / Anthropic)
- 인증: NextAuth v5 beta.25 (Google OAuth)

### 배포 환경
- Frontend: `twin-track-ai.vercel.app` (git push 자동 배포)
- Backend API: `zoohc--twin-track-ai-fastapi-app.modal.run`
- Worker: Modal `run_worker` function (AI 테스트 실행)

---

## 해결된 이슈

### 1. Supabase `.insert().select()` 체이닝 오류
- 커밋: `5a7634b`
- 원인: supabase-py가 `.insert()` 후 `.select()` 체이닝을 지원하지 않음
- 해결: `.select()` 호출을 제거하고 별도 쿼리로 분리

### 2. Pydantic v2 + browser-use 호환성 (ainvoke/provider/model)
- 커밋: `a45b7a0` → `d3f73e1` → `b9c06bc` → `0bd6b22` → `6fb88f8`
- 원인: browser-use Agent가 LLM 객체에 `setattr()`로 동적 속성을 설정하는데, Pydantic v2 모델이 이를 거부
- 해결 과정:
  1. `object.__setattr__` → 부분적 해결 (provider만)
  2. `model_config["extra"] = "allow"` 런타임 수정 → 효과 없음 (Pydantic v2는 클래스 정의 시 validator 컴파일)
  3. `ConfigDict(extra="allow")` 서브클래스 → `model` alias 깨짐 (부모 config 통째 대체)
  4. **최종 해결**: `{**ChatOpenAI.model_config, "extra": "allow"}` 패턴으로 부모 config 병합
- 핵심 코드 (`backend/services/agent_runner.py`):
  ```python
  class FlexibleChatOpenAI(ChatOpenAI):
      model_config = {**ChatOpenAI.model_config, "extra": "allow"}
  ```
- browser-use가 동적으로 설정하는 속성들:
  - `ainvoke`: 토큰 사용량 추적을 위한 래퍼 메서드
  - `provider`: 로깅용 (`llm.provider_{llm.model}`)
  - `_verified_api_keys`: API 키 검증 플래그

### 3. 리포트 페이지 서버 에러
- 커밋: `ea73d5c`
- 원인: Next.js Server Component에서 `onClick` 핸들러 직접 사용
- 해결: Pro 업그레이드 버튼을 `ProBanner.tsx` Client Component로 분리

### 4. 디자인 개선 (borderless depth)
- 커밋: `ef7e20e`
- 변경사항:
  - 모든 색상 border 제거 → shadow 기반 입체감
  - `--color-surface-raised` 추가 (레이어 계층)
  - 폰트: 전체적으로 weight 증가 (medium → semibold/bold)
  - AppBar: backdrop-blur glass 효과
  - 버튼: 48px 높이, bold weight
  - Input: borderless, focus ring만 표시

---

## 디자인 시스템 (Design Tokens)

### 색상 계층
```
--color-bg:             #09090B    (최하층 배경)
--color-surface:        #151518    (카드 배경)
--color-surface-raised: #1C1C20    (카드 안 요소, 버튼)
--color-border:         rgba(255,255,255,0.06)  (미세한 구분선)
```

### 키컬러
```
--color-accent:         #3B82F6    (Blue — 유일한 키컬러)
--color-accent-hover:   #2563EB
--color-accent-subtle:  rgba(59,130,246,0.10)
```

### 시맨틱 색상
```
--color-danger:  #EF4444  (치명 이슈)
--color-warning: #F59E0B  (경고)
--color-success: #22C55E  (정상)
```

### 타이포그래피
- 서체: Pretendard (한국어 최적화 고딕)
- 기본 weight: 500 (medium) — 이전 400에서 상향
- 제목/라벨: 700 (bold) ~ 800 (extrabold)
- 본문: 500 (medium)
- 보조: 400 (regular) — placeholder 등

### 입체감 원칙
- 테두리 없음 (border: none)
- 그림자로 레이어 구분 (shadow-sm, shadow-md)
- 배경색 계층으로 깊이 표현 (bg → surface → surface-raised)
- AppBar: backdrop-filter blur로 유리 효과

---

## 아키텍처 (파일 구조)

### Frontend 핵심 파일
```
frontend/
├── app/
│   ├── layout.tsx                          # 루트 레이아웃
│   ├── page.tsx                            # 랜딩 페이지
│   ├── (auth)/onboarding/page.tsx          # 온보딩
│   └── dashboard/
│       ├── page.tsx                        # 대시보드 (Server)
│       ├── DashboardClient.tsx             # 대시보드 (Client)
│       ├── settings/SettingsClient.tsx      # 설정
│       ├── run/[jobId]/RunPageClient.tsx    # 테스트 실행 화면
│       └── report/[reportId]/
│           ├── page.tsx                    # 리포트 (Server)
│           └── ProBanner.tsx               # Pro 배너 (Client)
├── components/
│   ├── layout/AppBar.tsx
│   ├── IssueCard.tsx
│   └── ui/ (Badge, Button, Card, Input)
├── styles/globals.css                      # 전역 CSS 변수 + 컴포넌트
└── lib/
    ├── api.ts                              # 백엔드 API 클라이언트
    └── actions.ts                          # Server Actions
```

### Backend 핵심 파일
```
backend/
├── modal_app.py                 # Modal 배포 설정 (이미지, secrets)
├── main.py                      # FastAPI 앱 진입점
├── routers/
│   ├── jobs.py                  # POST /api/jobs (테스트 생성)
│   ├── reports.py               # GET /api/reports/{id}
│   ├── personas.py              # GET /api/personas
│   ├── profile.py               # PUT /api/profile/api-key
│   └── preview.py
├── worker/
│   └── run_test.py              # Job 실행 파이프라인
├── services/
│   └── agent_runner.py          # browser-use Agent 실행
└── db/
    └── supabase.py              # DB 클라이언트
```

---

## TODO (남은 작업)

### 긴급
- [ ] Modal 재배포 필요 (`modal deploy backend/modal_app.py`)
  - `{**ChatOpenAI.model_config, "extra": "allow"}` 패턴이 아직 반영 안 됨
  - 마지막 Modal 배포가 `ConfigDict(extra="allow")` 버전 (model 속성 깨짐)

### 기능
- [ ] 실제 AI 테스트가 의미 있는 결과를 생성하도록 프롬프트 개선
- [ ] Pro 플랜 결제 기능 (현재 alert으로 대체)
- [ ] 진행바 실시간 업데이트 (현재 fake: queued=10%, running=60%)
- [ ] 테스트 영상 녹화 (video_url 필드는 있으나 미구현)

### 디자인
- [ ] 랜딩 페이지 비주얼 강화
- [ ] 리포트 점수 시각화 (차트/그래프)
- [ ] 반응형 모바일 최적화 추가

### 안정성
- [ ] API 키 유효성 검증 (테스트 전 사전 확인)
- [ ] 에러 처리 고도화 (사용자 친화적 메시지)
- [ ] Worker 타임아웃 처리 개선

---

## 배포 명령어

### Frontend (Vercel — git push 자동)
```bash
cd /Users/hyeongchan/개발/money/vibe-builder/twin-track-ai
git add -A && git commit -m "..." && git push
```

### Backend (Modal — 수동)
```bash
cd /Users/hyeongchan/개발/money/vibe-builder/twin-track-ai
modal deploy backend/modal_app.py
```

### 중요: 두 곳 모두 배포해야 함
- Frontend만 push하면 Vercel만 업데이트
- Backend 변경 시 반드시 `modal deploy` 별도 실행
