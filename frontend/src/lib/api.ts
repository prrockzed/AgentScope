import type { AgentRun, TraceStep } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function getRuns(): Promise<AgentRun[]> {
  return fetcher<AgentRun[]>('/api/runs')
}

export async function getRun(id: string): Promise<AgentRun> {
  return fetcher<AgentRun>(`/api/runs/${id}`)
}

export async function getTraces(runId: string): Promise<TraceStep[]> {
  return fetcher<TraceStep[]>(`/api/runs/${runId}/traces`)
}

export async function createRun(task: string): Promise<AgentRun> {
  const res = await fetch(`${BASE_URL}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  })
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<AgentRun>
}
