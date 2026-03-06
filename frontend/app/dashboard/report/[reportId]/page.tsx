import type { ReactNode } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AppBar } from '@/components/layout/AppBar'
import { getReport } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { IssueCard } from '@/components/IssueCard'
import type { IssueSeverity } from '@/types'
import { ProBanner } from './ProBanner'

interface PageProps {
  params: Promise<{ reportId: string }>
}

function scoreToLabel(score: number): string {
  if (score >= 91) return '이슈 없음'
  if (score >= 71) return '경미한 UX 문제'
  if (score >= 41) return '일부 이슈 있음'
  return '치명적 이슈 다수'
}

function scoreToColor(score: number): string {
  if (score >= 71) return 'var(--color-accent)'
  if (score >= 41) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export default async function ReportPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.userId) redirect('/')

  const { reportId } = await params

  let report = null
  try {
    report = await getReport(session.userId, reportId)
  } catch {
    redirect('/dashboard')
  }

  if (!report) redirect('/dashboard')

  const isPro = false // TODO: session에서 plan 확인

  const criticalIssues = report.issues.filter((i) => i.severity === 'critical')
  const warningIssues = report.issues.filter((i) => i.severity === 'warning')
  const okIssues = report.issues.filter((i) => i.severity === 'ok')

  const severityOrder: IssueSeverity[] = ['critical', 'warning', 'ok']

  return (
    <div className="page">
      <AppBar />
      <main className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        {/* 뒤로가기 */}
        <a
          href="/dashboard"
          style={{
            fontSize: 'var(--font-sm)',
            color: 'var(--color-text-tertiary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 'var(--space-4)',
          }}
        >
          ← 홈
        </a>

        {/* 점수 카드 */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <p
            style={{
              fontSize: 'var(--font-xs)',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {report.url} — {new Date(report.created_at).toLocaleDateString('ko-KR')}
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <span
              style={{
                fontSize: 'var(--font-score)',
                fontWeight: 'var(--weight-bold)',
                color: report.score !== null ? scoreToColor(report.score) : 'var(--color-text-secondary)',
                lineHeight: 1,
              }}
            >
              {report.score ?? '-'}
            </span>
            <div>
              <span
                style={{
                  fontSize: 'var(--font-sm)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                / 100
              </span>
              {report.score !== null && (
                <p style={{ fontSize: 'var(--font-sm)', color: scoreToColor(report.score) }}>
                  {scoreToLabel(report.score)}
                </p>
              )}
            </div>
          </div>

          {/* 이슈 요약 */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {severityOrder.map((sev) => {
              const count = report.issues.filter((i) => i.severity === sev).length
              if (count === 0) return null
              return <Badge key={sev} severity={sev} count={count} />
            })}
          </div>
        </div>

        {/* AI 총평 */}
        {report.summary && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <p className="section-header">AI 총평</p>
            <div
              style={{
                background: 'var(--color-surface-raised)',
                borderRadius: 12,
                padding: 'var(--space-5)',
                fontSize: 'var(--font-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.7,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {report.summary}
            </div>
          </div>
        )}

        {/* 치명 이슈 */}
        {criticalIssues.length > 0 && (
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <p className="section-header">치명 이슈 {criticalIssues.length}건</p>
            {criticalIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} isPro={isPro} />
            ))}
          </section>
        )}

        {/* 경고 이슈 (아코디언) */}
        {warningIssues.length > 0 && (
          <AccordionSection
            title={`개선 권장 ${warningIssues.length}건`}
            defaultOpen={criticalIssues.length === 0}
          >
            {warningIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} isPro={isPro} />
            ))}
          </AccordionSection>
        )}

        {/* 정상 (아코디언) */}
        {okIssues.length > 0 && (
          <AccordionSection title={`정상 작동 ${okIssues.length}건`} defaultOpen={false}>
            {okIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} isPro={isPro} />
            ))}
          </AccordionSection>
        )}

        {/* Pro 업그레이드 배너 (Free 유저) */}
        {!isPro && criticalIssues.length > 0 && <ProBanner />}

        {/* 비디오 레코딩 */}
        {report.video_url && (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <p className="section-header">테스트 영상</p>
            <video
              src={report.video_url}
              controls
              style={{ width: '100%', borderRadius: 12, background: '#000' }}
            />
          </div>
        )}

        {/* 하단 액션 */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-8)' }}>
          <a href="/dashboard" className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            다시 테스트
          </a>
        </div>
      </main>
    </div>
  )
}

// 아코디언 섹션 컴포넌트
function AccordionSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      style={{ marginBottom: 'var(--space-6)' }}
    >
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) 0',
          fontSize: 'var(--font-sm)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          userSelect: 'none',
        }}
      >
        {title}
        <span>▾</span>
      </summary>
      <div style={{ marginTop: 'var(--space-3)' }}>{children}</div>
    </details>
  )
}
