// Server Component — auth 확인 후 클라이언트 컴포넌트로 위임
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AppBar } from '@/components/layout/AppBar'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.userId) redirect('/')

  return (
    <div className="page">
      <AppBar />
      <main className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        <a
          href="/dashboard"
          style={{
            fontSize: 'var(--font-sm)',
            color: 'var(--color-text-tertiary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 'var(--space-6)',
          }}
        >
          뒤로
        </a>

        <h1
          style={{
            fontSize: 'var(--font-xl)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-6)',
          }}
        >
          설정
        </h1>

        <SettingsClient />
      </main>
    </div>
  )
}
