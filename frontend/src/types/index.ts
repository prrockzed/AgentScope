export type RunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED'

export interface AgentDefinition {
  id: string
  name: string
  description: string
}

export interface ModelDefinition {
  id: string
  name: string
  description: string
  available: boolean
}

export type EventType =
  | 'TOOL_CALL'
  | 'LLM_RESPONSE'
  | 'VALIDATION_FAILURE'
  | 'RETRY_TRIGGERED'
  | 'RUN_COMPLETED'

export interface AgentRun {
  id: string
  task: string | null
  status: RunStatus
  createdAt: string
  totalLatency: number | null
  totalTokens: number | null
  replayOf: string | null
  failureReason: string | null
  model: string | null
  agentType: string | null
}

export interface TraceStep {
  id: string
  runId: string
  stepNumber: number
  toolName: string | null
  eventType: EventType
  prompt: string | null
  response: string | null
  latency: number
  tokenUsage: number
  status: string
  createdAt: string
}

export interface RegressionTest {
  id: string
  input: string | null
  expectedFailure: string | null
  type: string
  createdAt: string
  latestStatus: string
}

export interface FailureSummary {
  reason: string
  count: number
  lastSeenAt: string
}

export interface SavedRun {
  savedRunId: string
  runId: string
  task: string | null
  status: RunStatus
  totalLatency: number | null
  totalTokens: number | null
  savedAt: string
}
