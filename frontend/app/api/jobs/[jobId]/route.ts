import { auth } from '@/auth'
import type { NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.userId) {
    return Response.json({ detail: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await params

  const res = await fetch(`${BACKEND_URL}/api/jobs/${jobId}`, {
    headers: { 'X-User-Id': session.userId },
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
