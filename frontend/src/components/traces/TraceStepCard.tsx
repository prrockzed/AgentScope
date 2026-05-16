'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatMs } from '@/lib/utils'
import type { TraceStep, EventType } from '@/types'

const eventTypeStyles: Record<EventType, { bg: string; color: string }> = {
  TOOL_CALL:          { bg: '#3b0764', color: '#a78bfa' },
  LLM_RESPONSE:       { bg: '#1e3a5f', color: '#3b82f6' },
  RETRY_TRIGGERED:    { bg: '#451a03', color: '#f59e0b' },
  VALIDATION_FAILURE: { bg: '#4c0519', color: '#ef4444' },
  RUN_COMPLETED:      { bg: '#14532d', color: '#22c55e' },
}

export function TraceStepCard({ step, isNew }: { step: TraceStep; isNew?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const style = eventTypeStyles[step.eventType] ?? { bg: '#18181f', color: '#8b8a9b' }

  return (
    <div
      className={`rounded-lg transition-all ${isNew ? 'animate-fade-in' : ''}`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-custom)',
        borderLeft: step.status === 'FAILED'
          ? '3px solid #ef4444'
          : '1px solid var(--border-custom)',
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {/* Step number */}
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          {step.stepNumber}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: style.bg, color: style.color }}
            >
              {step.eventType.replace('_', ' ')}
            </span>
            {step.toolName && (
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {step.toolName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{step.status}</span>
            <span className="font-mono">{formatMs(step.latency)}</span>
            <span>{step.tokenUsage} tokens</span>
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-4 pb-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--border-custom)' }}
        >
          {step.prompt && (
            <div className="flex flex-col gap-1 pt-3">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Prompt
              </p>
              <pre
                className="text-xs rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap font-mono"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {step.prompt}
              </pre>
            </div>
          )}
          {step.response && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Response
              </p>
              <pre
                className="text-xs rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap font-mono"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {step.response}
              </pre>
            </div>
          )}
          {!step.prompt && !step.response && (
            <p className="pt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              No prompt or response data.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
