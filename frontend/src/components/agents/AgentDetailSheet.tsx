'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronRight, Wrench } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgentDetail } from '@/hooks/useAgentDetail'
import { useAgentPatches } from '@/hooks/useAgentPatches'
import { formatRelativeTime } from '@/lib/utils'
import type { AgentStep } from '@/types'

const eventTypeStyles: Record<string, { bg: string; color: string }> = {
  TOOL_CALL:          { bg: '#3b0764', color: '#a78bfa' },
  LLM_RESPONSE:       { bg: '#1e3a5f', color: '#3b82f6' },
  RETRY_TRIGGERED:    { bg: '#451a03', color: '#f59e0b' },
  VALIDATION_FAILURE: { bg: '#4c0519', color: '#ef4444' },
  RUN_COMPLETED:      { bg: '#14532d', color: '#22c55e' },
}

const workflowTypeLabel: Record<string, string> = {
  langgraph:    'LangGraph',
  sequential:   'Sequential',
  single_call:  'Single Call',
}

function StepCard({ step, index }: { step: AgentStep; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const style = eventTypeStyles[step.eventType] ?? { bg: '#18181f', color: '#8b8a9b' }

  return (
    <div
      className="rounded-lg"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-custom)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        {/* Step number */}
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          {index + 1}
        </div>

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {step.name}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: style.bg, color: style.color }}
            >
              {step.eventType.replace(/_/g, ' ')}
            </span>
            {step.conditional && (
              <span
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#451a03', color: '#f59e0b' }}
              >
                conditional
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {step.description}
          </p>
          {step.tools.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {step.tools.map((t) => (
                <span
                  key={t}
                  className="rounded px-1.5 py-0.5 text-xs font-mono"
                  style={{ backgroundColor: '#3b0764', color: '#a78bfa' }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {step.prompt && (
          <div className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        )}
      </button>

      {expanded && step.prompt && (
        <div
          className="px-3 pb-3 flex flex-col gap-1"
          style={{ borderTop: '1px solid var(--border-custom)' }}
        >
          <p className="text-xs font-medium pt-3" style={{ color: 'var(--text-muted)' }}>
            {step.promptLabel ?? 'Prompt'}
          </p>
          <pre
            className="text-xs rounded p-3 overflow-auto max-h-52 whitespace-pre-wrap font-mono"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            {step.prompt}
          </pre>
        </div>
      )}
    </div>
  )
}

interface Props {
  agentId: string | null
  onClose: () => void
}

export function AgentDetailSheet({ agentId, onClose }: Props) {
  const { data: detail, isLoading } = useAgentDetail(agentId)
  const { data: allPatches } = useAgentPatches()
  const activePatches = allPatches?.filter(
    (p) => p.agentType === agentId && p.status === 'ACTIVE'
  ) ?? []
  const pendingPatches = allPatches?.filter(
    (p) => p.agentType === agentId && p.status === 'PENDING'
  ) ?? []

  if (!agentId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-xl flex-col"
        style={{
          backgroundColor: 'var(--bg-base)',
          borderLeft: '1px solid var(--border-custom)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-custom)' }}
        >
          <div className="flex flex-col gap-1 min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-40" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                <Skeleton className="h-3 w-64 mt-1" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {detail?.name}
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {detail?.description}
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Stat chips */}
        {!isLoading && detail && (
          <div
            className="flex flex-wrap gap-2 px-5 py-3"
            style={{ borderBottom: '1px solid var(--border-custom)' }}
          >
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: '#1e3a5f', color: '#3b82f6' }}
            >
              {workflowTypeLabel[detail.workflowType] ?? detail.workflowType}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              {detail.steps.length} step{detail.steps.length !== 1 ? 's' : ''}
            </span>
            {detail.toolsAvailable.length > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#3b0764', color: '#a78bfa' }}
              >
                {detail.toolsAvailable.length} tool{detail.toolsAvailable.length !== 1 ? 's' : ''}
              </span>
            )}
            {detail.maxRetries !== null && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#451a03', color: '#f59e0b' }}
              >
                max {detail.maxRetries} retries
              </span>
            )}
            {activePatches.length > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#14291a', color: '#4ade80', border: '1px solid #166534' }}
              >
                {activePatches.length} active improvement{activePatches.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Step timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              ))}
            </div>
          ) : detail ? (
            <div className="relative flex flex-col gap-3">
              {/* Vertical connector line */}
              <div
                className="absolute left-[23px] top-3 w-0.5"
                style={{
                  backgroundColor: 'var(--border-custom)',
                  bottom: '12px',
                }}
              />
              {detail.steps.map((step, i) => (
                <div key={i} className="pl-10 relative">
                  {/* Dot */}
                  <div
                    className="absolute left-[17px] top-3 h-3 w-3 rounded-full border-2"
                    style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--purple-600)' }}
                  />
                  <StepCard step={step} index={i} />
                </div>
              ))}
            </div>
          ) : null}

          {/* Retry note */}
          {!isLoading && detail?.retryNote && (
            <p
              className="mt-4 text-xs leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              {detail.retryNote}
            </p>
          )}

          {/* Improvements section */}
          {!isLoading && detail && (activePatches.length > 0 || pendingPatches.length > 0) && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Wrench size={13} style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  IMPROVEMENTS
                </p>
              </div>

              {activePatches.map((patch) => (
                <div
                  key={patch.id}
                  className="rounded-lg p-3 flex flex-col gap-1.5"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid #166534' }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: '#14291a', color: '#4ade80', border: '1px solid #166534' }}
                    >
                      Active
                    </span>
                    {patch.activatedAt && (
                      <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                        {formatRelativeTime(patch.activatedAt)}
                      </span>
                    )}
                  </div>
                  {patch.title && (
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {patch.title}
                    </p>
                  )}
                  {patch.instruction && (
                    <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {patch.instruction}
                    </p>
                  )}
                </div>
              ))}

              {pendingPatches.map((patch) => (
                <div
                  key={patch.id}
                  className="rounded-lg p-3 flex flex-col gap-1.5"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: '#451a03', color: '#fbbf24', border: '1px solid #78350f' }}
                    >
                      Pending Review
                    </span>
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                      {formatRelativeTime(patch.createdAt)}
                    </span>
                  </div>
                  {patch.title && (
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {patch.title}
                    </p>
                  )}
                  {patch.instruction && (
                    <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {patch.instruction}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
