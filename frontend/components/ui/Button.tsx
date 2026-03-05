import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'link' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  children,
  fullWidth = false,
  style,
  ...props
}: ButtonProps) {
  const className = `btn-${variant}`

  return (
    <button
      className={className}
      style={{ ...(fullWidth ? { width: '100%' } : {}), ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
