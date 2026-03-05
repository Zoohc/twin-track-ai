'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createJobAction, saveApiKeyAction } from '@/lib/actions'
import { listReports } from '@/lib/api'
import type { Persona, Report, PaginatedResponse, LLMProvider } from '@/types'

function getScoreColor(score: number | null): string {
  if (score === null) return 'var(--color-text-secondary)'
  if (score >= 80) return 'var(--color-accent)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}일 전`
  if (hours > 0) return `${hours}시간 전`
  if (mins > 0) return `${mins}분 전`
  return '방금 전'
}

interface Props {
  personas: Persona[]
  initialReports: PaginatedResponse<Report>
  userId: string
  hasApiKey: boolean
}

export default function DashboardClient({ personas, initialReports, userId, hasApiKey: initialHasApiKey }: Props) {
  const [url, setUrl] = useState('')
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([])
  const [urlError, setUrlError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // API Key 상태
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey)
  const [provider, setProvider] = useState<LLMProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyError, setApiKeyError] = useState('')
  const [isSavingKey, startSaveKeyTransition] = useTransition()

  // 리포트 목록
  const [reports, setReports] = useState<Report[]>(initialReports.items)
  const [cursor, setCursor] = useState<string | null>(initialReports.next_cursor)
  const [hasNext, setHasNext] = useState(initialReports.has_next)
  const [loadingMore, setLoadingMore] = useState(false)

  function togglePersona(id: string) {
    setSelectedPersonaIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function validateUrl(val: string): boolean {
    try {
      new URL(val)
      return true
    } catch {
      return false
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUrlError('')

    const trimmed = url.trim()
    if (!trimmed) {
      setUrlError('URL을 입력해주세요')
      return
    }
    if (!validateUrl(trimmed)) {
      setUrlError('올바른 URL을 입력해주세요 (예: https://myapp.com)')
      return
    }

    startTransition(async () => {
      try {
        const jobId = await createJobAction(trimmed, selectedPersonaIds)
        router.push(`/dashboard/run/${jobId}`)
      } catch {
        setUrlError('테스트 시작에 실패했습니다. 다시 시도해주세요.')
      }
    })
  }

  function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault()
    setApiKeyError('')

    if (!apiKey.trim()) {
      setApiKeyError('API Key를 입력해주세요')
      return
    }

    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      setApiKeyError('OpenAI API Key는 sk- 로 시작해야 합니다')
      return
    }

    startSaveKeyTransition(async () => {
      try {
        await saveApiKeyAction(provider, apiKey.trim())
        setHasApiKey(true)
        setApiKey('')
      } catch {
        setApiKeyError('저장에 실패했습니다. 다시 시도해주세요.')
      }
    })
  }

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await listReports(userId, 20, cursor)
      setReports((prev) => [...prev, ...data.items])
      setCursor(data.next_cursor)
      setHasNext(data.has_next)
    } catch {
      // 에러 무시
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <>
      {/* API Key 미설정 배너 */}
      {!hasApiKey && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-accent-subtle)',
                borderRadius: 8,
                borderLeft: '3px solid var(--color-accent)',
              }}
            >
              <span style={{ fontSize: 18 }}>🔑</span>
              <div>
                <p
                  style={{
                    fontSize: 'var(--font-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  테스트를 시작하려면 API Key가 필요합니다
                </p>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)' }}>
                  키는 암호화되어 안전하게 저장됩니다 · 테스트 비용은 사용자 계정에서 직접 청구
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveApiKey} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Provider 선택 */}
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['openai', 'anthropic'] as LLMProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    style={{
                      flex: 1,
                      padding: 'var(--space-3)',
                      border: `1.5px solid ${provider === p ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      borderRadius: 8,
                      background: provider === p ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                      color: provider === p ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontSize: 'var(--font-sm)',
                      fontWeight: provider === p ? 'var(--weight-medium)' : 'var(--weight-regular)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {p === 'openai' ? 'OpenAI' : 'Anthropic'}
                  </button>
                ))}
              </div>

              <Input
                type="password"
                placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                error={!!apiKeyError}
                hint={apiKeyError}
                autoComplete="off"
              />

              <Button type="submit" disabled={isSavingKey} fullWidth>
                {isSavingKey ? '저장 중...' : 'API Key 저장하고 시작하기'}
              </Button>
            </form>
          </Card>
        </section>
      )}

      {/* 새 테스트 섹션 */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <p className="section-header">새 테스트 시작</p>

        <Card style={!hasApiKey ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              placeholder="https://myapp.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={!!urlError}
              hint={urlError}
              type="url"
            />

            {/* 페르소나 선택 */}
            {personas.length > 0 && (
              <div>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
                  페르소나 선택 (미선택 시 전체 실행)
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {personas.map((p) => {
                    const selected = selectedPersonaIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePersona(p.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 99,
                          border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          background: selected ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                          color: selected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                          fontSize: 'var(--font-xs)',
                          fontWeight: selected ? 'var(--weight-medium)' : 'var(--weight-regular)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 150ms ease',
                        }}
                      >
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <Button type="submit" disabled={isPending || !hasApiKey} fullWidth>
              {isPending ? '테스트 시작 중...' : '테스트 시작'}
            </Button>
          </form>
        </Card>
      </section>

      {/* 최근 리포트 섹션 */}
      <section>
        <p className="section-header">최근 리포트</p>

        {reports.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-10) 0',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-sm)',
            }}
          >
            아직 테스트 기록이 없습니다.
            <br />
            첫 번째 테스트를 시작해보세요!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {reports.map((report) => (
              <a
                key={report.id}
                href={`/dashboard/report/${report.id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    cursor: 'pointer',
                    transition: 'box-shadow 150ms ease',
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: report.score !== null
                        ? report.score >= 80 ? 'var(--color-accent)' : report.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                        : 'var(--color-text-tertiary)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 'var(--font-sm)',
                        fontWeight: 'var(--weight-medium)',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {report.url}
                    </p>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)' }}>
                      {timeAgo(report.created_at)}
                    </p>
                  </div>
                  {report.score !== null && (
                    <span
                      style={{
                        fontSize: 'var(--font-lg)',
                        fontWeight: 'var(--weight-bold)',
                        color: getScoreColor(report.score),
                        flexShrink: 0,
                      }}
                    >
                      {report.score}
                    </span>
                  )}
                </Card>
              </a>
            ))}

            {hasNext && (
              <Button
                variant="secondary"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                fullWidth
              >
                {loadingMore ? '로딩 중...' : '더 보기'}
              </Button>
            )}
          </div>
        )}
      </section>
    </>
  )
}
