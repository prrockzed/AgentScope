'use client'

import type { FailurePattern } from '@/types'
import { formatAgentType } from '@/lib/utils'

interface Props {
  data: FailurePattern[]
}

function Muted() {
  return <span style={{ color: 'var(--text-muted)' }}>—</span>
}

export function FailurePatternsTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-sm text-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)', color: 'var(--text-muted)' }}
      >
        No failure patterns yet. Failed runs will be recorded here automatically.
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-custom)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-custom)' }}>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Task</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Agent</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Model</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Failure Reason</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Count</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => (
            <tr
              key={p.id}
              style={{
                backgroundColor: idx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-custom)',
              }}
            >
              <td className="px-4 py-3 max-w-xs" style={{ color: 'var(--text-primary)' }}>
                <span title={p.task}>
                  {p.task.length > 80 ? p.task.slice(0, 80) + '…' : p.task}
                </span>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {p.agentType ? formatAgentType(p.agentType) : <Muted />}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {p.model ?? <Muted />}
              </td>
              <td className="px-4 py-3">
                {p.failureReason ? (
                  <span
                    className="rounded px-2 py-0.5 text-xs font-mono font-medium"
                    style={{ backgroundColor: '#4c0519', color: '#ef4444' }}
                  >
                    {p.failureReason}
                  </span>
                ) : (
                  <Muted />
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: '#4c0519', color: '#ef4444' }}
                >
                  {p.occurrenceCount}
                </span>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date(p.lastSeen).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
