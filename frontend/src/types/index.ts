export type RunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED'

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
