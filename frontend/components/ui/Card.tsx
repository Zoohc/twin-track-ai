import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, style, className, ...props }: CardProps) {
  return (
    <div
      className={`card${className ? ` ${className}` : ''}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}
