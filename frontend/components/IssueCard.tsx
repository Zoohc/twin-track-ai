'use client'

import { useState } from 'react'
import type { Issue } from '@/types'
import { Badge } from '@/components/ui/Badge'

interface IssueCardProps {
  issue: Issue
  isPro: boolean
}

export function IssueCard({ issue, isPro }: IssueCardProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleCopy() {
    if (!issue.fix_prompt) return
    await navigator.clipboard.writeText(issue.fix_prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasReproSteps = issue.reproduction_steps && issue.reproduction_steps.length > 0

  return (
    <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
        <Badge severity={issue.severity} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--font-md)' }}>
            {issue.title}
          </p>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {issue.affected_persona}
          </p>
        </div>
      </div>

      {/* 설명 */}
      <p
        style={{
          fontSize: 'var(--font-sm)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          marginBottom: 'var(--space-3)',
        }}
      >
        {issue.description}
      </p>

      {/* 요소 정보 */}
      {issue.element_info && (
        <div
          style={{
            display: 'inline-block',
            fontSize: 'var(--font-xs)',
            fontFamily: 'monospace',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            padding: '2px 8px',
            borderRadius: 4,
            marginBottom: 'var(--space-3)',
          }}
        >
          {issue.element_info}
        </div>
      )}

      {/* 재현 단계 토글 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-secondary)',
          fontSize: 'var(--font-xs)',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: expanded ? 'var(--space-2)' : 0,
        }}
      >
        재현 단계 보기
        <span
          style={{
            display: 'inline-block',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: expanded ? 'none' : '5px solid currentColor',
            borderBottom: expanded ? '5px solid currentColor' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {expanded && (
        <div
          style={{
            fontSize: 'var(--font-xs)',
            background: 'var(--color-surface)',
            borderRadius: 6,
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {hasReproSteps ? (
            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                lineHeight: 1.8,
                color: 'var(--color-text-secondary)',
              }}
            >
              {issue.reproduction_steps!.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              {issue.description}
            </p>
          )}
        </div>
      )}

      {/* 스크린샷 */}
      {issue.screenshot_urls && issue.screenshot_urls.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {issue.screenshot_urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Screenshot ${i + 1}`}
              style={{
                width: '100%',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
              }}
            />
          ))}
        </div>
      )}

      {/* Fix Pack 영역 */}
      {issue.fix_prompt && isPro ? (
        <div
          style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--color-surface-raised)',
            borderRadius: 8,
          }}
        >
          <p
            style={{
              fontSize: 'var(--font-xs)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--color-primary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            AI 수정 제안
          </p>
          <pre
            style={{
              fontSize: 'var(--font-xs)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--color-text-primary)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-3)',
            }}
          >
            {issue.fix_prompt}
          </pre>
          <button
            onClick={() => void handleCopy()}
            className="btn-secondary"
            style={{ height: 32, fontSize: 'var(--font-xs)', padding: '0 12px' }}
          >
            {copied ? '복사 완료' : '복사'}
          </button>
        </div>
      ) : issue.severity === 'critical' ? (
        <div
          style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--color-surface-raised)',
            borderRadius: 8,
            cursor: 'not-allowed',
          }}
        >
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-secondary)' }}>
            AI 수정 프롬프트는 Pro 플랜에서 확인 가능
          </p>
        </div>
      ) : null}
    </div>
  )
}
