'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { saveApiKeyAction } from '@/lib/actions'
import type { LLMProvider } from '@/types'

export default function OnboardingPage() {
  const [provider, setProvider] = useState<LLMProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!apiKey.trim()) {
      setError('API Key를 입력해주세요')
      return
    }

    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      setError('OpenAI API Key는 sk- 로 시작해야 합니다')
      return
    }

    startTransition(async () => {
      try {
        await saveApiKeyAction(provider, apiKey.trim())
        router.push('/dashboard')
      } catch {
        setError('API Key 저장에 실패했습니다. 다시 시도해주세요.')
      }
    })
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 'var(--space-10)', maxWidth: 480 }}>
        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--font-xs)', color: 'var(--color-white)',
              fontWeight: 'var(--weight-bold)',
            }}
          >
            ✓
          </div>
          <div style={{ height: 2, flex: 1, background: 'var(--color-accent)' }} />
          <div
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--color-text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--font-xs)', color: 'var(--color-white)',
              fontWeight: 'var(--weight-bold)',
            }}
          >
            2
          </div>
        </div>

        <h1
          style={{
            fontSize: 'var(--font-xl)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          어떤 AI를 사용하시나요?
        </h1>
        <p
          style={{
            fontSize: 'var(--font-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-6)',
            lineHeight: 1.6,
          }}
        >
          API Key는 암호화되어 안전하게 저장됩니다.
          <br />
          테스트 비용은 사용자의 계정에서 직접 청구됩니다.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* LLM 선택 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {(
              [
                { id: 'openai', label: 'OpenAI (GPT-4o)', hint: '권장 — 가장 높은 정확도' },
                { id: 'anthropic', label: 'Anthropic (Claude 3.5 Sonnet)', hint: '' },
              ] as Array<{ id: LLMProvider; label: string; hint: string }>
            ).map((option) => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  background: provider === option.id ? 'var(--color-success-bg)' : 'var(--color-surface)',
                  border: `1.5px solid ${provider === option.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                <input
                  type="radio"
                  name="provider"
                  value={option.id}
                  checked={provider === option.id}
                  onChange={() => setProvider(option.id)}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <div>
                  <span style={{ fontSize: 'var(--font-md)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-primary)' }}>
                    {option.label}
                  </span>
                  {option.hint && (
                    <span
                      style={{
                        fontSize: 'var(--font-xs)',
                        color: 'var(--color-accent)',
                        marginLeft: 'var(--space-2)',
                      }}
                    >
                      {option.hint}
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* API Key 입력 */}
          <Input
            label="API Key"
            type="password"
            placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            error={!!error}
            hint={error || 'AES-256으로 암호화되어 저장됩니다'}
            autoComplete="off"
          />

          <Button type="submit" disabled={isPending} fullWidth>
            {isPending ? '저장 중...' : '저장하고 시작하기'}
          </Button>
        </form>

        {/* 건너뛰기 */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
          <a
            href="/dashboard"
            style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            나중에 설정하기
          </a>
        </div>
      </div>
    </div>
  )
}
