import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  label?: string
  hint?: string
}

export function Input({ error = false, label, hint, id, className, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: 'var(--font-sm)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--color-text-primary)',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`input${error ? ' error' : ''}${className ? ` ${className}` : ''}`}
        {...props}
      />
      {hint && (
        <span
          style={{
            fontSize: 'var(--font-xs)',
            color: error ? 'var(--color-danger)' : 'var(--color-text-secondary)',
          }}
        >
          {hint}
        </span>
      )}
    </div>
  )
}
