'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { RunStatusBadge } from './RunStatusBadge'
import { formatMs, formatRelativeTime, truncateId } from '@/lib/utils'
import type { AgentRun } from '@/types'

function SkeletonRow() {
  return (
    <TableRow style={{ borderBottom: '1px solid var(--border-custom)' }}>
      {[...Array(6)].map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

interface Props {
  runs: AgentRun[] | undefined
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

export function RunsTable({ runs, isLoading, error, onRetry }: Props) {
  if (error) {
    return (
      <div
        className="rounded-lg p-4 flex items-center justify-between"
        style={{ backgroundColor: '#4c0519', border: '1px solid #ef4444' }}
      >
        <span className="text-sm" style={{ color: '#ef4444' }}>
          Failed to load runs: {error.message}
        </span>
        <button
          onClick={onRetry}
          className="text-sm font-medium underline"
          style={{ color: '#ef4444' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-custom)' }}
    >
      <Table>
        <TableHeader>
          <TableRow style={{ borderBottom: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}>
            {['ID', 'Task', 'Status', 'Created', 'Latency', 'Tokens', ''].map((h) => (
              <TableHead key={h} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
          ) : !runs || runs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                No runs yet. Submit your first task above.
              </TableCell>
            </TableRow>
          ) : (
            runs.map((run) => (
              <TableRow
                key={run.id}
                className="transition-colors"
                style={{ borderBottom: '1px solid var(--border-custom)' }}
              >
                <TableCell
                  className="font-mono text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {truncateId(run.id)}
                </TableCell>
                <TableCell
                  className="max-w-[240px] truncate text-sm"
                  style={{ color: 'var(--text-primary)' }}
                  title={run.task ?? ''}
                >
                  {run.task ? (run.task.length > 60 ? run.task.slice(0, 60) + '…' : run.task) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </TableCell>
                <TableCell>
                  <RunStatusBadge status={run.status} />
                </TableCell>
                <TableCell className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {formatRelativeTime(run.createdAt)}
                </TableCell>
                <TableCell className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                  {formatMs(run.totalLatency)}
                </TableCell>
                <TableCell className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                  {run.totalTokens ?? '—'}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/runs/${run.id}`}
                    className="flex items-center justify-center"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ArrowRight size={16} />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
