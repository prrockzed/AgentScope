'use client'

import type { ModelInsight } from '@/types'

interface Props {
  data: ModelInsight[]
}

function Muted() {
  return <span style={{ color: 'var(--text-muted)' }}>—</span>
}

function SuccessRateBadge({ rate }: { rate: number }) {
  let bg: string
  let text: string
  if (rate >= 80) {
    bg = '#14291a'
    text = '#4ade80'
  } else if (rate >= 50) {
    bg = '#431407'
    text = '#f97316'
  } else {
    bg = '#4c0519'
    text = '#ef4444'
  }
  return (
    <span
      className="rounded px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: bg, color: text }}
    >
      {rate.toFixed(1)}%
    </span>
  )
}

export function ModelInsightsTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-sm text-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)', color: 'var(--text-muted)' }}
      >
        No model data yet. Run a task to start tracking model performance.
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-custom)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-custom)' }}>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Model</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Total Runs</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Success Rate</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Avg Latency</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Avg Tokens</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m, idx) => (
            <tr
              key={m.id}
              style={{
                backgroundColor: idx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-custom)',
              }}
            >
              <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                {m.model}
              </td>
              <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                {m.totalRuns}
              </td>
              <td className="px-4 py-3">
                <SuccessRateBadge rate={m.successRate} />
              </td>
              <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                {m.avgLatency != null ? `${m.avgLatency.toLocaleString()} ms` : <Muted />}
              </td>
              <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                {m.avgTokens != null ? m.avgTokens.toLocaleString() : <Muted />}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date(m.lastUpdated).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
