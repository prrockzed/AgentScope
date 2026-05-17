'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRun } from '@/hooks/useRun'
import { useTraces } from '@/hooks/useTraces'
import { useReplayRun } from '@/hooks/useReplayRun'
import { useGenerateEval } from '@/hooks/useGenerateEval'
import { useIsRunSaved } from '@/hooks/useIsRunSaved'
import { useSaveRun } from '@/hooks/useSaveRun'
import { useRunOptimizations } from '@/hooks/useRunOptimizations'
import { useAnalyzeWithAI } from '@/hooks/useAnalyzeWithAI'
import { useLiveTraceStore } from '@/store/liveTraceStore'
import { useTraceWebSocket } from '@/hooks/useTraceWebSocket'
import { RunStatusBadge } from '@/components/runs/RunStatusBadge'
import { TraceTimeline } from '@/components/traces/TraceTimeline'
import { ExecutionGraph } from '@/components/graph/ExecutionGraph'
import { DiffView } from '@/components/traces/DiffView'
import { LiveIndicator } from '@/components/traces/LiveIndicator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMs, formatRelativeTime, truncateId } from '@/lib/utils'
import type { TraceStep } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

type Tab = 'timeline' | 'graph' | 'compare'

export default function TraceViewerPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { data: run, isLoading: runLoading } = useRun(id)
  const isRunning = run?.status === 'RUNNING'

  const { data: persistedSteps, isLoading: tracesLoading } = useTraces(id, isRunning ?? false)

  const liveSteps = useLiveTraceStore((s) => s.steps)
  const clearSteps = useLiveTraceStore((s) => s.clearSteps)

  useTraceWebSocket(id, isRunning ?? false)

  const replay = useReplayRun()
  const generateEvalMutation = useGenerateEval()
  const { data: savedData } = useIsRunSaved(id)
  const isSaved = savedData?.saved ?? false
  const { save: saveRunMutation, unsave: unsaveRunMutation } = useSaveRun(id)
  const { data: runOptimizations } = useRunOptimizations(id)
  const analyzeAI = useAnalyzeWithAI(id)
  const hasAISuggestions = runOptimizations?.some((s) => s.source === 'AI') ?? false

  const hasCompare = Boolean(run?.replayOf)
  const [activeTab, setActiveTab] = useState<Tab>('timeline')

  // Merge persisted + live steps, deduplicate by id, sort by stepNumber
  const allSteps = useMemo(() => {
    const map = new Map<string, TraceStep>()
    persistedSteps?.forEach((s) => map.set(s.id, s))
    liveSteps.forEach((s) => map.set(s.id, s))
    return Array.from(map.values()).sort((a, b) => a.stepNumber - b.stepNumber)
  }, [persistedSteps, liveSteps])

  const liveStepIds = useMemo(() => new Set(liveSteps.map((s) => s.id)), [liveSteps])

  // Clear live steps when run finishes
  useEffect(() => {
    if (!isRunning) clearSteps()
  }, [isRunning, clearSteps])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'graph', label: 'Graph' },
    ...(hasCompare ? [{ key: 'compare' as Tab, label: 'Compare' }] : []),
  ]

  return (
    <div className={`flex flex-col gap-6 ${activeTab === 'graph' ? 'max-w-6xl' : 'max-w-5xl'}`}>
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
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  {truncateId(run.id)}
                </span>
                <RunStatusBadge status={run.status} />
                {isRunning && <LiveIndicator />}
              </div>

              <div className="flex items-center gap-2">
                {/* Generate Eval button — only for failed runs */}
                {run.status === 'FAILED' && (
                  <button
                    disabled={generateEvalMutation.isPending}
                    onClick={() => generateEvalMutation.mutate(run.id)}
                    className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#4c0519', color: '#ef4444' }}
                  >
                    {generateEvalMutation.isPending ? 'Saving...' : 'Generate Eval'}
                  </button>
                )}

                {/* Save Run button — hidden while RUNNING */}
                {run.status !== 'RUNNING' && (
                  <button
                    disabled={saveRunMutation.isPending || unsaveRunMutation.isPending}
                    onClick={() =>
                      isSaved ? unsaveRunMutation.mutate() : saveRunMutation.mutate()
                    }
                    className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={
                      isSaved
                        ? { backgroundColor: '#1e3a5f', color: '#60a5fa' }
                        : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                    }
                  >
                    {isSaved ? 'Saved' : 'Save Run'}
                  </button>
                )}

                {/* Replay button */}
                <button
                  disabled={run.status === 'RUNNING' || replay.isPending}
                  onClick={() =>
                    replay.mutate(run.id, {
                      onSuccess: (newRun) => router.push(`/runs/${newRun.id}`),
                    })
                  }
                  className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  {replay.isPending ? 'Replaying...' : 'Replay Run'}
                </button>

                {/* Suggestions chip — only when suggestions exist and run is not running */}
                {run.status !== 'RUNNING' && (runOptimizations?.length ?? 0) > 0 && (
                  <button
                    onClick={() => router.push(`/optimizations?run=${run.id}`)}
                    className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                    style={{ backgroundColor: '#2e1065', color: '#a78bfa' }}
                  >
                    {runOptimizations!.length} Suggestion{runOptimizations!.length !== 1 ? 's' : ''}
                  </button>
                )}

                {/* Analyse with AI button — only for completed runs */}
                {run.status !== 'RUNNING' && (
                  hasAISuggestions ? (
                    <button
                      onClick={() => router.push(`/optimizations?run=${run.id}&tab=ai`)}
                      className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                      style={{ backgroundColor: '#14291a', color: '#4ade80' }}
                    >
                      Analysed
                    </button>
                  ) : (
                    <button
                      disabled={analyzeAI.isPending}
                      onClick={() => analyzeAI.mutate()}
                      className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    >
                      {analyzeAI.isPending ? 'Analysing…' : 'Analyse with AI'}
                    </button>
                  )
                )}
              </div>
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

      {/* Failure banner */}
      {run?.status === 'FAILED' && (
        <div
          className="rounded-lg px-4 py-3 text-sm flex items-center gap-3"
          style={{ backgroundColor: '#4c0519', color: '#ef4444', border: '1px solid #7f1d1d' }}
        >
          <span className="font-semibold">Run failed</span>
          {run.failureReason && (
            <span
              className="font-mono text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: '#7f1d1d' }}
            >
              {run.failureReason.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors"
            style={
              activeTab === tab.key
                ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'timeline' && (
        <TraceTimeline
          steps={allSteps}
          isLoading={tracesLoading && allSteps.length === 0}
          liveStepIds={liveStepIds}
        />
      )}
      {activeTab === 'graph' && <ExecutionGraph steps={allSteps} />}
      {activeTab === 'compare' && run?.replayOf && (
        <DiffView originalRunId={run.replayOf} replayRunId={run.id} />
      )}
    </div>
  )
}
