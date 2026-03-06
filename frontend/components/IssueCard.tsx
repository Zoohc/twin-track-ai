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

      {/* 재현 경로 토글 */}
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
          marginBottom: expanded ? 'var(--space-2)' : 0,
        }}
      >
        재현 경로 보기 {expanded ? '▲' : '▼'}
      </button>

      {expanded && (
        <pre
          style={{
            fontSize: 'var(--font-xs)',
            background: 'var(--color-surface)',
            borderRadius: 6,
            padding: 'var(--space-3)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: 'var(--space-3)',
          }}
        >
          {issue.description}
        </pre>
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
            📋 Cursor에 붙여넣기
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
            {copied ? '복사됨 ✓' : '복사'}
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
            🔒 AI 수정 프롬프트는 Pro 플랜에서 확인 가능
          </p>
        </div>
      ) : null}
    </div>
  )
}
