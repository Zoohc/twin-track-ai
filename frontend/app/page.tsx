import { auth, signIn } from '@/auth'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const session = await auth()

  // 이미 로그인된 경우 대시보드로
  if (session?.userId) {
    redirect('/dashboard')
  }

  return (
    <div className="page">
      {/* 상단 바 */}
      <header className="app-bar">
        <span
          style={{
            fontSize: 'var(--font-lg)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Twin Track AI
        </span>
      </header>

      {/* 히어로 섹션 */}
      <main>
        <div
          className="container"
          style={{
            paddingTop: 'var(--space-10)',
            paddingBottom: 'var(--space-10)',
          }}
        >
          {/* 헤드라인 */}
          <h1
            style={{
              fontSize: 'var(--font-2xl)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--color-primary)',
              lineHeight: 1.3,
              marginBottom: 'var(--space-4)',
            }}
          >
            AI가 실제 유저처럼
            <br />
            당신의 서비스를 테스트합니다
          </h1>

          <p
            style={{
              fontSize: 'var(--font-md)',
              color: 'var(--color-secondary)',
              marginBottom: 'var(--space-8)',
              lineHeight: 1.7,
            }}
          >
            배포하기 전 AI가 먼저 써봅니다.
            <br />
            URL 1개로 버그·UX 문제·성능 이슈를 자동 리포트.
          </p>

          {/* CTA: Google 로그인 */}
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/dashboard' })
            }}
          >
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', maxWidth: 320, fontSize: 'var(--font-md)' }}
            >
              Google로 무료 시작하기
            </button>
          </form>

          <p
            style={{
              fontSize: 'var(--font-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: 'var(--space-3)',
            }}
          >
            신용카드 불필요 · 자신의 OpenAI/Anthropic Key 사용
          </p>

          {/* 구분선 */}
          <div className="divider" style={{ margin: 'var(--space-8) 0' }} />

          {/* 데모 리포트 미리보기 */}
          <p className="section-header">리포트 미리보기</p>

          <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <p style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--font-lg)', color: 'var(--color-primary)' }}>
                  72
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 'var(--weight-regular)', color: 'var(--color-text-secondary)' }}>
                    {' '}/ 100
                  </span>
                </p>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)' }}>
                  myapp.com — 종합 점수
                </p>
              </div>
              <span className="badge badge--critical">🔴 치명 2건</span>
            </div>

            <div
              style={{
                background: 'var(--color-surface)',
                borderRadius: 8,
                padding: 'var(--space-3)',
                fontSize: 'var(--font-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}
            >
              💬 회원가입은 원활하나, 로그인 후 세션 관리에 치명적 문제가 있습니다. 모바일 환경에서 결제 버튼 접근이 어렵습니다.
            </div>
          </div>

          {/* 특징 3가지 */}
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-6)',
            }}
          >
            {[
              { icon: '🤖', title: '3가지 AI 페르소나', desc: '초보 유저, 빠른 클릭, 모바일 — 실제 사용 패턴 시뮬레이션' },
              { icon: '📋', title: '자연어 리포트', desc: '기술 용어 없이 버그와 UX 문제를 한국어로 설명' },
              { icon: '🛠️', title: 'AI Fix Pack (Pro)', desc: '각 버그마다 Cursor/Claude에 붙여넣을 수정 프롬프트 제공' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="card"
                style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}
              >
                <span style={{ fontSize: 24 }}>{feature.icon}</span>
                <div>
                  <p style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--font-sm)', marginBottom: 4 }}>
                    {feature.title}
                  </p>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
