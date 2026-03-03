// Twin Track AI — 공유 TypeScript 타입 정의

export type JobStatus = 'queued' | 'running' | 'done' | 'failed'
export type IssueSeverity = 'critical' | 'warning' | 'ok'
export type Plan = 'free' | 'pro'
export type FeedLevel = 'info' | 'success' | 'error'
export type LLMProvider = 'openai' | 'anthropic'

export interface Profile {
  id: string
  email: string
  plan: Plan
  llm_provider: LLMProvider | null
  llm_api_key_enc: string | null
  created_at: string
}

export interface Persona {
  id: string
  user_id: string | null
  name: string
  description: string
  system_prompt: string
  is_default: boolean
  created_at: string
}

export interface Job {
  id: string
  user_id: string
  url: string
  status: JobStatus
  persona_ids: string[]
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface Issue {
  id: string
  severity: IssueSeverity
  title: string
  description: string
  affected_persona: string
  screenshot_url: string | null
  fix_prompt: string | null
}

export interface PersonaResult {
  persona_id: string
  persona_name: string
  findings: string
  issues: Issue[]
}

export interface Report {
  id: string
  job_id: string
  user_id: string
  url: string
  score: number | null
  summary: string | null
  issues: Issue[]
  fix_pack: Issue[] | null
  video_url: string | null
  persona_results: PersonaResult[]
  created_at: string
}

export interface FeedMessage {
  id: string
  job_id: string
  message: string
  level: FeedLevel
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  next_cursor: string | null
  has_next: boolean
}

export interface CreateJobRequest {
  url: string
  persona_ids: string[]
  flow_urls: string[]
}

export interface CreateJobResponse {
  job_id: string
  status: JobStatus
  estimated_minutes: number
}

export interface CreatePersonaRequest {
  name: string
  description: string
}

export interface SaveApiKeyRequest {
  llm_provider: LLMProvider
  llm_api_key: string
}

export interface ApiError {
  detail: string
}
