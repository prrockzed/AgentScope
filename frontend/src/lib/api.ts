import type { AccuracyEvaluation, AgentDefinition, AgentDetail, AgentPatch, AgentRun, FailurePattern, FailureSummary, KnowledgeSummary, ModelDefinition, OptimizationSuggestion, RegressionResult, RegressionTest, SavedRun, SuccessfulPattern, TraceStep } from '@/types'

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

export async function getAgents(): Promise<AgentDefinition[]> {
  return fetcher<AgentDefinition[]>('/api/agents')
}

export async function getAgentDetail(id: string): Promise<AgentDetail> {
  return fetcher<AgentDetail>(`/api/agents/${id}`)
}

export async function getModels(): Promise<ModelDefinition[]> {
  return fetcher<ModelDefinition[]>('/api/models')
}

export async function createRun(task: string, agentType?: string, model?: string): Promise<AgentRun> {
  const res = await fetch(`${BASE_URL}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, agentType: agentType ?? 'tool_agent', model: model ?? 'qwen3:4b' }),
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

export async function getSavedRuns(): Promise<SavedRun[]> {
  return fetcher<SavedRun[]>('/api/saved-runs')
}

export async function isRunSaved(id: string): Promise<{ saved: boolean }> {
  return fetcher<{ saved: boolean }>(`/api/runs/${id}/saved`)
}

export async function saveRun(id: string): Promise<SavedRun> {
  const res = await fetch(`${BASE_URL}/api/runs/${id}/save`, { method: 'POST' })
  if (!res.ok) throw new Error('Save run failed')
  return res.json() as Promise<SavedRun>
}

export async function unsaveRun(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/runs/${id}/save`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Unsave run failed')
}

export async function getFailureSummary(): Promise<FailureSummary[]> {
  return fetcher<FailureSummary[]>('/api/failures/summary')
}

export async function getOptimizations(): Promise<OptimizationSuggestion[]> {
  return fetcher<OptimizationSuggestion[]>('/api/optimizations')
}

export async function getRunOptimizations(runId: string): Promise<OptimizationSuggestion[]> {
  return fetcher<OptimizationSuggestion[]>(`/api/runs/${runId}/optimizations`)
}

export async function analyzeWithAI(runId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/runs/${runId}/optimizations/ai`, { method: 'POST' })
  if (!res.ok) throw new Error('AI analysis failed')
}

export async function getRegressionResults(): Promise<RegressionResult[]> {
  return fetcher<RegressionResult[]>('/api/regression-results')
}

export async function getMemoryPatterns(): Promise<{
  successfulPatterns: SuccessfulPattern[]
  failurePatterns: FailurePattern[]
}> {
  return fetcher('/api/memory/patterns')
}

export async function getKnowledgeSummary(): Promise<KnowledgeSummary> {
  return fetcher('/api/knowledge/summary')
}

export async function getRunAccuracyEval(runId: string): Promise<AccuracyEvaluation | null> {
  const res = await fetch(`${BASE_URL}/api/runs/${runId}/accuracy-eval`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<AccuracyEvaluation>
}

export async function triggerAccuracyEval(runId: string, evaluatorModel: string): Promise<AccuracyEvaluation> {
  const res = await fetch(`${BASE_URL}/api/runs/${runId}/accuracy-eval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evaluatorModel }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<AccuracyEvaluation>
}

export async function generatePatch(runId: string): Promise<AgentPatch> {
  const res = await fetch(`${BASE_URL}/api/runs/${runId}/generate-patch`, { method: 'POST' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<AgentPatch>
}

export async function getAgentPatches(): Promise<AgentPatch[]> {
  return fetcher<AgentPatch[]>('/api/agent-patches')
}

export async function activatePatch(id: string): Promise<AgentPatch> {
  const res = await fetch(`${BASE_URL}/api/agent-patches/${id}/activate`, { method: 'PATCH' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<AgentPatch>
}

export async function rejectPatch(id: string): Promise<AgentPatch> {
  const res = await fetch(`${BASE_URL}/api/agent-patches/${id}/reject`, { method: 'PATCH' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<AgentPatch>
}

export async function revokePatch(id: string): Promise<AgentPatch> {
  const res = await fetch(`${BASE_URL}/api/agent-patches/${id}/revoke`, { method: 'PATCH' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<AgentPatch>
}
