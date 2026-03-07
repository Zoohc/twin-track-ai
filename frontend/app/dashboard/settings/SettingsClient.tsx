'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { saveApiKeyAction } from '@/lib/actions'
import type { LLMProvider } from '@/types'

export default function SettingsClient() {
  return (
    <>
      <ApiKeySettings />
      <div className="divider" />
      <PlanSection />
    </>
  )
}

function ApiKeySettings() {
  const [provider, setProvider] = useState<LLMProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!apiKey.trim()) {
      setError('API Key를 입력해주세요')
      return
    }

    startTransition(async () => {
      try {
        await saveApiKeyAction(provider, apiKey.trim())
        setSuccess(true)
        setApiKey('')
        setTimeout(() => setSuccess(false), 3000)
      } catch {
        setError('저장에 실패했습니다. 다시 시도해주세요.')
      }
    })
  }

  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <p className="section-header">AI 설정</p>

      <Card>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Provider 선택 */}
          <div>
            <p
              style={{
                fontSize: 'var(--font-sm)',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              LLM 제공자
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {(['openai', 'anthropic'] as LLMProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    border: 'none',
                    borderRadius: 8,
                    background: provider === p ? 'var(--color-accent-subtle)' : 'var(--color-surface-raised)',
                    color: provider === p ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontSize: 'var(--font-sm)',
                    fontWeight: provider === p ? 'var(--weight-bold)' : 'var(--weight-medium)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 150ms ease',
                  }}
                >
                  {p === 'openai' ? 'OpenAI' : 'Anthropic'}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <Input
            label="새 API Key"
            type="password"
            placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            error={!!error}
            hint={error || (success ? '저장되었습니다' : '현재 키는 마스킹 표시됩니다')}
            autoComplete="off"
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? '저장 중...' : 'API Key 변경'}
          </Button>
        </form>
      </Card>
    </section>
  )
}

function PlanSection() {
  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <p className="section-header">플랜</p>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-text-primary)', marginBottom: 4 }}>Free 플랜</p>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>
              기본 3개 페르소나 · 자연어 리포트
            </p>
          </div>
          <button
            onClick={() => alert('결제 기능은 준비 중입니다.')}
            className="btn-link"
            style={{ fontSize: 'var(--font-sm)' }}
          >
            Pro 업그레이드
          </button>
        </div>

        <div className="divider" />

        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: 8,
            padding: 'var(--space-4)',
          }}
        >
          <p style={{ fontSize: 'var(--font-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
            Pro 플랜 ($19/월)
          </p>
          <ul
            style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--color-text-secondary)',
              paddingLeft: 'var(--space-4)',
              lineHeight: 1.8,
            }}
          >
            <li>AI Fix Pack — 각 버그 수정 프롬프트 제공</li>
            <li>커스텀 페르소나 빌더</li>
            <li>휴먼 베타테스터 네트워크</li>
            <li>히스토리 무기한 보관</li>
          </ul>
          <button
            onClick={() => alert('결제 기능은 준비 중입니다.')}
            className="btn-primary"
            style={{ marginTop: 'var(--space-4)', width: '100%' }}
          >
            Pro 업그레이드 시작하기
          </button>
        </div>
      </Card>
    </section>
  )
}
