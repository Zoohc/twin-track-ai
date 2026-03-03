import type { IssueSeverity } from '@/types'

interface BadgeProps {
  severity: IssueSeverity
  count?: number
}

const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: '치명',
  warning: '경고',
  ok: '정상',
}

const SEVERITY_EMOJI: Record<IssueSeverity, string> = {
  critical: '🔴',
  warning: '🟡',
  ok: '🟢',
}

export function Badge({ severity, count }: BadgeProps) {
  return (
    <span className={`badge badge--${severity}`}>
      {SEVERITY_EMOJI[severity]}
      {SEVERITY_LABELS[severity]}
      {count !== undefined && ` ${count}건`}
    </span>
  )
}
