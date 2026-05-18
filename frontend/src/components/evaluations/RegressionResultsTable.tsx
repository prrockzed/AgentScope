'use client'

import type { RegressionResult } from '@/types'
import { formatAgentType } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  results: RegressionResult[]
}

function deltaStyle(value: number | null): React.CSSProperties {
  if (value === null || value === 0) return { color: 'var(--text-muted)' }
  return value > 0
    ? { color: '#ef4444' }
    : { color: '#22c55e' }
}

function formatDelta(value: number | null, unit: string): string {
  if (value === null) return '—'
  if (value === 0) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}${unit}`
}

function scoreStyle(score: number): React.CSSProperties {
  if (score < 0.2) return { backgroundColor: '#14532d', color: '#22c55e' }
  if (score < 0.5) return { backgroundColor: '#78350f', color: '#f97316' }
  return { backgroundColor: '#4c0519', color: '#ef4444' }
}

function StatusTransition({ baseline, candidate }: { baseline: string; candidate: string }) {
  if (baseline === 'SUCCESS' && candidate === 'FAILED') {
    return <span style={{ color: '#ef4444' }}>{baseline} → {candidate}</span>
  }
  if (baseline === 'FAILED' && candidate === 'SUCCESS') {
    return <span style={{ color: '#22c55e' }}>{baseline} → {candidate}</span>
  }
  return <span style={{ color: 'var(--text-muted)' }}>{baseline} → {candidate}</span>
}

export function RegressionResultsTable({ results }: Props) {
  if (results.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-sm text-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)', color: 'var(--text-muted)' }}
      >
        No comparisons yet. Replay any run to generate a regression score.
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-custom)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-custom)' }}>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Task</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Baseline</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Candidate</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Latency Δ</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Tokens Δ</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Retries Δ</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Score</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Links</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => (
            <tr
              key={r.id}
              style={{
                backgroundColor: idx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-custom)',
              }}
            >
              <td className="px-4 py-3 w-64" style={{ color: 'var(--text-primary)' }}>
                <Link href={`/runs/${r.baselineRunId}`} className="hover:underline">
                  {r.task
                    ? r.task.length > 60
                      ? r.task.slice(0, 60) + '…'
                      : r.task
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {r.baselineModel ?? '—'}
                {r.baselineAgentType && (
                  <span className="ml-1">({formatAgentType(r.baselineAgentType)})</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {r.candidateModel ?? '—'}
                {r.candidateAgentType && (
                  <span className="ml-1">({formatAgentType(r.candidateAgentType)})</span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs" style={deltaStyle(r.latencyDelta)}>
                {formatDelta(r.latencyDelta, 'ms')}
              </td>
              <td className="px-4 py-3 font-mono text-xs" style={deltaStyle(r.tokenDelta)}>
                {formatDelta(r.tokenDelta, '')}
              </td>
              <td className="px-4 py-3 font-mono text-xs" style={deltaStyle(r.retryDelta)}>
                {formatDelta(r.retryDelta, '')}
              </td>
              <td className="px-4 py-3 text-xs">
                <StatusTransition baseline={r.baselineStatus} candidate={r.candidateStatus} />
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={scoreStyle(r.score)}
                >
                  {r.score.toFixed(2)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Link
                    href={`/runs/${r.baselineRunId}`}
                    className="text-xs px-2 py-0.5 rounded hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    title="View baseline run"
                  >
                    B →
                  </Link>
                  <Link
                    href={`/runs/${r.candidateRunId}`}
                    className="text-xs px-2 py-0.5 rounded hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    title="View candidate run"
                  >
                    C →
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
