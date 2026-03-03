'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createJob, cancelJob, saveApiKey } from '@/lib/api'
import type { CreateJobRequest, LLMProvider } from '@/types'

async function requireAuth() {
  const session = await auth()
  if (!session?.userId) {
    redirect('/')
  }
  return session
}

export async function createJobAction(url: string, personaIds: string[]): Promise<string> {
  const session = await requireAuth()

  const body: CreateJobRequest = {
    url,
    persona_ids: personaIds,
    flow_urls: [],
  }

  const result = await createJob(session.userId, body)
  return result.job_id
}

export async function cancelJobAction(jobId: string): Promise<void> {
  const session = await requireAuth()
  await cancelJob(session.userId, jobId)
}

export async function saveApiKeyAction(
  llmProvider: LLMProvider,
  apiKey: string
): Promise<void> {
  const session = await requireAuth()
  await saveApiKey(session.userId, {
    llm_provider: llmProvider,
    llm_api_key: apiKey,
  })
}
