import Link from 'next/link'
import { auth, signOut } from '@/auth'

interface AppBarProps {
  showNav?: boolean
}

export async function AppBar({ showNav = true }: AppBarProps) {
  const session = await auth()

  return (
    <header className="app-bar">
      <Link
        href={session ? '/dashboard' : '/'}
        style={{
          fontSize: 'var(--font-lg)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.03em',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <span style={{ color: 'var(--color-accent)', fontSize: 24, lineHeight: 1 }}>●</span>
        Twin Track AI
      </Link>

      {showNav && session && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
          <Link
            href="/dashboard/settings"
            style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            설정
          </Link>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              style={{
                background: 'none',
                border: 'none',
                fontSize: 'var(--font-sm)',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              로그아웃
            </button>
          </form>
        </nav>
      )}
    </header>
  )
}
