'use client'

import type { RegressionTest } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'PASSING':
      return { backgroundColor: '#14532d', color: '#22c55e' }
    case 'FAILING':
      return { backgroundColor: '#4c0519', color: '#ef4444' }
    default:
      return { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
  }
}

interface Props {
  tests: RegressionTest[]
}

export function RegressionTestsTable({ tests }: Props) {
  if (tests.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-sm text-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)', color: 'var(--text-muted)' }}
      >
        No regression tests yet. Failed runs will automatically create entries here.
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
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Input</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Expected Failure</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Type</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test, idx) => (
            <tr
              key={test.id}
              style={{
                backgroundColor: idx % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-custom)',
              }}
            >
              <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                {test.input
                  ? test.input.length > 60
                    ? test.input.slice(0, 60) + '…'
                    : test.input
                  : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td className="px-4 py-3">
                {test.expectedFailure ? (
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    {test.expectedFailure.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  {test.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={statusStyle(test.latestStatus)}
                >
                  {test.latestStatus}
                </span>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatRelativeTime(test.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
