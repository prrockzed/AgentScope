'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getTraces } from '@/lib/api'
import { formatMs } from '@/lib/utils'
import type { TraceStep } from '@/types'

interface Props {
  originalRunId: string
  replayRunId: string
}

function isDifferent(a: TraceStep | undefined, b: TraceStep | undefined): boolean {
  if (!a || !b) return false
  return a.status !== b.status || a.eventType !== b.eventType || a.toolName !== b.toolName
}

function StepCell({ step }: { step: TraceStep | undefined }) {
  const [expanded, setExpanded] = useState(false)

  if (!step) {
    return (
      <div
        className="rounded p-3 text-xs italic"
        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
      >
        — no step —
      </div>
    )
  }

  return (
    <div
      className="rounded"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              {step.eventType.replace(/_/g, ' ')}
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
        <div className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border-custom)' }}>
          {step.prompt && (
            <div className="flex flex-col gap-1 pt-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Prompt</p>
              <pre
                className="text-xs rounded p-2 overflow-auto max-h-36 whitespace-pre-wrap font-mono"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {step.prompt}
              </pre>
            </div>
          )}
          {step.response && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Response</p>
              <pre
                className="text-xs rounded p-2 overflow-auto max-h-36 whitespace-pre-wrap font-mono"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {step.response}
              </pre>
            </div>
          )}
          {!step.prompt && !step.response && (
            <p className="pt-2 text-xs" style={{ color: 'var(--text-muted)' }}>No prompt or response data.</p>
          )}
        </div>
      )}
    </div>
  )
}

export function DiffView({ originalRunId, replayRunId }: Props) {
  const { data: originalSteps = [], isLoading: loadingOriginal } = useQuery({
    queryKey: ['traces', originalRunId],
    queryFn: () => getTraces(originalRunId),
  })

  const { data: replaySteps = [], isLoading: loadingReplay } = useQuery({
    queryKey: ['traces', replayRunId],
    queryFn: () => getTraces(replayRunId),
  })

  if (loadingOriginal || loadingReplay) {
    return (
      <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
        Loading comparison...
      </div>
    )
  }

  const maxSteps = Math.max(originalSteps.length, replaySteps.length)

  if (maxSteps === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
        No trace steps to compare.
      </div>
    )
  }

  const rows = Array.from({ length: maxSteps }, (_, i) => {
    const orig = originalSteps.find((s) => s.stepNumber === i + 1)
    const rep = replaySteps.find((s) => s.stepNumber === i + 1)
    return { stepNumber: i + 1, orig, rep, different: isDifferent(orig, rep) }
  })

  const diffCount = rows.filter((r) => r.different).length

  return (
    <div className="flex flex-col gap-4">
      {/* Summary banner */}
      <div
        className="rounded-lg px-4 py-3 text-sm"
        style={{
          backgroundColor: diffCount > 0 ? '#451a03' : '#14532d',
          color: diffCount > 0 ? '#f59e0b' : '#22c55e',
          border: `1px solid ${diffCount > 0 ? '#78350f' : '#166534'}`,
        }}
      >
        {diffCount === 0
          ? `All ${maxSteps} steps match the original run`
          : `${diffCount} of ${maxSteps} step${maxSteps !== 1 ? 's' : ''} differ from the original run`}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2rem_1fr_1fr] gap-3">
        <div />
        <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Original</div>
        <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Replay</div>
      </div>

      {/* Step rows */}
      <div className="flex flex-col gap-2">
        {rows.map(({ stepNumber, orig, rep, different }) => (
          <div
            key={stepNumber}
            className="grid grid-cols-[2rem_1fr_1fr] gap-3 items-start rounded-lg p-2"
            style={{
              borderLeft: different ? '3px solid #f59e0b' : '3px solid transparent',
              backgroundColor: different ? 'rgba(245,158,11,0.05)' : 'transparent',
            }}
          >
            {/* Step number */}
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-1"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              {stepNumber}
            </div>

            {/* Original step */}
            <StepCell step={orig} />

            {/* Replay step */}
            <StepCell step={rep} />
          </div>
        ))}
      </div>
    </div>
  )
}
