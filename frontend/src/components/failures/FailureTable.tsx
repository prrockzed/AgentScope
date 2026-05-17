'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRelativeTime } from '@/lib/utils'
import type { FailureSummary } from '@/types'

interface Props {
  summary: FailureSummary[]
  selectedReason: string | null
  onSelect: (reason: string | null) => void
}

export function FailureTable({ summary, selectedReason, onSelect }: Props) {
  const total = summary.reduce((sum, s) => sum + s.count, 0)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-custom)' }}
    >
      <Table>
        <TableHeader>
          <TableRow
            style={{
              borderBottom: '1px solid var(--border-custom)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {['Failure Reason', 'Count', '% of Failures', 'Last Seen', 'View Runs'].map((h) => (
              <TableHead
                key={h}
                className="text-xs font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.map((row) => {
            const isActive = row.reason === selectedReason
            const pct = total > 0 ? ((row.count / total) * 100).toFixed(1) + '%' : '—'
            return (
              <TableRow
                key={row.reason}
                className="transition-colors"
                style={{
                  borderBottom: '1px solid var(--border-custom)',
                  borderLeft: isActive ? '4px solid #ef4444' : '4px solid transparent',
                }}
              >
                <TableCell>
                  <span
                    className="inline-block rounded px-2 py-0.5 font-mono text-xs"
                    style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                  >
                    {row.reason}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                  {row.count}
                </TableCell>
                <TableCell className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {pct}
                </TableCell>
                <TableCell className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {formatRelativeTime(row.lastSeenAt)}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onSelect(isActive ? null : row.reason)}
                    className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                    style={
                      isActive
                        ? { backgroundColor: '#ef4444', color: 'white' }
                        : {
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-custom)',
                          }
                    }
                  >
                    {isActive ? 'Hide Runs' : 'View Runs →'}
                  </button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
