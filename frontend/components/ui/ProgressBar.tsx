interface ProgressBarProps {
  value: number  // 0 ~ 100
  label?: string
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div>
      <div className="progress-bar">
        <div
          className="progress-bar__fill"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {label && (
        <span
          style={{
            fontSize: 'var(--font-xs)',
            color: 'var(--color-text-secondary)',
            marginTop: 4,
            display: 'block',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
