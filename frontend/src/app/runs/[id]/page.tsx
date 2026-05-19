'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { formatMs, formatRelativeTime } from '@/lib/utils'
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
  const ruleBasedCount = runOptimizations?.filter((s) => s.source === 'RULE').length ?? 0
  const aiCount = runOptimizations?.filter((s) => s.source === 'AI').length ?? 0
  const hasAISuggestions = aiCount > 0

  const hasCompare = Boolean(run?.replayOf)
  const [activeTab, setActiveTab] = useState<Tab>('timeline')
  const [idCopied, setIdCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copyRunId = useCallback(() => {
    if (!run) return
    void navigator.clipboard.writeText(run.id)
    setIdCopied(true)
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = setTimeout(() => setIdCopied(false), 2000)
  }, [run])

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
            {/* Row 1: ID + status */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex items-center gap-2">
                <button
                  onClick={copyRunId}
                  title="Click to copy run ID"
                  className="font-mono text-xs rounded px-2 py-1 transition-colors"
                  style={{
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-custom)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {run.id}
                </button>
                {idCopied && (
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: '#14532d', color: '#22c55e' }}
                  >
                    Copied!
                  </span>
                )}
              </div>
              <RunStatusBadge status={run.status} />
              {isRunning && <LiveIndicator />}
            </div>

            {/* Row 2: Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
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

              {/* Rule-based optimization suggestions */}
              {run.status !== 'RUNNING' && ruleBasedCount > 0 && (
                <button
                  onClick={() => router.push(`/optimizations?run=${run.id}`)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
                  style={{ backgroundColor: '#2e1065', color: '#a78bfa', border: '1px solid #4c1d95' }}
                >
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: '#4c1d95', color: '#c4b5fd' }}
                  >
                    {ruleBasedCount}
                  </span>
                  Rule-based Optimization{ruleBasedCount !== 1 ? 's' : ''}
                </button>
              )}

              {/* AI optimization suggestions */}
              {run.status !== 'RUNNING' && (
                hasAISuggestions ? (
                  <button
                    onClick={() => router.push(`/optimizations?run=${run.id}&tab=ai`)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
                    style={{ backgroundColor: '#14291a', color: '#4ade80', border: '1px solid #166534' }}
                  >
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: '#166534', color: '#86efac' }}
                    >
                      {aiCount}
                    </span>
                    AI Optimization{aiCount !== 1 ? 's' : ''}
                  </button>
                ) : (
                  <button
                    disabled={analyzeAI.isPending}
                    onClick={() => analyzeAI.mutate()}
                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-custom)' }}
                  >
                    {analyzeAI.isPending ? 'Generating…' : 'Get AI Optimizations'}
                  </button>
                )
              )}
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
