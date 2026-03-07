import type {
  Job,
  Report,
  Persona,
  CreateJobRequest,
  CreateJobResponse,
  PaginatedResponse,
  SaveApiKeyRequest,
  Profile,
  FeedMessage,
} from '@/types'

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

async function apiFetch<T>(
  path: string,
  userId: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BACKEND_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '알 수 없는 오류' }))
    throw new Error((error as { detail: string }).detail ?? '요청 실패')
  }

  // 204 No Content
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  return res.json() as Promise<T>
}

// ===== Jobs =====

export async function createJob(userId: string, body: CreateJobRequest): Promise<CreateJobResponse> {
  return apiFetch<CreateJobResponse>('/api/jobs', userId, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listJobs(
  userId: string,
  limit = 20,
  after?: string
): Promise<PaginatedResponse<Job>> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (after) params.set('after', after)
  return apiFetch<PaginatedResponse<Job>>(`/api/jobs?${params}`, userId)
}

export async function getJob(userId: string, jobId: string): Promise<Job> {
  return apiFetch<Job>(`/api/jobs/${jobId}`, userId)
}

export async function cancelJob(userId: string, jobId: string): Promise<void> {
  await apiFetch<void>(`/api/jobs/${jobId}`, userId, { method: 'DELETE' })
}

// ===== Reports =====

export async function listReports(
  userId: string,
  limit = 20,
  after?: string
): Promise<PaginatedResponse<Report>> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (after) params.set('after', after)
  return apiFetch<PaginatedResponse<Report>>(`/api/reports?${params}`, userId)
}

export async function getReport(userId: string, reportId: string): Promise<Report> {
  return apiFetch<Report>(`/api/reports/${reportId}`, userId)
}

export async function deleteReport(userId: string, reportId: string): Promise<void> {
  await apiFetch<void>(`/api/reports/${reportId}`, userId, { method: 'DELETE' })
}

// ===== Personas =====

export async function listPersonas(userId: string): Promise<Persona[]> {
  return apiFetch<Persona[]>('/api/personas', userId)
}

// ===== Profile / Settings =====

export async function getProfile(userId: string): Promise<Profile> {
  return apiFetch<Profile>(`/api/profile`, userId)
}

export async function saveApiKey(userId: string, body: SaveApiKeyRequest): Promise<void> {
  await apiFetch<void>('/api/profile/api-key', userId, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// ===== Feed Messages (서버 컴포넌트용 초기 로드) =====

export async function listFeedMessages(userId: string, jobId: string): Promise<FeedMessage[]> {
  return apiFetch<FeedMessage[]>(`/api/jobs/${jobId}/feed`, userId)
}
