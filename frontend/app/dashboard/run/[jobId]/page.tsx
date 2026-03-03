import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AppBar } from '@/components/layout/AppBar'
import { getJob, listFeedMessages } from '@/lib/api'
import RunPageClient from './RunPageClient'

interface PageProps {
  params: Promise<{ jobId: string }>
}

export default async function RunPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.userId) redirect('/')

  const { jobId } = await params

  let job = null
  let initialMessages = []

  try {
    ;[job, initialMessages] = await Promise.all([
      getJob(session.userId, jobId),
      listFeedMessages(session.userId, jobId),
    ])
  } catch {
    redirect('/dashboard')
  }

  if (!job) redirect('/dashboard')

  // 이미 완료된 경우 리포트로 이동 처리는 클라이언트에서
  return (
    <div className="page">
      <AppBar />
      <main className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        <RunPageClient
          jobId={jobId}
          initialJob={job}
          initialMessages={initialMessages}
          backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'}
        />
      </main>
    </div>
  )
}
