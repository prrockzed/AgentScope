import type { AgentRun, RegressionTest, TraceStep } from '@/types'

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

export async function replayRun(id: string): Promise<AgentRun> {
  const res = await fetch(`${BASE_URL}/api/runs/${id}/replay`, { method: 'POST' })
  if (!res.ok) throw new Error('Replay failed')
  return res.json() as Promise<AgentRun>
}

export async function getRegressionTests(): Promise<RegressionTest[]> {
  return fetcher<RegressionTest[]>('/api/regression-tests')
}

export async function generateEval(runId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/runs/${runId}/eval`, { method: 'POST' })
  if (!res.ok) throw new Error('Generate eval failed')
}
