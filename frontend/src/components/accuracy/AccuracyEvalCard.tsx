'use client'

import { formatRelativeTime } from '@/lib/utils'
import type { AccuracyEvaluation } from '@/types'

interface Props {
  eval: AccuracyEvaluation
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

const taskFitColors: Record<string, { bg: string; color: string }> = {
  APPROPRIATE: { bg: '#14532d', color: '#22c55e' },
  QUESTIONABLE: { bg: '#451a03', color: '#f59e0b' },
  INAPPROPRIATE: { bg: '#4c0519', color: '#ef4444' },
}

const recommendationConfig: Record<string, { border: string; label: string }> = {
  NO_ACTION: { border: '#22c55e', label: 'No action needed' },
  CONSIDER_IMPROVEMENT: { border: '#f59e0b', label: 'Consider improving this agent' },
  NEEDS_IMPROVEMENT: { border: '#ef4444', label: 'Agent needs improvement' },
}

export function AccuracyEvalCard({ eval: evaluation }: Props) {
  if (evaluation.evalStatus === 'PENDING') {
    return (
      <div
        className="rounded-lg p-5 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
      >
        <div className="animate-pulse flex flex-col gap-3">
          <div className="h-4 w-48 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          <div className="h-4 w-64 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </div>
      </div>
    )
  }

  if (evaluation.evalStatus === 'FAILED') {
    return (
      <div
        className="rounded-lg p-5 flex flex-col gap-2"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid #ef4444' }}
      >
        <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
          Evaluation failed
        </p>
        {evaluation.errorMessage && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {evaluation.errorMessage}
          </p>
        )}
      </div>
    )
  }

  const recommendation = evaluation.actionRecommendation
    ? recommendationConfig[evaluation.actionRecommendation]
    : null
  const taskFitStyle = evaluation.taskFit ? taskFitColors[evaluation.taskFit] : null

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Accuracy Evaluation
        </span>
        <div className="flex items-center gap-3">
          {evaluation.evaluatorModel && (
            <span
              className="font-mono text-xs rounded px-2 py-0.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-custom)',
                color: 'var(--text-muted)',
              }}
            >
              {evaluation.evaluatorModel}
            </span>
          )}
          {evaluation.completedAt && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatRelativeTime(evaluation.completedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Score row */}
      {evaluation.accuracyScore != null && (
        <div className="flex items-start gap-4">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: scoreColor(evaluation.accuracyScore) }}
          >
            {evaluation.accuracyScore}%
          </span>
          {evaluation.scoreReasoning && (
            <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-muted)' }}>
              {evaluation.scoreReasoning}
            </p>
          )}
        </div>
      )}

      {/* Task fit chip */}
      {evaluation.taskFit && taskFitStyle && (
        <div>
          <span
            className="text-xs font-semibold rounded-full px-3 py-1"
            style={{ backgroundColor: taskFitStyle.bg, color: taskFitStyle.color }}
          >
            {evaluation.taskFit}
          </span>
        </div>
      )}

      {/* Recommendation banner */}
      {recommendation && (
        <div
          className="rounded px-4 py-3 flex flex-col gap-1"
          style={{
            borderLeft: `3px solid ${recommendation.border}`,
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {recommendation.label}
          </span>
          {evaluation.recommendationReasoning && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {evaluation.recommendationReasoning}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
