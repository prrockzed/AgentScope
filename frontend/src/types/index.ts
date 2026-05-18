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
  model: string | null
  agentType: string | null
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
  model: string | null
  agentType: string | null
  savedAt: string
}

export interface OptimizationSuggestion {
  id: string
  runId: string
  category: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  suggestion: string
  source: 'RULE' | 'AI'
  createdAt: string
}

export interface RegressionResult {
  id: string
  baselineRunId: string
  candidateRunId: string
  task: string | null
  baselineModel: string | null
  candidateModel: string | null
  baselineAgentType: string | null
  candidateAgentType: string | null
  latencyDelta: number | null
  tokenDelta: number | null
  retryDelta: number | null
  baselineStatus: string
  candidateStatus: string
  score: number
  createdAt: string
}

export interface SuccessfulPattern {
  id: string
  task: string
  agentType: string | null
  model: string | null
  avgLatency: number | null
  avgTokens: number | null
  occurrenceCount: number
  lastSeen: string
  createdAt: string
}

export interface FailurePattern {
  id: string
  task: string
  agentType: string | null
  model: string | null
  failureReason: string | null
  occurrenceCount: number
  lastSeen: string
  createdAt: string
}

export interface ModelInsight {
  id: string
  model: string
  totalRuns: number
  successCount: number
  failureCount: number
  successRate: number
  avgLatency: number | null
  avgTokens: number | null
  lastUpdated: string
}

export interface OptimizationLearning {
  category: string
  count: number
  topSuggestion: string
}

export interface KnowledgeSummary {
  successfulPatterns: SuccessfulPattern[]
  failurePatterns: FailurePattern[]
  modelInsights: ModelInsight[]
  optimizationLearnings: OptimizationLearning[]
}
