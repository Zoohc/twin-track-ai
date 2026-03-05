import { auth, signIn } from '@/auth'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const session = await auth()
  if (session?.userId) redirect('/dashboard')

  return (
    <div className="page">
      {/* 상단 바 */}
      <header className="app-bar">
        <span
          style={{
            fontSize: 'var(--font-lg)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span style={{ color: 'var(--color-accent)', fontSize: 24, lineHeight: 1 }}>●</span>
          Twin Track AI
        </span>
      </header>

      <main>
        {/* 히어로 */}
        <div
          className="container"
          style={{
            paddingTop: 'var(--space-16)',
            paddingBottom: 'var(--space-16)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '6px 14px',
              background: 'var(--color-success-bg)',
              borderRadius: 99,
              fontSize: 'var(--font-xs)',
              fontWeight: 'var(--weight-medium)',
              color: 'var(--color-accent)',
              marginBottom: 'var(--space-6)',
            }}
          >
            ✦ AI 기반 자동 QA 테스트
          </div>

          <h1
            style={{
              fontSize: 'var(--font-2xl)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              marginBottom: 'var(--space-4)',
            }}
          >
            배포 전, AI가 먼저
            <br />
            <span style={{ color: 'var(--color-accent)' }}>테스트</span>합니다
          </h1>

          <p
            style={{
              fontSize: 'var(--font-md)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-8)',
              lineHeight: 1.7,
              maxWidth: 480,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            URL 하나로 버그, UX 문제, 성능 이슈를 자동 리포트.
            <br />
            실제 유저처럼 행동하는 AI가 서비스를 검증합니다.
          </p>

          {/* CTA */}
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/dashboard' })
            }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <button
              type="submit"
              className="btn-primary"
              style={{ fontSize: 'var(--font-md)', height: 48, padding: '0 32px' }}
            >
              Google로 무료 시작하기
            </button>
          </form>

          <p
            style={{
              fontSize: 'var(--font-xs)',
              color: 'var(--color-text-tertiary)',
              marginTop: 'var(--space-3)',
            }}
          >
            신용카드 불필요 · 자신의 OpenAI/Anthropic Key 사용
          </p>
        </div>

        <div className="divider" style={{ maxWidth: 720, margin: '0 auto' }} />

        {/* 데모 리포트 미리보기 */}
        <div
          className="container"
          style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-6)' }}
        >
          <p className="section-header" style={{ textAlign: 'center' }}>리포트 미리보기</p>

          <div
            className="card"
            style={{
              maxWidth: 520,
              margin: '0 auto',
              marginBottom: 'var(--space-3)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <p
                  style={{
                    fontWeight: 'var(--weight-bold)',
                    fontSize: 'var(--font-xl)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  72
                  <span
                    style={{
                      fontSize: 'var(--font-sm)',
                      fontWeight: 'var(--weight-regular)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {' '}/ 100
                  </span>
                </p>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)' }}>
                  myapp.com — 종합 점수
                </p>
              </div>
              <span className="badge badge--critical">치명 2건</span>
            </div>

            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: 8,
                padding: 'var(--space-4)',
                fontSize: 'var(--font-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.7,
                borderLeft: '3px solid var(--color-accent)',
              }}
            >
              회원가입은 원활하나, 로그인 후 세션 관리에 치명적 문제가 있습니다. 모바일 환경에서 결제 버튼 접근이 어렵습니다.
            </div>
          </div>
        </div>

        {/* 특징 */}
        <div
          className="container"
          style={{ paddingBottom: 'var(--space-16)' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-4)',
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            {[
              {
                icon: '🤖',
                title: 'AI 페르소나',
                desc: '초보 유저, 파워 유저, 모바일 — 실제 사용 패턴 시뮬레이션',
              },
              {
                icon: '📋',
                title: '자연어 리포트',
                desc: '기술 용어 없이 버그와 UX 문제를 한국어로 설명',
              },
              {
                icon: '⚡',
                title: 'AI Fix Pack',
                desc: '각 버그마다 Cursor/Claude에 붙여넣을 수정 프롬프트 제공',
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-5)',
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  {f.icon}
                </div>
                <p
                  style={{
                    fontWeight: 'var(--weight-semibold)',
                    fontSize: 'var(--font-sm)',
                    marginBottom: 'var(--space-2)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    fontSize: 'var(--font-xs)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
