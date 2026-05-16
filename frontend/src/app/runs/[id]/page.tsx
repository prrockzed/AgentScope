'use client'

import { use, useMemo, useState } from 'react'
import { useRun } from '@/hooks/useRun'
import { useTraces } from '@/hooks/useTraces'
import { useLiveTraceStore } from '@/store/liveTraceStore'
import { useTraceWebSocket } from '@/hooks/useTraceWebSocket'
import { RunStatusBadge } from '@/components/runs/RunStatusBadge'
import { TraceTimeline } from '@/components/traces/TraceTimeline'
import { ExecutionGraph } from '@/components/graph/ExecutionGraph'
import { LiveIndicator } from '@/components/traces/LiveIndicator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMs, formatRelativeTime, truncateId } from '@/lib/utils'
import type { TraceStep } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default function TraceViewerPage({ params }: Props) {
  const { id } = use(params)
  const { data: run, isLoading: runLoading } = useRun(id)
  const isRunning = run?.status === 'RUNNING'

  const { data: persistedSteps, isLoading: tracesLoading } = useTraces(id, isRunning ?? false)

  const liveSteps = useLiveTraceStore((s) => s.steps)
  const clearSteps = useLiveTraceStore((s) => s.clearSteps)

  useTraceWebSocket(id, isRunning ?? false)

  const [activeTab, setActiveTab] = useState<'timeline' | 'graph'>('timeline')

  // Merge persisted + live steps, deduplicate by id, sort by stepNumber
  const allSteps = useMemo(() => {
    const map = new Map<string, TraceStep>()
    persistedSteps?.forEach((s) => map.set(s.id, s))
    liveSteps.forEach((s) => map.set(s.id, s))
    return Array.from(map.values()).sort((a, b) => a.stepNumber - b.stepNumber)
  }, [persistedSteps, liveSteps])

  const liveStepIds = useMemo(() => new Set(liveSteps.map((s) => s.id)), [liveSteps])

  // Clear live steps when run finishes
  useMemo(() => {
    if (!isRunning) clearSteps()
  }, [isRunning, clearSteps])

  return (
    <div className={`flex flex-col gap-6 ${activeTab === 'graph' ? 'max-w-6xl' : 'max-w-3xl'}`}>
      {/* Run header */}
      <div
        className="rounded-lg p-5 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
      >
        {runLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-64" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            <Skeleton className="h-4 w-48" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          </div>
        ) : run ? (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {truncateId(run.id)}
              </span>
              <RunStatusBadge status={run.status} />
              {isRunning && <LiveIndicator />}
            </div>
            {run.task && (
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {run.task}
              </p>
            )}
            <div className="flex items-center gap-6 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
              <span>{formatRelativeTime(run.createdAt)}</span>
              <span className="font-mono">{formatMs(run.totalLatency)}</span>
              {run.totalTokens != null && <span>{run.totalTokens} tokens</span>}
            </div>
          </>
        ) : null}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(['timeline', 'graph'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors"
            style={
              activeTab === tab
                ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
            }
          >
            {tab === 'timeline' ? 'Timeline' : 'Graph'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'timeline' ? (
        <TraceTimeline
          steps={allSteps}
          isLoading={tracesLoading && allSteps.length === 0}
          liveStepIds={liveStepIds}
        />
      ) : (
        <ExecutionGraph steps={allSteps} />
      )}
    </div>
  )
}
