'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import PreviewCanvas from '@/components/PreviewCanvas'
import LiveFeed from '@/components/LiveFeed'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { cancelJobAction } from '@/lib/actions'
import type { Job, FeedMessage, JobStatus } from '@/types'

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: '대기 중...',
  running: 'AI가 테스트 중입니다...',
  done: '테스트 완료!',
  failed: '테스트 실패',
}

const STATUS_PROGRESS: Record<JobStatus, number> = {
  queued: 10,
  running: 60,
  done: 100,
  failed: 100,
}

interface Props {
  jobId: string
  initialJob: Job
  initialMessages: FeedMessage[]
  backendUrl: string
}

export default function RunPageClient({ jobId, initialJob, initialMessages, backendUrl }: Props) {
  const [job, setJob] = useState<Job>(initialJob)
  const [isCancelling, startCancelTransition] = useTransition()
  const router = useRouter()

  // 폴링: 작업 상태 확인
  useEffect(() => {
    if (job.status === 'done' || job.status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`)
        if (res.ok) {
          const updated = (await res.json()) as Job
          setJob(updated)

          if (updated.status === 'done') {
            clearInterval(interval)
            setTimeout(() => {
              router.push(`/dashboard`)
            }, 2000)
          } else if (updated.status === 'failed') {
            clearInterval(interval)
          }
        }
      } catch {
        // 폴링 오류 무시
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [job.status, jobId, router])

  function handleCancel() {
    startCancelTransition(async () => {
      await cancelJobAction(jobId)
      router.push('/dashboard')
    })
  }

  const isDone = job.status === 'done'
  const isFailed = job.status === 'failed'
  const isActive = job.status === 'queued' || job.status === 'running'

  return (
    <div>
      {/* 헤더 */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <a
          href="/dashboard"
          style={{
            fontSize: 'var(--font-sm)',
            color: 'var(--color-text-tertiary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 'var(--space-3)',
          }}
        >
          ← 뒤로
        </a>
        <h1
          style={{
            fontSize: 'var(--font-xl)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {job.url}
        </h1>
      </div>

      {/* 상태 + 진행바 */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <p
          style={{
            fontSize: 'var(--font-sm)',
            color: isDone ? 'var(--color-accent)' : isFailed ? 'var(--color-danger)' : 'var(--color-text-secondary)',
            marginBottom: 'var(--space-3)',
            fontWeight: 'var(--weight-medium)',
          }}
        >
          {STATUS_LABEL[job.status]}
          {isActive && <span style={{ marginLeft: 6, color: 'var(--color-text-tertiary)' }}>예상 완료: 1~3분</span>}
        </p>

        <ProgressBar
          value={STATUS_PROGRESS[job.status]}
          label={isActive ? `${STATUS_PROGRESS[job.status]}%` : undefined}
        />
      </div>

      {/* 실시간 레이아웃: 좌측 피드 / 우측 미리보기 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* 라이브 피드 */}
        <div>
          <p className="section-header" style={{ marginBottom: 'var(--space-2)' }}>
            라이브 피드
          </p>
          <LiveFeed jobId={jobId} initialMessages={initialMessages} />
        </div>

        {/* 미리보기 */}
        <div>
          <p className="section-header" style={{ marginBottom: 'var(--space-2)' }}>
            실시간 미리보기
          </p>
          {isActive ? (
            <PreviewCanvas jobId={jobId} backendUrl={backendUrl} />
          ) : (
            <div
              style={{
                background: isDone ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                borderRadius: 12,
                aspectRatio: '16/10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDone ? 'var(--color-accent)' : 'var(--color-danger)',
                fontSize: 'var(--font-md)',
                fontWeight: 'var(--weight-medium)',
              }}
            >
              {isDone ? '✓ 테스트 완료' : '✕ 테스트 실패'}
            </div>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
        {isDone && (
          <Button onClick={() => router.push('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        )}
        {isActive && (
          <Button
            variant="danger"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? '취소 중...' : '테스트 취소'}
          </Button>
        )}
        {isFailed && (
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            돌아가기
          </Button>
        )}
      </div>
    </div>
  )
}
