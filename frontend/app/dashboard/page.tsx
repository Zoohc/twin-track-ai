import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AppBar } from '@/components/layout/AppBar'
import { listPersonas, listReports } from '@/lib/api'
import DashboardClient from './DashboardClient'
import type { Persona, Report, PaginatedResponse } from '@/types'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.userId) redirect('/')

  let personas: Persona[] = []
  let initialReports: PaginatedResponse<Report> = { items: [], next_cursor: null, has_next: false }

  try {
    [personas, initialReports] = await Promise.all([
      listPersonas(session.userId),
      listReports(session.userId, 20),
    ])
  } catch {
    // 에러 무시, 빈 상태로 렌더링
  }

  return (
    <div className="page">
      <AppBar />
      <main className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        <DashboardClient
          personas={personas}
          initialReports={initialReports}
          userId={session.userId}
        />
      </main>
    </div>
  )
}
