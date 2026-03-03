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
          color: 'var(--color-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        Twin Track AI
      </Link>

      {showNav && session && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
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
                color: 'var(--color-text-secondary)',
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
